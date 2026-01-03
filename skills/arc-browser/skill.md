---
name: arc-browser
description: Access and organize Arc browser tabs by space and folder. Use when user asks to list, search, or analyze their open Arc tabs. Can retrieve tabs from all spaces or specific spaces, search by keyword, filter by domain, or browse tabs by folder.
allowed-tools: Bash
---

# Arc browser tab access

Access Arc browser tabs organized by space or folder. Uses StorableSidebar.json parsing to provide hierarchical folder/tab structure. Retrieve tab information including title, URL, space, folder organization, and pinned status without any external APIs or authentication.

## Script location

`~/Repositories/scripts/skills/arc-browser/arc-tabs.js`

## CLI usage

All commands use: `node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js [options]`

### Basic commands

**List all spaces** (hierarchical with folders):
```bash
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --json
```

**Get specific space**:
```bash
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --space "HQ"
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --space "Research" --json
```

**List all folders** (flat map view):
```bash
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --folders
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --folders --folder "Inbox"
```

### Filtering tabs

**Filter by pinned status**:
```bash
# Get all unpinned tabs
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --unpinned

# Get all pinned tabs
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --pinned

# Unpinned tabs in HQ space
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --space "HQ" --unpinned
```

**Filter by activity date**:
```bash
# Tabs active in past 7 days
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --active-after "2025-12-24T00:00:00Z"

# Tabs not active in 30 days
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js --active-before "2025-12-01T00:00:00Z"

# Unpinned tabs from HQ active in past week
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --space "HQ" \
  --unpinned \
  --active-after "2025-12-24T00:00:00Z"
```

**Filter by creation date**:
```bash
# Tabs created in December 2025
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --created-after "2025-12-01T00:00:00Z" \
  --created-before "2026-01-01T00:00:00Z"

# Old tabs (created before 2024)
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --created-before "2024-01-01T00:00:00Z"
```

**Combine multiple filters**:
```bash
# Stale unpinned tabs (old, not recently viewed)
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --unpinned \
  --created-before "2025-06-01T00:00:00Z" \
  --active-before "2025-12-01T00:00:00Z"

# Recently created and active tabs in specific space
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --space "Research" \
  --created-after "2025-12-01T00:00:00Z" \
  --active-after "2025-12-20T00:00:00Z" \
  --json
```

## Response format

### Text output (spaces)

Shows hierarchical structure with folders and tabs:

```
=== Space Name ===
📌 Inbox (folder)
    Tab Title
      https://example.com/url
    Another Tab
      https://another.com/url
📄 Archive (folder)
    Archived Tab
      https://archive.com
  Direct Tab (not in folder)
    https://direct.com
```

### Text output (folders)

```
=== Folders and Tabs ===

📌 Inbox (51 tabs) [PINNED]
   ID: folder-uuid
   Parent ID: parent-uuid
   - Tab Title
   - Another Tab
   - Third Tab
   ... and 48 more tabs

📄 Shopping (12 tabs) [UNPINNED]
   ID: folder-uuid
   - Tab Title
   - Another Tab
   ... and 10 more tabs

Total folders: 67
Total tabs: 1013
```

### JSON output (spaces) - Hierarchical structure

```json
[
  {
    "name": "Space Name",
    "id": "space-uuid",
    "items": [
      {
        "type": "folder",
        "id": "folder-uuid",
        "title": "Folder Name",
        "pinned": true,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "items": [
          {
            "type": "tab",
            "id": "tab-uuid",
            "title": "Page Title",
            "url": "https://example.com",
            "pinned": true,
            "createdAt": "2024-01-15T10:35:00.000Z",
            "lastActiveAt": "2025-12-30T14:20:00.000Z"
          }
        ]
      },
      {
        "type": "tab",
        "id": "tab-uuid",
        "title": "Direct Tab (not in folder)",
        "url": "https://example.com",
        "pinned": false,
        "createdAt": "2024-01-14T08:20:00.000Z",
        "lastActiveAt": "2025-12-29T16:45:00.000Z"
      }
    ]
  }
]
```

### JSON output (folders)

```json
{
  "Inbox": {
    "id": "folder-uuid",
    "title": "Inbox",
    "parentID": "parent-container-uuid",
    "pinned": true,
    "createdAt": "2024-01-10T09:00:00.000Z",
    "tabs": [
      {
        "id": "tab-uuid",
        "title": "Page Title",
        "url": "https://example.com",
        "pinned": true,
        "createdAt": "2024-01-15T10:35:00.000Z",
        "lastActiveAt": "2025-12-30T14:20:00.000Z"
      }
    ]
  }
}
```

## Key fields

### Space-based output (hierarchical)
- `name`: Space name
- `id`: Space UUID
- `items[]`: Array of items (tabs and folders)
  - **Folder item:**
    - `type`: "folder"
    - `id`: Folder UUID
    - `title`: Folder name (or null if unnamed)
    - `pinned`: Boolean - true if folder is pinned
    - `createdAt`: ISO 8601 timestamp when folder was created
    - `items[]`: Nested array of tabs/folders
  - **Tab item:**
    - `type`: "tab"
    - `id`: Tab UUID
    - `title`: Page title
    - `url`: Full URL
    - `pinned`: Boolean - inherited from parent folder/container
    - `createdAt`: ISO 8601 timestamp when tab was created
    - `lastActiveAt`: ISO 8601 timestamp when tab was last viewed/active

### Folder-based output (flat)
- `id`: Folder UUID
- `title`: Folder name (or UUID if unnamed)
- `parentID`: Parent folder/container ID (optional)
- `pinned`: Boolean - true if folder is pinned, false if unpinned
- `createdAt`: ISO 8601 timestamp when folder was created
- `tabs[]`: Array of tab objects
  - `id`: Tab UUID
  - `title`: Page title
  - `url`: Full URL
  - `pinned`: Boolean - inherited from folder
  - `createdAt`: ISO 8601 timestamp when tab was created
  - `lastActiveAt`: ISO 8601 timestamp when tab was last viewed/active

## Programmatic usage

The script can also be used as a Node.js module:

```javascript
const ArcTabOrganizer = require('~/Repositories/scripts/skills/arc-browser/arc-tabs.js');

const arc = new ArcTabOrganizer();

// Get all spaces with hierarchical structure
const spaces = arc.getSpaces();

// Get specific space
const hqSpace = arc.getSpace('HQ');

// Search tabs across all spaces (recursively searches folders)
const results = arc.searchTabs('documentation');

// Filter by domain (recursively searches folders)
const githubTabs = arc.getTabsByDomain('github.com');

// Filter tabs by various criteria
const recentUnpinned = arc.filterTabs({
  pinned: false,
  lastActiveAfter: '2025-12-24T00:00:00Z'
});

const oldPinnedInHQ = arc.filterTabs({
  spaceName: 'HQ',
  pinned: true,
  createdBefore: '2024-01-01T00:00:00Z'
});

const recentlyCreated = arc.filterTabs({
  createdAfter: '2025-12-01T00:00:00Z'
});

// Get tabs organized by folders (flat map view)
const folders = arc.getTabsByFolder(); // Returns Map

// Get specific folder
const inboxFolder = arc.getFolder('Inbox');

// Search tabs in folders
const folderResults = arc.searchTabsInFolders('design');
```

## Common workflows for AI agents

### Find stale tabs to close
```bash
# Unpinned tabs not viewed in 30 days
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --unpinned \
  --active-before "2025-12-01T00:00:00Z" \
  --json
```

### Get recent activity from a space
```bash
# Tabs from HQ active in past week
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --space "HQ" \
  --active-after "2025-12-24T00:00:00Z" \
  --json
```

### Analyze old but active tabs
```bash
# Tabs created >6 months ago but active in past week
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --created-before "2025-06-01T00:00:00Z" \
  --active-after "2025-12-24T00:00:00Z" \
  --json
```

### Find tabs from specific time period
```bash
# All tabs created in December 2025
node ~/Repositories/scripts/skills/arc-browser/arc-tabs.js \
  --created-after "2025-12-01T00:00:00Z" \
  --created-before "2026-01-01T00:00:00Z" \
  --json
```

## Limitations

- **JSON file dependency**: All data accessed through StorableSidebar.json (not live Arc state)
- **Some folders lack titles**: Folders without user-assigned names show as UUIDs
- **File system access required**: Needs read access to `~/Library/Application Support/Arc/`

## Implementation details

### Space-based access
- Parses StorableSidebar.json for complete folder/tab hierarchy
- Uses `getSpaces()` to build nested structure
- Includes pinned/unpinned status for all items
- Supports nested folders with arbitrary depth
- Recursive search methods for tabs and domains

### Folder-based access (flat view)
- Parses StorableSidebar.json in `~/Library/Application Support/Arc/`
- Maps tabs to folders via `parentID` property
- Each tab has `data.tab` with `savedTitle` and `savedURL`
- Each folder has `data.list` with `title` and `childrenIds`
- Supports nested folders through `parentID` chain
- Determines pinned/unpinned status from space containerIDs
  - Folders in "pinned" section are pinned
  - Tabs inherit pinned status from their folder
  - Status determined by traversing parent chain to space containerIDs

### General
- No external dependencies beyond Node.js
- No API keys or authentication required
- Data reflects Arc's current state (not cached)

## Error handling

The script handles:
- Arc not running (will fail with AppleScript error)
- Empty spaces (returns space with 0 tabs)
- Invalid space names (returns error message)
- Malformed URLs (skips tabs with invalid URLs in domain filtering)

## Performance

- Retrieving all tabs typically takes 1-3 seconds depending on tab count
- Scales linearly with number of tabs
- No rate limiting or throttling needed
