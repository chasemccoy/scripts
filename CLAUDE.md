# Claude Configuration

## About the user

- Name: Chase McCoy
- Location: Chicago, IL
- Age: 30
- Role: Product designer, frontend engineer, and blogger

## Environment

- When working with shell commands, use zsh-compatible syntax (this is macOS with zsh as default shell). Avoid bash-specific syntax like brace expansion that may not work as expected.

## Machines

Two macOS machines. Both report the hostname `mac.lan`, so always disambiguate by user account (`chase` vs `voyager`), never by hostname.

### This machine — MacBook Air (user `chase`, `~` = `/Users/chase`)

The daily driver and the only place development happens. All repos, writing, notes, and agent work live here. Nothing is authored directly on voyager.

### Voyager — Mac mini (user `voyager`, `~` = `/Users/voyager`)

Always-on home server. Runs the personal apps, holds their production data, and hosts background services. Reach it with:

```bash
ssh voyager
```

- Configured in `~/.ssh/config` (`Host voyager` → `HostName voyager`, `User voyager`), resolved via Tailscale MagicDNS.
- **The same command works at home and away** — Tailscale handles it either way, taking a direct LAN path at home (`192.168.86.38`) and relaying when remote. There is no separate "local" vs "remote" procedure; don't reach for `.local` addresses or LAN IPs.
- Tailnet IP: `100.127.164.4`. Tailnet name: `voyager.tail9000e.ts.net`.
- Voyager has its own `~/CLAUDE.md`, which is a **stale copy** of this file (missing the newer skills). Don't assume the two are in sync; edits here don't propagate.

## Deploying to voyager

Apps are developed on the MacBook and run on voyager. There is no CI/CD for these — deploys are manual and pull-based:

1. Build and test locally on the MacBook.
2. Commit and push to GitHub (`chasemccoy/<repo>`).
3. `ssh voyager`, then in `~/Repositories/<repo>`: `git pull`.
4. `pnpm install` if dependencies changed.
5. `pm2 restart <name>`.

### Voyager's stack

- **Process manager: pm2.** Config at `~/Repositories/dotfiles/voyager/ecosystem.config.js`, symlinked to `~/Documents/ecosystem.config.js` on voyager. One entry per app. Use `pm2 list` for state, `pm2 logs <name>` for output, `pm2 restart <name>` after a pull. Brought up at login by `~/Library/LaunchAgents/pm2.voyager.plist`, which runs `pm2 resurrect` from `~/.pm2/dump.pm2` — so **run `pm2 save` after adding, removing, or renaming an app**, or the change silently disappears at the next reboot.
- **Reverse proxy: Caddy.** Config at `~/Repositories/dotfiles/voyager/Caddyfile`, symlinked to `~/Documents/Caddyfile`. Listens on 80/443 and maps each `*.chsmc.tools` hostname to a localhost port. Adding a new app means adding both an ecosystem entry and a Caddyfile block.
- **TLS:** Caddy issues certs via the Cloudflare DNS-01 challenge, so nothing needs to be publicly exposed to get valid HTTPS. The API token is **not** in the Caddyfile — it's read as `{env.CLOUDFLARE_API_TOKEN}` from `~/.config/caddy/.env` on voyager (mode 600, outside git), which the `caddy` pm2 entry sources before exec'ing Caddy.
- **Caddy runs in the foreground** under pm2 via `exec caddy run`, so pm2 supervises the real process and restarts it if it dies. Don't switch it back to `caddy start` — that daemonizes, which leaves pm2 supervising nothing. See `voyager/README.md` in dotfiles for the details.
- **Binary paths:** pm2 runs entries through `/bin/bash -c` with a minimal PATH that excludes `/usr/local/bin` (where Caddy lives). Use absolute paths in ecosystem `script` values.
- **Networking:** every `*.chsmc.tools` record is a CNAME to `voyager.tail9000e.ts.net`, which resolves only to the Tailscale IP. **These apps are tailnet-only, not public.** They're reachable from any tailnet device, at home or away, at the same URLs.

### Finding what's running on voyager

Never assume a fixed list of services — it changes. Three sources of truth:

- **What runs, and from where** — `~/Repositories/dotfiles/voyager/ecosystem.config.js`. One entry per app with its `cwd` and start script. This is the canonical list of deployed apps.
- **What's exposed, and on which port** — `~/Repositories/dotfiles/voyager/Caddyfile`. Each `*.chsmc.tools` hostname and the localhost port it proxies to.
- **What's actually alive right now** — `pm2 list` on voyager, then `pm2 logs <name>` to see why something is down.

The first two are versioned in the dotfiles repo and symlinked into `~/Documents` on voyager, so **read them locally — no SSH needed** (pull dotfiles first). See `voyager/README.md` there for how the pieces fit together. Only live state needs a connection:

```bash
ssh voyager 'PATH=/opt/homebrew/bin:$PATH pm2 list'
```

Notes on reading them:

- `pm2` isn't on `PATH` in a non-interactive SSH session — prefix with `PATH=/opt/homebrew/bin:$PATH` as above.
- An app is only fully wired up when it appears in **both** files: the ecosystem entry starts it, the Caddyfile block exposes it. Apps present in only the ecosystem config are localhost-only on voyager with no URL.
- Ports are set in more than one place, so treat the Caddyfile as authoritative for what a hostname maps to. Some ecosystem entries carry a `port` field that reaches the app as `env.PORT`; others hardcode the port in the repo's own `package.json` dev script.
- To identify an app's stack, read `package.json` in its `cwd`.

### Things to know before touching voyager

- **Apps run in dev mode under pm2**, not as production builds — `pnpm run dev`, `vite --host`, `wrangler dev`. The `deploy:prod` (trailmix) and `deploy` (concierge) scripts are really "build the app, then run preview + backend concurrently." A `git pull` plus `pm2 restart` is the whole deploy; there's no build artifact to ship.
- **Production data lives only on voyager.** SQLite files sit inside the repo directories (`~/Repositories/enchiridion/enchiridion.db` is ~41MB) and are gitignored. Local clones have their own empty or stale copies — never treat a local DB as authoritative. Follow the existing rule about not writing to live app databases: copy first, inspect the copy. Enchiridion backups land in `~/enchiridion-backups` on voyager.
- **Secrets are per-app `.env` files on voyager**, not in git. A fresh local clone won't have them.
- `pm2 list` is an accurate health check — every entry, including `caddy`, should read `online`. Anything else is genuinely down, and its hostname will return 502 through Caddy. `pm2 logs <name> --err --lines 20 --nostream` shows why. A common cause is missing dependencies after a pull — the start script can't find `tsx` or `vite` — fixed with `pnpm install` in the app's `cwd`.

## Public vs private hosting

Two separate paths — deploying to voyager is not what makes the public sites live.

- **Public sites deploy to Netlify from GitHub.** `chsmc.org` (the blog, `~/Repositories/www`, Astro) and `lab.chsmc.org` (`~/Repositories/lab`, SvelteKit, proxied through Cloudflare) both build on Netlify via their `netlify.toml`. Voyager also runs dev copies of these; those are previews, not production.
- **Personal apps run on voyager**, tailnet-only, at `*.chsmc.tools`.
- **`~/Repositories/api` is a Cloudflare Worker**, published with `wrangler deploy`. The copy on voyager is just `wrangler dev`.
- Repos in `~/Repositories` are a superset of what's on voyager; most are local-only with no deploy target. To see which ones actually ship, compare against `ssh voyager 'ls ~/Repositories'`, or read the ecosystem config for the deployed set and each repo's `netlify.toml` / `wrangler.toml` for the hosted set.

## Directory structure

- **~/Desktop**: Screenshots and recent downloads
- **~/Repositories**: Main coding projects
- **~/Notes**: Obsidian vault/personal notes. Use the obsidian-vault skill for interacting with this folder (except for the log, which uses the log skill).
- **~/Documents**: Personal documents

## Working directories

- **Scripts**: `~/Repositories/scripts` - Custom scripts and automations
- **Skills**: `~/Repositories/scripts/skills` - Agent skills, symlinked to `~/.claude`
- **Commands**: `~/Repositories/scripts/commands` - Agent slash commands, symlinked to `~/.claude`
- **Agent sessions**: `~/Notes/Agents/` - Persistent session logs and memories for AI agents. Use the agent-sessions skill for managing these files.
- **Log**: `~/Notes/Log.md` - Personal log and daily journal entries (markdown). Use the log skill for interacting with the log.
- **Blog posts**: `~/Repositories/www/posts` - Blog posts in Markdown format. Use the blogging skill for interacting with this directory.
- **Lab**: `~/Repositories/lab` - Code examples and demos site (SvelteKit). Use the lab skill for managing examples in the data directory.

## Tools, scripts, and skills

**IMPORTANT: How skills work**
- When you activate a skill, the skill provides you with instructions and documentation
- Activating a skill does NOT automatically complete the user's request
- You MUST read the skill instructions and then take action using the appropriate tools (Bash, Read, Edit, etc.)
- Skills are reference documents that tell you HOW to do something - you still need to DO it

### Available skills

- **Agent Sessions Skill**: `~/Repositories/scripts/skills/agent-sessions` - Manage persistent session logs and memories for AI agents in `~/Notes/Agents/`. Use when you need to save work context across conversations, resume from previous sessions, or maintain long-term memory. 
- **Apple Notes Skill**: `~/Repositories/scripts/skills/apple-notes`
- **Archive Webpage Skill**: `~/Repositories/scripts/skills/archive-webpage` - Archive a webpage as a self-contained, de-junked offline folder using the amber tool. Use when user asks to save, archive, snapshot, or make an offline copy of a webpage or URL. Archives live in `~/Documents/Archives`; `amber-voyager <url>` archives onto voyager instead (served at archive.chsmc.tools).
- **Blogging Skill**: `~/Repositories/scripts/skills/blogging`
- **Calendar Skill**: `~/Repositories/scripts/skills/calendar` - Access and manage macOS Calendar events. Use when user asks about calendar events, schedule, upcoming meetings, or wants to create new events.
- **Design Lab Skill**: `~/Repositories/scripts/skills/design-lab` - Explore a UI design by generating visual variants on a live scratch page, polishing them in Chrome, and converging on the user's in-browser pick. User-invoked only (`/design-lab`).
- **Lab Skill**: `~/Repositories/scripts/skills/lab`
- **iOS Ship Skill**: `~/Repositories/scripts/skills/ios-ship` - Build any iOS app on voyager, signed with the paid team, and get an install link for the iPhone (`ios-ship build <repo> --ref <branch>`). Builds install over the existing app and keep its data. History at builds.chsmc.tools.
- **Enchiridion Skill**: `~/Repositories/scripts/skills/enchiridion` - ALWAYS use this skill when user asks to search, create, update, link, or query records in Enchiridion. Drives the `ench` CLI (a stdio interface installed globally on PATH). Enchiridion is a knowledge repository for long-term storage of links, references, sources, and research. Records can be artifacts, entities, or concepts, linked via predicates.
- **Obsidian Vault Skill**: `~/Repositories/scripts/skills/obsidian-vault` - Create, edit, organize notes in `~/Notes`. Supports frontmatter, wikilinks, and arrowhead CLI for search. Use for permanent notes, projects, clippings, and writing.
- **Log Skill**: `~/Repositories/scripts/skills/log` - Manage `~/Notes/Log.md` only. Use for daily log entries (brief list items under date headings). Always use this skill for log operations, not the obsidian-vault skill.
- **Optimize Video Skill**: `~/Repositories/scripts/skills/optimize-video` - Optimize videos for web playback using FFmpeg. Converts videos to H.264/AAC format with efficient compression and fast-start capability. Use when user asks to optimize, compress, or convert videos for web use.
- **Arc Browser Skill**: `~/Repositories/scripts/skills/arc-browser` - Access Arc browser tabs with hierarchical folder structure. Use when user asks to list, search, or analyze their open Arc tabs. Returns tabs organized by space with full folder hierarchy, pinned status, and nested folder support. Can retrieve all spaces or specific spaces, search by keyword across all folders, or filter by domain.
- **Twitter Skill**: `~/Repositories/scripts/skills/twitter` - Fetch tweet content from Twitter/X URLs. Use when user asks to access, fetch, or get information from tweets. Works without API keys via syndication endpoint.
- **Todo-list Skill**: `~/Repositories/scripts/skills/todo-list` - Manage tasks and projects in Things. Use when user asks to add, find, search, or list tasks, projects, areas, or tags. When user mentions a todo offhand in conversation, add it to Things inbox.
	- When the user asks to save a blog post idea, save to the Blog posts project in Things. Don’t add a prefix such as “Blog post:” to the task title.
- **Weekly Sweep Skill**: `~/Repositories/scripts/skills/weekly-sweep` - Run the weekly maintenance sweep: triage Arc tabs into Readwise Reader, propose Things inbox filing, run ench sync, and produce the weekly review digest at `~/Notes/Weekly review.md`. Runs automatically Sundays 7am via scheduled task; use when user asks to run the sweep or prep their weekly review.
- **YouTube Transcript Skill**: `~/Repositories/scripts/skills/youtube-transcript` - Extract transcripts from YouTube videos. Use when user asks for a transcript, subtitles, or captions of a YouTube video and provides a YouTube URL.

## Usage notes

- You are a general purpose assistant, not limited to coding
- You can write code to help with various tasks. Prefer bash and Node scripts over Python or other languages.
- When user mentions a task or todo offhand in conversation (e.g., "I need to...", "remind me to...", "I should..."), add it to Things inbox using the Things skill.
- When agents need to write markdown files to tmp directories, use the agent-sessions skill instead.

## Writing style

- Use sentence case for all headings in markdown files (e.g., "## Common workflows" not "## Common Workflows")

## Date handling

- When creating files with dates (blog posts, logs, etc.), always verify the current date using `date +"%Y-%m-%d"` command first
- Don't rely solely on the date shown in system environment—there may be discrepancies
