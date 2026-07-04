# Castle Conquest — Browser Port Notes

*A running log of how the original Shockwave game is being rebuilt for the browser.
Written for both humans and future Claude sessions. Updated as work progresses.*

Last updated: 2026-07-03 (accuracy-marker fix; Director score chunk now parseable)

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
| `tools/parse_score.py` | Parses the raw Director score chunk (`VWSC-6181.bin`) that ProjectorRays dumps but can't decode: prints every sprite channel's cast member + rect per frame (this is where the score-authored sprite positions live) |
| `web/` | The new TypeScript browser game (Vite + React + Three.js) |
| `PORTING_NOTES.md` | This file |

## How the original game works (from reading its source)

The game was written in **Lingo** (Director's scripting language). The decompiled
classes and what they do:

- **`gameClass`** — the whole game, and there are **two** cast members with
  this name: **ParentScript 2 (1,420 lines) is the LIVE one** (Director's
  `script("gameClass")` resolves to the lowest member number); ParentScript 41
  (2,290 lines) is an abandoned revision with a different throw model — see
  "Fixed 2026-07-03". State machine: `#castleSelect → #setPower →
  #setAccuracy → #throwBall → #ballInPlay → #roundOver → #tallyScore`.
  Owns aiming, the power/accuracy meters, throwing, cameras, scoring, the
  shop, save data.
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
- Aim limits: `ballAngleY` 15–67 (reset to 60 every turn), rotation −27°…+23°.
  **`ballAngleY` is a dial value, not the elevation**: getThrowVectors treats it
  as a zenith angle — and (in the *live* gameClass, see 2026-07-03 below) only
  **player 1** gets a +15 handicap. Player 1's launch elevation is
  `75 − ballAngleY` (default 60 = a flat 15° shot; limits span 60° steep to 8°
  flat); the AI and player 2 get `90 − ballAngleY` (default = a 30° lob, which
  is what the AI's power table is calibrated on)
- Aim controls have momentum: velocity += 0.01/frame held, friction ×0.98/frame
- Player shots get **no random scatter** (live gameClass). The only shot error
  is a deterministic *lateral* deflection from the third spacebar tap: miss the
  accuracy marker and `ySpeed += 400 × (signed miss / marker→top distance)`.
  The marker is a **fixed notch 21.2% up the meter track** (score-placed,
  never moved by code — see "Fixed 2026-07-03 (later)"), so the deflection is
  bounded (±14° worst case) and independent of power
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
- The original sprite positions lived in the Director *score* (not readable by
  ProjectorRays), so the HUD/menu overlay coordinates were re-measured from the
  artwork pixels (2026-06-12, fixing the misaligned first pass). **Update
  2026-07-03: the raw score chunk IS parseable** — `tools/parse_score.py` reads
  `chunks/VWSC-6181.bin` directly and recovers every sprite rect; it confirmed
  the re-measured positions (dial center, menu buttons, viewport) to the pixel:
  - `launchControls_02.png` (105×346, placed at stage 18,70): the sword-blade
    slot is a **transparent window** at x 45–62, y 12–156 — the original drew
    `sword_blade_01` *behind* the toolbar art and let it show through the slot
    as it slides up with power (so no clipping is needed, just z-order).
    Rotation-dial circle center is (52,239); protractor vertex is (37,336).
  - `mainMenu_04.png`: the three baked-in button boxes sit at x 48–257,
    tops 148/207/265, 40px tall (59px pitch). The port's "Two Player" button is
    drawn as a matching fourth box at top 324.
  - `yellowLine_bmp.png` decoded with a broken palette (green/black pixels), so
    the elevation needle is drawn as a CSS line instead of using that bitmap.
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

Desktop controls: arrow keys aim, spacebar three times — start power meter,
set power, then tap again as the accuracy sweep crosses the fixed marker
notch (the miss deflects the shot sideways). Number keys 0-9 switch cameras
(original keymap). Touch: drag the view to aim, tap FIRE three times.

## Fixed 2026-06-12: cannonball range + unstable castles at round start

Two related physics bugs, both resolved:

**Range.** Shots fell short because thrust-as-impulse on the 22 kg ball gives
only 57–82 units/s while castles sit 447–595 apart. A first attempt weakened
gravity 5x (−57 → −11.4), but the right move was the opposite: the AI's own
distance→power table (`447 units → 87% power, 595 → 100%`) is exactly
quadratic — `595/447 = (1/0.87)²` — which means drag-free ballistics where
range = v²·sin(30°)/g at the default 15° launch. Any (gravity, launch-speed)
pair satisfying that gives *identical trajectory shapes*; they differ only in
flight time and impact energy. We restored `GRAVITY = -57` (matching Havok's
≈49 units/s² at the original 0.2 unit→meter scale) and added
`IMPULSE_SCALE = 3.2` on launch, calibrated so the AI table lands shots —
verified headless: the AI's shot reaches the player castle face, a 50%-meter
player shot demolishes the enemy front wall. The ball now flies ~260 units/s,
so each 0.02 s physics tick is split into 4 substeps (cannon-es has no CCD)
to keep it from tunneling through 5-unit walls.

**Wobbly/collapsing enemy castle before any shot.** Three causes:

1. `towerTopA` was rebuilt 8 units tall but the original was 10 — every
   layout mounts flags at the tower top's base + 10 (castle 1: top at 15,
   flag at 25; castle 11: 45 → 55; castle 6: 30 → 40). Flags spawned floating
   2 units in the air, dropped, bounced and tipped over (>10° = "captured")
   before the first shot. Same for `towerTopB` (was 5, now 10, pinned by
   castle 7's flag).
2. cannon-es applies restitution at *any* contact speed (Havok only above a
   threshold), so the catalogue's bouncy pieces micro-jittered forever.
   Piece bodies now use restitution 0.05; the catalogue keeps the original
   values for reference.
3. Havok held live stacks rock-stable; cannon-es doesn't. Pieces now spawn
   *asleep* (frozen solid) and wake in a chain reaction when the ball — or a
   piece it knocked loose — touches them. Bonus: zero drift means no phantom
   "damage" gold from settling.

Headless checks live in `web/flagtest.cjs` (flags must stay at 0° tilt with
no shot), `web/balltest.cjs` (shot ranges), `web/hittest.cjs` (a mid-power
hit must wake and damage the castle). They drive the dev server on port 5175
via Playwright and `window.__engine`.

Also noted: gold is the only persisted progress — localStorage key
`cstlcnqst20` (the original SharedObject name), written after each round
tally. Score/level/round are not saved; castle unlocks derive from gold.

## Tuned 2026-06-13: lighter feel + localized castle impacts

The physics felt wonky: the ball whipped through too fast and impacts were
all-or-nothing (a hit either barely nudged the castle or dominoed the whole
thing flat). Root cause: an in-progress experiment had pushed `GRAVITY` to
−175 while leaving `IMPULSE_SCALE` at 3.2, which (since range ∝ scale²/g)
left shots reaching only ~1/3 of their calibrated distance on a steep,
fast-dropping arc. Re-tuned around three levers:

1. **Lighter / slower ball.** Dropped `GRAVITY` to −50 (floatier) and
   re-derived `IMPULSE_SCALE` to keep the AI's distance→power table on target.
   The calibration: at 87% power (thrust 1566) the ball must travel 447 units,
   so `scale = sqrt(447·|g| / 3066)` = 2.7 at g=−50 (the old 3.2 assumed the
   pre-change `BALL_MASS` of 22; it's 20 now). Lower gravity *with* the
   matching smaller impulse = same range, but the ball flies slower with a
   longer, gentler arc and lands with ~30% less energy.
2. **Lighter pieces.** Catalogue masses run ~25% under the original table
   (WALL 30→22, HEAVY 55→40, LIGHT 10→7, ratios preserved) so a moderate hit
   registers instead of needing a full-power blast.
3. **Localized impacts via damping.** Piece bodies now carry
   `linearDamping 0.15` / `angularDamping 0.5`. The heavy angular damping tames
   the fast spin a hard hit imparts, so a struck piece topples roughly in place
   rather than cartwheeling into its neighbours and cascading the whole castle.

Verified headless: `flagtest` (castles hold at 0° tilt, no pre-shot collapse),
`hittest` (an 85%-power direct hit lands and moves 12 of 28 pieces — graded,
no longer all-or-nothing). `balltest`'s "max x" is misleading here: the ball
rolls a long way after landing, so that number reflects roll, not range.
Damping strength and masses are deliberately exposed for further eyeballing.

### Follow-up: aiming direction, camera, AI overshoot, castle visibility

- **Aim inversion.** Three consumers of `ballAngleY` disagreed: trajectory
  (`75 - ballAngleY`) and the HUD elevation needle both treat *lower*
  `ballAngleY` as steeper, but the aim camera pitched the opposite way. Flipped
  the camera pitch and the up/down keys so up = steeper everywhere, leaving the
  (intentional) trajectory/needle convention untouched.
- **Camera framing.** Rebuilt the aim camera with real trig instead of adding a
  fixed height to the look point (which sat above the camera and pitched the view
  up even at the flattest aim, burying the target under sky). The look pitch is
  now derived from the launch elevation: ~4° down at the flattest aim so the
  enemy castle is centred under the crosshair, rising to ~+18° at the steepest
  lob — capped under the ~20° half-FOV so the horizon never leaves the frame.
- **Enemy always overshot.** The AI fires at whatever `ballAngleY` the turn
  resets to, and `IMPULSE_SCALE` is calibrated only for a 15° launch
  (`ballAngleY 60`). A default of 45 (a 30° launch) made *both* the AI and the
  player's default shots fly ~1.7× too far — clean over the castle. Added
  `BALL_ANGLE_Y_AI = 60` so the AI always fires the calibrated elevation
  regardless of the player default, and restored `BALL_ANGLE_Y_DEFAULT = 60`.
- **"Castle selection does nothing."** It always worked (picking castle 5 vs 1
  rebuilds the player's castle, 36 vs 10 pieces) — but the player's castle sits
  at negative x, *behind* the aim camera, so it was never on screen. Each round
  now opens with a ~2.2 s establishing shot of the player's own castle
  (`castle1` cam) before swinging round to the aim view.

## Fixed 2026-07-02: the physics disconnect, explained from the source

All the earlier physics passes (impulse fudge → gravity experiments → mass
lightening → damping) were treating symptoms of **three real conversion
errors**. Going back to the decompiled Lingo and deriving everything from it:

**1. `ballAngleY` was misread as the launch elevation.** In `getThrowVectors`
the *horizontal* speed is `thrust·sin(ballAngleY+15)` and the *vertical* is
`thrust·cos(ballAngleY+15)` (z is up; the x/y split by `rotation.z` proves
x,y are the ground plane). So elevation = `75 − ballAngleY`: the default 60
is a **flat 15° cannon shot**, not a 60° mortar lob, and the 15–67 limits
mean 60° down to 8°. The port's trajectory code had this right, but the notes
above documented it wrong ("elevation 15°–67°"), and tuning sessions that
trusted the notes (e.g. the `BALL_ANGLE_Y_DEFAULT = 45` experiment — actually
a 30° launch) kept mis-aiming both the AI and the player.

**2. The impulse and gravity are recoverable — they were never "lost knobs".**
`simClass` calls `hk.Initialize(w, 0.2, 1)`: a Havok world scale of **0.2 m
per world unit**, so gravity is 9.8/0.2 = **49 units/s²** (not −50, −57 or
−175 — every one of those was a guess around the same truth). The original
throw is `rbBall.applyImpulse(thrust·dir)` on a 22 kg ball; naive SI
(Δv = J/m) gives 57–82 u/s, which *cannot* reach a castle 447–595 units away
— proof the Havok Xtra applied an internal unit conversion that died with the
plugin. But the AI's distance→power table is exactly quadratic
(595/447 = (1/0.87)²), i.e. drag-free ballistics `range = v²·sin30°/|g|` at
the 15° launch, and with g pinned at 49 it pins the launch speed:
**v(87%) = √(447·49/0.5) ≈ 209 u/s**, v(100%) ≈ 240. `IMPULSE_SCALE` is
therefore the *recovered Xtra conversion constant* — `v·m/thrust = 2.94` —
not a feel knob. Ball mass restored to the original 22 (it had drifted to
20), piece masses restored to the original 30/55/10 table (they'd been
lightened 25% to compensate for the mistuned slow ball), and the ball body's
linearDamping zeroed (quadratic table = no drag; cannon-es defaults to 0.01).

**3. The port ran physics at 2× real time.** `hk.step(0.1, 15)` per 10 ms
tick reads as "10× real time", which is visibly absurd — those Xtra arguments
don't map to wall-clock seconds, so the time base has to come from
observables instead, and they all agree on **1×**: at g=49 a 447-unit shot
flies ~2.2 s, which fits the 3 s smoke-trail window (`the timer < 180` ticks)
and the 8.3 s minimum turn wait (`50·10` ticks). The port's
`PHYS_DT_PER_TICK = 0.02` (2×) was a compensating hack that made the ball
look twice as fast ("fast ball") and castle collapses play in fast-forward.
Now 0.01 = real time.

**Camera/cannon angle, the downstream casualty.** With the trajectory
mistuned, the aim camera had been rebuilt twice around wrong assumptions. The
original's behaviour is fully readable in `applyVelToAimCam`: the camera
(`cam_aimShape`) yaws 1:1 with `ballAngleZ` about a pivot at the cannon, and
pitches **0.9° about its own axis per degree of `ballAngleY`**, from a baked
w3d anchor that frames the enemy castle at the default aim. The port's last
reconstruction used a 0.42 factor capped under the half-FOV "so the horizon
never leaves the frame" — but the original had no cap: crank a steep lob and
you look up into the sky (~+36° at max), exactly like real artillery. Now
implemented faithfully (anchor −4° at `ballAngleY` 60). Note the **cannon
model itself never rotates** in the original — aim feedback is only the
camera, the HUD dials and the fixed crosshair overlay.

## Fixed 2026-07-03: the port was built against the WRONG gameClass

Follow-up to the user reports "the ball flies higher than the crosshair
indicates" and "the castle pieces feel really light" — both checked against
the decompiled source, and the trail led somewhere unexpected.

**The movie contains TWO scripts named `gameClass`** (cast members 2 and 41),
and the port had been diffed against the wrong one. `globalScripts` creates
the game object with `objGame = script("gameClass").new()`; Director resolves
a name lookup to the **lowest member number**, i.e. **ParentScript 2**.
ParentScript 41 is an abandoned revision. The tell: only ParentScript 2 has
the `#setAccuracy` state driving the `accuracyMeter_bmp`/`accuracyMarker_bmp`
sprites that the movie actually wires up — the three-spacebar-tap flow the
real game (and its instructions) had. What differs in the live script:

1. **No random scatter — the crosshair complaint.** ParentScript 41 added a
   `random(200·power)` bump to all three impulse axes of every player shot —
   and Lingo's `random()` is strictly positive, so every shot flew *long and
   high* of the aim point, never short: exactly "fires higher than the
   crosshair indicates" (verified with screenshots: a near-max-scatter 87%
   shot sails clean over the whole castle). The live script has **none of
   that**: `tRandX = tRandZ = 0`. The only error is **lateral**:
   `tRandY = 400 × accuracy`, where `accuracy` is the *signed miss* of the
   third tap — (meter − marker) / (marker→top distance). A perfect tap flies
   perfectly true. Now implemented: FIRE₁ starts the power sweep, FIRE₂ sets
   power, FIRE₃ must hit the accuracy marker on a second sweep that runs at
   `max(0.1, powerPerc·0.8)` speed — low-power shots get a slow, easy sweep;
   the sweep auto-fires if it runs back to the bottom. (The first
   implementation made the marker the power level you'd set — wrong, see
   "Fixed 2026-07-03 (later)" below: the marker is a fixed notch.)
2. **The AI fires 15° steeper than player 1 — the calibration linchpin.**
   Live `getThrowVectors`: zenith = `ballAngleY + 15` *only for player 1*;
   everyone else gets `ballAngleY` straight. So at the per-turn reset value
   (60) the AI lobs at **30°**, and its distance→power table pins the launch
   speed on *that* trajectory: `v(87%) = √(447·49/sin 60°) ≈ 159 u/s` →
   `IMPULSE_SCALE = 159·22/1566 = 2.234` (yesterday's 2.94 assumed the AI
   fired flat at 15°, making every shot ~31% too fast).
3. **Pieces felt light because the ball hit 73% too hard.** Impact energy
   scales with v²: 209² vs 159² = 1.73×. With the correct launch speed the
   22 kg ball at ~160-180 u/s moves the full-weight 30/55/10 piece table the
   way the original did (verified: the calibrated 87% lob still lands on the
   castle face; a 50% frontal hit moves 12 pieces — graded, not explosive).
4. **cannon-es multiplies material frictions; Havok used the geometric
   mean.** Piece-on-piece contacts ran at 0.6×0.6 = 0.36 instead of 0.6,
   piece-on-ground at 0.54 instead of ~0.73 — everything sheared and skidded
   at half grip, the other half of "feels really light". Fixed by storing
   each material's friction as √(catalogue value), so cannon-es's product
   reproduces the geometric-mean combine exactly.
5. **The player's default aim genuinely lands short.** With the correct
   calibration, player 1's flat 15° default reaches only 167–341 units
   across the whole power range — mid-field. That's the original game: you
   crank the elevation up toward 30–45° and *lob* (the aim camera pitching
   0.9°/deg up into the sky at steep aim now makes sense — that IS the
   gameplay posture). The port's power-brackets-the-castle default was an
   artifact of calibrating the wrong elevation.
6. Smaller live-script details now matched: the power meter is an
   `|sin|`-sweep oscillator (`oscVal += 0.02`/tick, fill = 1−|sin|, starts
   empty, full in ~0.8 s), not ParentScript 41's spring meter; aiming is
   locked during the accuracy sweep; the ball also gets `angularDamping 0.8`
   so a dud lob stops rolling instead of bulldozing the castle at walking
   pace (cannon-es has no rolling resistance; flight is untouched since spin
   damping doesn't act on translation).

Everything in the 2026-07-02 section below that concerns *recovering gravity,
the time base, and the Xtra impulse conversion* still stands — only the
calibration elevation (15° → the AI's 30°) and the scatter model changed.
`web/{flagtest,balltest,hittest}.cjs` updated to drive the three-tap flow;
all three pass.

## Fixed 2026-07-03 (later): high-power shots veered right — up to 90° at max power

User report: the higher the power, the more the cannonball fired to the
right, hitting a full 90° sideways at max power. Root cause: the three-tap
accuracy model from earlier today was reconstructed wrong in one crucial
detail. The port made the accuracy marker *the power level you set*, so
`accuracy = (tap − marker) / (1 − marker)` had a denominator that shrank to
its 0.02 safety floor at max power — any tap miss got amplified up to ~50×.
And since a marker at the very top can only be missed from *below*, the
error was always the same sign: hard right, worse with power. (Lateral sign
for player 1: −y. The 90° figure is real — a 0.5 miss × 50 × 400 = a lateral
impulse 5× the forward one.)

**The marker is actually a fixed notch on the meter track.** In the live
gameClass, `throwControl` reads `sprite(accuracyMarker_bmp)` rects but **no
script ever moves that sprite** — its position is score-authored. And it
turned out the score *is* recoverable: ProjectorRays dumps the raw `VWSC`
chunk, and its frame-delta format is simple enough to parse by hand
(`tools/parse_score.py`). Calibration checks all landed to the pixel
(sprite 7 = the 427×305 viewport, sprites 8–19 = the twelve castle-select
hotspots, sprite 27's needle at the re-measured dial center (74,256)).
The recovered geometry, in stage pixels:

- meter container (sprite 23): y 28–174, height 146
- accuracy marker (sprite 32): an 18×4 notch at y 139–143, i.e. **31 px =
  21.2% up the track**, `ACCURACY_MARKER_PERC = 31/146`
- so `maxMarkerDistance` = 115 px is a **constant**: accuracy is bounded in
  [−0.27, +1] at every power — worst-case deflection ~14°, typically 1–2°
  per 10% of tap miss, independent of power

So the real flow is: set any power you like, then hit one fixed low notch on
the return sweep (which runs faster after high-power taps — that's the whole
power/accuracy tradeoff). Also corrected while here: the auto-fire threshold
is `newTop ≥ 173` on the 28–174 container = fill within 1 px of empty
(`oscPerc ≥ 0.993`, was 0.999). The meters and marker in the original are all
the same 1×1 `blackbox` bitmap stretched and tinted at runtime, which is why
no dedicated marker artwork was ever found.

Headless-verified: a max-power shot with a 10%-of-track tap miss launches
1.87° off-axis (was ~90°); balltest/hittest/flagtest all pass (the tests now
park the sweep on the fixed notch for a perfect tap).

## Tuned 2026-07-04: castle pieces ~25% heavier

Feel tweak by request: the piece-mass presets in `web/src/game/pieces.ts` now
run ~25% *above* the original simClass table — WALL 30→38, HEAVY 55→70,
LIGHT 10→13 (the archway's inline 30→38 too) — so castles sit a bit more
solidly against the recovered launch speed. The ball (22 kg), restitution,
friction and damping are untouched; this is the first deliberate departure
from the original's mass table rather than a compensation for a mistuned
ball.

## Known approximations (worth revisiting)

- **Geometry**: castle pieces are rebuilt primitives, not the original meshes
  (those are locked in Intel-IFX compressed bitstreams inside the w3d).
  Proportions come from the 25-unit grid; the brick texture is original.
- **Castle names/unlock prices** on the select screen are invented — the real
  ones were Director score-sprite behavior parameters. Gating logic (locked
  until enough gold) matches the original. (Now that `tools/parse_score.py`
  decodes the VWSC frame stream, the remaining ~1879 chunk entries — which
  hold the per-sprite behavior attachments — are a plausible place to dig
  these out someday.)
- **Physics feel**: cannon-es with the original friction table (piece masses
  deliberately run ~25% heavy as of 2026-07-04 — see above), gravity
  and launch speed recovered from the source (see "the physics disconnect"
  above). Remaining engine-difference accommodations: piece restitution is
  near zero (cannon-es bounces at any contact speed, Havok only above a
  threshold), pieces spawn asleep, and piece bodies carry linear/angular
  damping to keep impacts localized. Not Havok-identical, but close.
- ~~The original's third spacebar tap (accuracy meter) is simplified to two
  taps~~ — implemented 2026-07-03 (it turned out to be the live game's whole
  shot-error model; see "the port was built against the WRONG gameClass").
- The dead online features (save castle to dluxproductions.com, email
  challenges) are intentionally omitted; gold persists in localStorage under
  the original SharedObject name `cstlcnqst20`.
