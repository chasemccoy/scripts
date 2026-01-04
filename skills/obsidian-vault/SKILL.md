---
name: obsidian-vault
description: Manage Obsidian vault Markdown notes with frontmatter and wikilinks. Use when user asks to create, edit, delete, or organize Obsidian notes (excluding log entries, which are handled by the log skill).
version: 1.0.0
---

# Obsidian Vault Management

**IMPORTANT**: This skill provides context and guidelines only. After invoking this skill, you MUST use the standard tools (Write, Edit, Read, Bash) to actually perform operations. The skill does not execute operations automatically.

## Vault setup

**VAULT PATH**: `~/Notes`

**LOG HANDLING**: Log.md and log entries are managed by the dedicated `log` skill, not this skill.

**Folder structure:**
- **@Inbox**: Quick captures and unsorted notes. Unless specified, new notes should be placed in this folder. 
- **Journal**: Daily notes and time-based entries
- **Projects**: Active projects (archive completed to `Projects/Archive/`)
- **Slipbox**: Permanent notes and knowledge base
- **Readwise**: Auto-synced highlights - don't manually edit
- **Writing**: Long-form writing and drafts
- **assets**: All images and attachments

## Writing conventions

### Voice and perspective

**CRITICAL: All notes must be written from Chase's first-person perspective.**

When creating or editing notes:
- Write as if Chase is writing for himself
- Use first person ("I", "my", "me")
- Adopt Chase's voice and thinking style
- Notes are personal knowledge, not documentation written about Chase
- Example: "I think this approach..." NOT "Chase thinks this approach..."
- Example: "This reminds me of..." NOT "This might remind the user of..."

These are personal notes in Chase's vault, not third-party documentation.

### File naming

- **Use sentence case**: Capitalize only the first word (e.g., `Meeting notes.md`, `Claude code productivity skill.md`)
- Descriptive names with spaces
- Avoid special characters: `# | ^ : %% [[ ]]`
- Filename IS the title (don't repeat in file)

### Formatting

- **No blank lines after headings**: Content should start immediately on the next line after a heading
  ```markdown
  ## Heading
  Content starts here immediately.

  - Or lists start immediately
  - Like this
  ```

## Markdown syntax

### Frontmatter

Optional metadata at the top of notes, enclosed in `---`:

```markdown
---
created: YYYY-MM-DD HH:mm
tags: [tag1, tag2]
aliases: [Alternative Name]
---

Content starts here.
```

**Rules:**
- Must be at the very top of the file
- Common fields: `created`, `description`, `tags`, `aliases`
- Notes in the Projects directory must have a `description` frontmatter field
- Preserve existing frontmatter unless asked to modify
- **No `title` property or `# Title` header** - filename IS the title

### Wikilinks

Syntax for internal links:

```markdown
[[Note Name]]                    # Link to another note
[[Note Name|Display Text]]       # Custom display text
[[Note Name#Heading]]           # Link to specific heading
[[Folder/Note Name]]            # Link to note in subfolder
![[Note Name]]                  # Embed the entire note
![[Image.png]]                  # Embed an image
![[Image.png|300]]              # Embed with width (in pixels)
```

### Tags

**Prefer wikilinks over tags.** Use tags sparingly:

- Tags: Status (`draft`), broad categorization, auto-generated (Readwise)
- Wikilinks: Concepts, people, topics, relationships between ideas
- Syntax: `tags: [tag1, tag2]` in frontmatter
- Keep taxonomy flat and minimal

### Embedding tweets

**ALWAYS embed tweets** using markdown image syntax:

```markdown
![](https://x.com/username/status/1234567890)
```

This works without any text - just the URL in image syntax. The Obsidian tweet embed plugin will render it properly.

### Images and attachments

**Storage**: `~/Notes/assets/` (flat structure)

**Embedding** (prefer wikilink syntax):
```markdown
![[image.png]]          # Embed
![[image.png|400]]      # With width
```

**Adding images**:
```bash
cp /path/to/image.jpg ~/Notes/assets/descriptive-name.jpg
```

## Core operations

### Searching

Use **arrowhead** for vault searches (hybrid FTS + semantic search):

```bash
arrowhead search hybrid "query"          # Recommended
arrowhead search fts "query"             # Full-text only
arrowhead graph orphans                  # Find disconnected notes
arrowhead graph backlinks "note-title"   # Find backlinks
arrowhead notes list                     # List all notes
```

Options: `--limit N`, `--format [paths|ids|json]`

### Creating notes

Use **Write** tool: `~/Notes/@Inbox/Note Name.md` 

```markdown
---
created: YYYY-MM-DD HH:mm
---

Content starts here.
```

Pattern: vault_path + optional_subfolder + filename.md

**CRITICAL: Auto-linking existing notes**
- Before creating any note, search for potential wikilink targets using arrowhead
- When writing content that mentions other note names, ALWAYS wikilink them using `[[Note Name]]` syntax
- Search for partial matches: if content mentions "Toyama", search for notes containing "Toyama"
- Example workflow:
  1. Draft note content
  2. Run `arrowhead search fts "keyword"` for each potential note reference
  3. Add wikilinks for any matches found
  4. Write the note with all wikilinks included

### Editing notes

1. **Read** to view current content
2. **Edit** with `old_string`/`new_string`
3. Preserve frontmatter unless asked to modify

### Deleting notes

```bash
rm "~/Notes/Note.md"
```

Confirm with user first.

### Folder operations

```bash
mkdir -p "~/Notes/Projects/Project Name"
ls "~/Notes"
```

## Advanced features

### Obsidian URIs

**ALWAYS link note references in your output** using obsidian:// URIs:

```
[Note Name](obsidian://open?vault=Notes&file=Note%20Name)
[Folder Note](obsidian://open?vault=Notes&file=Slipbox/Note%20Name)
```

URL-encode spaces as `%20`.

### Obsidian Bases (map views)

Create `.base` files for map visualizations. Example structure:

```yaml
filters:
  and:
    - file.folder == "Slipbox/Japan"
properties:
  file.name:
    displayName: Place
  coordinates:
    displayName: Coordinates
views:
  - type: map
    name: Map
    markerCoordinatesField: coordinates
    center: "[35.57684, 140.3672]"
    defaultZoom: 4.8
    coordinates: note.coordinates
    markerIcon: note.icon
    markerColor: note.color
    mapHeight: 320
  - type: table
    name: Table
    order:
      - file.name
      - coordinates
      - color
      - icon
```

**Location note frontmatter:**
```yaml
coordinates: 32.7042, 131.3117  # Plain format (not array)
```

**Embed**: `![[BaseName.base#Map]]`

**Adding places to maps:**

When adding new locations to an existing map:

1. Create a new note in the mapped folder
2. Add frontmatter with:
   - `coordinates: lat, lon` (required)
3. The map automatically updates

## Important reminders

- Use absolute paths for all file operations
- UTF-8 encoding
- Frontmatter must start at first line
- **ALWAYS link note references in your output** using obsidian:// URIs
- Always add wikilinks in notes to cross-link to other relevant notes
- New notes are always added to the @Inbox folder unless otherwise specified
