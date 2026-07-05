// Builds the 3D scene: ground, sky, castle pieces (mesh + physics body).
// Coordinate system matches the original Shockwave world: z is up,
// player 1 attacks from negative x toward positive x.
//
// As of 2026-07-05 the visuals use the ORIGINAL meshes extracted from the
// w3d (see models.ts / PORTING_NOTES.md). Key consequence: the castle layout
// strings position pieces by their authored PIVOT, which is not the bbox
// center (wallA spans x 0..5 from its pivot; towerA's cylinder is centered
// at +2.5,+2.5). Physics bodies sit at the collider's center (proper center
// of mass for cannon-es), and the visual mesh hangs off the body group at
// minus that offset so the pivot lands exactly on the authored coordinate.

import * as THREE from "three";
import * as CANNON from "cannon-es";
import { PIECES, PieceDef } from "./pieces";
import { PieceData } from "./castles";
import { GRAVITY } from "./constants";
import { PIECE_BBOX } from "./modelData";
import { getModelMesh } from "./models";

export interface GamePiece {
  name: string;
  baseName: string;
  mesh: THREE.Object3D;
  body: CANNON.Body;
  defaultPos: THREE.Vector3;
  lastPos: THREE.Vector3;
  isFlag: boolean;
  isCannon: boolean;
}

/** Collider derived from the real mesh's local bbox.
 *
 * - The base is floored to z=0: pieces are authored floating ~0.5 above
 *   their pivot; flooring keeps them resting exactly at the authored z
 *   (same behavior the calibrated primitive port had).
 * - towerTopA/towerTopB colliders are capped at 10 units tall even though
 *   the real meshes are ~15 (towerTopA's top third is the cone roof):
 *   layouts mount flags at the top's base z + 10, i.e. the flag pole is
 *   authored EMBEDDED in the roof. A full-height collider would overlap the
 *   flag body and blast it off on the first wake. The 10-unit collider is
 *   exactly the tested pre-mesh setup: the flag body rests flush on it.
 * - flagPoleC keeps the legacy slim 3x3x20 box (the real mesh is a 10.6-unit
 *   pole + cloth): tall and thin is what makes tilt>10° detection behave,
 *   and its base resting at the authored z is what keeps it mounted.
 */
interface ColliderSpec {
  shape: CANNON.Shape;
  /** collider center in piece-local (pivot) space */
  center: THREE.Vector3;
  /** local orientation of the shape within the body. cannon-es cylinders are
   * built along their local Y axis; our world is Z-up, so cylinder colliders
   * must be rotated 90° about X to stand upright. Without it `height` becomes a
   * horizontal dimension and the vertical extent collapses to the radius —
   * which quietly balloons the trimmed flag-mount tops (height 10, radius 7.4)
   * to 14.8 tall in Z, penetrating the tower below and the flag resting on top
   * and launching both on the first wake. */
  orientation?: CANNON.Quaternion;
}

/** Collider trims, in LOCAL piece space. The original meshes are authored to
 * INTERPENETRATE in the layouts (verified against every castle string with
 * an exact AABB sweep — all layout yaws are multiples of 90°):
 *   - wallTopA/B are 29.8 long but placed at 25-unit pitch (crenellation
 *     rows overlap ~4.8 into each other and into tower tops);
 *   - storey pieces are 15.03-15.16 tall on exact 15-unit storeys;
 *   - drawbridgeA is 35.2 tall while archA sits at z 30 above it;
 *   - towerTopA/B mount flags at base+10 (pole embedded in the roof).
 * Havok absorbed spawn penetration; cannon-es resolves it violently on the
 * first wake (a single mid-power shot flattened 27/28 pieces before these
 * trims). Meshes render the authored overlap; only colliders shrink. */
const COLLIDER_TRIM: Record<string, { height?: number; halfY?: number }> = {
  towerTopA: { height: 10 }, // flag mount (see pieceCollider doc above)
  towerTopB: { height: 10, halfY: 12.45 }, // flag mount + 25-pitch rows
  // wallTops need the harder trim: rows at 25-pitch AND flush against
  // tower-top cylinders / wallPieceA gate columns (castles 3, 6, 8)
  wallTopA: { height: 15, halfY: 10.0 },
  wallTopB: { height: 15, halfY: 10.0 },
  wallA: { height: 15 },
  wallB: { height: 15 },
  wallPieceA: { height: 15 }, // 15.16 tall; z15 storeys + archA at z30 above
  drawbridgeA: { height: 29.9 }, // 35.2 tall; archA sits at z 30
};

export function pieceCollider(baseName: string, def: PieceDef): ColliderSpec {
  if (def.kind === "flag") {
    // Pole axis sits at local (+2.5, +2.5). Height = the REAL pole (10.6,
    // pole embedded in the mount roof, cloth at the top) — the legacy
    // 20-tall guess overlapped towerTopB side-mounted flags (castle 12).
    return {
      shape: new CANNON.Box(new CANNON.Vec3(1.5, 1.5, 5.3)),
      center: new THREE.Vector3(2.5, 2.5, 5.3),
    };
  }
  const bb = PIECE_BBOX[baseName];
  const [x0, y0] = bb.bboxMin;
  const [x1, y1, z1] = bb.bboxMax;
  const trim = COLLIDER_TRIM[baseName];
  const height = trim?.height ?? z1; // base floored to z=0
  const halfY = trim?.halfY ?? (y1 - y0) / 2;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  if (def.kind === "cylinder") {
    const r = (x1 - x0) / 2;
    const orientation = new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0);
    return {
      shape: new CANNON.Cylinder(r, r, height, 12),
      center: new THREE.Vector3(cx, cy, height / 2),
      orientation,
    };
  }
  return {
    shape: new CANNON.Box(new CANNON.Vec3((x1 - x0) / 2, halfY, height / 2)),
    center: new THREE.Vector3(cx, cy, height / 2),
  };
}

/** Body-space visual for a piece: the original mesh, hung so that the piece
 * pivot sits at -center (i.e., at the authored coordinate once the body is
 * placed at pivot + R(yaw)·center). Shared with the thumbnail renderer,
 * which uses offset (0,0,0) and places pivots directly. */
export function buildPieceMesh(
  baseName: string,
  offset?: THREE.Vector3,
): THREE.Object3D {
  const g = new THREE.Group();
  const m = getModelMesh(baseName);
  if (offset) m.position.set(-offset.x, -offset.y, -offset.z);
  g.add(m);
  return g;
}

export class GameWorld {
  scene = new THREE.Scene();
  world = new CANNON.World();
  pieces: GamePiece[] = [];
  groundBody!: CANNON.Body;
  private pieceCount = 0;

  constructor() {
    this.world.gravity.set(0, 0, GRAVITY);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.6;
    this.world.defaultContactMaterial.restitution = 0.15;

    // Original scenery, world-space as authored: the textured ground slab,
    // the skydome photo sphere (r~536, full-bright per gameClass which sets
    // shader("blinn4").emissive to white), and the 27 tree billboards. The
    // old port used a flat green plane, a giant r=1500 sphere with the 2D
    // skydome bitmap, and no trees. No fog: the original had none, and the
    // dome's baked horizon haze does that job.
    const sky = getModelMesh("skydome");
    sky.renderOrder = -1;
    this.scene.add(sky);
    this.scene.add(getModelMesh("ground"));
    this.scene.add(getModelMesh("trees"));

    this.groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    // CANNON.Plane faces +z by default, which is up in our world. p_ground sim=2.
    // Friction is stored as sqrt(catalogue value): cannon-es MULTIPLIES the two
    // materials' frictions at a contact, while Havok combines them as the
    // geometric mean — sqrt(a)*sqrt(b) = sqrt(a*b) restores Havok's rule.
    // (Raw values would give e.g. piece-on-piece 0.6*0.6 = 0.36: everything
    // slides around at half grip and the castle feels weightless.)
    this.groundBody.material = new CANNON.Material({
      friction: Math.sqrt(0.9),
      restitution: 0.1,
    });
    this.world.addBody(this.groundBody);

    // Lights
    const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x40502a, 1.0);
    hemi.position.set(0, 0, 1);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
    sun.position.set(-200, -300, 400);
    this.scene.add(sun);
  }

  private buildBody(def: PieceDef, spec: ColliderSpec): CANNON.Body {
    const body = new CANNON.Body({ mass: def.mass });
    if (spec.orientation)
      body.addShape(spec.shape, new CANNON.Vec3(), spec.orientation);
    else body.addShape(spec.shape);
    // The catalogue restitution is Havok's (which only bounced above a
    // velocity threshold); cannon-es applies it at any contact speed, so
    // resting stacks micro-bounce and wobble unless it's near zero.
    // Friction is sqrt-encoded — see the ground material comment.
    body.material = new CANNON.Material({
      friction: Math.sqrt(def.friction),
      restitution: 0.05,
    });
    // Damping keeps impacts *localized*: a struck piece bleeds off velocity
    // (and especially the fast spin a hard hit imparts) quickly, so it topples
    // roughly in place instead of cartwheeling into the rest of the castle and
    // dominoing the whole thing down. Linear damping is light so pieces still
    // fall naturally under gravity; angular damping is heavier to tame tumbling.
    body.linearDamping = 0.15;
    body.angularDamping = 0.5;
    body.sleepSpeedLimit = 0.4;
    body.sleepTimeLimit = 0.6;
    return body;
  }

  /** castleBuilderClass.makeCastlePiece — (x,y,z) is the authored PIVOT
   * (z at the piece's base; x and rz arrive pre-multiplied by side, exactly
   * like the original's makeCastle does). Mirroring is the original's
   * `transform.scale.x = -1` — a TRUE geometric mirror about the pivot's
   * local YZ plane, NOT a 180° yaw. (The pre-mesh port used a +180° yaw
   * hack, invisible on centered primitives; with pivot-offset meshes it
   * displaced differently-rotated pieces by different amounts, leaving 34
   * interpenetrating collider pairs across the enemy castles — the cause of
   * one shot flattening 27/28 pieces.) Original quirk kept 1:1: flags with
   * rz=0 sit at y+1 (both sides) and lean -8° on x on the enemy side only
   * (safe under the 20° flag-down threshold).
   *
   * The body is centered on the collider (pivot + rotated, mirrored collider
   * center); the mesh child hangs at -center inside a group whose scale.x is
   * the side (three.js handles negative-determinant winding automatically). */
  makeCastlePiece(
    pieceName: string,
    x: number,
    y: number,
    z: number,
    rz: number,
    side: 1 | -1,
  ): GamePiece {
    this.pieceCount++;
    const def = PIECES[pieceName];
    const name = `p_clone_${pieceName}_${this.pieceCount}`;
    const spec = pieceCollider(pieceName, def);
    const mesh = buildPieceMesh(pieceName, spec.center);
    mesh.scale.x = side;
    const body = this.buildBody(def, spec);
    let ty = y;
    let rx = 0;
    if (def.kind === "flag" && rz === 0) {
      ty = y + 1;
      rx = side === -1 ? (-8 * Math.PI) / 180 : 0;
    }
    const yaw = (rz * Math.PI) / 180;
    body.quaternion.setFromEuler(rx, 0, yaw);
    const centerWorld = body.quaternion.vmult(
      new CANNON.Vec3(spec.center.x * side, spec.center.y, spec.center.z),
    );
    body.position.set(x + centerWorld.x, ty + centerWorld.y, z + centerWorld.z);
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    mesh.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
    this.scene.add(mesh);
    const piece: GamePiece = {
      name,
      baseName: pieceName,
      mesh,
      body,
      defaultPos: new THREE.Vector3().copy(
        body.position as unknown as THREE.Vector3,
      ),
      lastPos: new THREE.Vector3().copy(
        body.position as unknown as THREE.Vector3,
      ),
      isFlag: pieceName.includes("flagPole"),
      isCannon: pieceName.includes("cannon"),
    };
    this.pieces.push(piece);
    return piece;
  }

  /** castleBuilderClass.makeCastle — side=1 builds as-authored, -1 mirrors x. */
  makeCastle(dataList: PieceData[], side: 1 | -1): GamePiece[] {
    const out: GamePiece[] = [];
    for (const pd of dataList) {
      out.push(
        this.makeCastlePiece(
          pd.name,
          pd.x * side,
          pd.y,
          pd.z,
          pd.rz * side,
          side,
        ),
      );
    }
    return out;
  }

  addToSim(piece: GamePiece) {
    if (!this.world.bodies.includes(piece.body)) this.world.addBody(piece.body);
    // Spawn frozen: Havok held live stacks rock-stable, cannon-es doesn't.
    // A sleeping body is immovable until an awake one (the ball, or a piece
    // it knocked loose) contacts it, which wakes the stack in a chain.
    piece.body.sleep();
  }

  removeFromSim(piece: GamePiece) {
    if (this.world.bodies.includes(piece.body))
      this.world.removeBody(piece.body);
  }

  syncMeshes() {
    for (const p of this.pieces) {
      p.mesh.position.set(
        p.body.position.x,
        p.body.position.y,
        p.body.position.z,
      );
      p.mesh.quaternion.set(
        p.body.quaternion.x,
        p.body.quaternion.y,
        p.body.quaternion.z,
        p.body.quaternion.w,
      );
    }
  }

  clearPieces() {
    for (const p of this.pieces) {
      this.scene.remove(p.mesh);
      this.removeFromSim(p);
    }
    this.pieces = [];
    this.pieceCount = 0;
  }

  /** world-space tilt of a piece in degrees on x/y axes (checkFlagsDown) */
  tiltDegrees(piece: GamePiece): { x: number; y: number } {
    const e = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(
        piece.body.quaternion.x,
        piece.body.quaternion.y,
        piece.body.quaternion.z,
        piece.body.quaternion.w,
      ),
      "XYZ",
    );
    return { x: (e.x * 180) / Math.PI, y: (e.y * 180) / Math.PI };
  }
}
