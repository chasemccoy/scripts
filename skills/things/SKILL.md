---
name: things
description: Manage tasks in Things 3. Use when user asks to add, find, search, or list tasks, projects, areas, or tags.
allowed-tools: Bash
---

# Things task management

Interact with Things 3 task manager using AppleScript via the CLI. Provides awareness of projects, areas, tags, and lists.

## Script location

`/Users/chase/Repositories/scripts/skills/things/things-cli.js`

## Available commands

### List organization structures

Get lists of areas, projects, and tags to understand the user's task organization:

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js list-areas
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js list-projects
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js list-projects "Area Name"
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js list-tags
```

### View tasks

Show tasks from built-in lists or specific projects/areas:

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-today
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-upcoming
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-inbox
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-anytime
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-someday
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-project "Project Name"
```

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js show-area "Area Name"
```

### Add tasks

Create new tasks with optional organization and metadata:

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name"
```

Add task with notes:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --notes "Additional details"
```

Add task to project:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --project "Project Name"
```

Add task to area:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --area "Area Name"
```

Add task with tags:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --tags "tag1, tag2"
```

Add task to a specific list:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --list "Today"
```

Add task with due date:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Task name" --due "2025-12-31"
```

Combine options:
```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js add "Review PR" --project "Development" --tags "code review" --when "today"
```

### Search tasks

Find tasks by name:

```bash
node /Users/chase/Repositories/scripts/skills/things/things-cli.js search "query"
```

## Add task options

- `--notes "text"` - Add notes/description to the task
- `--project "name"` - Add task to a specific project
- `--area "name"` - Add task to a specific area
- `--tags "tag1, tag2"` - Add comma-separated tags
- `--list "name"` - Move task to specific list (Today, Upcoming, Anytime, Someday)
- `--due "YYYY-MM-DD"` - Set a due date

## Usage notes

- All commands use the full path to the script
- Project/area/tag names with spaces must be quoted
- Search matches task names only
- When adding tasks, `--project` and `--area` are mutually exclusive
- Use `list-areas`, `list-projects`, and `list-tags` first to understand organization
- The `--list` option accepts: Today, Upcoming, Anytime, Someday, Inbox

## Common workflows

### Adding a task

Before adding a task, check available projects and areas:
1. Run `list-areas` to see areas
2. Run `list-projects` to see projects (optionally filtered by area)
3. Run `list-tags` to see available tags
4. Use `add` with appropriate options

### Finding tasks

1. Use `search` to find tasks by name
2. Use `show-project` or `show-area` to see tasks in specific containers
3. Use `show-today`, `show-upcoming`, etc. to see tasks in built-in lists

### Understanding organization

1. Start with `list-areas` to see top-level organization
2. For each area of interest, use `list-projects "Area Name"` to see projects
3. Use `list-tags` to see available tags for categorization

## Integration with Claude

When the user asks to add a task, Claude should:
1. First run `list-areas`, `list-projects`, and/or `list-tags` to understand the organization
2. Suggest or ask about the appropriate project/area for the task
3. Add the task with relevant options based on context
4. Confirm the task was added with location details

When the user asks to find or view tasks, Claude should:
1. Use `search` for specific task names
2. Use `show-project` or `show-area` for container-based queries
3. Use built-in list commands for time-based queries (today, upcoming, etc.)
