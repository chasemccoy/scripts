#!/usr/bin/env node
/**
 * arc-synced-tabs.js
 *
 * Reads Arc's *currently synced* open tabs directly from Arc's cloud sync
 * service (Cloud Firestore), the same source the Arc iOS app reads. This works
 * from anywhere at any time — even when Arc is closed on this Mac — because it
 * talks to the server, not the local StorableSidebar.json mirror.
 *
 * How it works (reverse-engineered):
 *   1. Arc authenticates with Firebase Auth (project "bcny-arc-server").
 *      The refresh token is persisted in your login Keychain by the Firebase
 *      SDK. We read it *locally at runtime* via `security` — it never leaves
 *      this machine.
 *   2. We exchange the refresh token for a short-lived Firebase ID token at
 *      https://securetoken.googleapis.com/v1/token
 *   3. We query Cloud Firestore over REST:
 *        projects/bcny-arc-server/databases/(default)/documents/
 *          sync/sidebar/{uid}/item     -> every tab / folder / container
 *          sync/sidebar/{uid}/space    -> spaces (+ pinned/unpinned containers)
 *   4. We decode Firestore's typed values, rebuild the tab tree, and print the
 *      open (unpinned) tabs.
 *
 * Usage:
 *   node arc-synced-tabs.js                 # open (unpinned) tabs, grouped by space
 *   node arc-synced-tabs.js --json          # machine-readable JSON
 *   node arc-synced-tabs.js --all           # include pinned + favorites
 *   node arc-synced-tabs.js --pinned        # only pinned/favorite tabs
 *   node arc-synced-tabs.js --space "www26" # filter to one space
 *   node arc-synced-tabs.js --debug         # step-by-step diagnostics (no secrets)
 *
 * Credential sources (first match wins):
 *   - env ARC_FIREBASE_REFRESH_TOKEN
 *   - login Keychain (auto-discovered Firebase Auth item; may show a one-time
 *     macOS "allow" prompt — click Allow / Always Allow)
 *   - --keychain-service "<service>" to force a specific Keychain item
 */

'use strict';

const https = require('https');
const { execFileSync } = require('child_process');
const readline = require('readline');
const { Writable } = require('stream');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---- Arc's Firebase config (from Arc.app/Contents/Resources/GoogleService-Info.plist) ----
const PROJECT_ID = 'bcny-arc-server';
const API_KEY = 'AIzaSyDsPi_DksHWxdaO8VQhKj5yUw0AOrj8RN0';
const FIREBASE_APP_ID = '1:80528684017:ios:c9834dbdb74b08ae7d0a50';

// Our own login-keychain item, created by `--login`, holding the refresh token we mint.
const STORE_SERVICE = 'arc-synced-tabs';
const DEFAULT_EMAIL = 'hi@chasem.co';                       // the address Arc is signed in with
const EXPECTED_UID = 'bpdUCchRVebXjXr6hoXoVkGRxkJ2';        // Arc's stored Firebase uid (sanity check)

// ---- args ----
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const DEBUG = has('--debug');
const AS_JSON = has('--json');
const WANT = has('--all') ? 'all' : has('--pinned') ? 'pinned' : 'open';
const SPACE_FILTER = val('--space');
const FORCE_SERVICE = val('--keychain-service');

const dbg = (...a) => { if (DEBUG) console.error('[debug]', ...a); };
const die = (msg) => { console.error('Error: ' + msg); process.exit(1); };

// -------------------------------------------------------------------------------------
// 1. Obtain the Firebase refresh token (locally; never printed)
// -------------------------------------------------------------------------------------
function sec(args) {
  return execFileSync('/usr/bin/security', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Parse `security dump-keychain` attribute output for candidate Firebase-Auth services. */
function discoverKeychainServices() {
  let dump = '';
  try { dump = sec(['dump-keychain']); }
  catch (e) { dbg('dump-keychain failed:', e.message); return []; }
  const svcs = new Set();
  const re = /"svce"<blob>="([^"]+)"/g;
  let m;
  while ((m = re.exec(dump))) {
    const s = m[1];
    if (/firebase_auth/i.test(s)) svcs.add(s);
  }
  // Prefer the item belonging to Arc's Firebase app (its GCM sender id shows up
  // in the service string), then any firebase_auth item.
  return [...svcs].sort((a, b) => {
    const aArc = a.includes('80528684017') ? 0 : 1;
    const bArc = b.includes('80528684017') ? 0 : 1;
    return aArc - bArc;
  });
}

/** Read a generic-password blob; returns a Buffer (handles hex-encoded binary). */
function readKeychainBlob(service) {
  // -w prints the password; for binary data `security` emits lowercase hex.
  const out = sec(['find-generic-password', '-s', service, '-w']).trim();
  if (/^[0-9a-f]+$/i.test(out) && out.length % 2 === 0) {
    return Buffer.from(out, 'hex');
  }
  return Buffer.from(out, 'utf8');
}

/** Extract a Firebase refresh token from a Keychain blob (JSON or NSKeyedArchiver plist). */
function extractRefreshToken(buf) {
  const asText = buf.toString('utf8');

  // (a) plain JSON blob
  try {
    const j = JSON.parse(asText);
    const t = deepFindRefreshToken(j);
    if (t) return t;
  } catch (_) { /* not json */ }

  // (b) binary/xml plist (NSKeyedArchiver) -> convert with plutil, scan $objects
  if (buf.slice(0, 6).toString('utf8') === 'bplist' || asText.startsWith('<?xml')) {
    const tmp = path.join(os.tmpdir(), `arc-fb-${process.pid}.plist`);
    try {
      fs.writeFileSync(tmp, buf);
      const jsonStr = execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', tmp], { encoding: 'utf8' });
      const plist = JSON.parse(jsonStr);
      const objects = plist && plist['$objects'];
      if (Array.isArray(objects)) {
        const t = pickRefreshTokenFromStrings(objects.filter((o) => typeof o === 'string'));
        if (t) return t;
      }
      const t2 = deepFindRefreshToken(plist);
      if (t2) return t2;
    } catch (e) {
      dbg('plutil parse failed:', e.message);
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  // (c) last resort: regex a token-looking string out of the raw text
  const t = pickRefreshTokenFromStrings(asText.split(/[\x00-\x1f"']+/));
  return t || null;
}

function deepFindRefreshToken(obj) {
  let found = null;
  const visit = (o) => {
    if (found || o == null) return;
    if (typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        if (found) return;
        if (/refresh.?token/i.test(k) && typeof v === 'string' && v.length > 20) { found = v; return; }
        visit(v);
      }
    }
  };
  visit(obj);
  return found;
}

/** A Firebase refresh token is a long opaque string; not a JWT, URL, or class name. */
function pickRefreshTokenFromStrings(strings) {
  const candidates = strings.filter((s) =>
    typeof s === 'string' &&
    s.length >= 40 &&
    !s.startsWith('eyJ') &&               // not a JWT (access/ID token)
    !s.includes(' ') &&
    !s.includes('/') &&
    !s.includes('://') &&
    !/^[A-Z]/.test(s.split('.')[0]) &&    // not an ObjC class like NSKeyedArchiver
    /^[A-Za-z0-9_\-:.]+$/.test(s)
  );
  // Refresh tokens are typically the longest such blob.
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || null;
}

/** Read the refresh token we stored ourselves via `--login`. */
function readOwnStoredToken() {
  try {
    const out = execFileSync('/usr/bin/security',
      ['find-generic-password', '-s', STORE_SERVICE, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out) return out;
  } catch (_) { /* not present */ }
  return null;
}

function getRefreshToken() {
  if (process.env.ARC_FIREBASE_REFRESH_TOKEN) {
    dbg('using refresh token from env');
    return process.env.ARC_FIREBASE_REFRESH_TOKEN.trim();
  }
  const stored = readOwnStoredToken();
  if (stored) {
    dbg(`using stored refresh token from keychain service "${STORE_SERVICE}" (len ${stored.length})`);
    return stored;
  }
  // Fallback: try to read Arc's own Firebase item — only works if it lives in the
  // file-based keychain (it usually doesn't; Arc uses the data-protection keychain).
  const services = FORCE_SERVICE ? [FORCE_SERVICE] : discoverKeychainServices();
  dbg('candidate keychain services:', services.length ? services : '(none found)');
  if (!services.length) {
    die('No stored credential found.\n' +
        '  Run the one-time sign-in to mint your own token:\n' +
        '    node ' + path.basename(__filename) + ' --login\n' +
        '  (or set ARC_FIREBASE_REFRESH_TOKEN, or pass --keychain-service "<service>").');
  }
  for (const svc of services) {
    try {
      const blob = readKeychainBlob(svc);
      const tok = extractRefreshToken(blob);
      if (tok) { dbg(`refresh token recovered from service "${svc}" (len ${tok.length})`); return tok; }
      dbg(`no token in service "${svc}"`);
    } catch (e) {
      dbg(`read failed for "${svc}":`, e.message);
    }
  }
  die('Found Firebase Keychain item(s) but could not extract a refresh token. Re-run with --debug.');
}

// -------------------------------------------------------------------------------------
// 2/3. HTTP helpers, token exchange, Firestore query
// -------------------------------------------------------------------------------------
function requestOnce(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers, timeout: 20000 },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error('request timed out'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Retry transient network failures (timeouts, resets, happy-eyeballs AggregateErrors).
async function request(method, url, opts = {}) {
  const retryable = new Set(['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'ENOTFOUND']);
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await requestOnce(method, url, opts);
    } catch (e) {
      lastErr = e;
      const code = e.code || (e.errors && e.errors[0] && e.errors[0].code);
      dbg(`${method} ${url.split('?')[0]} attempt ${attempt}/4 failed: ${code || e.message}`);
      const transient = retryable.has(code) || e instanceof AggregateError || /timed out|socket hang up/i.test(e.message);
      if (!transient || attempt === 4) break;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  throw lastErr;
}

async function exchangeRefreshToken(refreshToken) {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
  const { status, body: resp } = await request(
    'POST',
    `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }, body }
  );
  let j;
  try { j = JSON.parse(resp); } catch (_) { die('Token endpoint returned non-JSON: ' + resp.slice(0, 200)); }
  if (status !== 200) {
    die('Token refresh failed (' + status + '): ' + (j.error?.message || resp.slice(0, 200)) +
        '\n  The saved credential may be expired — open Arc and confirm sync is on, then retry.');
  }
  dbg('ID token acquired; uid =', j.user_id, '; expires in', j.expires_in + 's');
  return { idToken: j.access_token, uid: j.user_id };
}

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const relPath = (name) => name.split('/documents/')[1]; // resource name -> path under documents/

// List all documents in a collection (odd number of path segments). {status, docs}
async function fsList(idToken, collectionPath) {
  const docs = [];
  let pageToken = '', status = 0;
  do {
    const url = `${FS_BASE}/${collectionPath}?pageSize=300` + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const res = await request('GET', url, { headers: { Authorization: 'Bearer ' + idToken } });
    status = res.status;
    if (status !== 200) return { status, docs };
    const j = JSON.parse(res.body);
    (j.documents || []).forEach((d) => docs.push(d));
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return { status, docs };
}

// List child collection ids of a document (empty docPath = root). {status, ids}
async function fsCollectionIds(idToken, docPath) {
  const url = `${FS_BASE}${docPath ? '/' + docPath : ''}:listCollectionIds`;
  const res = await request('POST', url, {
    headers: { Authorization: 'Bearer ' + idToken, 'Content-Type': 'application/json', 'Content-Length': 2 },
    body: '{}',
  });
  if (res.status !== 200) return { status: res.status, ids: [] };
  const j = JSON.parse(res.body);
  return { status: res.status, ids: j.collectionIds || [] };
}

const looksLikeTab = (doc) => {
  const s = JSON.stringify(doc.fields || {});
  return s.includes('savedURL') || s.includes('"tab"');
};

// Walk sync/sidebar to locate the document that parents the item/space subcollections.
async function discoverSidebarDoc(idToken, uid) {
  const { ids: cols } = await fsCollectionIds(idToken, 'sync/sidebar'); // e.g. [uid]
  for (const col of cols) {
    const { docs } = await fsList(idToken, `sync/sidebar/${col}`);
    for (const doc of docs) {
      const dp = relPath(doc.name);
      const { ids: subs } = await fsCollectionIds(idToken, dp);
      if (subs.includes('item') || subs.includes('space')) {
        dbg(`discovered sidebar doc: ${dp} (subcollections: ${subs.join(', ')})`);
        return dp;
      }
    }
  }
  return null;
}

// Return all docs of a sidebar subcollection, trying known shapes then discovery.
async function getSidebarCollection(idToken, uid, name, discoveredParent) {
  const parents = [
    discoveredParent,
    `sync/sidebar/${uid}/${uid}`,   // observed shape: sidebar doc is /{uid}/{uid}
  ].filter(Boolean);
  for (const parent of parents) {
    if (parent.split('/').length % 2 !== 0) continue; // parent must be a document (even segments)
    const cp = `${parent}/${name}`;
    const { status, docs } = await fsList(idToken, cp);
    dbg(`list ${cp} -> HTTP ${status}, ${docs.length} docs`);
    if (status === 200) return { docs, parent };
  }
  return { docs: [], parent: null };
}

// ---- Firestore typed-value decoding ----
function decodeValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('referenceValue' in v) return v.referenceValue;
  if ('bytesValue' in v) return v.bytesValue; // Firestore returns base64
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  return null;
}
function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
function docId(doc) { return doc.name.split('/').pop(); }
function decodeDoc(doc) {
  let rec = decodeFields(doc.fields || {});
  if (rec.value && typeof rec.value === 'object' && rec.value.data) rec = rec.value; // unwrap LWW wrapper if present
  if (!rec.id) rec.id = docId(doc);
  return rec;
}

// Apple Core Foundation epoch (2001-01-01) seconds -> ISO
function cfToISO(t) {
  if (typeof t !== 'number') return null;
  return new Date((t + 978307200) * 1000).toISOString();
}

// -------------------------------------------------------------------------------------
// 4. Rebuild the tab tree and select tabs
// -------------------------------------------------------------------------------------
function build(items, spaces) {
  const byId = new Map();
  items.forEach((it) => byId.set(it.id, it));

  // pinned/unpinned container map from each space's containerIDs: ["unpinned",uuid,"pinned",uuid]
  const pinnedMap = new Map();
  const spaceMeta = new Map();
  spaces.forEach((s) => {
    spaceMeta.set(s.id, s.title || s.id);
    const ids = s.containerIDs || s.newContainerIDs || [];
    let pinned = false;
    for (const cid of ids) {
      if (cid === 'pinned') pinned = true;
      else if (cid === 'unpinned') pinned = false;
      else pinnedMap.set(cid, pinned);
    }
  });

  const resolve = (tab) => {
    // walk up parentID chain to find pinned status + owning space
    let cur = tab.parentID, pinned = false, spaceId = null, guard = 0;
    const seen = new Set();
    while (cur && !seen.has(cur) && guard++ < 100) {
      seen.add(cur);
      if (pinnedMap.has(cur)) pinned = pinnedMap.get(cur);
      if (spaceMeta.has(cur)) { spaceId = cur; break; }
      const parent = byId.get(cur);
      // a container's data.itemContainer.containerType.spaceItems._0 points to its space
      const sp = parent?.data?.itemContainer?.containerType?.spaceItems?._0;
      if (sp && spaceMeta.has(sp)) { spaceId = sp; }
      cur = parent?.parentID;
    }
    return { pinned, spaceId };
  };

  const tabs = [];
  for (const it of items) {
    const tab = it.data?.tab;
    if (!tab) continue;
    const { pinned, spaceId } = resolve(it);
    tabs.push({
      id: it.id,
      title: tab.savedTitle || it.title || null,
      url: tab.savedURL || null,
      pinned,
      space: spaceId ? spaceMeta.get(spaceId) : null,
      lastActiveAt: cfToISO(tab.timeLastActiveAt),
      createdAt: cfToISO(it.createdAt),
    });
  }
  return tabs;
}

// ---- End-to-end decryption ------------------------------------------------------------
// Each doc: a content key sealed with NaCl box (X25519) to the user's key, wrapping the
// item JSON with NaCl secretbox. Master key lives in StorableFirebaseEncryptionKey.json.
let _nacl;
function loadNacl() {
  if (_nacl !== undefined) return _nacl;
  try { _nacl = require('tweetnacl'); }
  catch (_) {
    _nacl = null;
    die('Missing dependency "tweetnacl". Install it once:\n' +
        `    ( cd "${__dirname}" && npm install tweetnacl )\n` +
        '  then re-run.');
  }
  return _nacl;
}

function loadMasterKeys() {
  const keyPath = path.join(os.homedir(), 'Library/Application Support/Arc/StorableFirebaseEncryptionKey.json');
  let kf;
  try { kf = JSON.parse(fs.readFileSync(keyPath, 'utf8')); }
  catch (e) { die(`Could not read encryption key (${keyPath}): ${e.message}\n  Open Arc and confirm sync is enabled on this Mac.`); }
  const keys = Object.values(kf.encryptionKeysByID || {}).map((a) => Uint8Array.from(a));
  if (Array.isArray(kf.hashedPassword)) keys.push(Uint8Array.from(kf.hashedPassword));
  const seen = new Set(), out = [];
  for (const k of keys) { const h = Buffer.from(k).toString('hex'); if (k.length === 32 && !seen.has(h)) { seen.add(h); out.push(k); } }
  if (!out.length) die('No 32-byte master key found in the encryption key file.');
  dbg(`loaded ${out.length} master key(s)`);
  return out;
}

const b64 = (s) => Uint8Array.from(Buffer.from(String(s || ''), 'base64'));

let _sodium;
async function getSodium() {
  if (_sodium) return _sodium;
  try { _sodium = require('libsodium-wrappers-sumo'); }
  catch (_) { die(`Missing dependency "libsodium-wrappers-sumo". Install once:\n    ( cd "${__dirname}" && npm install )`); }
  await _sodium.ready;
  return _sodium;
}

// Decrypt one item/space record -> plain object, or null. Scheme (verified):
//   encryptedKey = nonce(24) ‖ NaCl secretbox(item's X25519 secret key) under the master key
//   publickey    = X25519 public half of that secret
//   data         = NaCl sealed box (crypto_box_seal) to publickey
function decryptRecord(rec, masterKeys, sodium) {
  const n = loadNacl();
  const ek = b64(rec.encryptedKey), pub = b64(rec.publickey), data = b64(rec.data);
  if (ek.length < 25 || pub.length !== 32 || data.length < 49) return null;
  for (const master of masterKeys) {
    const secret = n.secretbox.open(ek.slice(24), ek.slice(0, 24), master);
    if (!secret) continue; // this master key doesn't wrap the item key
    try {
      const pt = sodium.crypto_box_seal_open(data, pub, secret);
      return JSON.parse(Buffer.from(pt).toString('utf8'));
    } catch (_) { return null; } // secret recovered but data unreadable/unparseable
  }
  return null;
}

// -------------------------------------------------------------------------------------
// One-time sign-in: mint our own durable refresh token (Arc's own token is locked in the
// data-protection keychain and can't be read by a script). Password goes ONLY to Google's
// official Identity Toolkit endpoint — never printed, logged, or stored.
// -------------------------------------------------------------------------------------
function askHidden(query) {
  return new Promise((resolve) => {
    let muted = false;
    const out = new Writable({ write(c, e, cb) { if (!muted) process.stdout.write(c, e); cb(); } });
    const rl = readline.createInterface({ input: process.stdin, output: out, terminal: true });
    rl.question(query, (ans) => { rl.close(); process.stdout.write('\n'); resolve(ans); });
    muted = true; // mute keystroke echo after the prompt is drawn
  });
}

async function fetchSignInMethods(email) {
  const body = JSON.stringify({ identifier: email, continueUri: 'http://localhost' });
  const { status, body: resp } = await request(
    'POST', `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${API_KEY}`,
    { headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body }
  );
  let j = {}; try { j = JSON.parse(resp); } catch (_) {}
  if (status !== 200) return { error: j.error?.message || resp.slice(0, 200) };
  return { registered: !!j.registered, methods: j.signinMethods || j.allProviders || [] };
}

async function signInWithPassword(email, password) {
  const body = JSON.stringify({ email, password, returnSecureToken: true });
  const { status, body: resp } = await request(
    'POST', `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, body }
  );
  let j = {}; try { j = JSON.parse(resp); } catch (_) {}
  return { status, j };
}

function storeToken(uid, token) {
  execFileSync('/usr/bin/security',
    ['add-generic-password', '-U', '-s', STORE_SERVICE, '-a', uid, '-D', 'Arc sync refresh token', '-w', token],
    { stdio: ['ignore', 'ignore', 'pipe'] });
}

async function loginFlow() {
  const email = (val('--email') || DEFAULT_EMAIL).trim();
  console.error(`Signing in to Arc's Firebase (project ${PROJECT_ID}) as ${email} …`);
  const info = await fetchSignInMethods(email);
  if (info.error) die('Could not check sign-in methods: ' + info.error);
  dbg('sign-in methods:', info.methods, '| registered:', info.registered);
  if (!info.registered) {
    die(`No Firebase account for ${email}. Pass --email "<the address you use in Arc>".`);
  }
  const methods = info.methods.map((m) => String(m).toLowerCase());
  if (!methods.includes('password')) {
    die(`This account signs in with: ${info.methods.join(', ') || 'a federated provider'} — not email/password.\n` +
        '  Independent password sign-in cannot work. Options:\n' +
        '   • capture a refresh token from Arc\'s traffic and pass it via ARC_FIREBASE_REFRESH_TOKEN (see skill.md)\n' +
        '   • or tell me the provider and I\'ll wire up the matching OAuth flow.');
  }
  const password = await askHidden(`Password for ${email} (sent only to Google — never stored or logged): `);
  if (!password) die('No password entered.');
  const { status, j } = await signInWithPassword(email, password);
  if (status !== 200) {
    if (j.error?.message === 'MFA_REQUIRED' || j.mfaPendingCredential) {
      die('This account has 2-step verification enabled; scripted sign-in needs the extra code step. Tell me and I\'ll add it.');
    }
    die('Sign-in failed: ' + (j.error?.message || ('HTTP ' + status)) +
        (j.error?.message === 'INVALID_LOGIN_CREDENTIALS' ? '  (wrong email or password)' : ''));
  }
  const uid = j.localId, refreshToken = j.refreshToken;
  if (!refreshToken) die('Sign-in succeeded but no refresh token was returned.');
  if (uid !== EXPECTED_UID) {
    console.error(`Note: signed-in uid ${uid} differs from Arc's stored uid ${EXPECTED_UID}; using ${uid}.`);
  }
  storeToken(uid, refreshToken);
  console.error(`✓ Stored refresh token in your login keychain (service "${STORE_SERVICE}"). ` +
                'Future runs need no password.\n');
}

// One-line summary of a Firestore typed value (structure, not full contents).
function summarizeValue(v) {
  if (v == null) return 'null';
  if ('stringValue' in v) return `str("${String(v.stringValue).slice(0, 48)}")`;
  if ('integerValue' in v) return 'int';
  if ('doubleValue' in v) return 'num';
  if ('booleanValue' in v) return 'bool';
  if ('timestampValue' in v) return 'ts';
  if ('nullValue' in v) return 'null';
  if ('referenceValue' in v) return 'ref';
  if ('bytesValue' in v) return 'bytes';
  if ('mapValue' in v) {
    const f = v.mapValue.fields || {};
    const ks = Object.keys(f);
    return `map{${ks.length}}[${ks.slice(0, 10).join(',')}${ks.length > 10 ? ',…' : ''}]`;
  }
  if ('arrayValue' in v) {
    const a = v.arrayValue.values || [];
    return `array(${a.length})${a[0] ? ' of ' + summarizeValue(a[0]) : ''}`;
  }
  return '?';
}

// Enumeration (listCollectionIds) is blocked by security rules, so GET known document
// paths directly and dump their field structure to find where the tabs actually live.
async function exploreFlow(idToken, uid) {
  const get = (p) => request('GET', `${FS_BASE}/${p}`, { headers: { Authorization: 'Bearer ' + idToken } });
  const candidates = [
    `sync/sidebar/${uid}/${uid}`,                    // most likely: monolithic per-user sidebar doc
    `sync/sidebar/${uid}`,                            // (collection — GET should 404, informative)
    `sync/sidebar`,
    `users/${uid}`,                                  // sanity: confirms reads work at all
    `sync/sidebar/${uid}/${uid}/space/orderedSpaces`,
    `sync/sidebar/${uid}/${uid}/item`,
  ];
  for (const p of candidates) {
    const r = await get(p);
    console.log(`\n== GET ${p} -> HTTP ${r.status} ==`);
    if (r.status !== 200) { console.log('   ' + r.body.slice(0, 160).replace(/\s+/g, ' ')); continue; }
    let doc; try { doc = JSON.parse(r.body); } catch { console.log('   (unparseable)'); continue; }
    const f = doc.fields || {};
    const keys = Object.keys(f);
    console.log(`   fields (${keys.length}):`);
    for (const k of keys) console.log(`     - ${k}: ${summarizeValue(f[k])}`);
  }
  const l = await fsList(idToken, `sync/sidebar/${uid}`);
  console.log(`\n== LIST collection sync/sidebar/${uid} -> HTTP ${l.status}, ${l.docs.length} docs ==`);
  l.docs.slice(0, 25).forEach((d) =>
    console.log('   • ' + relPath(d.name).split('/').pop() + ' | fields: ' + Object.keys(d.fields || {}).slice(0, 10).join(',')));
  console.log('\nDone. Paste this back — I\'m looking for the doc whose fields hold the tabs.');
}

// Dump one encrypted item doc's field shapes + local key info, to reverse the crypto.
function analyzeBlob(name, v) {
  if (typeof v !== 'string') { console.log(`  ${name}: ${JSON.stringify(v)}`); return; }
  let buf = null;
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(v) && v.length % 4 === 0) { try { buf = Buffer.from(v, 'base64'); } catch (_) {} }
  if (buf && buf.length) {
    console.log(`  ${name}: base64, ${buf.length} bytes | head ${buf.slice(0, 12).toString('hex')} | tail ${buf.slice(-16).toString('hex')}`);
  } else if (/^[0-9a-f]+$/i.test(v)) {
    console.log(`  ${name}: hex, ${v.length / 2} bytes = ${v.slice(0, 32)}${v.length > 32 ? '…' : ''}`);
  } else {
    console.log(`  ${name}: string(${v.length}) = ${v.slice(0, 64)}`);
  }
}

async function dumpItemFlow(idToken, uid) {
  const { docs } = await fsList(idToken, `sync/sidebar/${uid}`);
  const item = docs.find((d) => relPath(d.name).split('/').pop().startsWith('item|')) || docs[0];
  if (!item) die('No documents found to dump.');
  console.log('doc id:', relPath(item.name).split('/').pop(), '\nfield shapes:');
  const rec = decodeFields(item.fields || {});
  for (const [k, val] of Object.entries(rec)) analyzeBlob(k, val);

  const keyPath = path.join(os.homedir(), 'Library/Application Support/Arc/StorableFirebaseEncryptionKey.json');
  try {
    const kf = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const ids = Object.keys(kf.encryptionKeysByID || {});
    console.log('\nlocal key IDs:', ids);
    ids.forEach((id) => console.log(`  ${id}: ${(kf.encryptionKeysByID[id] || []).length}-byte key`));
    console.log('item.publickey === a local keyID?', ids.includes(rec.publickey), '| item.publickey =', String(rec.publickey).slice(0, 72));
    console.log('item.schemaVersion =', rec.schemaVersion, '| device =', rec.device);
  } catch (e) {
    console.log('\n(could not read local key file:', e.message + ')');
  }

  // Decrypt with the confirmed scheme (secretbox-unwrap the item's X25519 secret, then
  // crypto_box_seal_open on `data`).
  const sodiumX = await getSodium();
  const decoded = decryptRecord(rec, loadMasterKeys(), sodiumX);
  if (decoded) {
    const t = decoded && decoded.data && decoded.data.tab;
    console.log('\n✓ decrypted:', t ? `${t.savedTitle}  |  ${t.savedURL}` : `record keys: ${Object.keys(decoded).join(', ')}`);
  } else {
    console.log('\n✗ decryption failed for this doc.');
  }
  return;

  // ---- legacy crypto-discovery diagnostics below (unreachable; kept for reference) ----
  // eslint-disable-next-line no-unreachable
  console.log('\ndecryption test:');
  const n = loadNacl();
  const crypto = require('crypto');
  const masterKeys = loadMasterKeys();
  const ek = b64(rec.encryptedKey), data = b64(rec.data);
  const dataBuf = Buffer.from(data);

  let ck = null;
  for (const master of masterKeys) { ck = n.secretbox.open(ek.slice(24), ek.slice(0, 24), master); if (ck) break; }
  if (!ck) { console.log('  content-key unwrap failed unexpectedly.'); return; }
  console.log('  content key unwrapped: OK (32 bytes)');
  const key = Buffer.from(ck);

  const sodium = require('libsodium-wrappers-sumo');
  await sodium.ready;
  const u8 = (x) => Uint8Array.from(x);
  const ckU8 = u8(ck);
  const sha256 = (b) => Uint8Array.from(crypto.createHash('sha256').update(Buffer.from(b)).digest());

  // Key-relationship diagnostics: is the content key an X25519 secret whose public is `publickey`?
  const pubU8d = b64(rec.publickey), masterU8 = (loadMasterKeys())[0];
  const sm = (s, p) => { try { return sodium.crypto_scalarmult(u8(s), u8(p)); } catch (_) { return null; } };
  const smBase = (s) => { try { return sodium.crypto_scalarmult_base(u8(s)); } catch (_) { return null; } };
  const hx = (b) => b ? Buffer.from(b).toString('hex') : '(err)';
  console.log('  publickey            :', Buffer.from(pubU8d).toString('hex'));
  console.log('  X25519_base(contentKey):', hx(smBase(ckU8)));
  console.log('  X25519_base(masterKey) :', hx(smBase(masterU8)));

  // Candidate data keys: raw / hashed content key, plus ECDH(secret, publickey) variants.
  const bl = (b) => sodium.crypto_generichash(32, u8(b));
  const ecdhCkPub = sm(ckU8, pubU8d), ecdhMasterPub = sm(masterU8, pubU8d);
  const keyCandidates = [
    ['raw', ckU8],
    ['blake2b-32', bl(ckU8)],
    ['sha256', sha256(ckU8)],
    ...(ecdhCkPub ? [['ecdh(ck,pub)', ecdhCkPub], ['blake2b(ecdh(ck,pub))', bl(ecdhCkPub)], ['sha256(ecdh(ck,pub))', sha256(ecdhCkPub)]] : []),
    ...(ecdhMasterPub ? [['ecdh(master,pub)', ecdhMasterPub], ['blake2b(ecdh(master,pub))', bl(ecdhMasterPub)]] : []),
  ];
  // Candidate AAD (many AEAD schemes authenticate the record id / version).
  const rawId = relPath(item.name).split('/').pop();
  const uuid = rawId.includes('|') ? rawId.split('|')[1] : rawId;
  const aads = [
    ['none', null],
    ['rawId', u8(Buffer.from(rawId))],
    ['uuid', u8(Buffer.from(uuid))],
    ['uuid-lc', u8(Buffer.from(uuid.toLowerCase()))],
    ['schemaVer', u8(Buffer.from(String(rec.schemaVersion)))],
    ['publickey', b64(rec.publickey)],
    ['device', u8(Buffer.from(String(rec.device || '')))],
  ];

  const xdec = (key, nonce, ct, ad) => { try { return Buffer.from(sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, u8(ct), ad, u8(nonce), u8(key))); } catch (_) { return null; } };
  const cdec = (key, nonce, ct, ad) => { try { return Buffer.from(sodium.crypto_aead_chacha20poly1305_ietf_decrypt(null, u8(ct), ad, u8(nonce), u8(key))); } catch (_) { return null; } };
  const gdec = (key, iv, ct, tag, ad) => { try { const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv)); if (ad) d.setAAD(Buffer.from(ad)); d.setAuthTag(Buffer.from(tag)); return Buffer.concat([d.update(Buffer.from(ct)), d.final()]); } catch (_) { return null; } };

  const ciphers = [
    ['XChaCha20 n=data[:24]', (key, ad) => xdec(key, data.slice(0, 24), data.slice(24), ad)],
    ['XChaCha20 n=data[-24:]', (key, ad) => xdec(key, data.slice(-24), data.slice(0, -24), ad)],
    ['XChaCha20 n=ek[:24]', (key, ad) => xdec(key, ek.slice(0, 24), data, ad)],
    ['ChaCha20 n=data[:12]', (key, ad) => cdec(key, data.slice(0, 12), data.slice(12), ad)],
    ['AES-GCM iv=data[:12] tag@end', (key, ad) => gdec(key, data.slice(0, 12), data.slice(12, -16), data.slice(-16), ad)],
  ];

  // For an AEAD, a non-null result IS the answer (Poly1305/GCM only verify with exact
  // key+nonce+AAD). Report every authenticated decrypt, then try to make sense of the
  // plaintext (JSON directly, or gzip/deflate/brotli, or JSON embedded after padding).
  const zlib = require('zlib');
  const tryJson = (buf) => {
    const attempts = [
      () => buf.toString('utf8'),
      () => zlib.gunzipSync(buf).toString('utf8'),
      () => zlib.inflateSync(buf).toString('utf8'),
      () => zlib.inflateRawSync(buf).toString('utf8'),
      () => zlib.brotliDecompressSync(buf).toString('utf8'),
    ];
    for (const a of attempts) {
      let s = null; try { s = a(); } catch (_) { continue; }
      try { return JSON.parse(s); } catch (_) {}
      const i = s.indexOf('{'), j = s.lastIndexOf('}');
      if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)); } catch (_) {} }
    }
    return null;
  };

  let authOk = 0, solved = false;
  for (const [kn, kk] of keyCandidates) {
    for (const [cn, cfn] of ciphers) {
      for (const [an, ad] of aads) {
        let buf = null; try { buf = cfn(kk, ad); } catch (_) {}
        if (!buf) continue;
        authOk++;
        const gz = buf[0] === 0x1f && buf[1] === 0x8b ? ' [gzip]' : '';
        const utf = buf.slice(0, 40).toString('utf8').replace(/[^\x20-\x7e]/g, '.');
        console.log(`  ✓ AUTH OK — key=${kn}, cipher=${cn}, aad=${an} -> ${buf.length}B${gz} head="${utf}"`);
        const obj = tryJson(buf);
        if (obj) {
          const tab = obj?.data?.tab || obj?.value?.data?.tab;
          console.log('     >>> DECODED JSON keys:', Object.keys(obj).join(','), tab ? `\n     ${tab.savedTitle} | ${tab.savedURL}` : '');
          solved = true;
        }
      }
    }
  }
  if (!authOk) console.log('  (no authenticated AEAD decrypt — likely a raw stream cipher; sweeping…)');

  // ---- Raw stream-cipher sweep (no Poly1305 tag to verify) ----
  const S = sodium;
  const streamXor = (kind, key, nonce, body, ic) => {
    try {
      if (kind === 'xchacha20') return Buffer.from(ic ? S.crypto_stream_xchacha20_xor_ic(u8(body), u8(nonce), ic, u8(key)) : S.crypto_stream_xchacha20_xor(u8(body), u8(nonce), u8(key)));
      if (kind === 'chacha20ietf') return Buffer.from(ic ? S.crypto_stream_chacha20_ietf_xor_ic(u8(body), u8(nonce), ic, u8(key)) : S.crypto_stream_chacha20_ietf_xor(u8(body), u8(nonce), u8(key)));
      if (kind === 'chacha20') return Buffer.from(ic ? S.crypto_stream_chacha20_xor_ic(u8(body), u8(nonce), ic, u8(key)) : S.crypto_stream_chacha20_xor(u8(body), u8(nonce), u8(key)));
      if (kind === 'xsalsa20') return Buffer.from(S.crypto_stream_xsalsa20_xor(u8(body), u8(nonce), u8(key)));
      if (kind === 'salsa20') return Buffer.from(S.crypto_stream_salsa20_xor(u8(body), u8(nonce), u8(key)));
    } catch (_) {}
    return null;
  };
  const pubU8 = b64(rec.publickey);
  const framings = [
    ['n=data[:24]', data.slice(0, 24), data.slice(24)],
    ['n=data[:24],stripTag', data.slice(0, 24), data.slice(24, -16)],
    ['n=data[:12]', data.slice(0, 12), data.slice(12)],
    ['n=data[:8]', data.slice(0, 8), data.slice(8)],
    ['n=ek[:24],body=data', ek.slice(0, 24), data],
    ['n=ek[:24],body=data[24:]', ek.slice(0, 24), data.slice(24)],
    ['n=pub[:24],body=data', pubU8.slice(0, 24), data],
  ];
  const textRatio = (b) => { let p = 0, N = Math.min(b.length, 240); for (let i = 0; i < N; i++) { const c = b[i]; if (c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127)) p++; } return p / N; };
  for (const [kn, kk] of keyCandidates) {
    for (const kind of ['xchacha20', 'chacha20ietf', 'chacha20', 'xsalsa20', 'salsa20']) {
      const need = (kind === 'xchacha20' || kind === 'xsalsa20') ? 24 : kind === 'chacha20ietf' ? 12 : 8;
      for (const [fn, nonce, body] of framings) {
        if (nonce.length < need) continue;
        for (const ic of [0, 1]) {
          const pt = streamXor(kind, kk, nonce.slice(0, need), body, ic);
          if (!pt) continue;
          const obj = tryJson(pt);
          if (obj) {
            const tab = obj?.data?.tab || obj?.value?.data?.tab;
            console.log(`  ✓✓ STREAM WINNER — key=${kn}, ${kind}, ${fn}, ic=${ic}`);
            console.log('     JSON keys:', Object.keys(obj).join(','), tab ? `\n     ${tab.savedTitle} | ${tab.savedURL}` : '');
            solved = true;
          } else if (textRatio(pt) > 0.9) {
            console.log(`  ~ printable key=${kn} ${kind} ${fn} ic=${ic} head="${pt.slice(0, 56).toString('utf8').replace(/[^\x20-\x7e]/g, '.')}"`);
          }
        }
      }
    }
  }

  // ---- Known-plaintext: this item's plaintext is in the local sidebar ----
  try {
    const sb = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'Library/Application Support/Arc/StorableSidebar.json'), 'utf8'));
    const arr = sb.firebaseSyncState.syncData.items;
    let val = null;
    for (let i = 0; i < arr.length; i += 2) { if (arr[i] === uuid) { val = arr[i + 1].value; break; } }
    if (val) {
      const P = Buffer.from(JSON.stringify(val), 'utf8');
      console.log('\n  known-plaintext: local item found, JSON len', P.length);
      console.log('    plaintext head:', JSON.stringify(val).slice(0, 80));
      const body = Buffer.from(data.slice(24));
      const ks = Buffer.alloc(Math.min(P.length, body.length));
      for (let i = 0; i < ks.length; i++) ks[i] = body[i] ^ P[i];
      console.log('    observed keystream (data[24:] XOR plaintext) head:', ks.slice(0, 32).toString('hex'));
      for (const [kn, kk] of keyCandidates) {
        const z = new Uint8Array(48);
        const k0 = Buffer.from(S.crypto_stream_xchacha20_xor(z, data.slice(0, 24), u8(kk)));
        const k1 = Buffer.from(S.crypto_stream_xchacha20_xor_ic(z, data.slice(0, 24), 1, u8(kk)));
        console.log(`    xchacha20(${kn}) ic0:`, k0.slice(0, 32).toString('hex'));
        console.log(`    xchacha20(${kn}) ic1:`, k1.slice(0, 32).toString('hex'));
      }
    } else {
      console.log('\n  known-plaintext: item', uuid, 'not found in local StorableSidebar.json');
    }
  } catch (e) { console.log('\n  known-plaintext step error:', e.message); }

  if (!solved) console.log('\n  → still unsolved; the keystream lines above will tell us the cipher/key. Paste them.');
}

// -------------------------------------------------------------------------------------
async function main() {
  if (has('--login')) await loginFlow();
  const refreshToken = getRefreshToken();
  const { idToken, uid } = await exchangeRefreshToken(refreshToken);

  if (has('--explore')) { await exploreFlow(idToken, uid); return; }
  if (has('--dump-item')) { await dumpItemFlow(idToken, uid); return; }

  // The sidebar is a flat collection; each doc id is "<type>|<uuid>" (item|…, space|…),
  // and each doc is end-to-end encrypted.
  const masterKeys = loadMasterKeys();
  const sodium = await getSodium();
  const { status, docs } = await fsList(idToken, `sync/sidebar/${uid}`);
  if (status !== 200) die(`Firestore list failed (HTTP ${status}).`);
  dbg(`fetched ${docs.length} sidebar docs`);

  const items = [], spaces = [];
  let failed = 0;
  for (const doc of docs) {
    const rawId = relPath(doc.name).split('/').pop();
    const bar = rawId.indexOf('|');
    const type = bar >= 0 ? rawId.slice(0, bar) : rawId;
    const realId = bar >= 0 ? rawId.slice(bar + 1) : rawId;
    if (type !== 'item' && type !== 'space') continue;
    const plain = decryptRecord(decodeFields(doc.fields || {}), masterKeys, sodium);
    if (!plain) { failed++; continue; }
    let obj = (plain && plain.value && plain.value.data) ? plain.value : plain;
    if (obj && !obj.id) obj.id = realId;
    (type === 'item' ? items : spaces).push(obj);
  }
  dbg(`decrypted ${items.length} items, ${spaces.length} spaces (${failed} failed)`);
  if (!items.length) {
    die(`Fetched ${docs.length} docs but decrypted 0 — the crypto scheme may differ. ` +
        'Re-run with --debug and --dump-item and share the output.');
  }

  const spacesClean = spaces.filter((s) => s && s.id !== 'orderedSpaces');
  let tabs = build(items, spacesClean);
  if (WANT === 'open') tabs = tabs.filter((t) => !t.pinned);
  else if (WANT === 'pinned') tabs = tabs.filter((t) => t.pinned);
  if (SPACE_FILTER) tabs = tabs.filter((t) => (t.space || '').toLowerCase() === SPACE_FILTER.toLowerCase());

  tabs.sort((a, b) => (b.lastActiveAt || '').localeCompare(a.lastActiveAt || ''));

  if (AS_JSON) {
    console.log(JSON.stringify({ uid, fetchedAt: new Date().toISOString(), count: tabs.length, tabs }, null, 2));
    return;
  }

  const label = WANT === 'open' ? 'open (unpinned)' : WANT;
  console.log(`Arc synced ${label} tabs — ${tabs.length} (uid ${uid})\n`);
  const bySpace = new Map();
  for (const t of tabs) {
    const k = t.space || '(no space)';
    if (!bySpace.has(k)) bySpace.set(k, []);
    bySpace.get(k).push(t);
  }
  for (const [space, list] of bySpace) {
    console.log(`## ${space} (${list.length})`);
    for (const t of list) console.log(`  • ${t.title || '(untitled)'}\n    ${t.url || ''}`);
    console.log('');
  }
}

if (require.main === module) {
  main().catch((e) => die(e.stack || String(e)));
} else {
  module.exports = { decodeValue, decodeFields, decodeDoc, build, cfToISO };
}
