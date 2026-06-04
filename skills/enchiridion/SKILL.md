---
name: enchiridion
description: Manage Enchiridion knowledge repository. Use when user asks to search, create, update, link, or query records in their knowledge base.
allowed-tools: Bash
---

# Enchiridion knowledge repository

Enchiridion is a custom SQLite-based knowledge repository for long-term storage of links, references, sources, and research materials. Interact with it through the `ench` CLI — a stdio interface installed globally on PATH.

## Output format

All commands print JSON on stdout by default with shape `{data, meta}` (or `{error: {code, message}}` on stderr with exit 1). Useful global flags:

- `--format=table` — human-readable table output
- `--raw` — drop the `{data, meta}` envelope and print just `data`
- `--dry-run` / `-n` — preview mutations without writing
- `--debug` — print stack traces on errors

When piping to `jq` or otherwise parsing, default JSON output is what you want.

## Record types

- **artifact**: A piece of content (article, video, book, etc.)
- **entity**: A person, organization, or place
- **concept**: An idea, topic, or tag

## Linking to records

When presenting search results or referencing records, always link to them using `https://enchiridion.chsmc.tools/{slug}` where `{slug}` is the record's slug field.

## Core commands

### Records

```bash
ench records get <id> [--links]              # Fetch a record (optionally with links)
ench records list [filters]                   # List records (ids only by default)
ench records list --full                      # List full records, not just ids
ench records create '<json>'                  # Create a record
ench records update <id> '<json>'             # Update a record
ench records bulk-update <id,id,...> '<json>' # Bulk-update
ench records delete <id...>                   # Delete record(s)
ench records merge <src> <target>             # Merge src into target
ench records tree <id>                        # Family tree (parent/siblings/children)
ench records children <id>                    # Direct children
ench records parent <id>                      # Direct parent
ench records similar <id> [--limit=N]         # Records similar by embedding
ench records embed <id> [--force]             # Force-regenerate embedding
```

**List filters** (`ench records list`):
- `--type=artifact|entity|concept` (comma-separated for multiple)
- `--source=manual|readwise|twitter` (comma-separated)
- `--curated[=BOOL]` — by isCurated
- `--parent[=BOOL]` — has containment parent
- `--media[=BOOL]` — has media attached
- `--has-title[=BOOL]` — title is non-null
- `--embedding[=BOOL]` — has stored embedding
- `--order=<field:dir,...>` — e.g. `recordCreatedAt:desc,title:asc`
- `--limit=N --offset=N` — pagination
- `--full` — return full records instead of `{id, slug, title}` stubs

**Create/update JSON shape**: required `title`, `slug`; optional `content`, `summary`, `url`, `type`, `notes`, `source`, `isCurated`, `contentCreatedAt`, `contentUpdatedAt`. Example:

```bash
ench records create '{"slug":"foo","title":"Foo","type":"concept"}'
```

### Search

```bash
ench search "<query>"                   # Hybrid (text + vector, RRF merge) — default
ench search text "<query>" [--type=...] # Trigram substring search
ench search semantic "<query>"          # Vector search (requires OPENAI_API_KEY)
ench search similar <id> [--limit=N]    # Similarity by record id
```

All search subcommands accept `--limit=N`. `semantic` also accepts `--exclude=id,id`.

### Links

```bash
ench links list <record-id> [--predicate=<slug>] [--direction=incoming|outgoing]
ench links create '<json>'         # { sourceId, targetId, predicate, notes? }
ench links delete <id...>
ench links predicates              # Dump the predicate vocabulary
```

⚠️ **`links create` takes a predicate `slug`, not `predicateId`**. Example:

```bash
ench links create '{"sourceId":123,"targetId":456,"predicate":"created_by"}'
```

### Inbox (unpromoted Readwise documents)

```bash
ench inbox list [--limit=N]
ench inbox next                          # Next document
ench inbox promote <document-id> [--curated]
ench inbox dismiss <document-id>         # Soft-delete
```

### Sync, db, wayback

```bash
ench sync                                # All integrations + embedding backfill
ench sync readwise
ench sync embeddings [--force]

ench db status
ench db backup [--out=path]
ench db restore <path>

ench wayback archive <url-or-id>
ench wayback status <url>
```

## Predicates reference

Use canonical predicates (`canonical=true`) when creating links. Pass the `slug` (e.g. `"created_by"`) as the `predicate` field — the CLI does not use predicate IDs.

| Slug | Name | Type | Inverse |
|------|------|------|---------|
| created_by | created by | creation | creator_of |
| via | via | creation | source_for |
| edited_by | edited by | creation | editor_of |
| contained_by | contained by | containment | contains |
| quotes | quotes | containment | quoted_in |
| has_format | has format | description | format_of |
| tagged_with | tagged with | description | tag_of |
| references | references | reference | referenced_by |
| about | about | reference | subject_of |
| related_to | related to | association | related_to |
| same_as | same as | identity | same_as |

Run `ench links predicates --format=table` for the live, complete vocabulary including inverse slugs.

## Common workflows

### Find records by text

```bash
ench search "knowledge graph" --limit=10
```

### Get recent records

```bash
ench records list --order=recordCreatedAt:desc --limit=10 --full
```

### Create and link a new artifact

```bash
# 1. Create the record
ench records create '{"slug":"my-article","title":"My Article","type":"artifact","url":"https://example.com"}'
# → returns the new record with its `id`

# 2. Link it to a creator entity
ench links create '{"sourceId":<new-id>,"targetId":<creator-id>,"predicate":"created_by"}'
```

### Find a record's creator(s)

```bash
ench links list <record-id> --predicate=created_by --direction=outgoing
```

### Browse the Readwise inbox

```bash
ench inbox list --limit=20 --format=table
ench inbox promote <doc-id> --curated
```

### Preview a destructive change

```bash
ench records delete 123 --dry-run
ench records merge 123 456 -n
```

## Schema reference

Field names in CLI inputs and outputs are **camelCase** (e.g. `recordCreatedAt`, `isCurated`, `sourceId`).

**records**: `id`, `slug`, `type`, `title`, `url`, `isCurated`, `summary`, `content`, `notes`, `source`, `recordCreatedAt`, `recordUpdatedAt`, `contentCreatedAt`, `contentUpdatedAt`

**links**: `id`, `sourceId`, `targetId`, `predicate` (slug), `notes`, `recordCreatedAt`, `recordUpdatedAt`

**predicates**: `slug`, `name`, `type`, `role`, `inverseSlug`, `canonical`

**media**: `id`, `recordId`, `url`, `altText`, `type`, `contentTypeString`, `fileSize`, `width`, `height`, `recordCreatedAt`, `recordUpdatedAt`

For raw SQL access (rare; use only when no CLI command fits), open the SQLite file directly at `~/Repositories/enchiridion/enchiridion.db` — note that the on-disk schema uses **snake_case** columns (`created_at`, `is_curated`, `source_id`, etc.).
