---
name: agent-sessions
description: Manage persistent session logs and memories for AI agents. Use when agent needs to save work context, resume from previous sessions, or maintain long-term memory across conversations.
version: 1.0.0
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# Agent sessions

Manage persistent session logs and memories for AI agents in the Obsidian vault.

## Directory

**LOCATION**: `~/Notes/Agents/`

This folder contains markdown files for agent session logs. Each session is a note with frontmatter containing metadata about the agent's work.

## Session File Structure

### Frontmatter Schema

```yaml
---
agent: string         # Agent name/type (e.g., "claude-code", "general-purpose")
session_id: string    # Unique identifier (ISO date + slug, e.g., "2025-12-30-feature-implementation")
created: datetime     # ISO 8601 format (e.g., "2025-12-30T14:30:00")
updated: datetime     # ISO 8601 format
status: string        # active | paused | completed | archived
task: string          # Brief description of the task/purpose
---
```

### Document Structure

```markdown
---
[frontmatter]
---

## Context
[Background information the agent needs to resume work]

## Progress

### YYYY-MM-DD
- Work item 1
- Work item 2

### YYYY-MM-DD
- Earlier work item

## Notes
[Ongoing notes, decisions, important findings]

## Next steps
- [ ] Task 1
- [ ] Task 2
```

## Common Operations

### Create New Session

1. Get current date and time using `date +"%Y-%m-%dT%H:%M:%S"`
2. Create descriptive filename based on task (e.g., "Refactor authentication system.md")
3. Generate session_id from date and task slug (e.g., "2025-12-30-feature-name")
4. Write new file to `~/Notes/Agents/[descriptive-filename].md`
5. Include all required frontmatter fields
6. Add initial context and progress sections

**Example**:
```bash
# Get current timestamp
date +"%Y-%m-%dT%H:%M:%S"
```

**IMPORTANT**: The filename becomes the note title in Obsidian, so use descriptive, human-readable names.

### Update Existing Session

1. Read the session file
2. Update the `updated` timestamp in frontmatter
3. Append new progress under appropriate date heading
4. Update status if needed (e.g., active → paused)

**IMPORTANT**: When updating frontmatter, preserve all existing fields and only modify what's needed.

### Resume from Session

1. Use Grep or Glob to find relevant session files
2. Read the session file to get context
3. Load "Context", "Progress", and "Next steps" sections
4. Update status to "active" if resuming paused session

### List Sessions

```bash
# List all session files
ls -1 ~/Notes/Agents/*.md

# Or use Glob for pattern matching
```

### Search Sessions

```bash
# Search for keyword in all sessions
grep -r "keyword" ~/Notes/Agents/

# Or use Grep tool with path parameter
```

### Archive Session

1. Read the session file
2. Update status to "archived" or "completed"
3. Update the `updated` timestamp
4. Optionally move important findings to permanent notes

## File Naming

**IMPORTANT**: In Obsidian, the filename becomes the note title. Use descriptive, human-readable names.

- Use natural language for filenames (e.g., "Refactor authentication system.md")
- Capitalize appropriately (sentence case or title case)
- Be specific and descriptive
- Can include dates if helpful, but not required (timestamps are in frontmatter)

**Examples**:
  - `Refactor authentication system.md`
  - `Blog post writing workflow.md`
  - `Fix payment processing bug.md`
  - `2025-12-30 Feature implementation.md` (if date in title is useful)

The `session_id` in frontmatter serves as a unique identifier separate from the filename.

## Best Practices

### When to Create Sessions

- Multi-step tasks that span multiple conversations
- Complex features requiring context across sessions
- Research or analysis work that builds over time
- Debugging investigations
- Long-running projects

### When to Update Sessions

- Before ending a conversation with significant progress
- When pausing work to continue later
- After completing major milestones
- When discovering important findings or decisions

### Session Context

Include in "Context" section:
- What problem is being solved
- Relevant codebase architecture
- Key decisions made
- Dependencies or constraints
- Links to related files or documentation

### Progress Tracking

- Group by date using `### YYYY-MM-DD` headings
- Use bullet points for discrete accomplishments
- Be specific and actionable
- Include file paths when relevant

### Next Steps

- Use task list format (`- [ ]`)
- Order by priority or logical sequence
- Be specific enough for future resumption
- Update as tasks are completed

## Status Field

- **active**: Currently being worked on
- **paused**: Work paused, can be resumed
- **completed**: Task finished successfully
- **archived**: Historical record, no longer active

## Agent Field

Common values:
- `claude-code`: Main Claude Code sessions
- `general-purpose`: General purpose agent
- `explore`: Explore agent for codebase analysis
- `plan`: Planning agent sessions
- Custom: Any descriptive agent name