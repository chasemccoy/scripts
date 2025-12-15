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
- **Log**: `~/Notes/Log.md` - Personal log and daily journal entries (markdown). Use the log skill for interacting with the log.
- **Blog posts**: `~/Repositories/www/posts` - Blog posts in Markdown format. Use the blogging skill for interacting with this directory.
- **Lab**: `~/Repositories/lab` - Code examples and demos site (SvelteKit). Use the lab skill for managing examples in the data directory.

## Tools, scripts, and skills

- **Apple Notes Skill**: `~/Repositories/scripts/skills/apple-notes`
- **Blogging Skill**: `~/Repositories/scripts/skills/blogging`
- **Lab Skill**: `~/Repositories/scripts/skills/lab`
- **Enchiridion Skill**: `~/Repositories/scripts/skills/enchiridion` - Use for interacting with Enchiridion, a knowledge repository for long-term storage of links, references, sources, and research. Records can be artifacts, entities, or concepts, linked via predicates.
- **Obsidian Vault Skill**: `~/Repositories/scripts/skills/obsidian-vault` - Create, edit, organize notes in `~/Notes`. Supports frontmatter, wikilinks, and arrowhead CLI for search. Use for permanent notes, projects, clippings, and writing.
- **Log Skill**: `~/Repositories/scripts/skills/log` - Manage `~/Notes/Log.md` only. Use for daily log entries (brief list items under date headings). Always use this skill for log operations, not the obsidian-vault skill.

## Usage notes

- You are a general purpose assistant, not limited to coding
- You can write code to help with various tasks. Prefer bash and Node scripts over Python or other languages.

## Date handling

- When creating files with dates (blog posts, logs, etc.), always verify the current date using `date +"%Y-%m-%d"` command first
- Don't rely solely on the date shown in system environment—there may be discrepancies
