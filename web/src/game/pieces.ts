// Castle piece catalogue. Display names and shop prices are 1:1 from
// gameClass (getWorldName / refund). Physics classes are from simClass's
// sim-type table. Dimensions are reconstructed: the original meshes live in
// the compressed Shockwave-3D world (no public decoder), but the layouts
// place pieces on a strict 25-unit grid with 15-unit storeys, so each shape
// is sized to fill its slot exactly like the original.

export type PieceKind =
  | "box"
  | "cylinder"
  | "wedge"
  | "flag"
  | "cannon"
  | "arch";

export interface PieceDef {
  kind: PieceKind;
  /** x (toward enemy), y (across), z (up) full extents */
  size: [number, number, number];
  mass: number;
  restitution: number;
  friction: number;
  displayName: string;
  price: number;
}

// simClass presets (original masses kept in comments): 1:{30} 2:static
// 3:{55} 4:ball 5:{30,nonconvex} 6:{10}. We run everything ~25% lighter than
// the original table so pieces respond to a moderate hit instead of needing a
// full-power blast — the gentler-feeling castle the original Havok scaling
// implied but cannon-es doesn't reproduce. Mass ratios are preserved.
const WALL = { mass: 25, restitution: 1, friction: 0.6 }; // orig 30
const HEAVY = { mass: 50, restitution: 0.5, friction: 0.4 }; // orig 55
const LIGHT = { mass: 10, restitution: 1, friction: 0.6 }; // orig 10

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
    mass: 30,
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

export function pieceBaseName(modelName: string): string {
  for (const key of Object.keys(PIECES)) {
    if (modelName.includes(key)) return key;
  }
  return "wallPieceA";
}
