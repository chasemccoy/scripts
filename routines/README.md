# Routines

Familiar's routines as files: each `.md` here (but this one) is one routine, its schedule in the frontmatter and the
instructions Familiar is woken with as the body. `context.mjs` is the shared gatherer a routine's instructions can
tell Familiar to run.

## A routine file

```markdown
---
name: Morning brief
schedule: daily 07:00
tz: America/Chicago
paused: false
---
What Familiar is told when it fires: what to gather, what to write, how long.
```

- `schedule`: `daily HH:MM`, `weekdays HH:MM` (Monday to Friday), `weekly mon,wed HH:MM`, `every 2h` or `every 90m`,
  or `at 2026-10-12T09:00-05:00` (once).
- `tz`: an IANA zone; the system's when left out.
- `paused`: optional; a paused routine fires only when run by hand.
- The `name` is the routine's identity: applying a file creates the routine or updates the one with that name.

## Applying them

On voyager, after pulling this repo:

```zsh
familiar routines apply ~/Repositories/scripts/routines          # every file; prints created, updated or unchanged
familiar routines apply ~/Repositories/scripts/routines/morning-brief.md
```

Applying never deletes a routine that has no file (`familiar routines rm` does). A routine changed in the app or the
chat afterwards keeps the change until the file is applied again. The app lists every routine, with Pause and Run now.

## Context

`node ~/Repositories/scripts/routines/context.mjs [sources...] [--json]` prints one Markdown digest; with no names,
every source. `--list` names them. Each has a 25 s limit, and one that fails prints `(unavailable: why)` while the
rest still print. Everything is read-only.

| Source | Name | From |
|---|---|---|
| Weather | `weather` | Open-Meteo for Chicago, no key: today and tomorrow, rain by part of day, sunset |
| Calendar | `calendar` | the synced Calendar database (`~/Library/Group Containers/group.com.apple.calendar`), copied first: today and the next three days, holidays once |
| Things | `things` | the `things` CLI (reads the Things database): Today, deadlines within a week, starting soon, the inbox, done yesterday |
| Yesterday's log | `log` | `~/Notes/Log.md`, the section under yesterday's heading, and today's if begun |
| Arc tabs | `tabs` | the arc-tabs service (`localhost:5003`): open tabs per space, how many are stale, the newest |
| Enchiridion | `enchiridion` | `ench records list`, records added in the last day |
| Voyager | `voyager` | `pm2 jlist`: apps down or restarted in the last day |

Familiar's own conversations, threads and routines come from its memory, not from here.

The calendar is only as complete as voyager's synced accounts: on 2026-10-10 the `chase@era.app` calendar vanished
from voyager's store mid-afternoon, so work events didn't show. Check Internet Accounts on voyager if one goes
missing. Not used on voyager: the calendar skill's EventKit helper (no calendar permission over ssh or pm2) and the
Things skill's AppleScript (times out without the app in front).

To see what a routine would get:

```zsh
ssh voyager 'PATH=/opt/homebrew/bin:$HOME/.nvm/versions/node/v24.13.0/bin:$PATH node ~/Repositories/scripts/routines/context.mjs'
```
