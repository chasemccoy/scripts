---
name: design-lab
description: Explore a UI design by generating visual variants on a live scratch page, polishing them in Chrome, and converging on the user's in-browser pick. Use for "explore designs", "see a few options", "iterate on the look of X".
argument-hint: <what to design>
disable-model-invocation: true
---

# Design Lab

Brief: **$ARGUMENTS**

Two-phase evolution loop. **Explore** — render distinct variants on a scratch page inside the running app, regenerate around the user's in-browser pick. **Tune** — once a direction lands, collapse to one render and edit it in place. Runs interactively, or with `--auto` you play the picker too.

## Setup

- Invoke any frontend/design skills in scope (design quality, design-system rules, a11y).
- Confirm the dev server is up. Learn how this app does routes, theming, tokens, and design-system components — variants are built from the app's real primitives, on-brand from the first render. If the brief names an existing component, read it; read a few neighbours too so the new thing sits naturally beside them.
- Invoke the `claude-in-chrome` skill to load the browser tools.

## The lab page

One directory per exploration: `/design-lab/<brief-slug>-<hash>/`. Gitignore the `design-lab` path before writing anything; lab files are never staged.

Mount the route so it inherits the app's real shell (CSS, theme, fonts, providers).

Each round is its own sub-route `/design-lab/<slug>/<n>` (1, 2, 3…) with its variant files alongside; past rounds are never overwritten. A top-level `manifest.ts` tracks the trail: `{rounds: [{n, mode, seededFrom: {round, choice, action, note} | null, variants: [{label, file}]}]}` — `seededFrom` is the pick that spawned this round. `mode` is per-round: `'grid'` when the subject fits in a card, `'tabs'` when it needs full viewport, `'tune'` for a single full-width render. Regenerating = write a new `<n+1>/` folder and append to `rounds`. If the manifest already exists, read it and resume from `max(n) + 1`.

The harness shell at `/design-lab/<slug>` redirects bare hits to the latest round and renders two navs: **prev/next** in numeric order, and a **lineage trail** of the `seededFrom` tree.

Each variant has **Choose** / **Variations** / **Tune** controls (the latter two reveal a note field). Controls are always live — clicking writes `localStorage['designLab:<slug>:pick']` (JSON `{round, choice, action, note}`); a second click just overwrites it. The harness shows a *working* indicator while `…:pick` is set and polls it on a short interval so same-tab writes land.

## Generating a round

Count is your call — however many genuinely different directions remain. Breadth, not increments: each variant is a distinct bet on composition, hierarchy, density, metaphor, or motion. Round 1 spans the space. Later rounds seed from the pick and include the seed itself unchanged as one variant (the control). When notes shift from direction to adjustment, drop the count.

Every variant is a finished design, not a wireframe: real design-system components where one exists (buttons, badges, links, icons), semantic tokens for color and spacing, the app's actual type scale. Reach for a hand-rolled element only when no primitive fits.

## Handing off a round

Open `/design-lab/<slug>/<n>` in Chrome and screenshot it; fix only what blocks rendering. Post the URL in chat with a one-line rundown of the directions. While waiting on the pick you can keep tightening from that screenshot — edits hot-reload under the user.

## Detecting the pick

Read `localStorage.getItem('designLab:<slug>:pick')` — instant, no Promise needed. Null = nothing yet; wait a beat and re-read, after a few empty reads fall back to chat. Non-null = act, then clear it once the new round renders.

The pick can come from **any** round — the user may have browsed back. Look up the seed via `manifest.rounds.find(r => r.n === pick.round).variants[pick.choice]`. Write the next round as `n = max(n) + 1` with `seededFrom: pick`.

`choose` → finalize. `variations` → next explore round, seeded from this variant + note. `tune` → next round is `mode:'tune'`.

## Auto mode

If the brief includes `--auto`, skip the wait. Critique each variant's screenshot against the brief and the design guidance you loaded, then decide yourself: `variations` (with a note) while directions still differ meaningfully, `tune` once one is clearly strongest, `choose` when a tune pass produces nothing you'd change. Cap at ~4 explore rounds and ~6 tune passes. Still write `…:pick` so a watcher sees the *working* pulse between rounds.

## Tune mode

Tune passes are numbered rounds too — `mode: 'tune'`, single variant, full-width render. Floating bar: note field + **Apply** / **Variations** / **Done**. They write the same `…:pick` shape with `choice: 0`: Apply → `action:'tune'` (next round is another tune with the tweak applied); Variations → `action:'variations'` (fan out from current state); Done → `action:'choose'`.

## Finalize

Promote the winner to its real location and strip lab scaffolding. Offer to delete `/design-lab/<slug>` and clear `localStorage` keys matching `designLab:<slug>:*`. Only the promoted file is a commit candidate.

## Gotchas

No `alert`/`confirm`. The Chrome JS executor takes a returned `Promise`, not top-level `await` — but keep any Promise short; background-tab timer throttling pushes long polls past its ~45s ceiling. Verify icon names against real exports — a bad import blanks the page.
