---
name: lab
description: Manage code examples and demos in the lab project. Use when user asks to create, list, search, or view lab examples.
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Lab Examples Management

Interact with code examples in `~/Repositories/lab/data/` directory. The lab is a SvelteKit site that auto-discovers examples (HTML or React) from the data directory.

## Project Location

Lab directory: `/Users/chase/Repositories/lab`
Examples directory: `/Users/chase/Repositories/lab/data`

## Example Formats

### HTML Examples

HTML files with YAML frontmatter:

```html
---
title: Example Title
description: Optional description with **markdown** support
tags: ["ui", "animation"]
minHeight: "60vh"
---
<!DOCTYPE html>
<html>
<head>
  <style>
    /* CSS here */
  </style>
</head>
<body>
  <!-- HTML here -->
  <script>
    // JavaScript here
  </script>
</body>
</html>
```

**Metadata fields**:
- `title` (required): Display name for the example
- `description` (optional): Markdown-formatted description
- `tags` (required): Array of tags like `["ui", "animation", "generative art"]`
- `minHeight` (optional): Minimum height for preview (e.g., "60vh", "800px")

### React Examples

JSX files with default export and meta export:

```jsx
export const meta = {
  title: "Example Title",
  description: "Optional description",
  tags: ["ui", "animation"]
}

export default function ExampleComponent() {
  return (
    <div>
      {/* Component JSX here */}
    </div>
  )
}
```

## Naming Conventions

- **Filename**: kebab-case (e.g., `animated-border.html`, `button-hover.jsx`)
- **Slug**: Auto-generated from filename without extension
- **Categories**: Auto-determined from tags:
  - Tags include "ui" → ui category
  - Tags include "generative art" → generative art category
  - Otherwise → misc category

## Common Operations

### List All Examples

```bash
ls /Users/chase/Repositories/lab/data/
```

### Search Examples by Pattern

```bash
ls /Users/chase/Repositories/lab/data/ | grep "pattern"
```

### View Example Metadata

For HTML files, read the frontmatter:
```bash
head -20 /Users/chase/Repositories/lab/data/example-name.html
```

For React files, read the meta export:
```bash
head -10 /Users/chase/Repositories/lab/data/example-name.jsx
```

### Create New HTML Example

Use the Write tool with proper frontmatter format:

```html
---
title: New Example
tags: ["ui"]
---
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      display: grid;
      place-items: center;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
```

### Create New React Example

Use the Write tool with proper meta export:

```jsx
export const meta = {
  title: "New React Example",
  tags: ["ui", "animation"]
}

export default function NewExample() {
  return (
    <div>
      <h1>Hello React</h1>
    </div>
  )
}
```

## Development Workflow

After creating a new example:

1. The file is automatically discovered (no config updates needed)
2. Accessible at: `http://localhost:5173/slug-name`
3. To test locally: `cd /Users/chase/Repositories/lab && yarn dev`