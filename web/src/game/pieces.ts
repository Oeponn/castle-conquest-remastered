// Castle piece catalogue. Display names and shop prices are 1:1 from
// gameClass (getWorldName / refund). Physics classes are from simClass's
// sim-type table. Since 2026-07-05 the rendered geometry is the ORIGINAL
// meshes from the w3d (models.ts); the local bounding boxes that drive the
// colliders live in the generated modelData.ts. `kind` only picks the
// collider shape now (cylinder for the round towers, the slim flag box);
// `size` is the old reconstructed-primitive guess, kept for reference and
// as documentation of what the pre-mesh port shipped.

export type PieceKind =
  | "box"
  | "cylinder"
  | "wedge"
  | "flag"
  | "cannon"
  | "arch";

export interface PieceDef {
  kind: PieceKind;
  /** LEGACY reconstructed extents (pre-mesh port) — colliders now derive
   * from modelData.PIECE_BBOX; see world.ts pieceCollider. */
  size: [number, number, number];
  mass: number;
  restitution: number;
  friction: number;
  displayName: string;
  price: number;
}

// simClass presets, from the original table: 1:{30, rest 1, fric 0.6}
// 2:static 3:{55, rest 0.5, fric 0.4} 4:ball 5:{30, nonconvex} 6:{10}.
// (An earlier pass ran these ~25% lighter to compensate for a mistuned,
// too-slow ball; with the launch speed recovered from the original the 22 kg
// ball at ~210-240 u/s moves full-weight pieces fine.)
// Masses now run ~25% above the original presets (30/55/10) so castles feel
// a bit more solid against that launch speed.

const WALL = { mass: 48, restitution: 1, friction: 0.6 };
const HEAVY = { mass: 70, restitution: 0.5, friction: 0.4 };
const LIGHT = { mass: 33, restitution: 1, friction: 0.6 };

export const PIECES: Record<string, PieceDef> = {
  wallA: {
    kind: "box",
    size: [5, 25, 15],
    ...WALL,
    displayName: "Wall Thin",
    price: 100,
  },
  wallB: {
    kind: "box",
    size: [10, 25, 15],
    ...WALL,
    displayName: "Wall Thick",
    price: 500,
  },
  towerA: {
    kind: "cylinder",
    size: [15, 15, 15],
    ...WALL,
    displayName: "Tower Piece",
    price: 750,
  },
  wallTopA: {
    kind: "box",
    size: [5, 25, 8],
    ...WALL,
    displayName: "Wall Top Thin",
    price: 150,
  },
  wallTopB: {
    kind: "box",
    size: [10, 25, 8],
    ...WALL,
    displayName: "Wall Top Thick",
    price: 750,
  },
  // Tower-top heights are pinned by the layouts: every castle mounts flags at
  // the top's base z + 10 (e.g. castle 1: towerTopA at 15, flag at 25;
  // castle 11: 45 -> 55; castle 7 puts a flag on towerTopB at +10).
  towerTopA: {
    kind: "cylinder",
    size: [17, 17, 10],
    ...WALL,
    displayName: "Tower Top",
    price: 1000,
  },
  drawbridgeA: {
    kind: "box",
    size: [3, 20, 28],
    ...WALL,
    displayName: "Drawbridge",
    price: 1000,
  },
  archA: {
    kind: "arch",
    size: [5, 30, 10],
    mass: 38,
    restitution: 1,
    friction: 0.6,
    displayName: "Archway",
    price: 800,
  },
  towerTopB: {
    kind: "box",
    size: [16, 16, 10],
    ...WALL,
    displayName: "Platform",
    price: 1500,
  },
  wallPieceA: {
    kind: "box",
    size: [5, 10, 15],
    ...WALL,
    displayName: "Wall Piece",
    price: 75,
  },
  supportA: {
    kind: "wedge",
    size: [8, 8, 15],
    ...WALL,
    displayName: "Wedge Small",
    price: 500,
  },
  supportB: {
    kind: "wedge",
    size: [12, 12, 15],
    ...WALL,
    displayName: "Wedge Large",
    price: 750,
  },
  cannonA: {
    kind: "cannon",
    size: [16, 10, 10],
    ...HEAVY,
    displayName: "Cannon Small",
    price: 0,
  },
  cannonB: {
    kind: "cannon",
    size: [24, 15, 15],
    ...HEAVY,
    displayName: "Cannon Large",
    price: 2500,
  },
  flagPoleC: {
    kind: "flag",
    size: [1.2, 1.2, 20],
    ...LIGHT,
    displayName: "Flag",
    price: 5000,
  },
};
