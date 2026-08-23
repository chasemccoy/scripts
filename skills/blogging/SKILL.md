---
name: blogging
description: Manage blog posts in Markdown format. Use when user asks to search, create, edit, list, get, or review blog posts for style conformance.
allowed-tools: Bash, Read, Write, Edit, Glob, AskUserQuestion
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

## Creating a New Blog Post (Agent Workflow)

When the user asks to create a new blog post, the CLI script handles the mechanics of making the files — but the agent is responsible for the thinking that happens first. Don't jump straight to `create`. Work through the steps below.

The user's request often includes raw material: a link, quoted text, drafted thoughts, or an image/video attachment or URL. Treat whatever they provide as the seed for the post and carry it through the conversation.

### Step 1: Ask which kind of post this is

Use the **AskUserQuestion** tool (use it for *all* inquiries in this workflow) to ask whether the user wants:

- **A quick link post** — a short post (roughly 100–200 words) that shares a link, quote, or observation with light commentary. See the "Post length patterns" section in the voice notes (Style Guide Review below).
- **A longer draft** — a medium or long post they want to develop and iterate on.

### Step 2: Gather related material from the user's knowledge base

This step runs for **both** kinds of post, before asking the angle questions. Search the user's own sources for related topics, links, and ideas so the findings can inform the questions you ask and ground the draft in their existing thinking. Use the relevant skills rather than raw tools:

- **Obsidian notes** — use the **obsidian-vault** skill. Prefer `arrowhead search hybrid "query"` for discovery; fall back to `obsidian search query="..."`. Search on the post's core topic and any key terms.
- **Past blog posts** — use the **blogging** skill's own `search` command (`node ~/Repositories/scripts/skills/blogging/blog-cli.js search "query"`) to find related posts the user has already written.
- **Enchiridion** — use the **enchiridion** skill to find saved links, references, and research on the topic. Search PRODUCTION (see that skill's "two databases" section — query the API at `enchiridion-api.chsmc.tools`), not the local `ench` dev database.

Pull the most relevant hits from each source. Use them to:
1. **Inform the questions** in the next step — e.g. "You wrote about X last year; is this a follow-up or a different angle?" or surface a saved link they may want to reference.
2. **Seed the draft** — they get collected at the bottom of the post (see Step 4).

### Step 3a: If a quick link post

Don't over-interrogate. Confirm the angle or the one thing they want to say about it, then create the post with the link/quote and a brief commentary draft already filled in. Keep it tight and in their voice.

### Step 3b: If a longer draft

Grill the user with questions (via AskUserQuestion) to find the angle before writing anything. Fold in what you found in Step 2. The goal is to figure out what they actually want to *say*, not just the topic. Probe things like:

- What's the core point or argument? What should the reader take away?
- Why does this matter to them right now — what's the personal hook?
- What's the angle that makes it theirs and not a generic take?
- Who/what should be credited or linked (the style guide favors generous linking)?
- What connections to other ideas, past posts, or domains are worth drawing in?
- How should it end — open question, forward-looking note, invitation?

Ask in rounds if needed; keep going until the angle is clear. Reflect their answers back so they know you've got it.

### Step 4: Create the post with a draft/outline

Once the angle is settled, create the post using the CLI `create` command, then fill it with a draft or outline for the user to edit — not a blank file. Write the draft in the house style — read both references in the Style Guide Review section below first. Incorporate the raw material they provided (links, quotes, images) and structure the draft around the angle you landed on together. For a longer post, an outline with section stubs and notes-to-self is fine; for a link post, a near-complete short draft is better.

**At the bottom of the draft, add a "Related" section** collecting the relevant material found in Step 2 — link the Obsidian notes (using `obsidian://open?vault=Notes&file=...` URIs), past blog posts, and Enchiridion records (`https://enchiridion.chsmc.tools/{slug}`). This is reference scaffolding for the user while drafting, not necessarily final post content — they can prune or weave it in as they edit.

After creating, open it in iA Writer (see the Create Post command above).

## Style Guide Review

Two references, and both matter when drafting or reviewing:

1. **The canonical house style guide** — `~/Repositories/www/src/pages/style-guide.md`, published at [chsmc.org/style-guide](https://chsmc.org/style-guide). Authoritative for punctuation, capitalization, numbers, titles and tags, links, quoting, formatting, and word choice. Where anything else disagrees with it, it wins.
2. **Voice notes** — `~/Repositories/scripts/skills/blogging/STYLE_GUIDE.md`. Voice, tone, and structural patterns the canonical guide doesn't cover: opening strategies, paragraph rhythm, verbal tics, endings.

When asked to review a post for style conformance:
1. Read the post using the `get` command
2. Read both references at the paths above
3. Provide feedback on:
   - Punctuation, capitalization, links, quoting, and formatting (per the canonical guide)
   - Voice and tone alignment (per the voice notes)
   - Structural patterns (paragraph length, opening/closing)
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
