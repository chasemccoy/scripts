---
name: ios-ship
description: Build any of Chase's iOS apps on voyager (signed with his paid team) and get an install link for his iPhone, with a build history at builds.chsmc.tools. Use when the user asks to build, ship, install, or send a build of an iOS app to their phone, wants an install link, asks about recent iOS builds, or wants to register a new device for builds.
allowed-tools: Bash, Read
---

# ios-ship

`ios-ship` archives an iOS app on voyager (the Mac mini, which has Xcode), signs it ad hoc with Chase's paid team (`GXA23694DJ`), and publishes it at `https://builds.chsmc.tools/<repo>/<id>/`. Opening that page on the iPhone and tapping **Install** installs the build over the existing app. Same team and bundle ID, so the app's data is kept. Every build, including failures, is kept in the history at `https://builds.chsmc.tools/`.

`ios-ship` is on PATH on both machines (`~/Repositories/scripts/bin/ios-ship`, linked into `~/.local/bin`). On voyager it runs the CLI directly; anywhere else it forwards over `ssh voyager`, with the same arguments and output.

## Building

voyager builds what's **on GitHub**, not the MacBook's working tree. So first commit and push the branch, then:

```bash
ios-ship build <repo> --ref <branch-or-sha> --note "what changed"
```

- `<repo>` is the GitHub repo name under `chasemccoy` (`familiar`, `faulkner-ios`, `enchiridion`, `curio`, …). voyager keeps its own mirror in `~/ios-builds/repos/` and builds each commit in a throwaway worktree. It never touches the checkouts in `~/Repositories` there.
- `--ref` defaults to the repo's default branch. A branch name means its latest commit on GitHub.
- `--note` is a short line shown in the history. Use it to say what this build is for.
- Agents running **on voyager** (familiar, or Claude Code there) can build a local directory as it is, uncommitted changes included: `ios-ship build /path/to/repo`. The history marks such builds with `+` (dirty).
- A build takes a few minutes, mostly the archive. Builds queue: a second one waits for the first.

On success it prints:

```
✓ Familiar 0.1 (261015212007) — familiar @ main 1dd1759
  install page: https://builds.chsmc.tools/familiar/261015212007/
  direct link:  itms-services://?action=download-manifest&url=…
```

**Give the user the install page URL.** Most chat apps don't make an `itms-services://` link tappable, and the page has a big Install button. The page and the link only work on the tailnet, which the phone is on.

On failure it prints the error lines, the log URL, and exits 1. To read the whole log: `ssh voyager 'cat ~/ios-builds/www/<repo>/<id>/build.log'`. Fix the code, push, and build again.

`--json` on `build` or `list` prints the build record instead (`status`, `pageUrl`, `installUrl`, `errors`, …) for scripts.

## History

```bash
ios-ship list                     # last 10 builds
ios-ship list --repo familiar --limit 5
```

## Project config

ios-ship finds the project on its own: the shallowest `project.yml` (run through `xcodegen`) or `.xcodeproj`, with the scheme named after the project. It builds Release. If a repo needs something else, add `.ios-ship.json` at its root:

```json
{
  "project": "ios/project.yml",
  "scheme": "Enchiridion",
  "configuration": "Release",
  "buildSettings": { "SOME_SETTING": "value" }
}
```

Every build sets these itself:

- `DEVELOPMENT_TEAM` to the paid team, whatever the project says.
- `CODE_SIGN_STYLE=Automatic`.
- `CURRENT_PROJECT_VERSION` to the build's id (`yyMMddHHmmss`), so build numbers only go up.

Profiles and App IDs are created on demand through the App Store Connect API key.

## Keeping the app's data

A build replaces the installed app and keeps its data only when **both** of these match the installed app:

- **Bundle ID.** Don't change it.
- **Signing team.** Always `GXA23694DJ` here.

An app installed from a free Personal Team build (Faulkner was signed by `756EWAN4G2`) has to be deleted once before the first ios-ship build will install. If its data lives only on the phone, save it first: Xcode → Devices and Simulators → the app → Download Container. To keep Xcode builds from the MacBook and ios-ship builds interchangeable, set the project's `DEVELOPMENT_TEAM` to `GXA23694DJ` too.

Ad-hoc builds use the **production** push environment. Xcode development builds use the sandbox.

## Devices

Only devices registered on the team can install a build.

```bash
ios-ship devices                          # list
ios-ship devices add <udid> "<name>"      # register; also deletes the ad-hoc profiles so the next build includes it
```

Vern (`00008150-000E505C0C80401C`) is Chase's iPhone. After adding a device, each app needs one new build before that device can install it.

## Setup and health

```bash
ios-ship doctor     # config, API key, keychain, identities, App Store Connect, builds.chsmc.tools
```

What's on voyager:

| | |
|---|---|
| `~/.config/ios-ship/config.json` | `teamId`, `keyId`, `issuerId`, `keyPath`, optional `baseUrl`. Not secret. |
| `~/.config/ios-ship/AuthKey_FZ56Z4WSPM.p8` | App Store Connect team key (Admin), mode 600. The original is in 1Password: "App Store Connect API key (ios-ship)". |
| `~/Library/Keychains/ios-ship.keychain-db` | Signing keychain holding voyager's own Apple Development and Apple Distribution identities (expire 2027-10-16). Its password is in `~/.config/ios-ship/keychain-password`. The CLI unlocks it for each build, so builds work over ssh and under pm2, where the login keychain is locked. |
| `~/ios-builds/www/` | What Caddy serves at `builds.chsmc.tools` (the block is in dotfiles' `voyager/Caddyfile`). `builds.json` next to it is the history. |
| `~/ios-builds/repos`, `work`, `DerivedData` | Mirrors, per-build worktrees, build caches. |

On a fresh voyager: write `config.json`, copy the key from 1Password, then run `ios-ship setup`. It creates the keychain, imports Apple's WWDR intermediates (`certs/apple-wwdr.pem`; voyager's System keychain only has the one that expired in 2023), and creates the two certificates through the API. When the certificates near expiry, delete the old identities from the keychain and run `setup` again.

`ios-ship index` rebuilds the HTML from `builds.json` after editing `lib/html.mjs`.
