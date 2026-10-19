---
name: taxonomy
description: Chase's canonical tag corpus. ALWAYS use this skill when tagging, categorizing, or filing content in any system — Readwise Reader, Enchiridion, Obsidian, or blog posts — or when asked about tags, topics, or the taxonomy. Provides the canonical vocabulary, naming rules, and per-tool conventions. Never invent tags without consulting this skill.
version: 1.0.0
---

# Personal taxonomy

Chase maintains one canonical tag corpus across all tools. The source of truth is **production Enchiridion** (on the Mac mini, via Tailscale). A concept is in the corpus **iff it has a non-null `summary`** — the `isCurated` flag alone does not mark membership.

**Never invent a new tag while filing content.** Use corpus terms only. If nothing fits, file with the nearest corpus term and mention the gap to Chase — new tags go through governance (below), not through ad-hoc creation.

## Fetching the live corpus

```bash
curl -s -X POST "https://enchiridion-api.chsmc.tools/records" \
  -H 'Content-Type: application/json' \
  -d '{"filters":{"type":"concept"},"limit":500}' \
  | jq '[.[] | select(.summary) | {slug, title, summary}]'
```

Requires Tailscale. Once live, the public mirror at `https://chsmc.org/.well-known/tags` works from anywhere.

⚠️ **Never use the local `ench` CLI for corpus reads or writes** — it opens the dev database at `~/Repositories/enchiridion/enchiridion.db`, which is stale. Use the production API, or run `~/Library/pnpm/ench` on voyager over SSH.

## The four facets

1. **Topics** (33) — what something is *about*. Shared across all tools.
2. **Formats** (18) — what *kind* of thing it is. Applied in Enchiridion via `has_format`.
3. **Status/context** — workflow state (`#draft`, Reader locations, Things contexts). Per-tool by design; never part of the corpus.
4. **Entities** — people, organizations, places. Records and wikilinks, **never tags**. Rule: if it can have a biography, it's an entity.

## Topics (snapshot 2026-08-09 — production is authoritative)

**Design & craft**: `design`, `design-systems`, `typography`, `css`
**The web & computing**: `the-web`, `web-dev`, `software`, `ai`, `hypermedia`, `interfaces`, `communal-computing`
**Making & thinking**: `writing`, `blogging`, `publishing`, `creativity`, `knowledge-work`, `attention`, `archival-practices`
**Culture & society**: `culture`, `community`, `media`, `social-media`, `music`, `art`, `science-fiction`, `history`, `politics`, `capitalism`
**Living**: `life`, `work`, `relationships`, `travel`, `sexuality`

Disambiguation notes (from the concept summaries):
- `the-web` is the web as medium and place; `web-dev` is building for it; `hypermedia` is the ideas beneath it (links, hypertext).
- `attention` is the economics and ethics of attention, **not** productivity tips — those go to `knowledge-work`.
- `capitalism` covers all political economy (it absorbed `economics`).
- `knowledge-work` absorbed `productivity`; tools-for-thought and research practice live here.
- `communal-computing` covers self-hosting and home-cooked software.

## Formats (18)

`article`, `essay`, `book`, `novel`, `newsletter`, `podcast`, `talk`, `video`, `tweet`, `website`, `blog`, `tool`, `product`, `quote`, `aphorism`, `definition`, `idea`, `method`

Notes: `blog` is a body of work, `website` a site notable as a site; `method` covers techniques and tutorials; a PDF is not a format — use what the content is (`essay`, `book`, …).

## Watchlist — do NOT apply as tags

Real interests below the promotion bar (~5 tagged items across 2+ systems): `animation`, `film`, `science`, `security`, `shame`, `systems`. Pending Chase's verdict: `self-hosting`, `research`. Vault-only candidates: open-source, APIs, poetry, retro computing, protocols. These exist as uncurated concepts or wikilinks; mention to Chase when content keeps landing near one.

## Naming rules

- **Canonical ID**: kebab-case slug (`design-systems`, `the-web`)
- **Display name**: sentence case ("Design systems", "The web")
- **Reader tags**: lowercased display name ("design systems", "the web")
- **Obsidian**: wikilinks to display-name notes (`[[Design systems]]`, `[[The web]]`) — **never `#tags`** (those are only for status like `#draft` and Readwise auto-tags)
- **Blog frontmatter**: slugs (`tags: [the-web, blogging]`)

## Per-tool application

| System | How |
|---|---|
| Readwise Reader | 1–3 topic tags per doc, lowercased display names. Leave `instapaper-favorites` alone (provenance, not topic). |
| Enchiridion | Topics via `tagged_with` links, formats via `has_format`, both pointing at concept records. Write via production API (`PUT /link`) or ench on voyager. |
| Obsidian | Wikilink concept notes in prose or `related` frontmatter. Never topic `#tags`. |
| Blog | `tags:` frontmatter with slugs (once the schema lands). |
| Things / Apple Notes | Out of scope — contexts and capture, not topics. |

## Governance

- **Upstream rule**: no tag exists in any downstream tool that isn't an Enchiridion concept first.
- **Promotion**: when ~5 items across two systems need a watchlist term, create/update the concept in production with a one-line `summary`, then start using it in tools.
- **Prefer specific over broad** when two topics fit; cap at ~3 topics per item.
- **Merges/renames**: Reader side first (empty the old tag), then Enchiridion (the sync resurrects concepts whose Reader tag still has documents). Renames of concept records keep all links (they're by id).
