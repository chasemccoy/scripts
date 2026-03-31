---
name: lab
description: Manage code examples and demos in the lab project. Use when user asks to create, list, search, or view lab examples.
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Lab Examples Management

Interact with code examples in `~/Repositories/lab/data/` directory. The lab is a SvelteKit site that auto-discovers examples (HTML or React) from the data directory.

## Project Location

Lab directory: `~/Repositories/lab`
Examples directory: `~/Repositories/lab/data`

## Example Formats

### HTML Examples

HTML files with YAML frontmatter. No DOCTYPE, `<html>`, `<head>`, or `<body>` tags are needed — the file is injected directly into the page. Write `<style>` and `<script>` tags at the top level alongside your HTML:

```html
---
title: Example Title
description: Optional description with **markdown** support
tags: ["ui", "animation"]
minHeight: "60vh"
---
<style>
  /* CSS here */
</style>

<!-- HTML here -->

<script>
  // JavaScript here
</script>
```

**Metadata fields**:
- `title` (required): Display name for the example
- `description` (optional): Markdown-formatted description
- `tags` (required): Array of tags like `["ui", "animation", "generative art"]`
- `minHeight` (optional): Minimum height for preview (e.g., "60vh", "800px")

### React Examples

JSX files with a `meta` export at the top and a default export component. React is auto-imported — use `React.useState`, `React.useEffect`, etc. from the global rather than named imports from `"react"`.

Styles go in a JSX `<style>` element rendered inside the component — not inline style objects:

```jsx
export const meta = {
  title: "Example Title",
  description: "Optional description",
  tags: ["ui", "animation"],
}

const styles = (
  <style>{`
    .wrapper { display: flex; padding: 40px; justify-content: center; }
  `}</style>
)

export default function Demo() {
  const [value, setValue] = React.useState(0)

  return (
    <div>
      {styles}
      <div className="wrapper">Hello {value}</div>
    </div>
  )
}
```

**CDN imports in JSX:** Use `/* @vite-ignore */` for runtime CDN imports inside `useEffect` (not at module top level, which runs during SSR):

```jsx
React.useEffect(() => {
  import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/some-pkg/dist/index.js").then(setModule)
}, [])
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
ls ~/Repositories/lab/data/
```

### Search Examples by Pattern

```bash
ls ~/Repositories/lab/data/ | grep "pattern"
```

### View Example Metadata

For HTML files, read the frontmatter:
```bash
head -20 ~/Repositories/lab/data/example-name.html
```

For React files, read the meta export:
```bash
head -10 ~/Repositories/lab/data/example-name.jsx
```

### Create New HTML Example

Use the Write tool with proper frontmatter format:

```html
---
title: New Example
tags: ["ui"]
---
<style>
  body {
    margin: 0;
    display: grid;
    place-items: center;
    min-height: 100vh;
  }
</style>

<h1>Hello World</h1>
```

### Create New React Example

Use the Write tool. The `meta` export goes at the top:

```jsx
export const meta = {
  title: "New React Example",
  tags: ["ui", "animation"],
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
2. Accessible at: `http://localhost:2000/slug-name`
3. To test locally: `cd ~/Repositories/lab && yarn dev`