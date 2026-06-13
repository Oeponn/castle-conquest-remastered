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

export const BALL_ANGLE_Y_DEFAULT = 60.0; // measured from vertical-ish, see getThrowVectors
export const BALL_ANGLE_Y_MIN = 15;
export const BALL_ANGLE_Y_MAX = 67;
export const BALL_ANGLE_Z_MIN = -27;
export const BALL_ANGLE_Z_MAX = 23;

// Power meter oscillation (gameClass initPowerMeter)
export const METER_REST = 1;
export const METER_OSC_SPEED = 1200;

// Throw: thrust = MAX_POWER * (0.7 + 0.3 * meterPercent)
export const THROW_BASE_FRAC = 0.7;
export const THROW_METER_FRAC = 0.3;

// Player shots scatter randomly up to ±200 * (thrust / 1800) on each axis
export const SCATTER_MAX = 200;

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

// Physics: Havok ran step(0.1, 15) per logic tick; we run 0.02 s of sim per
// 10 ms logic tick (2x real time), split into substeps so the ~260 units/s
// cannonball can't tunnel through 5-unit-thick walls (cannon-es has no CCD).
export const PHYS_DT_PER_TICK = 0.02;
export const PHYS_SUBSTEPS = 3;
export const GRAVITY = -175;
// The Havok Xtra's impulse/unit scaling is lost with the plugin, so launch
// strength is calibrated against the AI's own distance->power table
// (aiClass.setPower: 447 units -> 87% power, 595 -> 100%). That table is
// exactly quadratic (595/447 = (1/0.87)^2), i.e. range = v^2 sin(30°)/g for
// the default 15° launch, which requires v(87%) ~= 226 units/s — 3.2x what
// thrust/BALL_MASS alone gives.
export const IMPULSE_SCALE = 3.2;

export const BALL_MASS = 20;
export const BALL_RADIUS = 3.4;
export const BALL_RADIUS_BIG = 6;

export const STAGE_W = 640;
export const STAGE_H = 480;
export const VIEW_W = 427;
export const VIEW_H = 305;
