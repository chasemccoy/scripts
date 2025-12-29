# Calendar access

Access and manage macOS Calendar events via EventKit. Properly handles recurring events.

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
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Event Title" --date 2026-01-05 --time "2:30 PM" --duration 60 --calendar "Calendar Name"
```

**Options:**
- `--date` (required): Date in yyyy-MM-dd format
- `--time` (optional): Time in "h:mm AM/PM" format. Omit for all-day events
- `--duration` (optional): Duration in minutes (default: 60)
- `--calendar` (optional): Calendar name. Defaults to "chase@chsmc.org" if not specified

**Examples:**

All-day event:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Team Offsite" --date 2026-01-10
```

Timed event:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Design Review" --date 2026-01-08 --time "2:30 PM" --duration 90
```

Event in specific calendar:
```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js add "Personal Appointment" --date 2026-01-09 --time "11:00 AM" --calendar "Personal"
```

### Delete events

Delete an event by exact title and date:

```bash
node ~/Repositories/scripts/skills/calendar/calendar-cli.js delete "Event Title" --date 2026-01-05
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
node ~/Repositories/scripts/skills/calendar/calendar-cli.js delete "Test Event" --date 2026-01-10
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
