---
description: Save current session context to agent session log
allowed-tools: Skill, Bash, Read, Write, Edit
---

Use the `agent-sessions` skill to save the current conversation and work context to a session log file.

**Steps**:

1. **Analyze current conversation** to understand:
   - What task is being worked on
   - What progress has been made
   - What context is important to preserve
   - What next steps remain

2. **Determine session details**:
   - Create descriptive, human-readable filename from the task (e.g., "Refactor authentication system.md")
   - Get current timestamp using `date +"%Y-%m-%dT%H:%M:%S"`
   - Generate session_id: `YYYY-MM-DD-task-slug` for frontmatter

3. **Create or update session file** at `/Users/chase/Notes/Agents/[descriptive-filename].md`:
   - Include all required frontmatter (agent, session_id, created, updated, status, task)
   - Write comprehensive Context section with background and architecture details
   - Document Progress with specific accomplishments and file changes
   - List clear Next steps as actionable tasks
   - Include important Notes (decisions, findings, blockers)

   **IMPORTANT**: The filename becomes the note title in Obsidian - use natural, descriptive language.

4. **Set appropriate status**:
   - Use "paused" if work is being suspended to continue later
   - Use "completed" if task is finished
   - Use "active" if work is ongoing but needs checkpoint

5. **Confirm to user**:
   - Show the session file path
   - Display the session_id
   - Summarize what was saved
   - Mention how to resume (read the session file)

**Session content should include**:
- **Context**: Why this work matters, what problem it solves, relevant architecture
- **Progress**: Specific files changed, features added, bugs fixed, decisions made
- **Notes**: Important findings, trade-offs considered, blockers encountered
- **Next steps**: Concrete actionable tasks to resume work

**Be thorough**: This session log should allow an agent (or you in a future conversation) to resume work without needing to re-read the entire conversation history.
