#!/usr/bin/env node
// ios-ship — build a signed iOS app on voyager and hand back an install link.
//
//   ios-ship build <repo|path> [--ref <branch|sha>] [--scheme S] [--configuration C] [--note "…"]
//   ios-ship list [--repo <name>] [--limit N] [--json]
//   ios-ship devices                     list devices registered on the team
//   ios-ship devices add <udid> <name>   register a device (ad-hoc profiles regenerate on the next build)
//   ios-ship setup                       create the signing keychain and voyager's certificates
//   ios-ship doctor                      check the setup end to end
//   ios-ship index                       rebuild the HTML pages from the history
//
// Runs on voyager only (the wrapper in scripts/bin/ios-ship forwards over ssh from elsewhere).
// Builds are signed by the team in ~/.config/ios-ship/config.json, so each one installs over the
// last build of the same bundle ID and keeps its data.
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, createWriteStream,
  openSync, closeSync, statSync, copyFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client } from './lib/asc.mjs';
import { renderIndex, renderBuild } from './lib/html.mjs';

const HOME = homedir();
const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(HOME, '.config/ios-ship');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
const KEYCHAIN = join(HOME, 'Library/Keychains/ios-ship.keychain-db');
const KEYCHAIN_PASSWORD = join(CONFIG_DIR, 'keychain-password');
const ROOT = join(HOME, 'ios-builds');
const WWW = join(ROOT, 'www');
const REPOS = join(ROOT, 'repos');
const WORK = join(ROOT, 'work');
const DERIVED = join(ROOT, 'DerivedData');
const HISTORY = join(ROOT, 'builds.json');
const LOCK = join(ROOT, '.lock');
const DEFAULT_BASE_URL = 'https://builds.chsmc.tools';

// Children get a PATH with Homebrew (xcodegen) whatever shell started us.
process.env.PATH = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin', process.env.PATH].join(':');

// ---------- small helpers ----------

function die(message) {
  console.error(`ios-ship: ${message}`);
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function tryRun(cmd, args, opts) {
  try { return run(cmd, args, opts); } catch { return null; }
}

// Streams a command's output into a log file; resolves with the exit code.
function runLogged(cmd, args, log, opts = {}) {
  return new Promise((done) => {
    log.write(`\n$ ${cmd} ${args.join(' ')}\n`);
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.on('close', (code) => done(code));
  });
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) flags[key] = true;
      else { flags[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, flags };
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) die(`missing ${CONFIG_PATH}; see SKILL.md, "Setup"`);
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  for (const k of ['teamId', 'keyId', 'issuerId', 'keyPath']) if (!config[k]) die(`config.json needs "${k}"`);
  config.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  return config;
}

function loadHistory() {
  return existsSync(HISTORY) ? JSON.parse(readFileSync(HISTORY, 'utf8')) : [];
}

function saveHistory(history) {
  writeFileSync(HISTORY, JSON.stringify(history, null, 2) + '\n');
}

function plistValue(file, keyPath) {
  return tryRun('/usr/libexec/PlistBuddy', ['-c', `Print :${keyPath}`, file]);
}

function xmlEscape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// One build at a time: they share the keychain and the per-repo DerivedData.
async function withLock(fn) {
  mkdirSync(ROOT, { recursive: true });
  let warned = false;
  for (;;) {
    try {
      closeSync(openSync(LOCK, 'wx'));
      writeFileSync(LOCK, String(process.pid));
      break;
    } catch {
      const pid = Number(tryRun('cat', [LOCK]));
      let alive = false;
      try { if (pid) { process.kill(pid, 0); alive = true; } } catch {}
      if (!alive) { rmSync(LOCK, { force: true }); continue; }
      if (!warned) { console.error(`ios-ship: waiting for build in progress (pid ${pid})…`); warned = true; }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const release = () => rmSync(LOCK, { force: true });
  process.on('exit', release);
  try { return await fn(); } finally { release(); }
}

// ---------- keychain and signing identities ----------

function keychainPassword() {
  if (!existsSync(KEYCHAIN_PASSWORD)) die('no signing keychain yet; run `ios-ship setup`');
  return readFileSync(KEYCHAIN_PASSWORD, 'utf8').trim();
}

function unlockKeychain() {
  run('security', ['unlock-keychain', '-p', keychainPassword(), KEYCHAIN]);
}

function identities() {
  const out = tryRun('security', ['find-identity', '-v', '-p', 'codesigning', KEYCHAIN]) || '';
  return out.split('\n').map((l) => l.match(/"(.+)"/)?.[1]).filter(Boolean);
}

function ensureKeychainInSearchList() {
  const list = run('security', ['list-keychains', '-d', 'user']).split('\n').map((s) => s.trim().replace(/^"|"$/g, ''));
  if (list.includes(KEYCHAIN)) return;
  run('security', ['list-keychains', '-d', 'user', '-s', KEYCHAIN, ...list]);
}

async function setup() {
  const config = loadConfig();
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });

  if (!existsSync(KEYCHAIN)) {
    const password = randomBytes(24).toString('hex');
    writeFileSync(KEYCHAIN_PASSWORD, password + '\n', { mode: 0o600 });
    run('security', ['create-keychain', '-p', password, KEYCHAIN]);
    run('security', ['set-keychain-settings', KEYCHAIN]); // no auto-lock timeout
    console.log(`created ${KEYCHAIN}`);
  }
  ensureKeychainInSearchList();
  unlockKeychain();

  // Apple's current intermediates (G3–G6). voyager's System keychain only has the one that expired in 2023.
  const pem = readFileSync(join(SKILL_DIR, 'certs/apple-wwdr.pem'), 'utf8');
  const certs = pem.split(/(?=-----BEGIN CERTIFICATE-----)/).filter((c) => c.includes('BEGIN'));
  const tmp = join(CONFIG_DIR, 'tmp');
  mkdirSync(tmp, { recursive: true, mode: 0o700 });
  certs.forEach((c, i) => {
    const f = join(tmp, `wwdr-${i}.pem`);
    writeFileSync(f, c);
    tryRun('security', ['import', f, '-k', KEYCHAIN]); // fails harmlessly when already there
  });

  const asc = client(config);
  const have = identities();
  const wanted = [
    { type: 'DEVELOPMENT', prefix: 'Apple Development:' },  // archive signs with this
    { type: 'DISTRIBUTION', prefix: 'Apple Distribution:' }, // the ad-hoc export re-signs with this
  ];
  for (const { type, prefix } of wanted) {
    if (have.some((name) => name.startsWith(prefix))) { console.log(`have ${prefix.slice(0, -1)} identity`); continue; }
    const key = join(tmp, `${type}.key.pem`);
    const csr = join(tmp, `${type}.csr.pem`);
    const cer = join(tmp, `${type}.cer`);
    run('openssl', ['genrsa', '-out', key, '2048']);
    run('openssl', ['req', '-new', '-key', key, '-subj', `/CN=ios-ship on voyager (${type.toLowerCase()})`, '-out', csr]);
    const created = await asc.createCertificate(type, readFileSync(csr, 'utf8'));
    writeFileSync(cer, Buffer.from(created.data.attributes.certificateContent, 'base64'));
    run('security', ['import', key, '-k', KEYCHAIN, '-T', '/usr/bin/codesign', '-T', '/usr/bin/security']);
    run('security', ['import', cer, '-k', KEYCHAIN]);
    console.log(`created ${created.data.attributes.displayName} ${type} certificate (expires ${created.data.attributes.expirationDate.slice(0, 10)})`);
  }
  // Lets codesign use the keys without a GUI prompt.
  run('security', ['set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-s', '-k', keychainPassword(), KEYCHAIN]);
  rmSync(tmp, { recursive: true, force: true });

  for (const dir of [WWW, REPOS, WORK, DERIVED]) mkdirSync(dir, { recursive: true });
  console.log('identities:\n  ' + identities().join('\n  '));
}

// ---------- devices ----------

async function devices(args) {
  const config = loadConfig();
  const asc = client(config);
  if (args[0] === 'add') {
    const [, udid, ...nameParts] = args;
    const name = nameParts.join(' ');
    if (!udid || !name) die('usage: ios-ship devices add <udid> <name>');
    const existing = (await asc.listDevices()).find((d) => d.attributes.udid.toLowerCase() === udid.toLowerCase());
    if (existing) {
      console.log(`already registered as "${existing.attributes.name}" (${existing.attributes.status})`);
    } else {
      await asc.registerDevice(udid, name);
      console.log(`registered "${name}"`);
    }
    // Ad-hoc profiles list their devices when made. Deleting them makes the next build's
    // -allowProvisioningUpdates make fresh ones that include the new device.
    const adhoc = (await asc.listProfiles()).filter((p) => p.attributes.profileType === 'IOS_APP_ADHOC');
    for (const p of adhoc) await asc.deleteProfile(p.id);
    if (adhoc.length) console.log(`deleted ${adhoc.length} ad-hoc profile(s); the next build of each app regenerates its own`);
    return;
  }
  for (const d of await asc.listDevices()) {
    console.log(`${d.attributes.status === 'ENABLED' ? ' ' : '✗'} ${d.attributes.name.padEnd(24)} ${d.attributes.deviceClass.padEnd(12)} ${d.attributes.udid}`);
  }
}

// ---------- build ----------

// Finds what to build. A name is a GitHub repo (chasemccoy/<name>) kept in a mirror under
// ~/ios-builds/repos, checked out per build in its own worktree. A path builds that directory as is.
function prepareSource(target, ref, id) {
  const asPath = resolve(target.replace(/^~(?=\/)/, HOME));
  if (target.includes('/') && existsSync(asPath)) {
    const commit = tryRun('git', ['-C', asPath, 'rev-parse', 'HEAD']);
    const dirty = !!tryRun('git', ['-C', asPath, 'status', '--porcelain']);
    return {
      repo: basename(tryRun('git', ['-C', asPath, 'rev-parse', '--show-toplevel']) || asPath),
      dir: asPath,
      ref: tryRun('git', ['-C', asPath, 'branch', '--show-current']) || 'local',
      commit, dirty,
      subject: tryRun('git', ['-C', asPath, 'log', '-1', '--format=%s']),
      cleanup: () => {},
    };
  }
  const repo = target.replace(/^chasemccoy\//, '').replace(/\.git$/, '');
  const mirror = join(REPOS, repo);
  if (!existsSync(mirror)) {
    console.error(`ios-ship: cloning chasemccoy/${repo}…`);
    run('git', ['clone', '--quiet', `git@github.com:chasemccoy/${repo}.git`, mirror]);
  }
  run('git', ['-C', mirror, 'fetch', '--quiet', '--prune', 'origin']);
  let resolved = ref;
  if (!resolved) resolved = run('git', ['-C', mirror, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '');
  const commit =
    tryRun('git', ['-C', mirror, 'rev-parse', '--verify', `origin/${resolved}^{commit}`]) ||
    tryRun('git', ['-C', mirror, 'rev-parse', '--verify', `${resolved}^{commit}`]);
  if (!commit) die(`no branch or commit "${resolved}" in chasemccoy/${repo} (did you push it?)`);
  const dir = join(WORK, `${repo}-${id}`);
  run('git', ['-C', mirror, 'worktree', 'add', '--quiet', '--detach', dir, commit]);
  // Submodules, if any; harmless otherwise.
  tryRun('git', ['-C', dir, 'submodule', 'update', '--quiet', '--init', '--recursive']);
  return {
    repo, dir, ref: resolved, commit, dirty: false,
    subject: run('git', ['-C', dir, 'log', '-1', '--format=%s']),
    cleanup: () => {
      tryRun('git', ['-C', mirror, 'worktree', 'remove', '--force', dir]);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

// The repo's .ios-ship.json, else a guess: the shallowest project.yml or .xcodeproj (skipping
// dependencies), with the scheme named after the project.
function projectConfig(dir) {
  const file = join(dir, '.ios-ship.json');
  const config = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  if (!config.project) {
    const found = tryRun('find', [dir, '-maxdepth', '3', '(', '-name', 'project.yml', '-o', '-name', '*.xcodeproj', ')',
      '-not', '-path', '*/node_modules/*', '-not', '-path', '*/Pods/*', '-not', '-path', '*/.build/*', '-not', '-path', '*/Packages/*']) || '';
    const candidates = found.split('\n').filter(Boolean).sort((a, b) => a.split('/').length - b.split('/').length || (a.endsWith('.yml') ? -1 : 1));
    if (!candidates.length) die(`no project.yml or .xcodeproj in ${dir}; add a .ios-ship.json (see SKILL.md)`);
    config.project = candidates[0].slice(dir.length + 1);
  }
  return config;
}

async function build(args) {
  const { positional, flags } = parseArgs(args);
  const target = positional[0];
  if (!target) die('usage: ios-ship build <repo|path> [--ref <branch|sha>] [--scheme S] [--configuration C] [--note "…"]');
  const config = loadConfig();

  return withLock(async () => {
    const started = new Date();
    // The build number doubles as the build's id: yyMMddHHmmss, always increasing.
    const pad = (n) => String(n).padStart(2, '0');
    const id = `${String(started.getFullYear()).slice(2)}${pad(started.getMonth() + 1)}${pad(started.getDate())}${pad(started.getHours())}${pad(started.getMinutes())}${pad(started.getSeconds())}`;
    const source = prepareSource(target, flags.ref, id);
    const project = projectConfig(source.dir);
    const scheme = flags.scheme || project.scheme;
    const configuration = flags.configuration || project.configuration || 'Release';

    const outDir = join(WWW, source.repo, id);
    mkdirSync(outDir, { recursive: true });
    const logPath = join(outDir, 'build.log');
    const log = createWriteStream(logPath);
    const pageUrl = `${config.baseUrl}/${source.repo}/${id}/`;
    const record = {
      id, repo: source.repo, ref: source.ref, commit: source.commit, dirty: source.dirty, subject: source.subject,
      note: typeof flags.note === 'string' ? flags.note : undefined,
      startedAt: started.toISOString(), status: 'building', pageUrl, logUrl: pageUrl + 'build.log',
    };
    const history = loadHistory();
    history.unshift(record);
    saveHistory(history);
    console.error(`ios-ship: building ${source.repo} @ ${source.ref} (${source.commit?.slice(0, 7)}) — log: ${record.logUrl}`);

    const fail = (error) => {
      const tail = readFileSync(logPath, 'utf8').split('\n');
      const errors = tail.filter((l) => /\berror\b[: ]/i.test(l) && !/^\s*\$ /.test(l)).slice(-15);
      Object.assign(record, { status: 'failed', error, errors, finishedAt: new Date().toISOString() });
      return finish();
    };
    const finish = () => {
      record.durationSec = Math.round((Date.parse(record.finishedAt) - started.getTime()) / 1000);
      const h = loadHistory();
      const i = h.findIndex((b) => b.id === record.id && b.repo === record.repo);
      if (i >= 0) h[i] = record; else h.unshift(record);
      saveHistory(h);
      writeFileSync(join(outDir, 'index.html'), renderBuild(record));
      writeFileSync(join(WWW, 'index.html'), renderIndex(h));
      log.end();
      source.cleanup();
      return record;
    };

    try {
      let projectPath = join(source.dir, project.project);
      if (projectPath.endsWith('project.yml')) {
        const code = await runLogged('xcodegen', ['generate', '--spec', projectPath], log, { cwd: dirname(projectPath) });
        if (code !== 0) return fail('xcodegen generate failed');
        const generated = readdirSync(dirname(projectPath)).find((f) => f.endsWith('.xcodeproj'));
        if (!generated) return fail('xcodegen made no .xcodeproj');
        projectPath = join(dirname(projectPath), generated);
      }
      const projectFlag = projectPath.endsWith('.xcworkspace') ? '-workspace' : '-project';
      const schemeName = scheme || basename(projectPath).replace(/\.(xcodeproj|xcworkspace)$/, '');
      record.scheme = schemeName;
      record.configuration = configuration;

      unlockKeychain();
      const auth = [
        '-allowProvisioningUpdates',
        '-authenticationKeyPath', config.keyPath,
        '-authenticationKeyID', config.keyId,
        '-authenticationKeyIssuerID', config.issuerId,
      ];
      const archivePath = join(WORK, `${source.repo}-${id}.xcarchive`);
      const exportPath = join(WORK, `${source.repo}-${id}-export`);
      const settings = [
        `DEVELOPMENT_TEAM=${config.teamId}`,
        'CODE_SIGN_STYLE=Automatic',
        `CURRENT_PROJECT_VERSION=${id}`,
        `OTHER_CODE_SIGN_FLAGS=--keychain=${KEYCHAIN}`,
        ...(project.buildSettings ? Object.entries(project.buildSettings).map(([k, v]) => `${k}=${v}`) : []),
      ];
      let code = await runLogged('xcodebuild', [
        'archive', projectFlag, projectPath, '-scheme', schemeName, '-configuration', configuration,
        '-destination', 'generic/platform=iOS', '-archivePath', archivePath,
        '-derivedDataPath', join(DERIVED, source.repo), ...auth, ...settings,
      ], log, { cwd: source.dir });
      if (code !== 0) return fail('xcodebuild archive failed');

      const options = join(WORK, `${source.repo}-${id}-ExportOptions.plist`);
      writeFileSync(options, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>release-testing</string>
  <key>teamID</key><string>${config.teamId}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>thinning</key><string>&lt;none&gt;</string>
  <key>compileBitcode</key><false/>
</dict></plist>
`);
      code = await runLogged('xcodebuild', [
        '-exportArchive', '-archivePath', archivePath, '-exportPath', exportPath, '-exportOptionsPlist', options, ...auth,
      ], log);
      if (code !== 0) return fail('xcodebuild -exportArchive failed');

      const ipa = readdirSync(exportPath).find((f) => f.endsWith('.ipa'));
      if (!ipa) return fail('export made no .ipa');
      const archiveInfo = join(archivePath, 'Info.plist');
      const appPath = join(archivePath, 'Products', plistValue(archiveInfo, 'ApplicationProperties:ApplicationPath'));
      const appInfo = join(appPath, 'Info.plist');
      Object.assign(record, {
        bundleId: plistValue(archiveInfo, 'ApplicationProperties:CFBundleIdentifier'),
        version: plistValue(archiveInfo, 'ApplicationProperties:CFBundleShortVersionString'),
        build: plistValue(archiveInfo, 'ApplicationProperties:CFBundleVersion'),
        name: plistValue(appInfo, 'CFBundleDisplayName') || plistValue(appInfo, 'CFBundleName') || source.repo,
      });

      const ipaName = `${record.name.replace(/[^A-Za-z0-9._-]+/g, '-')}.ipa`;
      copyFileSync(join(exportPath, ipa), join(outDir, ipaName));
      record.ipaUrl = pageUrl + encodeURIComponent(ipaName);
      record.ipaBytes = statSync(join(outDir, ipaName)).size;
      writeFileSync(join(outDir, 'manifest.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>items</key><array><dict>
  <key>assets</key><array><dict>
    <key>kind</key><string>software-package</string>
    <key>url</key><string>${xmlEscape(record.ipaUrl)}</string>
  </dict></array>
  <key>metadata</key><dict>
    <key>bundle-identifier</key><string>${xmlEscape(record.bundleId)}</string>
    <key>bundle-version</key><string>${xmlEscape(record.version || '1.0')}</string>
    <key>kind</key><string>software</string>
    <key>title</key><string>${xmlEscape(record.name)}</string>
  </dict>
</dict></array></dict></plist>
`);
      record.installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(pageUrl + 'manifest.plist')}`;
      record.status = 'succeeded';
      record.finishedAt = new Date().toISOString();
      rmSync(archivePath, { recursive: true, force: true });
      rmSync(exportPath, { recursive: true, force: true });
      rmSync(options, { force: true });
      return finish();
    } catch (err) {
      log.write(`\n${err.stack || err}\n`);
      return fail(String(err.message || err));
    }
  }).then((record) => {
    if (flags.json) { console.log(JSON.stringify(record, null, 2)); }
    else if (record.status === 'succeeded') {
      console.log(`✓ ${record.name} ${record.version} (${record.build}) — ${record.repo} @ ${record.ref} ${record.commit?.slice(0, 7)}${record.dirty ? ' (uncommitted changes)' : ''}`);
      console.log(`  install page: ${record.pageUrl}`);
      console.log(`  direct link:  ${record.installUrl}`);
    } else {
      console.log(`✗ ${record.repo} build failed: ${record.error}`);
      if (record.errors?.length) console.log('  ' + record.errors.join('\n  '));
      console.log(`  log: ${record.logUrl}`);
    }
    process.exitCode = record.status === 'succeeded' ? 0 : 1;
  });
}

// ---------- list, index, doctor ----------

function list(args) {
  const { flags } = parseArgs(args);
  let history = loadHistory();
  if (flags.repo) history = history.filter((b) => b.repo === flags.repo);
  history = history.slice(0, Number(flags.limit) || 10);
  if (flags.json) return console.log(JSON.stringify(history, null, 2));
  for (const b of history) {
    const mark = b.status === 'succeeded' ? '✓' : b.status === 'failed' ? '✗' : '…';
    console.log(`${mark} ${b.id}  ${b.repo.padEnd(14)} ${(b.version ? `${b.version} ` : '').padEnd(6)} ${b.ref} ${b.commit?.slice(0, 7) || ''}  ${b.subject || ''}`);
    console.log(`    ${b.status === 'succeeded' ? b.pageUrl : b.logUrl}`);
  }
}

function index() {
  const history = loadHistory();
  writeFileSync(join(WWW, 'index.html'), renderIndex(history));
  for (const b of history) {
    const dir = join(WWW, b.repo, b.id);
    if (existsSync(dir)) writeFileSync(join(dir, 'index.html'), renderBuild(b));
  }
  console.log(`rebuilt ${history.length} build page(s)`);
}

async function doctor() {
  const ok = (m) => console.log(`✓ ${m}`);
  const bad = (m) => { console.log(`✗ ${m}`); process.exitCode = 1; };
  const config = loadConfig();
  ok(`config: team ${config.teamId}, key ${config.keyId}`);
  existsSync(config.keyPath) ? ok('API key file present') : bad(`API key missing at ${config.keyPath}`);
  const xcode = tryRun('xcodebuild', ['-version']);
  xcode ? ok(xcode.split('\n').join(', ')) : bad('xcodebuild not available');
  tryRun('xcodegen', ['--version']) ? ok('xcodegen installed') : bad('xcodegen missing (brew install xcodegen)');
  if (!existsSync(KEYCHAIN)) bad('signing keychain missing; run `ios-ship setup`');
  else {
    try { unlockKeychain(); ok('signing keychain unlocks'); } catch { bad('signing keychain does not unlock'); }
    const ids = identities();
    for (const prefix of ['Apple Development:', 'Apple Distribution:']) {
      const id = ids.find((n) => n.startsWith(prefix));
      id ? ok(`identity: ${id}`) : bad(`no ${prefix.slice(0, -1)} identity; run \`ios-ship setup\``);
    }
  }
  try {
    const devs = await client(config).listDevices();
    ok(`App Store Connect reachable; ${devs.filter((d) => d.attributes.status === 'ENABLED').length} device(s) registered`);
  } catch (e) { bad(e.message); }
  try {
    const res = await fetch(config.baseUrl + '/', { method: 'HEAD' });
    res.ok ? ok(`${config.baseUrl} serves the builds`) : bad(`${config.baseUrl} answered ${res.status}`);
  } catch (e) { bad(`${config.baseUrl} unreachable: ${e.message}`); }
}

// ---------- main ----------

const [command, ...rest] = process.argv.slice(2);
const commands = { build, list, devices, setup, doctor, index };
if (!command || command === '-h' || command === '--help' || !commands[command]) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(command && !commands[command] && command !== '-h' && command !== '--help' ? 1 : 0);
}
await commands[command](rest);
