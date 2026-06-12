// Computer opponent, ported from aiClass.setPower. The AI aims the ball at a
// random surviving flag on the player's castle, with an aim error
// ("dumbness offset") that shrinks at higher levels, and power derived
// linearly from distance. On long stalemates (turn > 10) it cycles reduced
// power to vary its shots; turns 4-6 step power down slightly.

import * as THREE from "three";
import {
  AI_MIN_GOLD_DIST, AI_MAX_GOLD_DIST, AI_MIN_POWER_PERC, AI_MAX_POWER_PERC,
} from "./constants";
import { GamePiece } from "./world";

export interface AiShot {
  power: number;
  aimAngleDeg: number; // rotation toward target around z
}

export function aiSetPower(
  roundCount: number,
  turnCount: number,
  maxPower: number,
  ballPos: THREE.Vector3,
  targetPieces: GamePiece[],
  tiltOf: (p: GamePiece) => { x: number; y: number }
): AiShot {
  // pick a random still-standing flag (fall back to castle center)
  const flags = targetPieces.filter((p) => {
    if (!p.isFlag) return false;
    const t = tiltOf(p);
    return !(Math.abs(t.x) > 20 || Math.abs(t.y) > 20);
  });
  let target = new THREE.Vector3(-200, 0, 0);
  if (flags.length > 0) {
    const f = flags[Math.floor(Math.random() * flags.length)];
    target = new THREE.Vector3(f.body.position.x, f.body.position.y, f.body.position.z);
  }

  const tRound = Math.min(roundCount, 10);
  let dumbness = Math.floor(Math.random() * 41) - 21;
  dumbness *= (1.0 - tRound / 10.0) * 0.2;

  const dx = target.x - ballPos.x;
  const dy = target.y - ballPos.y;
  const dz = target.z - ballPos.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angle = (Math.atan(dy / dx) * 180) / Math.PI + dumbness;

  let dumbnessPowerPerc = 1;
  if (turnCount > 10) {
    const off = turnCount % 3;
    dumbnessPowerPerc = off === 1 ? 0.8 : off === 2 ? 0.6 : 1;
  }
  const distPerc = (dist - AI_MIN_GOLD_DIST) / (AI_MAX_GOLD_DIST - AI_MIN_GOLD_DIST);
  const powerPerc = AI_MIN_POWER_PERC + (AI_MAX_POWER_PERC - AI_MIN_POWER_PERC) * distPerc;
  let power = maxPower * powerPerc * dumbnessPowerPerc;
  if (turnCount > 3 && turnCount < 7) {
    power -= (turnCount - 3) * (power * 0.02);
  }
  return { power, aimAngleDeg: angle };
}
