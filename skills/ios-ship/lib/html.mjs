// The pages builds.chsmc.tools serves: the history (index) and one page per build.
// Plain HTML written at build time; no scripts besides relative-time formatting.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const style = `
:root { --bg: #fbfaf8; --fg: #1c1b19; --muted: #77736c; --line: #e7e4de; --card: #fff; --accent: #2563eb; --ok: #15803d; --bad: #b91c1c; }
@media (prefers-color-scheme: dark) { :root { --bg: #141413; --fg: #ecebe8; --muted: #9a968e; --line: #2b2a27; --card: #1c1b1a; --accent: #60a5fa; --ok: #4ade80; --bad: #f87171; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.45 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
main { max-width: 640px; margin: 0 auto; padding: 32px 16px 64px; }
a { color: var(--accent); text-decoration: none; }
h1 { font-size: 28px; letter-spacing: -0.02em; margin: 0 0 4px; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 32px 0 8px; font-weight: 600; }
.sub { color: var(--muted); margin: 0 0 24px; }
.list { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.row { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.row .meta { flex: 1; min-width: 0; }
.row .title { font-weight: 600; }
.row .detail { color: var(--muted); font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.btn { display: inline-block; background: var(--accent); color: #fff; font-weight: 600; border-radius: 999px; padding: 6px 14px; font-size: 15px; white-space: nowrap; }
.btn.big { display: block; text-align: center; padding: 14px; font-size: 17px; border-radius: 14px; margin: 24px 0; }
.status-failed { color: var(--bad); font-weight: 600; font-size: 14px; }
.status-building { color: var(--muted); font-size: 14px; }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px; font-size: 15px; }
dt { color: var(--muted); }
dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
code { font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
pre { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px; overflow-x: auto; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--bad); }
.note { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; margin: 0 0 16px; }
`;

const timeScript = `<script>
for (const el of document.querySelectorAll('time[datetime]')) {
  const s = (Date.now() - Date.parse(el.dateTime)) / 1000;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  el.textContent = s < 60 ? 'just now' : s < 3600 ? rtf.format(-Math.round(s / 60), 'minute') : s < 86400 ? rtf.format(-Math.round(s / 3600), 'hour') : s < 604800 ? rtf.format(-Math.round(s / 86400), 'day') : new Date(el.dateTime).toLocaleDateString();
  el.title = new Date(el.dateTime).toLocaleString();
}
</script>`;

function page(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${style}</style></head>
<body><main>${body}</main>${timeScript}</body></html>
`;
}

const time = (iso) => `<time datetime="${esc(iso)}">${esc(new Date(iso).toLocaleString('en-US'))}</time>`;
const short = (sha) => (sha ? sha.slice(0, 7) : '');

function row(b, { showRepo = false } = {}) {
  const action =
    b.status === 'succeeded' ? `<a class="btn" href="${esc(b.installUrl)}">Install</a>`
    : b.status === 'failed' ? `<span class="status-failed">Failed</span>`
    : `<span class="status-building">Building…</span>`;
  const title = b.status === 'succeeded' ? `${esc(b.name)} ${esc(b.version)} <span style="color:var(--muted);font-weight:400">(${esc(b.build)})</span>` : esc(showRepo ? b.repo : b.ref);
  return `<div class="row"><div class="meta"><a href="${esc(`${b.repo}/${b.id}/`)}" style="color:inherit">
<div class="title">${title}</div>
<div class="detail">${esc(b.ref)} · ${esc(short(b.commit))}${b.dirty ? '+' : ''} · ${time(b.startedAt)}${b.note ? ` · ${esc(b.note)}` : b.subject ? ` · ${esc(b.subject)}` : ''}</div>
</a></div>${action}</div>`;
}

export function renderIndex(history) {
  const byRepo = new Map();
  for (const b of history) {
    if (!byRepo.has(b.repo)) byRepo.set(b.repo, []);
    byRepo.get(b.repo).push(b);
  }
  const sections = [...byRepo].map(([repo, builds]) =>
    `<h2>${esc(repo)}</h2><div class="list">${builds.slice(0, 25).map((b) => row(b)).join('')}</div>`).join('');
  return page('Builds', `<h1>Builds</h1><p class="sub">iOS builds from voyager. Open on your iPhone and tap Install; each build replaces the last one of the same app and keeps its data.</p>${sections || '<p class="sub">No builds yet.</p>'}`);
}

export function renderBuild(b) {
  const head = b.status === 'succeeded'
    ? `<h1>${esc(b.name)}</h1><p class="sub">${esc(b.version)} (${esc(b.build)}) · ${esc(b.bundleId)}</p>
${b.note ? `<div class="note">${esc(b.note)}</div>` : ''}
<a class="btn big" href="${esc(b.installUrl)}">Install on this iPhone</a>`
    : b.status === 'failed'
      ? `<h1>${esc(b.repo)}</h1><p class="sub status-failed">Build failed: ${esc(b.error)}</p>${b.errors?.length ? `<pre>${esc(b.errors.join('\n'))}</pre>` : ''}`
      : `<h1>${esc(b.repo)}</h1><p class="sub">Building… reload in a minute.</p>`;
  const details = [
    ['Repo', esc(b.repo)],
    ['Ref', esc(b.ref)],
    ['Commit', `<code>${esc(short(b.commit))}</code>${b.dirty ? ' + uncommitted changes' : ''}${b.subject ? ` ${esc(b.subject)}` : ''}`],
    b.scheme && ['Scheme', `${esc(b.scheme)} · ${esc(b.configuration)}`],
    ['Started', time(b.startedAt)],
    b.durationSec != null && ['Took', `${Math.floor(b.durationSec / 60)}m ${b.durationSec % 60}s`],
    b.ipaBytes && ['Size', `${(b.ipaBytes / 1e6).toFixed(1)} MB`],
    ['Log', `<a href="build.log">build.log</a>`],
  ].filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  return page(`${b.name || b.repo} ${b.version || ''} (${b.build || b.id})`,
    `<p style="margin:0 0 16px"><a href="../../">← All builds</a></p>${head}<dl>${details}</dl>`);
}
