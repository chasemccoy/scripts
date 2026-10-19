---
description: Resume work from a saved agent session
allowed-tools: Skill, Bash, Read, Edit, Glob, Grep
---

Use the `agent-sessions` skill to resume work from a previously saved session log.

**Steps**:

1. **Find available sessions**:
   - Use Glob to list all session files in `/Users/chase/Notes/Agents/`
   - Prioritize sessions with status "active" or "paused"
   - Show most recently updated sessions first

2. **Present options to user**:
   - Display session filenames (which are the descriptive titles)
   - Show status and last updated timestamp
   - Include brief task description
   - Ask user which session to resume (or let them specify by name)

3. **Load the session**:
   - Read the selected session file
   - Extract and present key information:
     - **Context**: Full background and architectural details
     - **Progress**: Summary of what's been accomplished so far
     - **Notes**: Important decisions, findings, or blockers
     - **Next steps**: Task list for continuing work

4. **Update session status**:
   - If status was "paused", update it to "active"
   - Update the `updated` timestamp
   - Preserve all other frontmatter fields

5. **Prepare to continue**:
   - Summarize the session state for the user
   - Highlight the next steps
   - Ask if they want to proceed with the first next step or do something else

**Finding sessions**:

```bash
# List all sessions sorted by modification time
ls -lt /Users/chase/Notes/Agents/*.md | head -10

# Or search for specific keywords
grep -l "keyword" /Users/chase/Notes/Agents/*.md
```

**Important**:
- Load the FULL context - don't summarize unless the session file is very long
- Present information clearly so the user understands where they left off
- Be ready to continue working immediately after loading context
- Update the session file as work progresses (treat it as a living document)
