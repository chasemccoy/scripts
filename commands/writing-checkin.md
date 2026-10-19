---
description: Writing check-in to review drafts and synthesize blog ideas
allowed-tools: Bash, Read, Grep, Glob, Skill
---

Run a comprehensive writing check-in that:

1. **Scans for active work:**
   - Check `~/Repositories/www/posts/` for uncommitted files (git status)
   - Scan posts for files with `hidden: true` in frontmatter
   - Read `~/Notes/Projects/Writing.md` if it exists for tracked draft status
   - Show last modified dates, status, blockers, completion %

2. **AI synthesis of potential blog ideas:**
   - Read recent log entries from the past 1-2 weeks
   - Check recent Enchiridion records (created/updated in last 2 weeks)
   - Look at recently modified Obsidian notes
   - Analyze patterns, connections, recurring topics
   - Synthesize potential blog post ideas by connecting:
     - Research you've been doing (Enchiridion records)
     - Topics you've mentioned in your log
     - Notes you've been working on
   - Look for themes that appear across multiple sources

3. **Interactive conversation:**
   - Present findings in a friendly, conversational way
   - Ask about potential ideas: "Based on your recent research on X, have you considered writing about Y?"
   - Inquire about ideas mentioned in the log: "You mentioned [idea] on Monday - want to develop this?"
   - Suggest connections: "These Enchiridion entries seem related - blog post opportunity?"
   - Don't just list - engage in dialogue about what's interesting

4. **Capture new ideas:**
   - If I express interest in an idea or mention a new one, use the `log` skill to append to today's entry
   - Format: `#blog-idea [idea description] - [context/related notes]. Priority: [high/medium/low if specified]`
   - Include wikilinks to related Obsidian notes when relevant
   - Example: `#blog-idea LLM productivity patterns - relates to [[Claude code productivity skill]]. Priority: high`

**Important guidelines:**
- Be conversational and helpful, not robotic
- Focus on synthesis and connections, not just listing items
- Ask follow-up questions to help develop ideas
- Don't create the Writing.md file if it doesn't exist - just note that drafts aren't being tracked yet
- When showing uncommitted files, include their last modified date
- For hidden posts, show when they were last updated
- Look for genuine connections and patterns, not forced ones

**Output format:**
Start with a brief summary of active work, then move into synthesized ideas and conversation.
