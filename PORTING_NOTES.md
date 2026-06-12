# Castle Conquest — Browser Port Notes

*A running log of how the original Shockwave game is being rebuilt for the browser.
Written for both humans and future Claude sessions. Updated as work progresses.*

Last updated: 2026-06-12 (extraction complete, web app build starting)

---

## What this project is

Castle Conquest is a 2003 Miniclip game (by DLux Productions) that ran on Adobe
Shockwave — **not Flash**. It's a turn-based 3D artillery game: you pick or build a
castle out of blocks, then trade cannon shots with an enemy castle until one side's
flags are all knocked down or a cannon is destroyed.

The original runs poorly in Flashpoint on Mac (the "no impact cutscene after
shooting" bug is the 3D camera sequence failing — Shockwave 3D emulation on Mac is
broken). Since no good browser emulator for Shockwave exists, we're **rewriting the
game in TypeScript** for the browser, mobile + desktop, using the **original
graphics, sounds, and game logic** extracted from the game file.

## Where things live

| Path | What it is |
|---|---|
| `assets/original/.../castleConquest_36.dcr` | The untouched original game file (from Flashpoint) |
| `assets/decompiled/` | Output of ProjectorRays: the movie's raw chunks + **all 41 Lingo source scripts** |
| `assets/decompiled/castleConquest_36/casts/code/` | The decompiled game source code (readable!) |
| `assets/extracted/images/` | All 26 original bitmaps converted to PNG (pixels unmodified) |
| `assets/extracted/sounds/` | All 6 original sounds (4 WAV + 2 MP3) |
| `tools/ProjectorRays/` | The Shockwave decompiler (patched to tolerate one bad sound chunk). **Not committed** — it's a clone of https://github.com/ProjectorRays/ProjectorRays (commit `6f9bceb`); to recreate it, clone that repo into `tools/ProjectorRays`, apply `tools/projectorrays-tolerate-bad-snd-chunk.patch` with `git apply`, then `make` |
| `tools/projectorrays-tolerate-bad-snd-chunk.patch` | Our local patch to ProjectorRays (turns a fatal decompress error into a warning) |
| `tools/extract_assets.py` | Script that converts the game's bitmaps/sounds to PNG/WAV |
| `web/` | The new TypeScript browser game (Vite + React + Three.js) |
| `PORTING_NOTES.md` | This file |

## How the original game works (from reading its source)

The game was written in **Lingo** (Director's scripting language). The decompiled
classes and what they do:

- **`gameClass`** (2,290 lines — the whole game): state machine with states like
  `#castleSelect → #setPower → #throwBall → #ballInPlay → #roundOver → #tallyScore`.
  Owns aiming, the power meter, throwing, cameras, scoring, the shop, save data.
- **`castleBuilderClass`**: 12 built-in castle layouts stored as comma-separated
  strings (`"towerA,-200,25,0,180,wallA,..."` = piece name, x, y, z, z-rotation).
  Castles are mirrored to the enemy side by flipping the x axis.
- **`simClass`**: thin wrapper over the **Havok physics** plugin. Per-piece physics
  presets (`sim=1` wall: mass 30, bouncy; `sim=2` static ground; `sim=4` ball:
  22 kg sphere; `sim=6` flag: 10 kg...). Physics steps at `step(0.1, 15)`.
- **`aiClass`**: computer opponent. Aims at a random surviving flag, with a
  "dumbness offset" that shrinks as you reach higher levels, and deliberately
  varies power on long stalemates.
- **`mathClass`**: distance + angle helpers.

### Key gameplay numbers (faithfully ported)

- Max cannon power 1800; actual throw = `maxPower * (0.7 + 0.3 * meterPercent)`
- Aim limits: elevation 15°–67° (starts 60°), rotation −27°…+23°
- Aim controls have momentum: velocity += 0.01/frame held, friction ×0.98/frame
- Player shots get random scatter proportional to power (up to ±200 at full power)
- A flag counts as "down" when tilted more than 10° on x or y
- Round ends when ALL your opponent's flags are down (or a cannon is hit = instant win)
- A piece counts as "damaged" for scoring if it moved more than 5 units
- Scoring after a won round: `castleDamage = damagedPieces × 5`,
  `flagDamage = enemyFlags × 25`, `flagProtect = (yourFlagsStanding) × 50`,
  `rubbleReward = max(0, 50 − damage%)`. Total is added to score AND gold.
- Gold buys castle pieces in the shop (wall 100, thick wall 500, tower 750,
  arch 800, drawbridge 1000, platform 1500, big cannon 2500, extra flag 5000...)
- Gold persisted in a Flash SharedObject (`cstlcnqst20`) → we use `localStorage`
- The impact "cutscene": the camera switches to a ball-chase cam when the ball
  crosses within 150 units of the target, then to the victim castle's camera at
  100 units past. This is the part that was broken on Mac — now reimplemented.

### The original 640×480 screen layout

- Sprite layout puts the 3D viewport at a 427×305 area with a parchment frame
  (`gameWorldOverlay.png`), toolbar on the left (`launchControls_02.png`):
  power meter, rotation dial, angle dial, sword power-meter needle.
- Menus are full-screen bitmaps: `mainMenu_04.png` (menu), `main_23.png`
  (instructions background), `castlesConquered_01.png` (castle select),
  `castle_unlock_01.png` (unlock popup).

## What is converted vs reconstructed

| Asset | Status |
|---|---|
| All 26 2D bitmaps (menus, toolbar, meters, dials, crosshair, brick texture, skydome) | **Converted as-is** (JPEG/RLE decoded → PNG, no edits) |
| All 6 sounds (cannon boom, crank, rock hit, ground hit, win/lose jingles) | **Converted as-is** (PCM → WAV, MP3 kept as MP3) |
| All game logic, AI, physics parameters, castle layouts, prices, scoring | **Ported 1:1 from the decompiled Lingo source** |
| Text content (instructions, hints, button labels) | **Taken from the original** |
| 3D castle-piece geometry | **Reconstructed.** The original meshes are inside the Shockwave 3D world in Intel IFX compressed-bitstream format (no public decoder exists). The pieces are simple shapes (boxes/cylinders/wedges) on a known 25-unit grid, rebuilt as Three.js primitives textured with the original `brick_bmp`/`skydome` art. |
| Havok physics | **Replaced** with cannon-es using the original mass/friction/restitution table from `simClass`. |
| Online castle save/challenge (dluxproductions.com, long dead) | Replaced with localStorage save. |

## The new web app (in `web/`)

- Vite + React + TypeScript. React renders menus/HUD; the game world is a
  Three.js WebGL canvas; physics is cannon-es.
- One `GameEngine` class mirrors the original `gameClass` state machine;
  module files mirror the original class split (`castleBuilder.ts`, `ai.ts`,
  `sim.ts`) so you can diff them against the Lingo source.
- Input: keyboard (arrows aim, space sets power — same as original) and
  touch (drag to aim, hold a fire button to set power) for mobile.
- Scales to fit any screen while keeping the original 640×480 aspect.

## Status

- [x] Locate game in Flashpoint, identify it as Shockwave 3D + Havok
- [x] Build ProjectorRays decompiler (patched one fatal error into a warning)
- [x] Decompile movie → all Lingo source readable
- [x] Read & document the entire game logic
- [x] Extract all bitmaps → PNG (one bug found & fixed: odd-width images need
      even-byte row padding in the alpha channel, or you get diagonal artifacts)
- [x] Extract all sounds → WAV/MP3
- [x] Web app built and **verified playable in headless Chrome**: menu →
      castle select → aim → power meter → fire → ball flight with smoke trail →
      **impact cutscene (the part that was broken on Mac)** → AI counter-attack →
      round win → tally screen with correct scoring → gold banked
- [x] Mobile verified: portrait + landscape layout, touch FIRE button, drag-aim
- [ ] Deploy to Vercel (keep it password-protected/unlisted — Miniclip owns the art)
- [ ] Wrap in a games-library home page when game #2 arrives

## How to run it

```bash
cd web
npm install
npm run dev        # then open http://localhost:5173
npm run build      # production build in web/dist (deployable to Vercel as-is)
```

Desktop controls: arrow keys aim, spacebar starts/sets the power meter,
number keys 0-9 switch cameras (original keymap). Touch: drag the view to aim,
tap FIRE twice.

## Known approximations (worth revisiting)

- **Geometry**: castle pieces are rebuilt primitives, not the original meshes
  (those are locked in Intel-IFX compressed bitstreams inside the w3d).
  Proportions come from the 25-unit grid; the brick texture is original.
- **Castle names/unlock prices** on the select screen are invented — the real
  ones were Director score-sprite parameters we can't read back. Gating logic
  (locked until enough gold) matches the original.
- **Physics feel**: cannon-es with the original mass/friction/restitution
  table, gravity tuned so the AI's distance→power formula stays on target.
  Not Havok-identical, but close in behavior.
- The original's third spacebar tap (accuracy meter) is simplified to two taps
  (power only) — the accuracy mechanic can be added later from the
  instructions' description.
- The dead online features (save castle to dluxproductions.com, email
  challenges) are intentionally omitted; gold persists in localStorage under
  the original SharedObject name `cstlcnqst20`.
