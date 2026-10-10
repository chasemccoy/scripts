# Morning brief

Familiar's morning brief: a routine on voyager that wakes Familiar at 7:00, has it run `sources.mjs`, and turns the
digest, plus its own memory of the last day, into a short message. The script gathers; Familiar decides what matters.

## Sources

`node ~/Repositories/scripts/brief/sources.mjs` (or `--json`) prints one Markdown digest. Each source has a 25 s
limit, and one that fails prints `(unavailable: why)` while the rest still print. Everything is read-only.

| Source | From |
|---|---|
| Weather | Open-Meteo for Chicago, no key: today and tomorrow, rain by part of day, sunset |
| Calendar | the synced Calendar database (`~/Library/Group Containers/group.com.apple.calendar`), copied first: today and the next three days, holidays once |
| Things | the `things` CLI (reads the Things database): Today, deadlines within a week, starting soon, the inbox, done yesterday |
| Yesterday's log | `~/Notes/Log.md`, the section under yesterday's heading, and today's if begun |
| Arc tabs | the arc-tabs service (`localhost:5003`): open tabs per space, how many are stale, the newest |
| Enchiridion | `ench records list`, records added in the last day |
| Voyager | `pm2 jlist` (anything down or restarted) and disk space as System Settings counts it (free plus purgeable) |

Familiar's own conversations, threads and routines come from its memory, not from the script.

The calendar is only as complete as voyager's synced accounts: on 2026-10-10 the `chase@era.app` calendar vanished
from voyager's store mid-afternoon, so work events didn't show. Check Internet Accounts on voyager if a calendar
goes missing.

Not used on voyager: the calendar skill's EventKit helper (no calendar permission over ssh or pm2) and the Things
skill's AppleScript (times out without the app in front). Claude Code transcripts stay on the MacBook.

## The routine

Set it by asking Familiar in the chat, which calls `routine_set`:

> Set a routine called "Morning brief", every day at 7:00 AM Chicago time, with this text:

```
Morning brief. Run `node ~/Repositories/scripts/brief/sources.mjs` and write my brief from its digest and from the
last day in your memory: what we talked about, threads that moved, anything you said you'd follow up on.

Order, skipping anything empty:
- Today: my first commitment and the shape of the day, meetings with times, tight gaps or conflicts, the weather in a
  clause (what to wear, whether rain will matter).
- Needs you: threads waiting on me, Things due or overdue, anything from our chats still open.
- Yesterday: two or three lines on what moved, from the log and our chats. What happened, not a list.
- Loose ends: pick the one or two most worth a nudge (a server problem first, then the Things inbox or stale tabs),
  never all of them.

120 to 180 words, plain sentences, a short bold lead per part. No headings, no pasted digest, no
"here is your brief". Don't infer time off (a long weekend, a free day) from an empty calendar alone: say what's on
it, not what isn't. Mention a source that was unavailable only if it matters today. On weekends, lighter and
shorter.
```

## Trying it

Run the script on voyager to see the digest:

```zsh
ssh voyager 'PATH=/opt/homebrew/bin:$HOME/.nvm/versions/node/v24.13.0/bin:$PATH node ~/Repositories/scripts/brief/sources.mjs'
```
