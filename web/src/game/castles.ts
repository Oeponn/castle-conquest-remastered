// The 12 built-in castle layouts, copied verbatim from the decompiled
// castleBuilderClass.getCastleDataList (assets/decompiled/.../ParentScript 3).
// Format: repeating groups of pieceName, x, y, z, zRotation.
// Player 1 builds at negative x; player 2's castle is mirrored (x and rz * -1).

export interface PieceData {
  name: string;
  x: number;
  y: number;
  z: number;
  rz: number;
}

const CASTLE_STRINGS: Record<number, string> = {
  1: "towerA,-200,25,0,180,wallA,-200,0,0,180,towerA,-200,-20,0,180,towerTopA,-200,-20,15,180,towerTopA,-200,25,15,180,wallA,-225,25,0,-90,wallA,-225,-25,0,90,flagPoleC,-200,25,25,180,flagPoleC,-205,-25,25,0,cannonA,-230,5,0,-180",
  2: "drawbridgeA,-195,0,0,180,towerA,-200,55,0,180,wallPieceA,-200,15,0,180,wallPieceA,-200,15,15,180,wallPieceA,-200,-10,0,180,wallPieceA,-200,-10,15,180,archA,-200,0,30,180,wallA,-200,30,0,180,wallA,-200,-30,0,180,towerA,-200,-50,0,180,towerTopA,-200,-50,15,180,towerTopA,-200,55,15,180,wallA,-225,55,0,-90,wallA,-225,-55,0,90,towerA,-245,55,0,180,towerA,-245,-50,15,180,towerA,-245,55,15,180,towerA,-245,-50,0,180,flagPoleC,-200,55,25,180,flagPoleC,-205,-55,25,0,cannonA,-230,35,0,180",
  3: "drawbridgeA,-195,0,0,-180,towerA,-200,55,0,-180,wallPieceA,-200,15,0,-180,wallPieceA,-200,15,15,-180,wallPieceA,-200,-10,0,-180,wallPieceA,-200,-10,15,-180,archA,-200,0,30,-180,wallA,-200,30,0,-180,wallA,-200,-30,0,-180,towerA,-200,-50,0,-180,towerTopA,-200,-50,15,-180,towerTopA,-200,55,15,-180,wallA,-225,55,0,-90,wallA,-225,-55,0,90,towerA,-245,55,0,-180,towerA,-245,-50,0,-180,flagPoleC,-200,55,25,-180,flagPoleC,-205,-55,25,0,wallTopA,-200,-30,15,180,wallTopA,-200,35,15,180,wallTopA,-225,-50,15,-90,wallTopA,-225,50,15,90,towerTopA,-245,-50,15,180,towerTopA,-245,55,15,180,cannonA,-225,-75,0,180",
  4: "drawbridgeA,-195,0,0,180,towerA,-200,55,0,180,wallPieceA,-200,15,0,180,wallPieceA,-200,15,15,180,wallPieceA,-200,-10,0,180,wallPieceA,-200,-10,15,180,archA,-200,0,30,180,towerA,-200,-50,0,180,towerTopA,-200,-50,15,180,towerTopA,-200,55,15,180,wallA,-225,55,0,-90,wallA,-225,-55,0,90,towerA,-245,55,0,180,towerA,-245,-50,0,180,flagPoleC,-200,55,25,180,flagPoleC,-205,-55,25,0,wallTopA,-225,-50,15,-90,wallTopA,-225,50,15,90,towerTopA,-245,-50,15,-180,towerTopA,-245,55,15,-180,wallB,-200,-30,0,180,wallB,-200,30,0,180,wallTopB,-200,30,15,180,wallTopB,-200,-30,15,180,wallA,-250,30,0,180,wallA,-250,-30,0,180,wallA,-250,0,0,180,cannonA,-235,80,0,180",
  5: "wallB,-200,-15,0,-180,wallB,-200,15,0,-180,wallB,-200,-15,15,-180,wallB,-200,15,15,-180,towerA,-195,-35,0,-180,towerA,-195,-35,15,-180,towerA,-195,-35,30,-180,towerTopA,-195,-35,45,-180,towerA,-195,40,0,-180,towerA,-195,40,15,-180,towerA,-195,40,30,-180,towerTopA,-195,40,45,-180,wallTopB,-200,-15,30,-180,wallTopB,-200,15,30,-180,wallB,-220,-35,0,-90,wallB,-220,-35,15,-90,wallB,-250,-35,0,-90,wallB,-250,-35,15,-90,wallB,-220,-35,30,-90,wallB,-250,-35,30,-90,wallB,-220,35,0,90,wallB,-220,35,15,90,wallB,-250,35,15,90,wallB,-250,35,0,90,wallB,-220,35,30,90,wallB,-250,35,30,90,towerA,-270,-35,0,-180,towerA,-270,-35,15,-180,towerA,-270,-35,30,-180,towerA,-270,40,0,-180,towerA,-270,40,15,-180,towerA,-270,40,30,-180,flagPoleC,-195,40,55,180,flagPoleC,-200,-40,55,0,cannonB,-180,0,0,-180,flagPoleC,-310,-50,0,0",
  6: "drawbridgeA,-195,0,0,-180,towerA,-200,55,0,-180,wallPieceA,-200,15,0,-180,wallPieceA,-200,15,15,-180,wallPieceA,-200,-10,0,-180,wallPieceA,-200,-10,15,-180,archA,-200,0,30,-180,towerA,-200,-50,0,-180,towerTopA,-200,-50,15,-180,towerTopA,-200,55,15,-180,wallA,-225,55,0,-90,wallA,-225,-55,0,90,towerA,-245,50,0,-180,towerA,-260,-40,0,-180,flagPoleC,-200,55,25,-180,flagPoleC,-205,-55,25,0,wallTopA,-225,-50,15,-90,wallTopA,-225,50,15,90,towerTopA,-255,-10,30,180,towerTopA,-245,50,15,180,wallB,-200,-30,0,-180,wallB,-200,30,0,-180,wallTopB,-200,30,15,-180,wallTopB,-200,-25,15,-180,wallA,-255,-50,0,-90,wallA,-265,10,0,-180,towerTopB,-255,-35,15,180,towerA,-245,-40,0,180,towerA,-245,-25,0,180,towerA,-260,-25,0,180,towerA,-260,-10,0,180,towerA,-255,-10,15,180,towerA,-260,35,0,180,towerTopA,-260,35,15,180,flagPoleC,-260,-15,40,0,cannonB,-185,-30,0,-180",
  7: "towerA,-200,70,0,180,towerA,-265,110,0,180,towerTopA,-265,110,15,180,towerTopA,-200,70,15,180,flagPoleC,-280,-40,25,180,flagPoleC,-285,-90,25,0,cannonB,-200,-10,0,180,wallB,-270,-65,0,180,supportA,-285,-70,0,0,supportB,-285,-80,0,0,supportB,-285,-55,0,0,supportA,-285,-60,0,0,wallTopB,-270,-65,15,180,towerA,-280,-40,0,180,towerA,-280,-85,0,180,towerTopA,-280,-85,15,180,towerTopA,-280,-40,15,180,towerA,-295,-40,0,180,towerA,-295,-85,0,180,towerA,-185,-105,0,180,towerA,-300,50,0,180,towerA,-300,50,15,180,towerTopA,-185,-105,15,180,towerTopA,-220,-45,15,180,towerTopB,-250,35,15,180,wallA,-250,20,0,-90,wallA,-250,55,0,-90,wallB,-265,35,0,180,wallB,-235,35,0,180,towerA,-220,-45,0,180,flagPoleC,-220,-45,25,180,flagPoleC,-250,30,25,0,flagPoleC,-200,70,25,180,flagPoleC,-265,110,25,180,flagPoleC,-320,50,0,-90,flagPoleC,-190,-110,25,0,wallTopB,-180,-10,0,-180,towerTopA,-180,-30,0,-180,towerTopA,-180,15,0,-180",
  8: "wallA,-245,0,0,-180,wallA,-245,-30,0,-180,wallA,-245,30,0,-180,wallA,-245,0,15,-180,wallA,-245,-30,15,-180,wallA,-245,30,15,-180,wallA,-245,0,30,-180,wallA,-245,-30,30,-180,wallA,-245,30,30,-180,wallTopA,-245,25,45,-180,wallTopA,-245,0,45,-180,wallTopA,-245,-25,45,-180,towerA,-285,-25,0,-180,towerA,-285,30,0,-180,towerTopA,-285,30,15,-180,towerTopA,-285,-25,15,-180,wallA,-265,-25,0,-90,wallA,-265,30,0,-90,supportB,-260,25,15,0,supportB,-260,-30,15,0,supportB,-260,-5,0,0,flagPoleC,-285,30,25,-180,flagPoleC,-290,-30,25,0,cannonB,-200,75,0,-180",
  9: "towerA,-185,-25,15,180,towerA,-230,-30,0,180,towerTopA,-185,80,30,180,flagPoleC,-280,35,25,180,cannonA,-210,-45,0,-180,towerA,-230,-45,0,180,towerA,-245,-30,0,180,towerTopB,-240,-40,15,180,flagPoleC,-265,-45,15,0,flagPoleC,-185,80,40,180,flagPoleC,-190,-30,40,0,towerA,-185,80,0,180,towerA,-185,80,15,180,wallB,-185,55,15,180,towerA,-185,-25,0,180,drawbridgeA,-185,25,0,180,wallPieceA,-185,40,0,180,wallPieceA,-185,40,15,180,wallPieceA,-185,15,0,180,wallPieceA,-185,15,15,180,archA,-185,25,30,180,wallB,-185,55,0,180,wallTopB,-185,55,30,180,wallB,-185,-5,0,180,wallB,-185,-5,15,180,wallTopB,-185,-5,30,180,towerTopA,-185,-25,30,180,wallB,-210,-30,0,-90,wallB,-210,-30,15,-90,towerA,-245,-45,0,180,wallB,-210,80,0,-90,towerA,-230,80,0,180,wallB,-235,55,0,180,towerA,-235,35,0,180,wallB,-260,30,0,-90,towerA,-280,35,0,180,wallB,-280,10,0,180,wallB,-280,-20,0,180,towerA,-275,-40,0,180,towerA,-260,-40,0,180,towerTopA,-230,80,15,-180,wallTopB,-210,80,15,-90,wallTopB,-235,55,15,0,towerTopA,-235,35,15,-180,wallTopB,-260,30,15,-90,towerTopA,-280,35,15,-180,wallB,-280,10,15,-180,wallB,-280,-20,15,-180,towerTopA,-275,-40,15,-180,towerA,-205,-90,0,-180,towerTopA,-205,-90,15,-180",
  10: "towerA,-200,100,0,180,wallA,-200,75,0,180,towerA,-200,55,0,180,towerTopA,-200,25,15,180,towerTopA,-200,55,15,180,wallA,-225,100,0,-90,wallA,-225,50,0,90,flagPoleC,-200,25,25,180,flagPoleC,-205,-25,25,0,cannonA,-205,40,0,-180,towerA,-200,25,0,180,towerA,-200,-20,0,180,wallA,-200,-75,0,180,towerA,-200,-50,0,180,towerA,-200,-95,0,180,wallPieceA,-205,15,0,180,wallPieceA,-205,-10,0,180,wallPieceA,-205,15,15,180,wallPieceA,-205,-10,15,180,archA,-205,0,30,180,towerTopA,-200,-20,15,180,towerTopA,-200,-50,15,180,drawbridgeA,-205,0,0,180,wallA,-225,-50,0,-90,wallA,-225,-95,0,-90,towerTopA,-200,-95,15,180,towerTopA,-200,100,15,180,wallTopA,-200,75,15,180,wallTopA,-200,-75,15,180,supportB,-245,10,0,0,supportB,-245,-15,0,0,wallA,-230,0,0,180,wallA,-225,25,0,-90,wallA,-225,-20,0,-90,towerA,-245,-20,0,180,towerA,-245,-50,0,180,towerA,-245,25,0,180,towerA,-245,55,0,180,towerA,-245,100,0,180,towerA,-245,-95,0,180,flagPoleC,-220,80,0,180,flagPoleC,-225,-85,0,0,towerA,-245,40,0,180,towerA,-245,-35,0,180,towerTopA,-245,40,15,180,towerTopA,-245,-35,15,180,flagPoleC,-245,40,25,180,flagPoleC,-250,-40,25,0",
  11: "flagPoleC,-305,-40,55,-180,flagPoleC,-310,-90,55,0,towerA,-260,80,0,-180,towerA,-260,35,0,-180,towerA,-260,-85,0,-180,towerA,-305,-85,0,-180,towerA,-305,80,0,-180,towerA,-260,-40,0,-180,towerA,-305,-40,0,-180,towerA,-305,35,0,-180,wallB,-260,55,0,-180,wallB,-285,80,0,-90,wallB,-285,30,0,-90,wallB,-260,-65,0,-180,wallB,-310,-65,0,-180,wallB,-285,-40,0,-90,wallB,-285,-90,0,-90,wallB,-515,25,0,-180,wallB,-485,-5,0,-180,wallB,-260,55,15,-180,wallB,-260,-65,15,-180,wallB,-310,55,0,-180,wallB,-310,-65,15,-180,wallB,-285,80,15,-90,wallB,-285,30,15,-90,wallB,-285,-90,15,-90,wallB,-285,-40,15,-90,towerA,-305,-85,15,-180,towerA,-305,-40,15,-180,towerA,-260,-40,15,-180,towerA,-260,-85,15,-180,towerA,-260,35,15,-180,towerA,-260,80,15,-180,towerA,-305,80,15,180,towerA,-305,35,15,180,wallB,-310,55,15,180,wallB,-260,55,30,180,wallB,-260,-65,30,180,wallB,-310,55,30,180,wallB,-285,80,30,-90,wallB,-285,30,30,90,towerA,-260,35,30,180,wallB,-310,-65,30,180,wallB,-285,-40,30,-90,wallB,-285,-90,30,90,towerA,-265,-40,30,-90,towerA,-260,-85,30,180,towerA,-305,-40,30,180,towerA,-305,-85,30,180,towerA,-305,35,30,180,towerA,-305,80,30,180,towerA,-260,80,30,180,towerTopA,-260,35,45,180,towerTopA,-260,75,45,180,towerTopA,-305,35,45,180,towerTopA,-305,80,45,180,towerTopA,-260,-40,45,180,towerTopA,-260,-85,45,180,towerTopA,-305,-40,45,180,towerTopA,-305,-85,45,180,flagPoleC,-260,-40,55,-180,flagPoleC,-265,-90,55,0,flagPoleC,-265,30,55,0,flagPoleC,-310,30,55,0,flagPoleC,-260,75,55,180,flagPoleC,-305,80,55,180,cannonB,-235,-5,0,180,towerA,-200,20,0,180,towerA,-200,-25,0,180,supportA,-220,-25,0,0,supportA,-220,15,0,0,wallTopB,-205,-5,0,180,towerTopA,-200,-25,15,-180,towerTopA,-200,20,15,-180",
  12: "flagPoleC,-265,30,55,180,flagPoleC,-280,-30,25,-90,supportB,-195,15,0,180,supportB,-195,-10,0,180,supportA,-195,5,0,180,supportA,-195,-5,0,180,supportA,-195,-25,0,180,supportA,-195,-35,0,180,supportA,-195,25,0,180,supportA,-195,35,0,180,supportB,-195,45,0,180,supportB,-195,-40,0,180,wallB,-210,30,0,180,wallTopB,-210,30,15,180,wallB,-210,0,0,180,wallB,-210,-30,0,180,supportB,-195,20,0,180,wallTopB,-210,0,15,180,supportB,-195,-15,0,180,towerA,-225,-20,0,180,towerTopB,-220,-30,15,180,wallB,-230,-40,0,-90,drawbridgeA,-255,-40,0,-90,archA,-255,-40,30,90,wallPieceA,-270,-40,0,-90,wallPieceA,-270,-40,15,-90,towerTopA,-265,30,45,180,wallB,-230,40,0,-90,wallTopB,-230,40,15,-90,towerA,-265,30,0,180,towerA,-265,30,15,180,towerA,-275,-30,0,180,towerTopA,-280,-30,15,-90,supportA,-295,-30,0,0,towerA,-265,30,30,180,wallB,-280,30,0,180,wallB,-280,0,0,180,wallTopB,-280,30,15,0,wallTopB,-280,0,15,0,wallB,-260,40,0,-90,wallTopB,-260,40,15,-90,supportB,-280,-25,0,0,supportB,-280,-20,0,0,wallPieceA,-245,-40,15,-90,flagPoleC,-215,-20,0,-180,flagPoleC,-215,-30,0,-180,flagPoleC,-230,-30,0,-90,cannonB,-235,-85,0,-180,supportB,-225,10,0,0,wallTopA,-210,-85,0,-180",
};

// Castle select metadata. The names/unlock prices were authored as Director
// score-sprite parameters (not recoverable from the decompiled scripts), so
// these are approximations; gold-gating behavior matches the original
// (updateCastleSelectButtonActiveStatus: locked while price > player gold).
export interface CastleInfo {
  num: number;
  name: string;
  price: number;
}
export const CASTLES: CastleInfo[] = [
  { num: 1, name: "Outpost", price: 0 },
  { num: 2, name: "Gatehouse", price: 500 },
  { num: 3, name: "Garrison", price: 1000 },
  { num: 4, name: "Barbican", price: 2000 },
  { num: 5, name: "Twin Towers", price: 3500 },
  { num: 6, name: "Bastion", price: 5000 },
  { num: 7, name: "Sprawl", price: 7500 },
  { num: 8, name: "Bulwark", price: 10000 },
  { num: 9, name: "Citadel", price: 15000 },
  { num: 10, name: "Long Wall", price: 20000 },
  { num: 11, name: "Fortress", price: 30000 },
  { num: 12, name: "Folly", price: 50000 },
];

export function parseCastleData(str: string): PieceData[] {
  const items = str.split(",");
  const out: PieceData[] = [];
  for (let i = 0; i + 4 < items.length; i += 5) {
    out.push({
      name: items[i],
      x: parseInt(items[i + 1], 10),
      y: parseInt(items[i + 2], 10),
      z: parseInt(items[i + 3], 10),
      rz: parseInt(items[i + 4], 10),
    });
  }
  return out;
}

export function getCastleDataList(castleNum: number): PieceData[] {
  return parseCastleData(CASTLE_STRINGS[castleNum] ?? CASTLE_STRINGS[1]);
}
