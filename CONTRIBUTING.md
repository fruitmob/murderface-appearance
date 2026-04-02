# Contributing to murderface-appearance

Thanks for your interest in contributing! This project is open source under MIT and welcomes bug reports, feature ideas, and pull requests.

## Reporting Bugs

Use the [Bug Report](https://github.com/fruitmob/murderface-appearance/issues/new?template=bug_report.yml) template. Include:

- The version or commit hash you're running
- Steps to reproduce the issue
- Server and client console errors (F8 console or server terminal)
- Your framework and game build number

## Suggesting Features

Use the [Feature Request](https://github.com/fruitmob/murderface-appearance/issues/new?template=feature_request.yml) template. Describe what you'd like and why it would improve the experience.

## Pull Requests

1. Fork the repo and create a branch from `master`
2. Make your changes — keep them focused on a single feature or fix
3. Rebuild the UI: `cd web/src && npm install && npm run build`
4. Test in-game (FiveM CEF, not a regular browser)
5. Open a PR with a clear description of what changed and why

### Project Structure

- `web/src/` — Svelte 5 frontend (NUI)
- `game/` — Lua game logic (ped manipulation, camera, customization)
- `client/` — Framework bridges, zones, commands
- `server/` — Database, permissions, framework detection
- `shared/` — Config, blacklists, tattoo data, theme

### Code Style

- **Lua**: Follow existing patterns, use `ox_lib` for UI, `lib.callback` for RPC
- **Svelte**: Svelte 5 runes (`$state`, `$derived`, `$effect`), no Svelte 4 stores
- **CSS**: Dark glassmorphism theme, cyan accent (`#00e5ff`), no `backdrop-filter: blur()` (broken in FiveM CEF)
- **Build**: Output is IIFE format for FiveM CEF — no ES modules, no `type="module"`

### Important Notes

- `provide "illenium-appearance"` in fxmanifest is critical — without it, all `exports['illenium-appearance']` calls from other resources fail
- The NUI must work in FiveM's Chromium Embedded Framework, not just modern Chrome
- Test with both character creation (`/appearance`) and barber (`/barber`) flows
- All appearance data must stay compatible with the illenium-appearance `playerskins` table format

## Questions?

Open an [issue](https://github.com/fruitmob/murderface-appearance/issues) or reach out to the FruitMob team.
