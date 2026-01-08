---
name: todo-list
description: Manage tasks and projects in the Things todo app. Use when user asks to add, find, search, delete, or list tasks, projects, areas, or tags.
allowed-tools: Bash
---

# Task management

The user uses an app called Things to manage tasks and projects. Interact with Things using AppleScript via the CLI. Provides awareness of projects, areas, tags, and lists.

**CRITICAL USAGE NOTE:** You must actively execute the commands below using the Bash tool. This skill provides instructions and documentation, but you are responsible for running the actual commands. Do not simply acknowledge these instructions - take action by executing the script commands.

## Script location

`~/Repositories/scripts/skills/todo-list/things-cli.js`

**IMPORTANT:** You MUST use the Bash tool to execute this script. Do NOT simply call the skill without taking action.

## Available commands

### List organization structures

Get lists of areas, projects, and tags to understand the user's task organization:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js list-areas
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js list-projects
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js list-projects "Area Name"
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js list-tags
```

### View tasks

Show tasks from built-in lists or specific projects/areas:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-today
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-upcoming
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-inbox
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-anytime
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-someday
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-project "Project Name"
```

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-area "Area Name"
```

### View completed tasks (logbook)

Show recent completed tasks from the logbook:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook
```

Show more/fewer completed tasks (default is 50):
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook 100
```

Show completed tasks for a specific project:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook-project "Project Name"
```

Show completed tasks for a specific area:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook-area "Area Name"
```

Limit results for project/area (default is 50):
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook-project "Project Name" 25
node ~/Repositories/scripts/skills/todo-list/things-cli.js show-logbook-area "Area Name" 25
```

**Note:** Completed tasks include their completion date, project, and area information.

### Add tasks

Create new tasks with optional organization and metadata:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name"
```

Add task with notes:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --notes "Additional details"
```

Add task to project:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --project "Project Name"
```

Add task to area:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --area "Area Name"
```

Add task with tags:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --tags "tag1, tag2"
```

Add task to a specific list:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --list "Today"
```

Add task with due date:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Task name" --due "2025-12-31"
```

Combine options:
```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Review PR" --project "Development" --tags "code review" --when "today"
```

### Search tasks

Find tasks by name:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js search "query"
```

### Delete tasks

Delete a task by exact name:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js delete "Task name"
```

**Note:** Deletes all tasks with the exact matching name. Use with caution.

### Delete projects

Delete a project by exact name:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js delete-project "Project name"
```

**Note:** Deletes all projects with the exact matching name. Use with caution.

### Move tasks

Move a task to a different list:

```bash
node ~/Repositories/scripts/skills/todo-list/things-cli.js move "Task name" "Today"
```

**List options:** Today, Upcoming, Anytime, Someday, Inbox

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

### Grocery and shopping list preferences

When the user adds grocery items or shopping lists:
- **Always add items as individual tasks** (not combined into a single task)
- Add each item to the **🛒 Shopping project**
- **Check existing tasks first** to avoid duplicates - use `show-project "🛒 Shopping"` before adding items
- Only add items that aren't already on the list
- Example: For "milk, bread, eggs" → create 3 separate tasks in 🛒 Shopping project (unless already present)

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
4. Use `show-logbook` to see completed tasks
5. Use `show-logbook-project` or `show-logbook-area` to see completed tasks for specific containers

### Understanding organization

1. Start with `list-areas` to see top-level organization
2. For each area of interest, use `list-projects "Area Name"` to see projects
3. Use `list-tags` to see available tags for categorization

### Managing tasks

1. Use `move` to relocate tasks between lists (Today, Upcoming, etc.)
2. Use `delete` to remove tasks by exact name
3. Use `delete-project` to remove projects by exact name

## Integration with Claude

### When adding tasks to projects (REQUIRED WORKFLOW)

**CRITICAL:** When the user asks to add a task to a specific project, you MUST:

1. **First, list existing projects** using `list-projects` to get the current project list
2. **Match the requested project name** against the existing projects:
   - If exact match found: use that project name
   - If partial/fuzzy match found: confirm with user or use best match
   - If no match found: ask user to clarify or create the project first
3. **Then add the task** using the exact project name from the list
4. **Confirm completion** with location details

**Example workflow:**
```bash
# Step 1: Get project list
node ~/Repositories/scripts/skills/todo-list/things-cli.js list-projects

# Step 2: Match "Dev" request to actual "Development" project from list
# Step 3: Add task with exact project name
node ~/Repositories/scripts/skills/todo-list/things-cli.js add "Review PR" --project "Development"
```

### When adding tasks generally

When the user asks to add a task (without specifying a project), Claude should:
1. First run `list-areas`, `list-projects`, and/or `list-tags` to understand the organization
2. Suggest or ask about the appropriate project/area for the task
3. Add the task with relevant options based on context
4. Confirm the task was added with location details

### When finding or viewing tasks

When the user asks to find or view tasks, Claude should:
1. Use `search` for specific task names
2. Use `show-project` or `show-area` for container-based queries
3. Use built-in list commands for time-based queries (today, upcoming, etc.)
