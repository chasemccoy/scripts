# Scripts & AI configuration

Personal scripts, global utilities, and AI agent configuration for productivity and automation.

## What's here

This repository contains:

- **Claude configuration** - Settings, skills, and agent instructions
- **Global scripts** - Command-line utilities and automation
- **Skills** - Domain-specific knowledge and workflows for Claude Code

## Claude configuration

### CLAUDE.md

Main configuration file (`CLAUDE.md`) defines:
- Directory structure and working directories
- Available skills and tools
- Usage notes and behavioral instructions
- Writing style preferences
- Date handling conventions

## Skills

Skills extend agent capabilities with specialized workflows and tool integrations. Each skill provides detailed instructions for interacting with specific systems or file formats.

#### 📝 Content and writing

- **[Blogging](./skills/blogging/)** - Manage blog posts in Markdown with frontmatter, style guide enforcement, and post organization.
- **[Log](./skills/log/)** - Daily journal entries in a single running Markdown file with chronological organization.

#### 🗂️ Knowledge management

- **[Obsidian Vault](./skills/obsidian-vault/)** - Comprehensive note management with frontmatter, wikilinks, semantic search via arrowhead CLI.
- **[Enchiridion](./skills/enchiridion/)** - SQLite-based knowledge repository for links, references, and research with linked records.
- **[Apple Notes](./skills/apple-notes/)** - Interact with macOS Notes via AppleScript for search, creation, and editing.

#### ✅ Tasks and scheduling 

- **[Things](./skills/things/)** - Manage tasks in Things 3 via AppleScript. List projects/areas, add tasks, search, and view lists.
- **[Calendar](./skills/calendar/)** - Access and manage macOS Calendar events via EventKit. View schedules, create events, properly handles recurring events.

#### 💻 Development

- **[Lab](./skills/lab/)** - Manage code examples and demos for SvelteKit-based examples site with auto-discovery.

#### 🐦 Social media

- **[Twitter](./skills/twitter/)** - Fetch tweet content from URLs without API authentication via public syndication endpoint.

## Repository structure

```
scripts/
├── CLAUDE.md          # Main configuration
└── skills/            # Claude Code skills
    ├── apple-notes/
    ├── blogging/
    ├── calendar/
    ├── enchiridion/
    ├── lab/
    ├── log/
    ├── obsidian-vault/
    ├── things/
    └── twitter/
```