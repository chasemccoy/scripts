---
description: Access and manage macOS Calendar events. Use when user asks about calendar events, schedule, upcoming meetings, or wants to create new events.
---

# Calendar access

Access and manage macOS Calendar events via EventKit.

## Script location

`~/Repositories/scripts/skills/calendar/calendar-cli.js`

## Available commands

### View events

Show events for different time ranges:

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js show-today
```

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js show-tomorrow
```

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js show-week
```

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js show-next-week
```

### List calendars

Show all available calendars:

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js list-calendars
```

### Add events

Create new calendar events:

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Event title" --date 2026-01-05 --time "2:30 PM" --duration 60 --calendar "Calendar Name" --location "123 Main St"
```

**Options:**
- `--date` (required): Date in yyyy-MM-dd format
- `--time` (optional): Time in "h:mm AM/PM" format. Omit for all-day events
- `--duration` (optional): Duration in minutes (default: 60)
- `--calendar` (optional): Calendar name. Defaults to "chase@chsmc.org" if not specified
- `--location` (optional): Location/address for the event
- `--notes` (optional): Additional notes for the event

**Examples:**

All-day event:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Team offsite" --date 2026-01-10
```

Timed event:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Design review" --date 2026-01-08 --time "2:30 PM" --duration 90
```

Event in specific calendar:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Personal appointment" --date 2026-01-09 --time "11:00 AM" --calendar "Personal"
```

Event with location:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Team lunch" --date 2026-01-10 --time "12:00 PM" --duration 60 --location "Café Blue, 123 Main St"
```

### Delete events

Delete an event by exact title and date:

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js delete "Event title" --date 2026-01-05
```

**IMPORTANT SAFETY NOTES:**
- Requires exact title match
- Automatically warns if event has attendees and lists them
- NEVER delete events with attendees without user's express permission
- Use with caution - deletion is immediate and permanent

**Options:**
- `--date` (required): Date in yyyy-MM-dd format

**Example:**
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js delete "Test event" --date 2026-01-10
```

## Implementation details

- Uses Swift + EventKit via `calendar.swift` backend
- Properly handles recurring events (unlike AppleScript)
- Fast performance
- Requires calendar access permission on first run

## Output format

Events are grouped by date with time and title:

```
This week (10 events):

Wednesday, Dec 31:
  All day      New Year's Eve

Friday, Jan 2:
  12:30 PM     Meeting with team
  2:30 PM      Project review
```

## Usage notes

- First run will prompt for calendar access permission
- All calendars are included in results when viewing
- Events are sorted chronologically
- Recurring events show actual occurrence dates, not base dates
- When adding events, use `list-calendars` to see available calendar names
- **Use sentence case for event titles** (e.g., "Design review" not "Design Review"). Proper nouns should still be capitalized (e.g., "Meeting with Sarah")

## User preferences

- Work day: 9am-5pm
- Meeting preferences: 10am-4pm (avoid meetings before 10am or after 4pm when possible)
- Work calendar: `chase@era.app`
- Personal calendar: `chase@chsmc.org` (default)
