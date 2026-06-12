// Builds the 3D scene: ground, sky, castle pieces (mesh + physics body).
// Coordinate system matches the original Shockwave world: z is up,
// player 1 attacks from negative x toward positive x.

import * as THREE from "three";
import * as CANNON from "cannon-es";
import { PIECES, PieceDef, pieceBaseName } from "./pieces";
import { PieceData } from "./castles";
import { GRAVITY } from "./constants";

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

const IMG = (n: string) => `/games/castle-conquest/images/${n}.png`;

export class GameWorld {
  scene = new THREE.Scene();
  world = new CANNON.World();
  pieces: GamePiece[] = [];
  brickTex: THREE.Texture;
  stoneMat: THREE.MeshLambertMaterial;
  roofMat: THREE.MeshLambertMaterial;
  woodMat: THREE.MeshLambertMaterial;
  flagMat: THREE.MeshLambertMaterial;
  cannonMat: THREE.MeshLambertMaterial;
  groundBody!: CANNON.Body;
  private pieceCount = 0;

  constructor() {
    this.world.gravity.set(0, 0, GRAVITY);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.6;
    this.world.defaultContactMaterial.restitution = 0.15;

    const loader = new THREE.TextureLoader();
    this.brickTex = loader.load(IMG("brick_bmp"));
    this.brickTex.wrapS = this.brickTex.wrapT = THREE.RepeatWrapping;
    this.brickTex.colorSpace = THREE.SRGBColorSpace;

    this.stoneMat = new THREE.MeshLambertMaterial({ map: this.brickTex });
    this.roofMat = new THREE.MeshLambertMaterial({ color: 0x8a4a2a });
    this.woodMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
    this.flagMat = new THREE.MeshLambertMaterial({ color: 0xcc1111, side: THREE.DoubleSide });
    this.cannonMat = new THREE.MeshLambertMaterial({ color: 0x333338 });

    // Sky: the original skydome bitmap mapped onto a backdrop dome
    const skyTex = loader.load(IMG("skydome"));
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false })
    );
    sky.rotation.x = Math.PI / 2; // z-up
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(0xbcc8d8, 700, 1500);

    // Ground
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x5e7a3a });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), groundMat);
    this.scene.add(ground);
    this.groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    // CANNON.Plane faces +z by default, which is up in our world. p_ground sim=2.
    this.groundBody.material = new CANNON.Material({ friction: 0.9, restitution: 0.1 });
    this.world.addBody(this.groundBody);

    // Lights
    const hemi = new THREE.HemisphereLight(0xe8f0ff, 0x40502a, 1.0);
    hemi.position.set(0, 0, 1);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
    sun.position.set(-200, -300, 400);
    this.scene.add(sun);
  }

  private buildMesh(def: PieceDef, baseName: string): THREE.Object3D {
    const [sx, sy, sz] = def.size;
    const g = new THREE.Group();
    switch (def.kind) {
      case "box": {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), this.stoneMat);
        g.add(m);
        break;
      }
      case "cylinder": {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(sx / 2, sx / 2, sz, 12),
          baseName.includes("Top") ? this.roofMat : this.stoneMat
        );
        m.rotation.x = Math.PI / 2; // cylinder axis -> z
        g.add(m);
        if (baseName === "towerTopA") {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(sx / 2 + 1, 8, 12), this.roofMat);
          cone.rotation.x = Math.PI / 2;
          cone.position.z = sz / 2 + 4;
          g.add(cone);
        }
        break;
      }
      case "wedge": {
        // right-angle wedge via half-extruded triangle
        const shape = new THREE.Shape();
        shape.moveTo(-sx / 2, 0);
        shape.lineTo(sx / 2, 0);
        shape.lineTo(-sx / 2, sz);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: sy, bevelEnabled: false });
        const m = new THREE.Mesh(geo, this.stoneMat);
        m.rotation.x = Math.PI / 2;
        m.position.set(0, sy / 2, -sz / 2);
        g.add(m);
        break;
      }
      case "arch": {
        const left = new THREE.Mesh(new THREE.BoxGeometry(sx, sy / 3, sz), this.stoneMat);
        left.position.y = -sy / 3;
        const right = left.clone();
        right.position.y = sy / 3;
        const top = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz / 2), this.stoneMat);
        top.position.z = sz / 4;
        g.add(left, right, top);
        break;
      }
      case "cannon": {
        const barrel = new THREE.Mesh(
          new THREE.CylinderGeometry(sz * 0.22, sz * 0.3, sx, 12),
          this.cannonMat
        );
        barrel.rotation.z = Math.PI / 2 - 0.35; // tilted up toward enemy (+x when rz=180 flips)
        barrel.position.z = sz * 0.15;
        const base = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.7, sy * 0.8, sz * 0.5), this.woodMat);
        base.position.z = -sz * 0.25;
        const wheelGeo = new THREE.CylinderGeometry(sz * 0.2, sz * 0.2, 1.5, 10);
        for (const [wx, wy] of [[-sx * 0.25, -sy * 0.4], [-sx * 0.25, sy * 0.4], [sx * 0.25, -sy * 0.4], [sx * 0.25, sy * 0.4]]) {
          const w = new THREE.Mesh(wheelGeo, this.woodMat);
          w.position.set(wx, wy, -sz * 0.4);
          g.add(w);
        }
        g.add(barrel, base);
        break;
      }
      case "flag": {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, sz, 6), this.woodMat);
        pole.rotation.x = Math.PI / 2;
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), this.flagMat);
        cloth.rotation.y = Math.PI / 2;
        cloth.position.set(0, 4, sz / 2 - 3);
        g.add(pole, cloth);
        break;
      }
    }
    return g;
  }

  private buildBody(def: PieceDef): CANNON.Body {
    const [sx, sy, sz] = def.size;
    const body = new CANNON.Body({ mass: def.mass });
    if (def.kind === "cylinder") {
      body.addShape(new CANNON.Cylinder(sx / 2, sx / 2, sz, 8), new CANNON.Vec3(), new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0));
    } else if (def.kind === "flag") {
      body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 1.5, sz / 2)));
    } else {
      body.addShape(new CANNON.Box(new CANNON.Vec3(sx / 2, sy / 2, sz / 2)));
    }
    body.material = new CANNON.Material({ friction: def.friction, restitution: Math.min(def.restitution, 0.4) });
    body.sleepSpeedLimit = 0.4;
    body.sleepTimeLimit = 0.6;
    return body;
  }

  /** castleBuilderClass.makeCastlePiece — z position is the piece's *base*. */
  makeCastlePiece(pieceName: string, x: number, y: number, z: number, rz: number, side: 1 | -1): GamePiece {
    this.pieceCount++;
    const def = PIECES[pieceName];
    const name = `p_clone_${pieceName}_${this.pieceCount}`;
    const mesh = this.buildMesh(def, pieceName);
    const body = this.buildBody(def);
    const cz = z + def.size[2] / 2;
    body.position.set(x, y, cz);
    const yaw = (rz * Math.PI) / 180 * (side === -1 ? -1 : 1) + (side === -1 ? Math.PI : 0);
    body.quaternion.setFromEuler(0, 0, yaw);
    mesh.position.copy(body.position as unknown as THREE.Vector3);
    this.scene.add(mesh);
    const piece: GamePiece = {
      name,
      baseName: pieceName,
      mesh,
      body,
      defaultPos: new THREE.Vector3(x, y, cz),
      lastPos: new THREE.Vector3(x, y, cz),
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
      out.push(this.makeCastlePiece(pd.name, pd.x * side, pd.y, pd.z, pd.rz * side, side));
    }
    return out;
  }

  addToSim(piece: GamePiece) {
    if (!this.world.bodies.includes(piece.body)) this.world.addBody(piece.body);
    piece.body.wakeUp();
  }

  removeFromSim(piece: GamePiece) {
    if (this.world.bodies.includes(piece.body)) this.world.removeBody(piece.body);
  }

  syncMeshes() {
    for (const p of this.pieces) {
      p.mesh.position.set(p.body.position.x, p.body.position.y, p.body.position.z);
      p.mesh.quaternion.set(p.body.quaternion.x, p.body.quaternion.y, p.body.quaternion.z, p.body.quaternion.w);
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
      new THREE.Quaternion(piece.body.quaternion.x, piece.body.quaternion.y, piece.body.quaternion.z, piece.body.quaternion.w),
      "XYZ"
    );
    return { x: (e.x * 180) / Math.PI, y: (e.y * 180) / Math.PI };
  }
}
