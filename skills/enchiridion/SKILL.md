---
name: enchiridion
description: Manage Enchiridion knowledge repository. Use when user asks to search, create, update, link, or query records in their knowledge base.
allowed-tools: mcp__enchiridion__search, mcp__enchiridion__create, mcp__enchiridion__update, mcp__enchiridion__link, mcp__enchiridion__query
---

# Enchiridion Knowledge Repository

Enchiridion is a custom SQLite-based knowledge repository for long-term storage of links, references, sources, and research materials. Interact with it using the MCP server tools.

## Record Types

- **artifact**: A piece of content (article, video, book, etc.)
- **entity**: A person, organization, or place
- **concept**: An idea, topic, or tag

## Available MCP Tools

### search
Search for records with filters and ordering.

```
filters: { text, title, url, hasMedia, hasParent, isCurated }
orderBy: [{ field, direction }]
limit, offset
```

Fields for ordering: `recordCreatedAt`, `recordUpdatedAt`, `title`, `contentCreatedAt`, `contentUpdatedAt`, `id`, `slug`, `type`

**When presenting search results**: Always link to records using `https://enchiridion.chsmc.tools/{slug}` where `{slug}` is the record's slug field.

### create
Create a new record. Required: `title`, `slug`. Optional: `content`, `summary`, `url`, `type`.

### update
Update an existing record by slug. Will create if doesn't exist.

### link
Link two records with a predicate: `sourceId`, `targetId`, `predicateId`

### query
Execute raw SQL against the database. Schema available at `schema://main` resource.

## Predicates Reference

Use canonical predicates (canonical=1) when creating links.

| ID | Slug | Name | Type | Inverse |
|----|------|------|------|---------|
| 1 | created_by | created by | creation | creator_of |
| 3 | via | via | creation | source_for |
| 5 | edited_by | edited by | creation | editor_of |
| 7 | contained_by | contained by | containment | contains |
| 9 | quotes | quotes | containment | quoted_in |
| 11 | has_format | has format | description | format_of |
| 13 | tagged_with | tagged with | description | tag_of |
| 15 | references | references | reference | referenced_by |
| 17 | about | about | reference | subject_of |
| 19 | related_to | related to | association | related_to |
| 20 | same_as | same as | identity | same_as |

## Common Operations

### Find records by text
```
mcp__enchiridion__search with filters: { text: "search term" }
```

### Get recent records
```
mcp__enchiridion__search with orderBy: [{ field: "recordCreatedAt", direction: "desc" }], limit: 10
```

### Create and link a new artifact
1. Create the record with `mcp__enchiridion__create`
2. Link it using `mcp__enchiridion__link` with appropriate predicate

### Find records by creator
```
mcp__enchiridion__query with SQL:
SELECT r.* FROM records r
JOIN links l ON r.id = l.source_id
WHERE l.target_id = [creator_id] AND l.predicate_id = 1
```

## Schema Reference

### Search Tool Fields (camelCase)
The `search` tool uses camelCase field names for `orderBy`:
- `recordCreatedAt`, `recordUpdatedAt`, `contentCreatedAt`, `contentUpdatedAt`
- `id`, `slug`, `type`, `title`

### Database Schema (snake_case)
The `query` tool uses raw SQL against the actual database with snake_case columns:

**records**: `id`, `slug`, `type`, `title`, `url`, `is_curated`, `summary`, `content`, `notes`, `source`, `created_at`, `updated_at`, `content_created_at`, `content_updated_at`

**links**: `id`, `source_id`, `target_id`, `predicate_id`, `notes`, `created_at`, `updated_at`

**predicates**: `id`, `slug`, `name`, `type`, `role`, `inverse_slug`, `canonical`, `created_at`, `updated_at`

**media**: `id`, `record_id`, `url`, `alt_text`, `type`, `content_type_string`, `file_size`, `width`, `height`, `created_at`, `updated_at`

⚠️ **Important**: Use `created_at` (snake_case) in SQL queries, but `recordCreatedAt` (camelCase) in the search tool's `orderBy` parameter.
