---
name: obsidian-vault
description: Manage Obsidian vault Markdown notes with frontmatter and wikilinks. Use when user asks to create, edit, delete, or organize Obsidian notes (excluding log entries, which are handled by the log skill).
version: 1.0.0
---

# Obsidian Vault Management

Interact with the user's Obsidian vault by creating, editing, and deleting Markdown notes with proper frontmatter and wikilinks.

## Vault Configuration

**VAULT PATH**: `/Users/chase/Notes`

Use this path for all vault operations unless the user explicitly specifies a different location.

### Folder Structure

```
/Users/chase/Notes/
├── .obsidian/              # Obsidian config (plugins, themes, snippets)
├── @Inbox/                 # Inbox for new/unsorted notes
├── assets/                 # Images and attachments
├── Clippings/             # Web clippings and saved content
├── Journal/               # Daily notes and journal entries
├── Projects/              # Project-specific notes
│   └── Archive/           # Archived projects
│       └── Stripe/        # Archived: Stripe project
├── Readwise/              # Readwise synced highlights
│   ├── Articles/          # Article highlights
│   ├── Books/             # Book highlights
│   └── Tweets/            # Tweet highlights
├── Slipbox/               # Zettelkasten/permanent notes
│   └── People/            # People-related notes
└── Writing/               # Writing projects and drafts
    ├── Lessons in toolmaking/
    └── Newsletter/        # Newsletter drafts
```

**Key Folders**:
- **@Inbox**: Default location for quick captures and unsorted notes
- **Journal**: Daily notes and time-based entries
- **Projects**: Active project notes (archive completed projects to `Projects/Archive/`)
- **Slipbox**: Permanent notes and knowledge base
- **Readwise**: Auto-synced highlights (don't manually edit)
- **Writing**: Long-form writing and published content

**Note**: Log entries are managed by the dedicated `log` skill.

## Obsidian-Specific Conventions

### YAML Frontmatter

Frontmatter is optional metadata at the top of notes, enclosed in `---`:

```markdown
---
title: Note Title
date: YYYY-MM-DD
tags: [tag1, tag2]
aliases: [Alternative Name]
---

Note content starts here.
```

**Important**:
- Must be at the very top of the file
- Common fields: `title`, `date`, `tags`, `aliases`, `status`, `author`
- Always preserve existing frontmatter when editing unless asked to modify it

### Wikilinks

Obsidian uses `[[Note Name]]` syntax for internal links:

```markdown
[[Note Name]]                    # Link to another note
[[Note Name|Display Text]]       # Custom display text
[[Note Name#Heading]]           # Link to specific heading
[[Folder/Note Name]]            # Link to note in subfolder
![[Note Name]]                  # Embed the entire note
![[Image.png]]                  # Embed an image
```

### File Naming

- Use descriptive names with spaces: `Meeting Notes.md`
- Avoid special characters: `# | ^ : %% [[ ]]`
- Always use `.md` extension

## Core Operations

### Creating Notes

Use the **Write** tool with the full path:

```
Write tool:
- file_path: /Users/chase/Notes/Note Name.md
- content: "---\ntitle: Note Name\ndate: YYYY-MM-DD\ntags: []\n---\n\n# Note Name\n\nContent here.\n\nRelated: [[Other Note]]"
```

**Pattern**: vault_path + optional_subfolder + filename.md

### Editing Notes

1. Use **Read** tool to view current content
2. Use **Edit** tool with `old_string` and `new_string` parameters
3. Preserve frontmatter unless specifically asked to modify it

```
Read tool: /Users/chase/Notes/Note.md
Edit tool:
- file_path: /Users/chase/Notes/Note.md
- old_string: "## Section"
- new_string: "## Section\n\nNew content here"
```

### Deleting Notes

Use **Bash** tool with `rm` command:

```bash
rm "/Users/chase/Notes/Note to Delete.md"
```

Confirm with user before deleting.

### Folder Operations

Create folders:
```bash
mkdir -p "/Users/chase/Notes/Projects/Project Name"
```

List vault contents:
```bash
ls "/Users/chase/Notes"
```

Find notes:
```bash
find "/Users/chase/Notes" -name "*.md" -type f
```

## Best Practices

**Frontmatter**:
- Include at minimum `title` and `date`
- Use ISO date format (YYYY-MM-DD)
- Keep tags consistent across vault

**Organization**:
- Use folders for broad categories (Projects, Journal, References)
- Rely on wikilinks and tags for connections
- Keep folder structure shallow (2-3 levels maximum)

**Wikilinks**:
- Create placeholder notes with wikilinks, fill in later
- Use aliases for frequently referenced notes: `[[Long Name|Short]]`
- Link to specific sections: `[[Note#Section Name]]`

## Important Notes

- Use absolute paths for all file operations
- Notes use UTF-8 encoding
- Avoid editing notes currently open in Obsidian to prevent conflicts
- Wikilinks are case-sensitive on some systems
- Frontmatter must start at the very first line of the file
