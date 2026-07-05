// The game engine: a port of the LIVE gameClass — ParentScript 2, the member
// Director's script("gameClass") lookup actually resolves to. (ParentScript 41,
// also named "gameClass", is an abandoned revision: two-tap throw, random
// scatter, no accuracy meter. See PORTING_NOTES "wrong gameClass".) One class
// owns the state machine, aiming, the power/accuracy meters, throwing, cameras
// (including the impact-cutscene camera that was broken on Mac), turn flow,
// scoring and persistence. React subscribes via onHud to render menus/HUD.

import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GameWorld, GamePiece } from "./world";
import { getModelMesh, getModelMeshOwnMaterial } from "./models";
import { ParticleSystem } from "./particles";
import { AudioBank } from "./audio";
import { aiSetPower } from "./ai";
import { getCastleDataList, PieceData, parseCastleData } from "./castles";
import * as C from "./constants";

// State names mirror the live gameClass (ParentScript 2) even where they read
// oddly: "setPower" = aiming (no meter yet); the first FIRE starts the POWER
// sweep and moves to "setAccuracy"; the second captures power and starts the
// ACCURACY sweep in "throwBall"; the third captures accuracy and throws.
export type GameState =
  | "setPower"
  | "setAccuracy"
  | "throwBall"
  | "ballInPlay"
  | "roundOver"
  | "tallyScore"
  | "gameOver";

export interface HudState {
  state: GameState;
  level: number;
  gold: number;
  score: number;
  flagsText: string;
  hint: string;
  meterPerc: number; // 0..1 power meter fill (frozen at the set power during the accuracy sweep)
  accuracyPerc?: number; // 0..1 accuracy sweep position while state is "throwBall"
  angleY: number;
  angleZ: number;
  playerTurn: 1 | 2;
  twoPlayer: boolean;
  tally?: {
    castleDamage: number;
    rubbleReward: number;
    flagProtect: number;
    flagDamage: number;
    total: number;
  };
  roundWon?: boolean;
  roundMessage?: string;
}

export interface Keys {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

const SAVE_KEY = "cstlcnqst20"; // original SharedObject name

export class GameEngine {
  gw = new GameWorld();
  particles: ParticleSystem;
  audio = new AudioBank();
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;

  state: GameState = "setPower";
  camState: "waiting" | "started" | "stopped" = "waiting";
  myCam = "aim";

  player1Pieces: GamePiece[] = [];
  player2Pieces: GamePiece[] = [];
  p1Default: THREE.Vector3[] = [];
  p2Default: THREE.Vector3[] = [];
  player1Cannon: GamePiece | null = null;
  player2Cannon: GamePiece | null = null;
  player1CastleData: PieceData[] = getCastleDataList(1);
  player2CastleData: PieceData[] = getCastleDataList(1);

  ball: THREE.Mesh;
  ballShadow: THREE.Mesh;
  ballBody: CANNON.Body;
  ballThrown = false;
  ballInWorld = false;
  lastThrust = 0; // read by the headless test harness

  player1Turn = true;
  twoPlayer = false;
  turnCount = 1;
  roundCount = 3; // original starts at 3 and increments before each round -> level = roundCount+1
  gameWon = false;

  ballAngleY = C.BALL_ANGLE_Y_DEFAULT;
  ballAngleZ = 0;
  aimVelX = 0;
  aimVelY = 0;

  // Power/accuracy oscillator (live gameClass): fill = 1 - |sin(oscVal)|.
  // The same oscillator runs both sweeps; after the power tap it's slowed and
  // keeps its direction (meterDir).
  oscVal = C.METER_OSC_VAL0;
  oscSpeed = C.METER_OSC_SPEED;
  oscPerc = 0;
  meterDir = 1;
  movePowerMeter = false;
  thrust = 0; // captured at the power tap
  powerPerc = 0; // power-meter fill at the power tap (HUD freeze during the accuracy sweep)

  player1Gold = 0;
  player1Score = 0;

  private throwTimeS = 0;
  private smokeAnimCycle = 0;
  private tickAccum = 0;
  private lastT = 0;
  private hudCb: ((h: HudState) => void) | null = null;
  private hint = "";
  private keys: Keys = { left: false, right: false, up: false, down: false };
  private spaceWasUp = true;
  private raf = 0;
  private pendingAiShot: { power: number } | null = null;
  private lastHudPush = 0;
  roundMessage = "";
  roundWon = false;
  tally: HudState["tally"];
  onRoundFlow: ((next: "tally" | "castleSelect" | "gameOver") => void) | null =
    null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(C.VIEW_W, C.VIEW_H, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.camera = new THREE.PerspectiveCamera(40, C.VIEW_W / C.VIEW_H, 1, 3000);
    this.camera.up.set(0, 0, 1);
    this.particles = new ParticleSystem(this.gw.scene);

    // The original ball master mesh (shiny black, radius 1.768) — throwBall
    // scales it BALL_SCALE (3.4x) or BALL_SCALE_BIG (6x from cannonB).
    this.ball = getModelMesh("ball");
    this.ball.visible = false;
    this.gw.scene.add(this.ball);
    // ballShadowShape: the translucent blob gameClass drags under the ball
    // (ballShadowFollow: x/y only — its z stays authored just above ground).
    this.ballShadow = getModelMeshOwnMaterial("ballShadow");
    this.ballShadow.visible = false;
    this.gw.scene.add(this.ballShadow);
    this.ballBody = new CANNON.Body({
      mass: C.BALL_MASS,
      shape: new CANNON.Sphere(C.BALL_RADIUS),
    });
    // friction sqrt-encoded (cannon-es multiplies material frictions; Havok
    // used the geometric mean — see the ground material comment in world.ts)
    this.ballBody.material = new CANNON.Material({
      friction: Math.sqrt(0.8),
      restitution: 0.2,
    });
    // The AI's distance->power table is exactly quadratic, i.e. drag-free
    // ballistics — cannon-es's default linearDamping (0.01) would shave a few
    // percent off every shot and drift the calibration. Angular damping does
    // not touch ballistic flight, only spin: without it a landed ball rolls
    // essentially forever (cannon-es has no rolling resistance) and a dud
    // lob can bulldoze the castle at walking pace.
    this.ballBody.linearDamping = 0;
    this.ballBody.angularDamping = 0.8;

    this.player1Gold = this.loadGold();

    this.ballBody.addEventListener(
      "collide",
      (ev: { body: CANNON.Body; contact: CANNON.ContactEquation }) => {
        this.onBallCollide(ev);
      },
    );
  }

  /** gameClass.ballShadowFollow, 1:1 — the blob tracks the ball on x/y (its
   * z stays at the authored height just above the ground plane), fades and
   * shrinks as the ball climbs: blend = 60 + 20*zPerc, scale = 1.3 +
   * 0.3*zPerc with zPerc = 1 - z/100... including the original's quirk that
   * a ball ABOVE 100 units snaps zPerc back to 1 (full-dark, full-size). */
  private ballShadowFollow() {
    this.ballShadow.visible = this.ball.visible;
    if (!this.ballShadow.visible) return;
    this.ballShadow.position.x = this.ballBody.position.x;
    this.ballShadow.position.y = this.ballBody.position.y;
    let zPerc = 1.0 - this.ballBody.position.z / 100.0;
    if (zPerc < 0) zPerc = 1;
    (this.ballShadow.material as THREE.Material).opacity = 0.6 + 0.2 * zPerc;
    const s = 1.3 + 0.3 * zPerc;
    this.ballShadow.scale.set(s, s, 1);
  }

  // ---------- persistence (replaces the Flash SharedObject) ----------
  private loadGold(): number {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}");
      return typeof d.gold === "number" ? d.gold : 0;
    } catch {
      return 0;
    }
  }
  saveGold() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ gold: this.player1Gold }));
  }
  clearSave() {
    this.player1Gold = 0;
    this.player1Score = 0;
    this.roundCount = 3;
    this.saveGold();
  }

  onHud(cb: (h: HudState) => void) {
    this.hudCb = cb;
    this.pushHud(true);
  }

  setKeys(k: Partial<Keys>) {
    Object.assign(this.keys, k);
  }

  /** spacebar / fire button — throwControl's three taps: power, accuracy, throw */
  firePressed() {
    if (this.state === "setPower") {
      this.initPowerMeter();
      this.state = "setAccuracy";
      this.hint = "Tap spacebar/FIRE to set power level.";
      this.pushHud(true);
    } else if (this.state === "setAccuracy") {
      const meterPerc = 1 - this.oscPerc;
      this.thrust =
        C.MAX_POWER * meterPerc * C.THROW_METER_FRAC +
        C.MAX_POWER * C.THROW_BASE_FRAC;
      this.powerPerc = meterPerc;
      this.initPowerAccuracy();
      this.state = "throwBall";
      this.hint = "Tap FIRE again as the sweep crosses the marker notch!";
      this.pushHud(true);
    } else if (this.state === "throwBall") {
      // accuracy = signed miss from the FIXED marker notch, normalized by the
      // constant marker->track-top distance (gameClass throwControl; the
      // marker sprite is score-placed and never moved). Bounded [-0.27, +1].
      const cur = 1 - this.oscPerc;
      const accuracy =
        (cur - C.ACCURACY_MARKER_PERC) / (1 - C.ACCURACY_MARKER_PERC);
      this.movePowerMeter = false;
      this.throwBall(this.thrust, undefined, accuracy);
    } else if (this.state === "roundOver") {
      this.advanceAfterRound();
    }
  }

  // ---------- round setup ----------
  startGame(twoPlayer: boolean) {
    this.twoPlayer = twoPlayer;
    this.player1Score = 0;
    this.roundCount = 3;
  }

  selectCastle(castleNum: number, forPlayer: 1 | 2 = 1) {
    if (forPlayer === 1) this.player1CastleData = getCastleDataList(castleNum);
    else this.player2CastleData = getCastleDataList(castleNum);
  }

  /** nextRoundInit — builds both castles and begins the round */
  nextRoundInit() {
    this.gameWon = false;
    this.turnCount = 1;
    this.roundCount++;
    this.state = "setPower";
    this.gw.clearPieces();
    this.particles.clear();

    if (!this.twoPlayer) {
      let id = this.roundCount % (C.MAX_CASTLE_ID + 1);
      if (id <= 0) id = 1;
      this.player2CastleData = getCastleDataList(id);
    }
    this.player2Pieces = this.gw.makeCastle(this.player2CastleData, -1);
    for (const p of this.player2Pieces) this.gw.addToSim(p);
    this.player1Pieces = this.gw.makeCastle(this.player1CastleData, 1);
    this.p1Default = this.player1Pieces.map((p) => p.defaultPos.clone());
    this.p2Default = this.player2Pieces.map((p) => p.defaultPos.clone());
    for (const p of this.player1Pieces) p.lastPos.copy(p.defaultPos);
    for (const p of this.player2Pieces) p.lastPos.copy(p.defaultPos);

    this.player1Cannon = this.player1Pieces.find((p) => p.isCannon) ?? null;
    this.player2Cannon = this.player2Pieces.find((p) => p.isCannon) ?? null;

    this.player1Turn = true;
    this.ballThrown = false;
    this.removeBallFromSim();
    this.ball.visible = false;
    this.ballAngleY = C.BALL_ANGLE_Y_DEFAULT;
    this.ballAngleZ = 0;
    this.aimVelX = 0;
    this.aimVelY = 0;
    this.movePowerMeter = false;
    this.powerPerc = 0;
    this.camState = "waiting";
    this.pickCam("aim");
    this.hint =
      "Aim the cannon, then tap spacebar/FIRE to start the power meter.";
    this.checkFlagsDown();
    this.pushHud(true);
  }

  // ---------- aiming & camera ----------
  pickCam(name: string) {
    this.myCam = name;
  }

  private cannonPos(player: 1 | 2): THREE.Vector3 {
    const c = player === 1 ? this.player1Cannon : this.player2Cannon;
    if (!c) return new THREE.Vector3(player === 1 ? -230 : 230, 0, 8);
    return new THREE.Vector3(
      c.body.position.x,
      c.body.position.y,
      c.body.position.z,
    );
  }

  private updateCamera() {
    const dir = this.player1Turn ? 1 : -1;
    const cp = this.cannonPos(this.player1Turn ? 1 : 2);
    switch (this.myCam) {
      case "aim": {
        // camera on a pivot at the cannon: yaw = ballAngleZ, slight pitch with angleY
        const yaw = (this.ballAngleZ * Math.PI) / 180;
        // The camera sits above & behind the cannon and looks toward the enemy.
        // Faithful to applyVelToAimCam: the original rotated cam_aimShape by
        // 0.9° about its own x-axis per degree of ballAngleY, from a baked
        // w3d anchor orientation that framed the enemy castle at the default
        // aim (ballAngleY 60 = flat 15° launch). We anchor that default at
        // -4° (slightly down, enemy castle centred under the crosshair); a
        // steep lob pitches the view up to ~+36° of sky, just like the
        // original — there is no FOV cap.
        const lookPitch = ((-4 + 0.9 * (60 - this.ballAngleY)) * Math.PI) / 180;
        const back = new THREE.Vector3(-70 * dir, 0, 45);
        back.applyAxisAngle(new THREE.Vector3(0, 0, 1), yaw * dir);
        this.camera.position.copy(cp).add(back);
        const ahead = new THREE.Vector3(
          400 * Math.cos(lookPitch) * dir,
          0,
          400 * Math.sin(lookPitch),
        );
        ahead.applyAxisAngle(new THREE.Vector3(0, 0, 1), yaw * dir);
        this.camera.lookAt(this.camera.position.clone().add(ahead));
        break;
      }
      case "ball": {
        const bp = this.ball.position;
        const off = new THREE.Vector3(-60 * dir, 25, 30);
        this.camera.position.copy(bp).add(off);
        this.camera.lookAt(bp);
        break;
      }
      case "castle1": {
        this.camera.position.set(-60, -190, 100);
        this.camera.lookAt(-240, 0, 15);
        break;
      }
      case "castle2": {
        this.camera.position.set(60, -190, 100);
        this.camera.lookAt(240, 0, 15);
        break;
      }
      case "start":
      default: {
        this.camera.position.set(0, -430, 170);
        this.camera.lookAt(0, 0, 20);
        break;
      }
      case "side1":
        this.camera.position.set(-240, -260, 80);
        this.camera.lookAt(-240, 0, 20);
        break;
      case "side2":
        this.camera.position.set(240, -260, 80);
        this.camera.lookAt(240, 0, 20);
        break;
      case "top1":
        this.camera.position.set(-240, 0, 380);
        this.camera.lookAt(-240, 0, 0);
        break;
      case "top2":
        this.camera.position.set(240, 0, 380);
        this.camera.lookAt(240, 0, 0);
        break;
      case "front1":
        this.camera.position.set(-40, 0, 60);
        this.camera.lookAt(-240, 0, 25);
        break;
      case "front2":
        this.camera.position.set(40, 0, 60);
        this.camera.lookAt(240, 0, 25);
        break;
    }
  }

  /** ballController + applyVelToAimCam, one logic tick */
  private aimTick() {
    const humanTurn = this.player1Turn || this.twoPlayer;
    if (!humanTurn) return;
    let cranking = false;
    // ballController runs while aiming and during the power sweep, but NOT
    // during the accuracy sweep (live gameClass gates on setPower/setAccuracy)
    if (this.state === "setPower" || this.state === "setAccuracy") {
      if (this.keys.left) {
        this.aimVelX += C.AIM_SPEED_INC;
        cranking = true;
      }
      if (this.keys.right) {
        this.aimVelX -= C.AIM_SPEED_INC;
        cranking = true;
      }
      // up = aim higher: a steeper shot is a *lower* ballAngleY (launch
      // elevation = 75 - ballAngleY), and ballAngleY += -aimVelY below.
      if (this.keys.up) {
        this.aimVelY += C.AIM_SPEED_INC;
        cranking = true;
      }
      if (this.keys.down) {
        this.aimVelY -= C.AIM_SPEED_INC;
        cranking = true;
      }

      this.ballAngleZ += this.aimVelX;
      this.ballAngleY -= this.aimVelY;
      if (this.ballAngleZ > C.BALL_ANGLE_Z_MAX) {
        this.ballAngleZ = C.BALL_ANGLE_Z_MAX;
        this.aimVelX *= -0.5;
      }
      if (this.ballAngleZ < C.BALL_ANGLE_Z_MIN) {
        this.ballAngleZ = C.BALL_ANGLE_Z_MIN;
        this.aimVelX *= -0.5;
      }
      if (this.ballAngleY < C.BALL_ANGLE_Y_MIN) {
        this.ballAngleY = C.BALL_ANGLE_Y_MIN;
        this.aimVelY *= -0.5;
      }
      if (this.ballAngleY > C.BALL_ANGLE_Y_MAX) {
        this.ballAngleY = C.BALL_ANGLE_Y_MAX;
        this.aimVelY *= -0.5;
      }
      this.aimVelX *= C.AIM_FRICTION;
      this.aimVelY *= C.AIM_FRICTION;

      if (cranking) this.audio.startCrank();
      else this.audio.stopCrank();
    }
  }

  // ---------- power meter (initPowerMeter / initPowerAccuracy / oscilate) ----------
  private initPowerMeter() {
    this.oscVal = C.METER_OSC_VAL0;
    this.oscSpeed = C.METER_OSC_SPEED;
    this.oscPerc = Math.abs(Math.sin(this.oscVal)); // ~1: the meter starts empty
    this.movePowerMeter = true;
  }

  /** the accuracy sweep reuses the oscillator, slowed by powerPerc*0.8 (min 0.1) */
  private initPowerAccuracy() {
    let mult = (1 - this.oscPerc) * C.ACCURACY_SPEED_FRAC;
    if (mult < C.ACCURACY_SPEED_MIN) mult = C.ACCURACY_SPEED_MIN;
    this.oscSpeed =
      Math.abs(this.oscSpeed) * mult * (this.meterDir < 0 ? -1 : 1);
  }

  private oscillatePowerTick() {
    const prev = this.oscPerc;
    this.oscVal += this.oscSpeed;
    this.oscPerc = Math.abs(Math.sin(this.oscVal));
    this.meterDir = this.oscPerc < prev ? -1 : 1;
    // oscilatePower: when the accuracy sweep runs back down to the bottom of
    // the track the shot fires itself with whatever accuracy that is
    // (newTop >= 173 on the 28..174 container = fill within 1px of empty)
    if (this.state === "throwBall" && this.oscPerc >= 0.993) this.firePressed();
  }

  // ---------- throwing (getThrowVectors / throwBall) ----------
  private throwBall(thrust: number, aiAngleDeg?: number, accuracy = 0) {
    this.audio.stopCrank();
    this.lastThrust = thrust;
    const dir = this.player1Turn ? 1 : -1;
    const big =
      (this.player1Turn ? this.player1Cannon : this.player2Cannon)?.baseName ===
      "cannonB";
    const radius = big ? C.BALL_RADIUS_BIG : C.BALL_RADIUS;
    (this.ballBody.shapes[0] as CANNON.Sphere).radius = radius;
    this.ballBody.updateBoundingRadius();
    // scale the MODEL like throwBall does (the mesh has its true radius baked)
    this.ball.scale.setScalar(big ? C.BALL_SCALE_BIG : C.BALL_SCALE);
    this.ball.visible = true;
    this.ballShadow.visible = true;

    const cp = this.cannonPos(this.player1Turn ? 1 : 2);
    this.ballBody.position.set(cp.x, cp.y, cp.z + 8);
    this.ballBody.velocity.setZero();
    this.ballBody.angularVelocity.set(0, dir > 0 ? -1 : 1, 0);

    // getThrowVectors: the zenith angle is ballAngleY + 15 for player 1 only —
    // the AI (and player 2 in 2P) fires 15° steeper for the same dial, and the
    // AI's distance->power table is calibrated on that 30° launch (see
    // IMPULSE_SCALE).
    const isAi = aiAngleDeg !== undefined;
    const zenith =
      ((this.ballAngleY + (this.player1Turn ? 15 : 0)) * Math.PI) / 180;
    let xSpeed = thrust * Math.sin(zenith);
    const zSpeed = thrust * Math.cos(zenith);
    const rotZ = isAi
      ? (aiAngleDeg * Math.PI) / 180
      : (this.ballAngleZ * Math.PI) / 180;
    let ySpeed = xSpeed * Math.sin(rotZ);
    xSpeed = xSpeed * Math.cos(rotZ);

    // No random scatter: the only shot error is the deterministic lateral
    // deflection from the accuracy tap (throwBall: tRandY = 400 * accuracy,
    // tRandX = tRandZ = 0). AI shots fly true.
    if (!isAi) ySpeed += C.ACCURACY_DEFLECT_MAX * accuracy;
    const impulse = new CANNON.Vec3(xSpeed * dir, ySpeed * dir, zSpeed);
    impulse.scale(C.IMPULSE_SCALE, impulse);
    if (!this.ballInWorld) {
      this.gw.world.addBody(this.ballBody);
      this.ballInWorld = true;
    }
    this.ballBody.wakeUp();
    this.ballBody.applyImpulse(impulse);

    this.audio.stopAll();
    this.audio.play("boompoof", this.player1Turn ? 200 : 100);
    this.particles.makeSmoke(new THREE.Vector3(cp.x, cp.y, cp.z + 10), 1, -dir);

    this.ballThrown = true;
    this.throwTimeS = 0;
    this.smokeAnimCycle = 0;
    this.hint = ""; // throwBall: defaultHint_txt = EMPTY
    this.state = "ballInPlay";
    this.camState = "waiting";
    this.pickCam("start");
    this.pushHud(true);
  }

  private onBallCollide(ev: {
    body: CANNON.Body;
    contact: CANNON.ContactEquation;
  }) {
    if (!this.ballThrown) return;
    if (ev.body === this.gw.groundBody) {
      this.audio.play("groundHit", 20);
      this.particles.makeSmokePoof(this.ball.position.clone(), 0.8);
      return;
    }
    const targetList = this.player1Turn
      ? this.player2Pieces
      : this.player1Pieces;
    const hitPiece = targetList.find((p) => p.body === ev.body);
    if (hitPiece) {
      const relVel = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      const velPerc = Math.min(1, relVel / 50);
      this.particles.makeAsplode(
        this.ball.position.clone(),
        velPerc,
        this.player1Turn ? 1 : -1,
      );
      this.audio.play("rockHit", velPerc * 255);
      if (hitPiece.isCannon) {
        this.gameWon = true; // detectWin: cannon hit = instant round win
      }
    }
  }

  private removeBallFromSim() {
    if (this.ballInWorld) {
      this.gw.world.removeBody(this.ballBody);
      this.ballInWorld = false;
    }
  }

  // ---------- ball flight per tick (main #ballInPlay) ----------
  private ballInPlayTick(dt: number) {
    this.throwTimeS += dt;

    // mid-flight nudge with left/right (ballController while ballThrown)
    if (this.player1Turn || this.twoPlayer) {
      const f = 600;
      if (this.keys.left)
        this.ballBody.applyForce(
          new CANNON.Vec3(0, f * (this.player1Turn ? 1 : -1), 0),
        );
      if (this.keys.right)
        this.ballBody.applyForce(
          new CANNON.Vec3(0, -f * (this.player1Turn ? 1 : -1), 0),
        );
    }

    this.ballInPlayCamControl();

    // smoke trail for the first seconds of flight (makeSmoke cadence)
    if (this.throwTimeS < C.SMOKE_TRAIL_S) {
      this.smokeAnimCycle = (this.smokeAnimCycle % 5) + 1;
      if (this.smokeAnimCycle === 5) {
        const opacity = 1.0 - this.throwTimeS / C.SMOKE_TRAIL_S;
        this.particles.makeSmoke(
          this.ball.position.clone(),
          opacity,
          this.player1Turn ? 1 : -1,
        );
      }
    }

    if (this.throwTimeS > C.TURN_MIN_WAIT_S) {
      const moving = this.checkForPieceMovement();
      if (!moving || this.throwTimeS > C.TURN_MAX_WAIT_S) {
        this.state = "setPower";
        this.turnEnd();
      }
    }
  }

  /** the impact cutscene camera — ballInPlayCamControl */
  private ballInPlayCamControl() {
    let ballDist = this.ball.position.x;
    if (this.player1Turn) ballDist = -ballDist;
    if (this.camState === "waiting") {
      if (ballDist < -C.BALL_CAM_START_DIST) this.camState = "started";
    } else if (this.camState === "started") {
      if (ballDist > -C.BALL_CAM_STOP_DIST) {
        // original: only the player's own shots get the ball-chase cam
        if ((this.player1Turn || this.twoPlayer) && this.myCam !== "ball")
          this.pickCam("ball");
      } else {
        this.pickCam(this.player1Turn ? "castle2" : "castle1");
        this.camState = "stopped";
      }
    }
  }

  /** checkForPieceMovement — average piece drift since last check */
  private checkForPieceMovement(): boolean {
    const list = this.player1Turn ? this.player2Pieces : this.player1Pieces;
    let sum = 0;
    for (const p of list) {
      const np = new THREE.Vector3(
        p.body.position.x,
        p.body.position.y,
        p.body.position.z,
      );
      sum += np.distanceTo(p.lastPos);
      p.lastPos.copy(np);
    }
    const avg = sum / Math.max(1, list.length);
    return avg > C.PIECE_SETTLED_THRESHOLD;
  }

  // ---------- turn / round flow ----------
  private turnEnd() {
    const flagsDown = this.checkFlagsDown();
    if (flagsDown || this.gameWon) {
      this.roundEnd();
      return;
    }
    this.afterTurnReset();
  }

  private afterTurnReset() {
    this.ballAngleY = C.BALL_ANGLE_Y_DEFAULT;
    this.ballAngleZ = 0;
    this.aimVelX = 0;
    this.aimVelY = 0;
    this.movePowerMeter = false;
    this.powerPerc = 0; // resetPowerMeter: both bars empty for the next turn
    this.switchTurns();
    this.removeBallFromSim();
    this.ball.visible = false;
    this.ballThrown = false;
    this.camState = "waiting";
    this.particles.clear();
    this.pickCam(this.player1Turn ? "aim" : "start");
    this.state = "setPower";
    if (!this.player1Turn && !this.twoPlayer) {
      // computer takes its shot after a beat
      const shot = aiSetPower(
        this.roundCount,
        this.turnCount,
        C.MAX_POWER,
        this.cannonPos(2).add(new THREE.Vector3(0, 0, 8)),
        this.player1Pieces,
        (p) => this.gw.tiltDegrees(p),
      );
      this.hint = "- Computer Player Turn -";
      this.pendingAiShot = { power: shot.power };
      window.setTimeout(() => {
        if (this.state === "setPower" && !this.player1Turn) {
          this.throwBall(shot.power, shot.aimAngleDeg);
        }
        this.pendingAiShot = null;
      }, 1200);
    } else {
      this.hint = this.twoPlayer
        ? `Player ${this.player1Turn ? 1 : 2}: aim, then tap spacebar/FIRE to start the power meter.`
        : "Aim the cannon, then tap spacebar/FIRE to start the power meter.";
    }
    this.pushHud(true);
  }

  /** switchplayer1Turns — swap which castle is live in the physics sim */
  private switchTurns() {
    this.player1Turn = !this.player1Turn;
    const addList = this.player1Turn ? this.player2Pieces : this.player1Pieces;
    const removeList = this.player1Turn
      ? this.player1Pieces
      : this.player2Pieces;
    if (this.player1Turn) this.turnCount++;
    for (const p of removeList) this.gw.removeFromSim(p);
    for (const p of addList) {
      if (!p.isCannon) this.gw.addToSim(p);
    }
    // refresh movement baselines so the settle check starts clean
    for (const p of addList)
      p.lastPos.set(p.body.position.x, p.body.position.y, p.body.position.z);
  }

  /** checkFlagsDown — flag is captured when tilted > 10 deg */
  private checkFlagsDown(): boolean {
    const list = this.player1Turn ? this.player2Pieces : this.player1Pieces;
    let flags = 0,
      down = 0;
    for (const p of list) {
      if (!p.isFlag) continue;
      flags++;
      const t = this.gw.tiltDegrees(p);
      if (
        Math.abs(t.x) > C.FLAG_DOWN_TILT_DEG ||
        Math.abs(t.y) > C.FLAG_DOWN_TILT_DEG
      )
        down++;
    }
    if (this.player1Turn) this.flagsText = `Flags ${down}/${flags}`;
    return flags > 0 && down >= flags;
  }
  flagsText = "Flags 0/0";

  private roundEnd() {
    this.state = "roundOver";
    const won = this.player1Turn || this.twoPlayer;
    this.roundWon = this.player1Turn;
    if (this.player1Turn) {
      if (this.gameWon && this.player2Cannon) {
        this.particles.makeBoom(
          new THREE.Vector3().copy(
            this.player2Cannon.body.position as unknown as THREE.Vector3,
          ),
        );
      }
      this.audio.play("hitGreat");
      this.roundMessage = this.twoPlayer
        ? "PLAYER 1 WINS!"
        : this.gameWon
          ? "YOU WON! Enemy Cannon Destroyed!"
          : "YOU WON! All Enemy Flags Captured!";
    } else {
      if (this.gameWon && this.player1Cannon) {
        this.particles.makeBoom(
          new THREE.Vector3().copy(
            this.player1Cannon.body.position as unknown as THREE.Vector3,
          ),
        );
      }
      this.audio.play(this.twoPlayer ? "hitGreat" : "hitBad");
      this.roundMessage = this.twoPlayer
        ? "PLAYER 2 WINS!"
        : this.gameWon
          ? "YOU LOST! Player Cannon Destroyed!"
          : "YOU LOST! All Player Flags Captured!";
    }
    this.hint = this.roundMessage + " — press spacebar/FIRE to continue";
    void won;
    this.removeBallFromSim();
    this.pushHud(true);
  }

  /** keyUp #roundOver branch: win -> tally, lose -> game over */
  private advanceAfterRound() {
    if (this.roundWon) {
      if (!this.twoPlayer) this.tallyScore();
      this.onRoundFlow?.(this.twoPlayer ? "castleSelect" : "tally");
    } else if (this.twoPlayer) {
      this.onRoundFlow?.("castleSelect");
    } else {
      this.state = "gameOver";
      this.onRoundFlow?.("gameOver");
    }
  }

  /** tallyScore — points from enemy damage + own flags protected */
  private tallyScore() {
    let dmg = 0,
      enemyFlags = 0;
    this.player2Pieces.forEach((p, i) => {
      const np = new THREE.Vector3(
        p.body.position.x,
        p.body.position.y,
        p.body.position.z,
      );
      if (np.distanceTo(this.p2Default[i]) > C.PIECE_DAMAGED_DIST) dmg++;
      if (p.isFlag) enemyFlags++;
    });
    const dmgPerc = Math.floor(
      (100 * dmg) / Math.max(1, this.player2Pieces.length),
    );
    const castleDamage = dmg * C.SCORE_PER_DAMAGED_PIECE;
    const flagDamage = enemyFlags * C.SCORE_PER_FLAG_CAPTURED;
    const rubbleReward = Math.max(0, C.DAMAGE_GOAL - dmgPerc);

    let myFlags = 0,
      myFlagsDamaged = 0;
    this.player1Pieces.forEach((p, i) => {
      if (!p.isFlag) return;
      myFlags++;
      const np = new THREE.Vector3(
        p.body.position.x,
        p.body.position.y,
        p.body.position.z,
      );
      if (np.distanceTo(this.p1Default[i]) > C.PIECE_DAMAGED_DIST)
        myFlagsDamaged++;
    });
    const flagProtect = (myFlags - myFlagsDamaged) * C.SCORE_PER_FLAG_PROTECTED;
    const total = castleDamage + rubbleReward + flagProtect + flagDamage;
    this.tally = { castleDamage, rubbleReward, flagProtect, flagDamage, total };
    this.player1Score += total;
    this.player1Gold += total;
    this.saveGold();
    this.state = "tallyScore";
    this.pushHud(true);
  }

  toggleSound() {
    this.audio.enabled = !this.audio.enabled;
    if (!this.audio.enabled) this.audio.stopAll();
    return this.audio.enabled;
  }

  // ---------- main loop ----------
  start() {
    this.lastT = performance.now();
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      let frame = Math.min(100, t - this.lastT);
      this.lastT = t;
      this.tickAccum += frame;
      let ticks = 0;
      while (this.tickAccum >= C.LOGIC_DT_MS && ticks < 20) {
        this.tickAccum -= C.LOGIC_DT_MS;
        this.logicTick(C.LOGIC_DT_MS / 1000);
        ticks++;
      }
      this.gw.syncMeshes();
      this.ball.position.set(
        this.ballBody.position.x,
        this.ballBody.position.y,
        this.ballBody.position.z,
      );
      this.ballShadowFollow();
      this.particles.update(frame / 1000);
      this.updateCamera();
      this.renderer.render(this.gw.scene, this.camera);
      if (t - this.lastHudPush > 50) this.pushHud();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.audio.stopAll();
  }

  private logicTick(dt: number) {
    switch (this.state) {
      case "ballInPlay":
        this.ballInPlayTick(dt);
        this.stepPhysics();
        break;
      case "setPower":
      case "setAccuracy":
      case "throwBall":
        this.aimTick();
        this.stepPhysics();
        break;
      default:
        break;
    }
    if (this.movePowerMeter) this.oscillatePowerTick();
  }

  private stepPhysics() {
    const sub = C.PHYS_DT_PER_TICK / C.PHYS_SUBSTEPS;
    for (let i = 0; i < C.PHYS_SUBSTEPS; i++) this.gw.world.step(sub);
  }

  private pushHud(force = false) {
    if (!this.hudCb) return;
    this.lastHudPush = performance.now();
    this.hudCb({
      state: this.state,
      level: this.roundCount + 1,
      gold: Math.floor(this.player1Gold),
      score: Math.floor(this.player1Score),
      flagsText: this.flagsText,
      hint: this.hint,
      // during the power sweep the meter tracks the oscillator; during the
      // accuracy sweep it freezes at the set power and the accuracy bar
      // takes over
      meterPerc:
        this.state === "setAccuracy" ? 1 - this.oscPerc : this.powerPerc,
      accuracyPerc: this.state === "throwBall" ? 1 - this.oscPerc : undefined,
      angleY: this.ballAngleY,
      angleZ: this.ballAngleZ,
      playerTurn: this.player1Turn ? 1 : 2,
      twoPlayer: this.twoPlayer,
      tally: this.tally,
      roundWon: this.roundWon,
      roundMessage: this.roundMessage,
    });
    void force;
  }
}
