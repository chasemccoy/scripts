---
name: weekly-sweep
description: Run Chase's weekly maintenance sweep - triage Arc tabs into Readwise Reader, propose Things inbox filing, run ench sync, check pipeline health, and produce the weekly review digest in ~/Notes. Runs automatically Sundays at 7am; also use when Chase asks to run the sweep or prepare his weekly review.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, Skill, ToolSearch
version: 1.2.0
---

# Weekly sweep

Produce one digest that lets Chase do his ~30 minute Sunday-evening weekly review with zero filing and at most 5 decisions. The sweep does everything that doesn't need his judgment; everything that does becomes a queued decision.

## Current mode: CALIBRATION (true dry run)

**Until 2026-09-06**: make NO changes to any system. No Reader saves or moves, no Things changes, no Enchiridion sync trigger, nothing. Every action appears in the digest as a proposal ("Would save 14 articles to Reader: ..."). The only things the sweep writes are the digest note itself and the iMessage ping. For the Enchiridion line, do NOT trigger the sync — query the newest production record (`POST /records`, limit 1) and report how stale the last sync is.

In the digest dated 2026-09-06 or later, add a question asking Chase whether to graduate to standard mode (Reader saves/moves become automatic, exact-match Things filing, executing approved close lists, triggering the production sync). If he agrees, update this section.

## Guardrails

- NEVER write to Arc's StorableSidebar.json or any live application database. Arc data is read-only via the arc-tabs script.
- NEVER modify Log.md (the log skill owns it). The on-deck draft lives in the digest for Chase to copy.
- Cap queued decisions at 5. Prioritize by impact; carry the rest to next week with a one-line count ("7 more queued").
- No guilt language, ever. A skipped week just means a slightly longer queue. No streaks, no "you didn't...".
- Keep the run under ~10 minutes. This is a sweep, not an audit. If a data source errors, note it in the digest and move on.
- Deletions of any kind are always proposed, never automatic, in every mode.

## Procedure

### 1. Gather

- **Arc tabs**: `node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --json` (see that skill's SKILL.md for flags). Ignore the active project space (currently **www26**) and pinned project folders. Focus on unpinned tabs older than 7 days across other spaces (HQ, Western Ave., Shopping).
- **Things**: `node ~/Repositories/scripts/skills/todo-list/things-cli.js` — `show-inbox`, `show-today`, `show-logbook 30`, and `show-project "✍️ Blog posts"` (exact emoji name required).
- **Reader**: load Readwise tools via ToolSearch (query "reader") — you need `reader_create_document`, `reader_move_documents`, `reader_list_documents`, and `readwise_list_highlights`.
- **Log**: read recent entries of `~/Notes/Log.md` (top ~80 lines) for this week's captures and any planning notes.
- **Enchiridion**: sync PRODUCTION (the Mac mini, via Tailscale), NOT the `ench` CLI — `ench` operates on the stale local dev database. Run `curl -s -m 300 -X POST https://enchiridion-api.chsmc.tools/sync/readwise` and use `entriesCreated` from the JSON response for the digest line. If the API is unreachable (Tailscale down, mini asleep), report that in the digest as a pipeline-health failure — never fall back to `ench`; local numbers look plausible but are stale. Any other Enchiridion counts/checks likewise go through the production API (`POST /records` with `{"filters":{"type":"concept"},"limit":500,"offset":0}`, `GET /record/slug/<slug>`).
- **Obsidian Readwise sync log**: find "Readwise Syncs.md" in ~/Notes and check whether recent nightly syncs are non-zero (zeros mean no highlighting is happening — a trend worth surfacing, not a failure).

### 2. Act (mode-dependent)

- Classify stale unpinned tabs: **article/blog post** → save to Reader, then queue the tab for closing. CRITICAL — check before creating: `reader_create_document` on an already-saved URL does NOT no-op. It silently bumps the existing doc's saved date (floating it to the top of Chase's Later list as if new) and can resurface previously-archived docs back into Later (observed 2026-08-09, corrupted list order + relocated 3 archived docs). So FIRST check each URL against Reader (`reader_search_documents` / `reader_list_documents`); only call create for URLs that are genuinely absent, and report found ones as "already in Reader" without touching them. Saving is two steps: `reader_create_document` has NO location parameter (new docs land in the inbox), so afterwards bulk-move the newly created docs with `reader_move_documents` (max 50 ids per call) — "later" for tabs created in the last 30 days, "archive" for older. Verify the moved ids belong only to docs you created this run (id timestamps ≈ now). After all saves and moves, VERIFY: `reader_list_documents` (newest-first) and confirm the new documents exist with the intended locations before reporting counts in the digest — check move-result success flags too, and spot-check titles (a scrape can capture a bot-check page as the title; retitle via `reader_bulk_edit_document_metadata` when that happens). A large cluster of ancient tabs (a forgotten multi-year stash) may be grouped as a single decision rather than itemized. **Tool/repo/reference** → queue with a suggested destination (usually just close; occasionally Enchiridion). **Shopping/wishlist** → queue with suggestion to move to a Things task or note. **Ephemeral** → queue for closing.
- Check Things inbox items against existing tasks, projects, and the recent logbook. Flag duplicates (including already-completed items). Propose a destination for each item.
- In calibration mode, ALL of the above is proposal-only — including Reader saves and the Enchiridion sync. Nothing is written to any external system during a dry run.

### 3. Write the digest

Prepend to `~/Notes/Weekly review.md` (create if missing; newest week at top, prior weeks below). If a section for today's date already exists (a same-day re-run), replace that section in place instead of prepending a duplicate. Follow Obsidian conventions (wikilinks welcome; no blank line after headings). Structure:

```markdown
## Sunday, August 9, 2026
### Decisions (max 5)
1. Close 23 stale HQ tabs? All saved to Reader first — full list below.
2. ...

### Done for you
- Saved 14 article tabs to Reader (list)
- Enchiridion sync (production): 6 new records

### Vitals
| | This week | Last week |
|---|---|---|
| Reader Later | 184 | 190 |
| Things inbox | 8 | 12 |
| Days since last blog post | 219 | 212 |
| Days since last log entry | 2 | 6 |

### Writing candidate
"[idea name]" — 3 new highlights and 2 log mentions this week touch it. Material: [links]

### On deck for this week
Draft — copy into Log.md and edit.
- ...

Queue overflow: 4 more decisions carried to next week.
```

Formatting rules for Obsidian rendering: use real `###` headings for sections, NEVER bold pseudo-headings (`**Vitals**`) — a table directly after a plain text line does not render as a table in Obsidian, but a table directly after a heading does. Content starts immediately after headings (vault convention, no blank line). Put a blank line before and after any `---` divider. Detail subsections under a `### Details` divider use `####`.

- Vitals compare against the previous digest's table (parse it from this same file). First run: mark last-week column "—". Record post-sweep values, noting the pre-sweep Reader Later count in a parenthetical (the sweep's own saves inflate it). "Days since last blog post" = newest filename date in `~/Repositories/www/posts` (filenames are `YYYY-MM-DD-slug`; never use file mtimes — they're unreliable there). "Readwise Syncs.md" is oldest-first: recent runs are at the tail.
- The on-deck draft: seed from incomplete items in the most recent "On deck" list in Log.md plus anything obviously committed this week (calendar, log mentions). Keep it short; it's a starting point for him to edit, not an assignment.
- The writing candidate: cross-reference this week's Reader saves, highlights, and log captures against the "✍️ Blog posts" Things project. Name the idea with the most accumulated material and link the material. The candidate doesn't have to already be on the ✍️ Blog posts list — if the week's material clusters around a new idea, name it and queue adding it to the project as one of the decisions. If nothing accumulated, say so in one line — do not manufacture a candidate.

### 4. Notify

Send a short iMessage to Chase's self-chat using the iMessage plugin's `reply` tool (load via ToolSearch, query "imessage reply"): `chat_id` is `any;-;+16624185906`. One or two sentences with the headline numbers, e.g. "Weekly digest ready: N decisions, M articles saved to Reader. Agenda's in 'Weekly review' in Obsidian."

Do NOT use osascript/Messages AppleScript — sending to "chase@chsmc.org" reports success but never delivers (verified 2026-08-09). If the reply tool is unavailable or errors, note that at the top of the digest and continue — the digest note is the source of truth.
