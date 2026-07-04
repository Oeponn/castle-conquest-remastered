// All gameplay numbers ported 1:1 from the decompiled Lingo source
// (ParentScript 41 - gameClass.ls / ParentScript 5 - aiClass.ls).
// The original game loop ran one logic tick every 10 ms (drawSpeed = 10),
// so per-tick values below assume a 100 Hz logic clock.

export const LOGIC_HZ = 100;
export const LOGIC_DT_MS = 10;

export const MAX_POWER = 1800;
export const DAMAGE_GOAL = 50;

// Aiming (per logic tick)
export const AIM_SPEED_INC = 0.01;
export const AIM_MAX_SPEED = 10;
export const AIM_FRICTION = 0.98;

// Starting aim, reset to 60 at every turn switch (live gameClass line 683).
// The launch elevation differs per shooter (getThrowVectors): player 1 gets
// 75 - ballAngleY (default = a flat 15° shot that lands short — you crank the
// angle up to reach), while the AI and player 2 get 90 - ballAngleY (30° at
// the default, which is what the AI's distance->power table is calibrated on).
export const BALL_ANGLE_Y_DEFAULT = 60.0;
export const BALL_ANGLE_Y_MIN = 15;
export const BALL_ANGLE_Y_MAX = 67;
export const BALL_ANGLE_Z_MIN = -27;
export const BALL_ANGLE_Z_MAX = 23;

// Power/accuracy meter (live gameClass initPowerMeter/oscilate, per logic
// tick): oscPerc = |sin(oscVal)|, oscVal += 0.02, meter fill = 1 - oscPerc.
// Starts empty (oscVal 1.5), full ~0.8 s later. After the power tap the same
// oscillator keeps running for the ACCURACY sweep, slowed by
// max(0.1, powerPerc * 0.8) — high-power shots get a faster, harder sweep.
export const METER_OSC_VAL0 = 1.5;
export const METER_OSC_SPEED = 0.02;
export const ACCURACY_SPEED_FRAC = 0.8;
export const ACCURACY_SPEED_MIN = 0.1;

// Throw: thrust = MAX_POWER * (0.7 + 0.3 * meterPercent)
export const THROW_BASE_FRAC = 0.7;
export const THROW_METER_FRAC = 0.3;

// Player shots get NO random scatter in the live gameClass. The only error is
// a deterministic LATERAL deflection from the accuracy tap: the third tap must
// hit the accuracy marker; the signed miss (normalized by the marker->track-top
// distance) deflects the shot sideways by up to this much added to ySpeed
// (throwBall: tRandY = 400 * accuracy, tRandX = tRandZ = 0).
export const ACCURACY_DEFLECT_MAX = 400;
// The marker is a FIXED notch on the meter track, not the power level you set:
// in the original, sprite 32 (accuracyMarker_bmp) is never moved by any script.
// Its rect, recovered from the raw Director score chunk (VWSC-6181.bin, see
// tools/parse_score.py): an 18x4 notch at stage y 139-143, on a meter container
// (sprite 23) spanning y 28-174 (146 tall). throwControl's markerFromBottom is
// therefore a constant 174-143 = 31 px (the notch sits at 21.2% fill) and
// maxMarkerDistance a constant 115 px, so accuracy = (fill-marker)/(1-marker)
// is bounded in [-0.27, +1] at EVERY power level.
export const ACCURACY_MARKER_PERC = 31 / 146;

// Ball-in-play camera (ballInPlayCamControl)
export const BALL_CAM_START_DIST = -150; // chase cam starts when ball within 150 of target side
export const BALL_CAM_STOP_DIST = 100; // impact cam when 100 past

// Turn timing, in original "ticks" (60/s): minimum wait 50*10, max 90*18
export const TURN_MIN_WAIT_S = (50 * 10) / 60;
export const TURN_MAX_WAIT_S = (90 * 18) / 60;
export const SMOKE_TRAIL_S = 180 / 60; // smoke trail for first 180 ticks
export const PIECE_SETTLED_THRESHOLD = 0.0025; // avg movement per check

// Flag counts as down when tilted > 10 degrees (checkFlagsDown)
export const FLAG_DOWN_TILT_DEG = 10;
// A piece is "damaged" for scoring when moved > 5 units (tallyScore)
export const PIECE_DAMAGED_DIST = 5.0;

// Scoring (tallyScore)
export const SCORE_PER_DAMAGED_PIECE = 5;
export const SCORE_PER_FLAG_CAPTURED = 25;
export const SCORE_PER_FLAG_PROTECTED = 50;

// AI (aiClass.setPower)
export const AI_MIN_GOLD_DIST = 447.0;
export const AI_MAX_GOLD_DIST = 595.0;
export const AI_MIN_POWER_PERC = 0.87;
export const AI_MAX_POWER_PERC = 1.0;

export const MAX_CASTLE_ID = 8; // computer cycles castles 1..8 by level

// Physics runs in REAL TIME: 0.01 s of sim per 10 ms logic tick, split into
// substeps so the cannonball can't tunnel through 5-unit-thick walls
// (cannon-es has no CCD). The original's hk.step(0.1, 15) arguments don't map
// to wall-clock seconds (at the 100 Hz logic rate that would be 10x real time,
// visibly absurd); the recoverable time anchors all say 1x: at the original
// gravity a 447-unit shot flies ~2.2 s, which fits inside the 3 s smoke-trail
// window and the 8.3 s minimum turn wait. The port previously ran 2x real time
// (0.02 per tick), which made the ball look twice as fast and castle collapses
// play in fast-forward.
export const PHYS_DT_PER_TICK = 0.01;
export const PHYS_SUBSTEPS = 3;
// Gravity is recovered from the original, not tuned: simClass calls
// hk.Initialize(w, 0.2, 1) — a Havok world scale of 0.2 m per world unit —
// so Havok's 9.8 m/s^2 is 9.8 / 0.2 = 49 units/s^2.
export const GRAVITY = -49;
// IMPULSE_SCALE is the recovered Havok-Xtra impulse conversion, not a feel
// knob. The original does rbBall.applyImpulse(thrust * dir) on a 22 kg ball;
// naive SI (dv = J/m) gives only 57-82 units/s — physically unable to reach a
// castle 447-595 away, so the Xtra applied some internal unit conversion that
// is lost with the plugin. But the AI's distance->power table
// (aiClass.setPower: 447 units -> 87% power, 595 -> 100%) is exactly
// quadratic (595/447 = (1/0.87)^2), i.e. drag-free ballistics
// range = v^2 sin(2*elev)/|g| — and the AI fires at 30° (the live
// getThrowVectors gives non-player-1 shooters 90 - ballAngleY, and ballAngleY
// is 60 at every AI shot). With g pinned at -49 that pins the launch speed:
//   v(87%) = sqrt(447 * 49 / sin 60°) = 159 u/s
//   scale = v * mass / thrust = 159.0 * 22 / 1566 = 2.234
// (check at 100%: v = 182.8 -> range 590 ≈ the table's 595)
// The player's default 15° launch reaches only 167-341 across the power
// meter — genuinely short of the enemy. That is the original game: you crank
// the elevation up toward 30-45° and lob.
export const IMPULSE_SCALE = 2.234;

export const BALL_MASS = 22; // simClass sim=4 preset, 1:1
export const BALL_RADIUS = 3.4;
export const BALL_RADIUS_BIG = 6;

export const STAGE_W = 640;
export const STAGE_H = 480;
export const VIEW_W = 427;
export const VIEW_H = 305;
