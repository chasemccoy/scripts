# Claude Configuration

## About Chase

- Name: Chase McCoy
- Role: Design Engineer at Era Finance

## Directory structure

- **~/Desktop**: Screenshots and recent downloads
- **~/Repositories**: Main coding projects
- **~/Notes**: Obsidian vault/personal notes. Use the obsidian-vault skill for interacting with this folder (except for the log, which uses the log skill).
- **~/Documents**: Personal documents

## Working directories

- **Scripts**: `~/Repositories/scripts` - Custom scripts and automations
- **Skills**: `~/Repositories/scripts/skills` - Agent skills, symlinked to `~/.claude`
- **Commands**: `~/Repositories/scripts/commands` - Agent slash commands, symlinked to `~/.claude`
- **Agent sessions**: `~/Notes/Agents/` - Persistent session logs and memories for AI agents. Use the agent-sessions skill for managing these files.
- **Log**: `~/Notes/Log.md` - Personal log and daily journal entries (markdown). Use the log skill for interacting with the log.
- **Blog posts**: `~/Repositories/www/posts` - Blog posts in Markdown format. Use the blogging skill for interacting with this directory.
- **Lab**: `~/Repositories/lab` - Code examples and demos site (SvelteKit). Use the lab skill for managing examples in the data directory.

## Tools, scripts, and skills

- **Agent Sessions Skill**: `~/Repositories/scripts/skills/agent-sessions` - Manage persistent session logs and memories for AI agents in `~/Notes/Agents/`. Use when you need to save work context across conversations, resume from previous sessions, or maintain long-term memory. 
- **Apple Notes Skill**: `~/Repositories/scripts/skills/apple-notes`
- **Blogging Skill**: `~/Repositories/scripts/skills/blogging`
- **Calendar Skill**: `~/Repositories/scripts/skills/calendar` - Access and manage macOS Calendar events. Use when user asks about calendar events, schedule, upcoming meetings, or wants to create new events. Properly handles recurring events via EventKit.
- **Lab Skill**: `~/Repositories/scripts/skills/lab`
- **Enchiridion Skill**: `~/Repositories/scripts/skills/enchiridion` - ALWAYS use this skill when user asks to search, create, update, link, or query records in Enchiridion. DO NOT use MCP tools directly. Enchiridion is a knowledge repository for long-term storage of links, references, sources, and research. Records can be artifacts, entities, or concepts, linked via predicates.
- **Obsidian Vault Skill**: `~/Repositories/scripts/skills/obsidian-vault` - Create, edit, organize notes in `~/Notes`. Supports frontmatter, wikilinks, and arrowhead CLI for search. Use for permanent notes, projects, clippings, and writing.
- **Log Skill**: `~/Repositories/scripts/skills/log` - Manage `~/Notes/Log.md` only. Use for daily log entries (brief list items under date headings). Always use this skill for log operations, not the obsidian-vault skill.
- **Arc Browser Skill**: `~/Repositories/scripts/skills/arc-browser` - Access Arc browser tabs with hierarchical folder structure. Use when user asks to list, search, or analyze their open Arc tabs. Returns tabs organized by space with full folder hierarchy, pinned status, and nested folder support. Can retrieve all spaces or specific spaces, search by keyword across all folders, or filter by domain.
- **Twitter Skill**: `~/Repositories/scripts/skills/twitter` - Fetch tweet content from Twitter/X URLs. Use when user asks to access, fetch, or get information from tweets. Works without API keys via syndication endpoint.
- **Things Skill**: `~/Repositories/scripts/skills/things` - Manage tasks in Things 3. Use when user asks to add, find, search, or list tasks, projects, areas, or tags. When user mentions a todo offhand in conversation, add it to Things inbox.

## Usage notes

- You are a general purpose assistant, not limited to coding
- You can write code to help with various tasks. Prefer bash and Node scripts over Python or other languages.
- When user mentions a task or todo offhand in conversation (e.g., "I need to...", "remind me to...", "I should..."), add it to Things inbox using the Things skill.
- When agents need to write markdown files to tmp directories, use the agent-sessions skill instead.

## Writing style

- Use sentence case for all headings in markdown files (e.g., "## Common workflows" not "## Common Workflows")

## Date handling

- When creating files with dates (blog posts, logs, etc.), always verify the current date using `date +"%Y-%m-%d"` command first
- Don't rely solely on the date shown in system environment—there may be discrepancies
