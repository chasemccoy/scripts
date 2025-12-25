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
├── Journal/               # Journal entries
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

**Note**: Log entries and the Log.md file are managed by the dedicated `log` skill.

## Obsidian-Specific Conventions

### YAML Frontmatter

Frontmatter is optional metadata at the top of notes, enclosed in `---`:

```markdown
---
date: YYYY-MM-DD
tags: [tag1, tag2]
aliases: [Alternative Name]
---

Note content starts here.
```

**Important**:
- Must be at the very top of the file
- Common fields: `date`, `tags`, `aliases`, `status`, `author`
- Always preserve existing frontmatter when editing unless asked to modify it
- **Do NOT include `title` property** - titles are derived from the filename
- **Do NOT add a markdown header repeating the filename** - start directly with content

### Tags

This vault uses **minimal tagging** with a preference for wikilinks over tags. Tags are used sparingly:

**Current tag usage patterns:**
- `draft` - Used in Writing folder for draft posts/articles
- `#articles`, `#books`, `#tweets` - Auto-added by Readwise in the Readwise folder (don't manually edit)

**Inline tag syntax:**
- YAML frontmatter: `tags: [tag1, tag2]` 

**Tag philosophy:**
- Prefer **wikilinks** over tags for connections between notes
- Use tags only when they add clear organizational value
- Keep tag taxonomy flat and minimal
- Don't create redundant tags when wikilinks work better
- Example: Instead of `tags: [writing]`, use wikilink `[[Writing]]`

**When to use tags vs wikilinks:**
- Tags: Status (`draft`), broad categorization, auto-generated (Readwise)
- Wikilinks: Concepts, people, topics, relationships between ideas

### Wikilinks

Obsidian uses `[[Note Name]]` syntax for internal links:

```markdown
[[Note Name]]                    # Link to another note
[[Note Name|Display Text]]       # Custom display text
[[Note Name#Heading]]           # Link to specific heading
[[Folder/Note Name]]            # Link to note in subfolder
![[Note Name]]                  # Embed the entire note
![[Image.png]]                  # Embed an image
![[Image.png|300]]              # Embed with width (in pixels)
```

### Images and Attachments

**Storage location:** All images are stored in `/Users/chase/Notes/assets/`

**Image naming patterns:**
- Auto-generated screenshots: `Pasted image YYYYMMDDHHMMSS.png` (from Obsidian)
- Screenshots from CleanShot: `CleanShot YYYY-MM-DD at HH.MM.SS@2x.png`
- iPhone photos: `IMG_XXXX.jpeg`
- Named images: Use descriptive names like `seuss.jpg`
- Book covers: ISBN-based like `9781234567890.jpg`

**Embedding images in notes:**

Prefer wikilink syntax over markdown:
```markdown
![[assets/image.png]]           # Embed from assets folder
![[image.png]]                  # Also works (Obsidian finds it in assets)
![[assets/image.png|400]]       # Specify width in pixels
```

Markdown syntax also works:
```markdown
![](assets/image.png)           # Standard markdown
![Alt text](assets/image.png)   # With alt text
```

**Adding images to vault:**

Use Bash tool to copy images to the assets folder:
```bash
# Copy image to assets
cp /path/to/image.jpg /Users/chase/Notes/assets/descriptive-name.jpg
```

Then reference in notes:
```markdown
![[descriptive-name.jpg]]
```

**Best practices:**
- Store all images in `assets/` folder (flat structure, no subfolders)
- Use descriptive filenames
- Prefer wikilink syntax for easier refactoring
- Specify width when needed: `![[image.png|300]]`

### File Naming

- Use descriptive names with spaces: `Meeting Notes.md`
- Avoid special characters: `# | ^ : %% [[ ]]`
- Always use `.md` extension
- **The filename IS the note title** - no need to repeat it in frontmatter or as a header

### Obsidian URI - Opening Notes

Use the `obsidian://` URI scheme to open notes directly in Obsidian:

```
obsidian://open?vault=Notes&file=Note%20Name
```

**Format:**
- `vault=Notes` - The vault name (use "Notes" for this vault)
- `file=Note%20Name` - URL-encoded note path relative to vault root
- For notes in subfolders: `file=Slipbox/Note%20Name`

**When responding to users:**
- **ALWAYS link note references** using obsidian:// URIs
- Format: `[Note Name](obsidian://open?vault=Notes&file=Note%20Name)`
- URL-encode spaces as `%20` and special characters appropriately
- Examples:
  - `[Japan Travel](obsidian://open?vault=Notes&file=Slipbox/Japan%20Travel)`
  - `[Writing](obsidian://open?vault=Notes&file=Slipbox/Writing)`

**Important:** Every time you mention a note that exists in the vault, link it with an obsidian:// URI so the user can click to open it.

## Searching with Arrowhead CLI

**IMPORTANT**: Use the **arrowhead** CLI for all vault searches. This is the preferred search method.

Arrowhead provides hybrid search combining full-text (FTS) and semantic search across the vault. Documentation: https://github.com/totocaster/arrowhead

### Search Commands

```bash
# Hybrid search (combines FTS + semantic) - RECOMMENDED
arrowhead search hybrid "query"

# Full-text search only
arrowhead search fts "query"

# Semantic/vector search only
arrowhead search semantic "query"
```

**Search options**:
- `--limit N` - Limit number of results
- `--format [paths|ids|json]` - Output format

### Graph Commands

```bash
# Find disconnected notes
arrowhead graph orphans

# Find backlinks to a note
arrowhead graph backlinks "note-title"

# View note relationships/context
arrowhead graph context "note-title"
```

### Note Commands

```bash
# List all notes
arrowhead notes list [--json]

# Read note content
arrowhead notes read [note-title]

# Create, update, or delete notes
arrowhead notes create
arrowhead notes delete
```

### When to Use Arrowhead

- **Always** prefer arrowhead for searching vault content
- Use for finding notes by topic, keyword, or concept
- Use for semantic searches ("notes about X")
- Use for exploring related content
- Use graph commands to analyze note relationships

## Core Operations

### Creating Notes

Use the **Write** tool with the full path:

```
Write tool:
- file_path: /Users/chase/Notes/Note Name.md
- content: "---\ndate: YYYY-MM-DD\ntags: []\n---\n\nContent here.\n\nRelated: [[Other Note]]"
```

**Pattern**: vault_path + optional_subfolder + filename.md

**Note structure:**
- Filename serves as the title
- No `title:` in frontmatter
- No `# Title` header at top
- Start content immediately after frontmatter
- No blank lines after headers (H2s) - content starts immediately on next line

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
- Include `date` when relevant
- Use ISO date format (YYYY-MM-DD)
- Keep tags consistent across vault
- Never include `title` - it's derived from filename

**Organization**:
- Use folders for broad categories (Projects, Journal, References)
- Rely on wikilinks and tags for connections
- Keep folder structure shallow (2-3 levels maximum)

**Wikilinks**:
- Create placeholder notes with wikilinks, fill in later
- Use aliases for frequently referenced notes: `[[Long Name|Short]]`
- Link to specific sections: `[[Note#Section Name]]`

## Obsidian Bases and Map Views

Bases are Obsidian's database-like views for organizing and visualizing notes. They use `.base` files to define filters, properties, and views.

### Creating a Base with Map View

**Example: Japan Places Map**

1. **Create a folder** for location notes:
```bash
mkdir -p "/Users/chase/Notes/Slipbox/Japan"
```

2. **Create the `.base` file** (e.g., `Japan.base`):
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

**Key configuration:**
- `filters`: Use `file.folder == "Folder/Path"` to include notes from a specific folder
- `markerCoordinatesField`: Must match the property name in location notes (use `coordinates`)
- `center`: Center point of map as `"[lat, lon]"`
- `defaultZoom`: Initial zoom level
- `markerIcon` and `markerColor`: Reference note properties for customization

3. **Create location notes** with required frontmatter:
```yaml
---
coordinates: 32.7042, 131.3117
color: red
icon: landmark
tags:
---

Place description here.
```

**Coordinate format:**
- Use plain format: `coordinates: lat, lon`
- NOT array format: `[lat, lon]` causes parsing issues
- Example: `coordinates: 35.6762, 139.6503`

4. **Embed the map** in a note:
```markdown
![[Japan.base#Map]]
```

Format: `![[BaseName.base#ViewName]]`

### Adding Places to Maps

When adding new locations to an existing map:

1. Create a new note in the mapped folder
2. Add frontmatter with:
   - `coordinates: lat, lon` (required)
   - `color: red|blue|green|...` (optional)
   - `icon: landmark|star|...` (optional)
3. The map automatically updates

### Map Icons and Colors

Common icon values: `landmark`, `star`, `flag`, `pin`, `circle`
Common color values: `red`, `blue`, `green`, `yellow`, `orange`, `purple`

## Important Notes

- Use absolute paths for all file operations
- Notes use UTF-8 encoding
- Avoid editing notes currently open in Obsidian to prevent conflicts
- Wikilinks are case-sensitive on some systems
- Frontmatter must start at the very first line of the file
