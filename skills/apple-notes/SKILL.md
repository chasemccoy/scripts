---
name: apple-notes
description: Manage Apple Notes using CLI. Use when user asks to search, create, edit, list, or get Apple Notes.
allowed-tools: Bash
---

# Apple Notes Management

Interact with Apple Notes using the CLI script to search, create, edit, list, and retrieve notes.

## Script Location

`~/.claude/skills/apple-notes/apple-notes-cli.js`

## Available Commands

### Search Notes
Search for notes by title or content:
```bash
node ~/.claude/skills/apple-notes/apple-notes-cli.js search "query"
```

### List All Notes
Get a list of all note titles:
```bash
node ~/.claude/skills/apple-notes/apple-notes-cli.js list
```

### Get Note Content
Retrieve the full content of a specific note by title:
```bash
node ~/.claude/skills/apple-notes/apple-notes-cli.js get "Note Title"
```

### Create Note
Create a new note with title and optional body:
```bash
node ~/.claude/skills/apple-notes/apple-notes-cli.js create "Note Title" "Note body content"
```

### Edit Note
Update the body of an existing note:
```bash
node ~/.claude/skills/apple-notes/apple-notes-cli.js edit "Note Title" "New body content"
```

## Usage Notes

- All commands must use the full path to the script
- Note titles with spaces should be quoted
- The script uses AppleScript to interact with the Notes app
- Search queries match both title and body content
- Edit command replaces the entire note body

## Common Operations

### Finding a Note
1. Use `search` if you know part of the title or content
2. Use `list` to see all available notes
3. Use `get` to retrieve the full content once you have the title

### Creating Content
1. Use `create` with a title and body
2. If you need to update it later, use `edit` with the exact title

### Updating Notes
1. First `get` the current content if you want to preserve parts of it
2. Use `edit` with the new complete body (it replaces all content)
