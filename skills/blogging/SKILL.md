---
name: blogging
description: Manage blog posts in Markdown format. Use when user asks to search, create, edit, list, get, or review blog posts for style conformance.
allowed-tools: Bash, Read, Write, Edit, Glob
---

# Blog Post Management

Interact with blog posts at `~/Repositories/www/posts/` using the CLI script. Posts are Markdown files or folders containing `index.md`, named as `YYYY-MM-DD-slug.md`.

## Script Location

`~/Repositories/scripts/skills/blogging/blog-cli.js`

## Post Format

- Filename: `YYYY-MM-DD-slug.md` or `YYYY-MM-DD-slug/index.md`
- Date and slug extracted from filename
- Optional YAML frontmatter with `title` key
- Titles are optional

## Available Commands

### List All Posts
Get a list of all blog posts with dates, slugs, and titles:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js list
```

### Search Posts
Search for posts by slug, title, or content:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js search "query"
```

### Get Post Content
Retrieve the full content of a specific post by slug:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js get "slug"
```

### Create Post
Create a new post with slug and optional title:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js create "slug" --title "Post Title"
```

Date is automatically set to today. Use `--date YYYY-MM-DD` to specify a different date.

**After creating a new post, open it in iA Writer:**
```bash
open -a "iA Writer" ~/Repositories/www/posts/YYYY-MM-DD-slug.md
```

### Edit Post
Update the content of an existing post by slug. Preserves frontmatter:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js edit "slug" "New content"
```

### Convert to Folder
Convert a single file post to a folder with `index.md`:
```bash
node ~/Repositories/scripts/skills/blogging/blog-cli.js convert-to-folder "slug"
```

This is useful when you want to add images or other assets to a post.

## Style Guide Review

A personal style guide is available at `~/Repositories/scripts/skills/blogging/STYLE_GUIDE.md`.

When asked to review a post for style conformance:
1. Read the post using the `get` command
2. Read the style guide at the path above
3. Provide feedback on:
   - Voice and tone alignment
   - Structural patterns (paragraph length, opening/closing)
   - Punctuation usage (em dashes, semicolons, italics)
   - Link and citation formatting
   - Language patterns and verbal tics
   - Balance of technical vs. personal content

## Usage Notes

- All commands use the full path to the script
- Slugs with spaces should be quoted
- Search queries match slug, title, and body content
- For folder-based posts, the script reads/writes to `index.md`
- Edit command preserves YAML frontmatter and only replaces content

## Common Operations

### Finding a Post
1. Use `list` to see all posts with dates and titles
2. Use `search` if you know part of the slug, title, or content
3. Use `get` to retrieve the full content once you have the slug

### Creating Content
1. Use `create` with a slug and optional title
2. Open the created file in iA Writer for editing
3. Content can also be added after creation using `edit`

### Updating Posts
1. First `get` the current content if needed
2. Use `edit` with the slug and new content (frontmatter is preserved)
