---
name: archive-webpage
description: Archive a webpage as a self-contained, de-junked offline folder using the amber tool — locally into ~/Documents/Archives, or onto voyager (served at archive.chsmc.tools) via amber-voyager. Use when the user asks to save, archive, snapshot, or make an offline copy of a webpage or URL, including past versions from the Wayback Machine.
allowed-tools: Bash, Read
---

# Archive a webpage

Save a URL as a permanent, self-contained offline folder — an `index.html` plus
local assets, with junk (ads, cookie banners, trackers) removed and embedded
media downloaded as real files. Driven by **amber** (`~/Repositories/amber`,
npm `in-amber`), which uses Claude to decide what's junk vs. main content.

## Where to archive

Two libraries, chosen by what the user says:

- **Local (default)** — `~/Documents/Archives` on this MacBook. Browsable index
  at `~/Documents/Archives/index.html`.
- **Voyager** — when the user says "to voyager", "to the archive server", or
  mentions `archive.chsmc.tools`. Runs amber *on* voyager (its own clone,
  key, and Chromium) so the archive lands in `~/Archives` there, served at
  `https://archive.chsmc.tools/`. Never copy archives between the machines.

```bash
pnpm --dir ~/Repositories/amber archive "<url>"   # local
amber-voyager "<url>"                              # on voyager (same flags)
```

`amber-voyager` (`~/Repositories/scripts/bin/amber-voyager`, on PATH via
`~/.local/bin`) passes every argument through to amber's CLI over SSH and
rewrites output paths to `https://archive.chsmc.tools/…` URLs. It is personal
glue — amber itself knows nothing about voyager. Keep-js renders of asset-heavy
pages take a few minutes; run long jobs in the background.

## Prerequisites (local)

- `ANTHROPIC_API_KEY` in the environment (only in interactive zsh here — run
  through `zsh -ic '…'` if a plain shell lacks it). Without it amber falls back
  to heuristics.
- `yt-dlp` on PATH for embedded media; ffmpeg optional (muxing).
- Playwright Chromium for JS-rendered and keep-js pages
  (`pnpm --dir ~/Repositories/amber exec playwright install chromium`).
- `pnpm --dir ~/Repositories/amber archive doctor` reports all of this.
  Voyager's setup: `amber-voyager doctor`.

## Options

```bash
--at 2009-06 <url>      # the page as it WAS, via the Wayback Machine (year, month, day, or 14-digit stamp)
--at latest <url>       # a dead site's last capture
https://web.archive.org/web/20090615/http://example.com/   # a pasted Wayback URL works as the target
--keep-js               # preserve the page's own JavaScript (WebGL, scroll choreography, 2010 carousels);
                        # Claude's plan also switches this on by itself when the page needs it
--no-keep-js            # forbid that
--overwrite             # replace the latest (or, for a Wayback capture, that version) instead of keeping history
--no-llm / --static / --playwright / --plan plan.json   # heuristics only / force a backend / replay a plan
amber index             # rebuild the library index (also: amber-voyager index)
```

## What you get

```
<library>/<slug>/
├── index.html       # cleaned, faithful to the original — always the newest capture
├── assets/{images,static,media}/   # (keep-js archives are ONE self-contained index.html instead)
├── thumbnail.jpg    # for the library index
├── plan.json        # the cleanup judgement that was applied (auditable, replayable)
├── manifest.json    # source URL, capture time, tags, asset list, errors, what was removed
└── versions/<YYYYMMDDTHHMMSSZ>/   # older snapshots, each a full archive
```

The slug is the host (leading `www.` stripped) + path. Re-archiving keeps
history: the newest capture stays at the root and the previous one rotates into
`versions/`; an identical re-capture is skipped. Wayback captures are dated by
their snapshot, so a capture older than the current latest is filed straight
into `versions/` (the run says "filed as a version").

## Reporting back

Surface the useful bits from the run: assets localised, `assetErrors`, junk
removed, media downloaded, whether keep-js kicked in, and — for Wayback — which
capture was actually served. Then give the path (local) or the
`https://archive.chsmc.tools/<slug>/` URL (voyager).

## Notes

- The plan is advisory and on disk: edit `plan.json` and re-run with
  `--plan plan.json` to adjust what's removed.
- For an awkward page, `pnpm --dir ~/Repositories/amber agent "<url>"` lets
  Claude inspect the DOM interactively (local only; no keep-js).
- Details: the amber repo's `README.md` and `CLAUDE.md`.
