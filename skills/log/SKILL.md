---
name: log
description: Manage personal log entries. Use when user asks to create, edit, delete, or organize log entries. You MUST use this skill when asked about the log or log entries.
version: 1.0.0
allowed-tools: Read, Edit, Grep
---

# Personal Log Management

Interact with the user's personal log file by adding, editing, and organizing daily entries.

## Log File

**LOCATION**: `/Users/chase/Notes/Log.md`

The Log is a running markdown file for daily entries and quick captures.

### Structure

```markdown
---
## Wednesday, November 5
- New entry added today
- Another item from today

## Tuesday, November 4
- Entry from yesterday
- Previous day's notes
```

**Key Details**:
- **Horizontal rule**: File starts with `--- ` (note trailing space) for Obsidian formatting
- **Date format**: `## Day, Month Date` (e.g., `## Wednesday, November 5`)
- **No blank lines**: Date headings immediately followed by entries (no empty line between)
- **Order**: Most recent date at the top
- **Entries**: List items (`-`) under each date heading
- **Year**: Current log represents current year only
- **Archive**: Past years archived to `Slipbox/` folder

### Adding Log Entries

1. **Read** Log.md (limit 10 lines) to find latest date heading
2. Check if today's date heading exists
3. **Edit** to insert new entry

**Critical**: Copy EXACT string from Read output including trailing whitespace. Read tool shows exact content with line numbers.

**Adding to existing date** (RECOMMENDED - most reliable):
```
Match the date heading itself to avoid whitespace issues:
Edit tool:
- old_string: "## Wednesday, November 5"
- new_string: "## Wednesday, November 5\n- New entry"  # No blank line after heading
```

**Alternative** (match first entry, riskier due to whitespace):
```
Read shows: "     2→- [Existing entry]"
Edit tool:
- old_string: "- [Existing entry]"  # Exact copy from Read
- new_string: "- New entry\n- [Existing entry]"
```

**Creating new date heading**:
```
Edit tool:
- old_string: "--- \n## Tuesday, November 4"  # Include horizontal rule with trailing space
- new_string: "--- \n## Wednesday, November 5\n- First entry\n\n## Tuesday, November 4"  # No blank line after new heading
```

**CRITICAL**:
- Always preserve `--- ` (with trailing space) at top of file for Obsidian formatting
- No blank line between date heading and first entry

**Tip**: Match smallest unique string (e.g., just first entry line) to avoid multi-line whitespace issues

### Important

- Always preserve chronological order (newest at top)
- Use correct day of week (calculate from current date)
- Don't include year in headings
- Entries are brief, concise list items
- Support wikilinks `[[Note Name]]` for connections to other notes
- Support inline tags with parentheses for categories (e.g., `([[Tag1]], [[Tag2]])`)

## Common Operations

### Add Entry to Today

1. Read first 10 lines of Log.md
2. Check if today's date heading exists
3. Add new entry as list item under today's heading
4. If today's heading doesn't exist, create it at the top

### Add Entry to Specific Date

1. Read Log.md to find the specific date heading
2. Add new entry under that date heading
3. Maintain chronological order

### Search Log

Use Grep to search for keywords in Log.md:
```bash
grep -i "keyword" "/Users/chase/Notes/Log.md"
```

## Best Practices

- Keep entries concise and focused
- Use wikilinks to connect to other notes in the vault
- Use inline tags for categorization
- Preserve existing formatting and structure
- Always verify the current date and day of week
