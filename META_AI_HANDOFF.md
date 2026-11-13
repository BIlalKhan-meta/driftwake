# Driftwake — handoff for Meta AI

**Date:** 2026-11-14  
**What this is:** A browser pirate sailing game (original IP; One Piece–*inspired*, not branded).  
**Stack:** ES modules + Babylon.js **7.30.0** (CDN) — **not** a single-file game anymore.

## How to run

1. Unzip this folder.
2. Serve the root statically (any static server). Examples:
   - `npx serve -l 5173 .`
   - VS Code Live Server on `index.html`
3. Open `http://localhost:5173/` (or your server URL).
4. Optional: `/?dev` or non-Netlify/Vercel host shows the DEV menu.
5. Click **Set sail**.

Deploy hints: `netlify.toml` / `vercel.json` publish the project root.

## What the game is

- Sail a sloop, collect **8 treasure chests** (gold beams).
- **Captain Mara** + bird **Pip** on the ship; **Old Tarn** on an island (trade shop: cannons / hull / sails).
- Combat: raiders + **Iron Warden** boss; lock-on broadsides (`L` / `F`).
- Seas (difficulty): Soft Tide · Storm Wake · Dreadwake.
- Day/night, procedural audio, localStorage save (`driftwake_v1`).
- Top-center **Tarn compass strip**; top-right **treasure compass**.

Controls (also on-screen hint): A/D steer · W sail · Space boost · F fire · L lock · Esc pause · M mute · T trade · S brake · drag look.

## File map (upload all of these)

| Path | Role |
|------|------|
| `index.html` | UI shell + boots `DriftwakeGame` |
| `favicon.svg` | Icon |
| `src/game.js` | Main class: init, loop, UI, run flow |
| `src/engine.js` | Babylon engine/scene/lights/materials |
| `src/shaders.js` | Custom sea shader registration |
| `src/water.js` | Sea mesh + wave function |
| `src/world.js` | Islands, foam, chests |
| `src/ship.js` | Player ship |
| `src/characters.js` | Mara, Pip, Tarn |
| `src/enemies.js` | Raiders + Iron Warden AI |
| `src/combat.js` | Cannons, projectiles, damage |
| `src/effects.js` | Splashes, wake, splinters, fire |
| `src/input.js` | Keyboard / touch / orbit |
| `src/audio.js` | Procedural SFX |
| `src/save.js` | localStorage |
| `src/config.js` | Constants, difficulty tunables, colors |
| `src/gamefeel.js` | Camera shake / trauma |
| `netlify.toml` / `vercel.json` | Deploy |
| `META_AI_HANDOFF.md` | This note |

Optional / not required to run: `waterMaterial.json`, old zips, `CLAUDE_HANDOFF.md` (outdated — was for single-file era).

## Architecture (important)

```
index.html
  └─ new DriftwakeGame(canvas).init()
       ├─ createEngine / shaders / water / islands / ship / characters
       ├─ createEnemies (hidden until Set sail)
       ├─ effects + projectiles
       └─ render loop → update() + extra()
            ├─ water, input, ship, camera, chests, characters
            └─ enemies → pending shots → projectiles → HUD
```

- Chests spawn in `newRun()` via `spawnChests`.
- Enemies are created at init, **placed** in `resetCombat()` when a run starts.
- Enemy AI queues shots on `e._pendingShots`; `game.extra()` calls `shoot(..., mine=false)`.

## Recent fixes (2026-11-14) — do not re-break

A bad refactor left the game stuck on the title screen with:

`TypeError: Cannot read properties of undefined (reading 'forEach')` in `updateChests`.

Root causes that were fixed:

1. `this.chests` used before `newRun()` → init as `[]` and guard updates.
2. `createEnemies` imported but never called → create in `createEntities`, place on run.
3. `updateProjectiles` args mis-ordered (`sunk` passed where `say` should be).
4. Enemy `_pendingShots` never fired.
5. Tarn create args / `tarn.x`/`z`; missing `st.spd`, `st.fx`/`fz`.

**Current status:** Game runs (title → Set sail → sail, chests, raiders, damage). Prefer small, tested edits over large rewrites.

## Style / constraints for Meta AI

- Keep **modular** `src/*.js` — do not collapse back into one giant HTML unless asked.
- Prefer **smallest change** that fully fixes the task.
- Original IP: no One Piece names/logos.
- Test in browser after changes; watch the console and the red on-screen error banner.
- Difficulty tunables live in `src/config.js` → `DIFFICULTY`.

## Suggested first prompts for Meta AI

- “Read META_AI_HANDOFF.md and src/game.js, then summarize how a run starts.”
- “Improve water look without breaking the wave function used by ship/chests/enemies.”
- “Add a feature X with the smallest safe change; do not re-init architecture.”

## Contact / live

- Feedback form + email are linked in `index.html`.
- Live site may exist on Netlify (`driftwake.netlify.app`) — treat zip as source of truth if live is stale.
