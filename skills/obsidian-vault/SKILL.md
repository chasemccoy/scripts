---
name: obsidian-vault
description: Manage Obsidian vault Markdown notes with frontmatter and wikilinks. Use when user asks to create, edit, delete, or organize Obsidian notes (excluding log entries, which are handled by the log skill).
version: 1.0.0
---

# Obsidian Vault Management

**VAULT PATH**: `/Users/chase/Notes`

**LOG HANDLING**: Log.md and log entries are managed by the dedicated `log` skill, not this skill.

### Folder Structure

- **@Inbox**: Quick captures and unsorted notes
- **Journal**: Daily notes and time-based entries
- **Projects**: Active projects (archive completed to `Projects/Archive/`)
- **Slipbox**: Permanent notes and knowledge base
- **Readwise**: Auto-synced highlights - don't manually edit
- **Writing**: Long-form writing and drafts
- **assets**: All images and attachments

## Obsidian-Specific Conventions

### YAML Frontmatter

Optional metadata at the top of notes, enclosed in `---`:

```markdown
---
date: YYYY-MM-DD
tags: [tag1, tag2]
aliases: [Alternative Name]
---

Content starts here.
```

**Rules**:
- Must be at the very top of the file
- Common fields: `date`, `tags`, `aliases`, `status`
- Preserve existing frontmatter unless asked to modify
- **No `title` property or `# Title` header** - filename IS the title

### Tags

**Prefer wikilinks over tags.** Use tags sparingly:

- Tags: Status (`draft`), broad categorization, auto-generated (Readwise)
- Wikilinks: Concepts, people, topics, relationships between ideas
- Syntax: `tags: [tag1, tag2]` in frontmatter
- Keep taxonomy flat and minimal

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

### Embedding Tweets

**ALWAYS embed tweets** using markdown image syntax:

```markdown
![](https://x.com/username/status/1234567890)
```

This works without any text - just the URL in image syntax. The Obsidian tweet embed plugin will render it properly.

### Images and Attachments

**Storage**: `/Users/chase/Notes/assets/` (flat structure)

**Embedding** (prefer wikilink syntax):
```markdown
![[image.png]]          # Embed
![[image.png|400]]      # With width
```

**Adding images**:
```bash
cp /path/to/image.jpg /Users/chase/Notes/assets/descriptive-name.jpg
```

### File Naming

- Descriptive names with spaces: `Meeting Notes.md`
- Avoid special characters: `# | ^ : %% [[ ]]`
- Filename IS the title (don't repeat in file)

### Obsidian URI - Opening Notes

**ALWAYS link note references** using obsidian:// URIs:

```
[Note Name](obsidian://open?vault=Notes&file=Note%20Name)
[Folder Note](obsidian://open?vault=Notes&file=Slipbox/Note%20Name)
```

URL-encode spaces as `%20`.

## Searching with Arrowhead CLI

Use **arrowhead** for vault searches (hybrid FTS + semantic search):

```bash
arrowhead search hybrid "query"          # Recommended
arrowhead search fts "query"             # Full-text only
arrowhead graph orphans                  # Find disconnected notes
arrowhead graph backlinks "note-title"   # Find backlinks
arrowhead notes list                     # List all notes
```

Options: `--limit N`, `--format [paths|ids|json]`

## Core Operations

### Creating Notes

Use **Write** tool: `/Users/chase/Notes/Note Name.md`

```markdown
---
date: YYYY-MM-DD
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

### Editing Notes

1. **Read** to view current content
2. **Edit** with `old_string`/`new_string`
3. Preserve frontmatter unless asked to modify

### Deleting Notes

```bash
rm "/Users/chase/Notes/Note.md"
```

Confirm with user first.

### Folder Operations

```bash
mkdir -p "/Users/chase/Notes/Projects/Project Name"
ls "/Users/chase/Notes"
```

## Obsidian Bases (Map Views)

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

**Location note frontmatter**:
```yaml
coordinates: 32.7042, 131.3117  # Plain format (not array)
```

**Embed**: `![[BaseName.base#Map]]`

### Adding Places to Maps

When adding new locations to an existing map:

1. Create a new note in the mapped folder
2. Add frontmatter with:
   - `coordinates: lat, lon` (required)
3. The map automatically updates

## Important

- Use absolute paths
- UTF-8 encoding
- Frontmatter must start at first line
- **ALWAYS link note references in your output** using obsidian:// URIs
- Always add wikilinks in notes to cross-link to other relevant notes
