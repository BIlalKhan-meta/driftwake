# Driftwake — handoff for Claude (from Cursor session)

**Date:** 2026-11-10  
**Game:** Driftwake — Babylon.js pirate sailing prototype (original IP, One Piece–*inspired*, not OP-branded)  
**Stack:** Single-page `index.html` + Babylon.js 7.30.0 CDN  
**Live (may be stale):** https://driftwake.netlify.app  
**Local:** serve the folder, open `http://localhost:5173/?dev` (or any static server + `/?dev`)

## What to open / upload

Upload this zip (or these files) into Claude:

| File | Role |
|------|------|
| `index.html` | **Full game** (source of truth) |
| `netlify.toml` | Publish root `.` |
| `vercel.json` | `cleanUrls` |
| `CLAUDE_HANDOFF.md` | This note |

Still one HTML file on purpose. Do **not** zip every turn unless the user asks.

## Baseline you already built (Claude chat)

Original Claude session ended with roughly:

- Sailing sloop, islands, 8 chests, compass to treasure  
- Captain Mara, Pip, Old Tarn + shop upgrades  
- Raiders + cannons, day/night, HP bars, lock crosshair, DEV (`?dev` / non-netlify host)  
- Iron Warden boss, procedural audio, localStorage save, feedback links  
- Trade marker / Tarn UX, on-screen error box  
- Ponytail ultra as working style  

Cursor started from the exported Claude HTML (`Driftwake.html`), then changed the items below.

---

## What Cursor changed (do not redo; continue from here)

### 1. God of War–style Tarn compass (replaced floating label)
- Removed world-space floating `⚓ Old Tarn · Xm` edge label.  
- Added top-center horizontal **strip** (`#strip`): bar + center diamond + sliding gold ⚓ with distance.  
- Marker position = camera yaw vs bearing to Tarn. Near range shows `Trade (T)`.  
- Treasure pill-compass (top-right) still exists separately.

### 2. Difficulty seas (themed names, not Easy/Normal/Hard)
On start card **and** in pause menu:

| Key | Name | Feel |
|-----|------|------|
| `soft` | Soft Tide | Slower AI, loose aim, `autoAim: true` |
| `storm` | Storm Wake | Default; flanking + lead shots; `autoAim: true` |
| `dread` | Dreadwake | Aggressive; **no auto-aim** for player or enemies; fierce Warden |

- Tunables live in `DIFF` (`aggro`, `ideal`, `chase`, `orbit`, `turn`, `fire`, `spread`, `lead`, boss multipliers, `bossNext`, `bossShots`).  
- Saved in `localStorage` key `driftwake_v1` as `diff`.  
- Mid-run change shows `#diffWarn` + Mara toast (may need voyage restart).

### 3. Smarter raider AI
- Flank/orbit instead of dumb nose-ram.  
- Island heading nudge.  
- Weave on Storm/Dread.  
- Soft/Storm: lead player position when firing.  
- Dread: aim at current hull + scatter (no perfect lead).  
- Iron Warden on Dread: charges, high turn/chase, short fire CD, **5-shot** volleys, spawns after **1** kill (`bossNext: 1`). Soft/Storm Warden is milder.

### 4. Pause menu (replaced top-right mute pill)
- `#pauseBtn` (⏸) + Esc open/close while sailing.  
- Pause freezes sim (`paused`); menu has mute + sea modes + Resume.  
- `M` still toggles mute without opening pause.  
- Start overlay still has sea buttons.

### 5. Audio tone-down
- Removed cartoon looping melody.  
- Soft ocean bed + layered noise/thump SFX (still fully procedural; no WAV assets).

### 6. Combat camera + broadsides (Black Flag style) — **current aiming model**
User confirmed this feels right:

- **Lock on (`L` / Lock button):** camera swings toward locked raider (side view OK).  
- **Fire (`F`):** **3-gun broadside** from the port/starboard facing the target. Soft/Storm lead the target; Dreadwake aims at current position + scatter.  
- **Lock off:** single **bow chaser** straight ahead.  
- Visible port/starboard gun meshes on the hull.  
- Hint text: `L lock = broadside`.

Do **not** go back to “camera must stay behind bow only” unless the user asks — that conflicted with sideways lock; broadsides fixed it.

---

## Controls (current)

Desktop: `A/D` steer · `W` sail · `Space` boost · `S` brake · `F` fire · `L` lock-cam/broadside · `Esc` pause · `M` mute · `T` trade near Tarn · drag orbit · wheel zoom · `Q/E` orbit  

Touch: on-screen steer/sail/boost/fire/lock. DEV only with `?dev` or non-netlify/vercel host.

## Important code anchors in `index.html`

- `DIFF` / `setDiff` / `syncModes` — difficulty  
- `#strip` / `hud3d` strip block — Tarn compass  
- `tryFire` — broadside vs bow  
- Camera block around `lk=lockCam&&lockT` — Black Flag lock  
- `openPause` / `paused` — pause  
- `SFX` / `audio()` — sound  
- Enemy loop in `extra()` — AI + Warden  

## Explicitly not done / deferred

- Split into Vite/multi-file modules  
- Real audio samples / music files  
- glTF ship/character models  
- Extra island quests / more bosses  
- Best-time per difficulty  
- Netlify re-upload of this Cursor build (user must drag zip if they want prod updated)

## How to continue (suggested)

1. Playtest Dreadwake broadsides + Warden balance.  
2. Only then: optional file split (`src/ship.js`, `combat.js`, …) **if user asks**.  
3. Use **ponytail** (smallest complete change). User previously used **ponytail ultra**.  
4. Do not rebuild zips unless asked.

## IP reminder

Original characters/world (Mara, Pip, Tarn, Driftwake, Iron Warden). Keep it that way — no One Piece names/art/music.
