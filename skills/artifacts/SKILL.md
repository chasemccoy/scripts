---
name: artifacts
description: Save, update, and find HTML artifacts (prototypes, tools, reports, explainers, visualizations, design explorations, shader toys) in Chase's artifact archive with the `artifacts` CLI. Browsable at artifacts.chsmc.tools. Use when the user asks to save, keep, file, or archive an HTML page or folder an agent made; when you finish a standalone HTML page made for Chase to look at; or when the user asks to find, open, or list something an agent made before ("that gradient tool", "the report from last week").
allowed-tools: Bash, Read
---

# Artifacts

Chase keeps the HTML artifacts agents make for him in one git-tracked archive: `~/Repositories/artifacts`, one
folder per artifact under `library/`, each with the artifact's own files, a `meta.json`, and a `thumb.jpg`
screenshot. The gallery at https://artifacts.chsmc.tools (tailnet-only, on voyager) shows them as a searchable
contact sheet. The `artifacts` CLI is on PATH on the MacBook and on voyager.

## When to save

- **Chase asks** to save, keep, file, or archive something: always.
- **You finish a standalone HTML page made for Chase to look at**: a report, explainer, prototype, tool,
  visualization, or design exploration, including one you publish with the Artifact tool. Save it without asking
  and mention the link in your reply.
- **Not**: scratch or debug pages, test fixtures, pages that are part of a repo's own product or site, anything
  containing secrets. When unsure, offer in one line instead.

Save the finished version. If you keep iterating after saving, use `update`, not a second `add`.

## Saving

```bash
artifacts add <file.html | folder | -> \
  --title "Sentence case title" \
  --description "One sentence on what it is." \
  --kind <prototype|tool|report|explainer|visualization|design|experiment> \
  --tag <topic> [--tag <topic>] \
  [--project <repo>] [--url <source url>] [--entry <page.html>] [--star] [--notes "…"]
```

- **A folder is the artifact** when it has more than one file (images, scripts, extra pages): pass the folder and
  everything in it is kept, relative links intact. If it has several HTML pages and no `index.html`, name the main
  one with `--entry`. A single `.html` file is saved as `index.html`, along with any local files it references by
  relative path.
- `-` reads HTML from stdin (handy for a page you generated in memory).
- **Tags**: 1–3 topic slugs from the taxonomy skill's canonical corpus (`css`, `typography`, `design`, `ai`,
  `web-dev`, …). Never invent tags; leave them off if nothing fits and mention the gap.
- `--project` defaults to the git repo you run it from; `--agent` defaults to `claude-code` inside Claude Code.
- Title and description fall back to the page's `<title>` and meta description; pass better ones when those are
  missing or generic.

`add` copies the files in, screenshots the page (a few seconds), commits, pushes, and nudges voyager to pull.
It prints the folder and the gallery URL (`https://artifacts.chsmc.tools/view/<id>`); give Chase the URL.
Add `--json` for machine-readable output.

## Updating and editing

```bash
artifacts update <id> <file|folder>          # new version: replaces the files, keeps metadata, retakes the thumbnail
artifacts edit <id> --add-tag css --star     # also --title, --description, --kind, --project, --notes, --tag (replace), --remove-tag, --unstar
artifacts thumb <id>                         # retake a screenshot that came out blank or mid-animation
```

Deleting is only for when Chase asks. It removes the folder and commits; git history keeps a copy:

```bash
artifacts delete <id> --yes                  # full id or the slug after the date; prefixes are refused
```

Ids look like `2026-07-04-ghibli-clouds-shader`; the part after the date (or any unambiguous prefix) works too.

## Finding

```bash
artifacts search "cloud shader"      # titles, tags, descriptions, notes, and page text; fuzzy
artifacts list [--kind tool] [--tag css] [--project familiar] [--starred] [--limit 10]
artifacts show <id>                  # metadata, file path, URL
artifacts path <id>                  # just the folder
artifacts open <id> [--local]        # gallery page, or the file itself
```

Give Chase the gallery URL for anything he'll want to look at; read the files from `artifacts path <id>` when you
need the contents.

## Notes

- Don't edit `library/` by hand, and don't delete artifacts unless Chase asks; the gallery and other machines commit to
  the same repo, so go through the CLI (it pulls first).
- `--no-commit` / `--no-push` stop short of git, for trying things out.
- Details: `~/Repositories/artifacts/README.md`.
