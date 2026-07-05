// Castle-select preview thumbnails. The original picker screen (Director
// score, unrecoverable) showed a small rendered snapshot of each castle's
// actual layout on a green tile — rather than guess at static art, we render
// the same piece data used in the real game (positions are 1:1 from the
// decompiled Lingo castle strings, see castles.ts) from a fixed isometric
// angle, so the thumbnails are geometrically faithful to the original.

import * as THREE from "three";
import { PIECES, FLAG_COLOR } from "./pieces";
import { getCastleDataList } from "./castles";
import { buildPieceMesh, PieceMaterials } from "./world";

const W = 220;
const H = 150;
// Pixel-sampled from an original Garrison castle-select screenshot: the grid
// tiles are a saturated grass green (~#458635), not the muted teal guessed
// at first.
const GROUND_COLOR = 0x458635;
const TREE_COLOR = 0x33482a;

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<number, string>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H, false);
  }
  return renderer;
}

function makeMaterials(): PieceMaterials {
  return {
    // Warm light gray, sampled from the same screenshot's castle walls
    // (~#7d7469) — the original flat gray guess read too cool/blue.
    stone: new THREE.MeshLambertMaterial({ color: 0x7d7469 }),
    roof: new THREE.MeshLambertMaterial({ color: 0x8a4a2a }),
    wood: new THREE.MeshLambertMaterial({ color: 0x6b4a2a }),
    flag: new THREE.MeshLambertMaterial({ color: FLAG_COLOR, side: THREE.DoubleSide }),
    cannon: new THREE.MeshLambertMaterial({ color: 0x333338 }),
  };
}

/** Small pine-tree silhouette, matching the background scenery scattered
 * around the castle in the original picker screenshots. */
function makeTree(scale: number): THREE.Object3D {
  const mat = new THREE.MeshLambertMaterial({ color: TREE_COLOR });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.4, scale, 8), mat);
  cone.position.z = scale / 2;
  return cone;
}

export function renderCastleThumbnail(castleNum: number): string {
  const cached = cache.get(castleNum);
  if (cached) return cached;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GROUND_COLOR);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1c3a20, 1.15));
  const sun = new THREE.DirectionalLight(0xfff2dd, 1.0);
  sun.position.set(150, -200, 260);
  scene.add(sun);

  const mats = makeMaterials();
  const group = new THREE.Group();
  for (const pd of getCastleDataList(castleNum)) {
    const def = PIECES[pd.name];
    if (!def) continue;
    const mesh = buildPieceMesh(def, pd.name, mats);
    mesh.position.set(pd.x, pd.y, pd.z + def.size[2] / 2);
    mesh.rotation.z = (pd.rz * Math.PI) / 180;
    group.add(mesh);
  }
  scene.add(group);

  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 25);

  const aspect = W / H;
  const halfH = radius * 0.95;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, radius * 10);
  camera.up.set(0, 0, 1);
  const camDir = new THREE.Vector3(1, -1, 1.05).normalize();
  camera.position.copy(center).add(camDir.clone().multiplyScalar(radius * 4));
  camera.lookAt(center);

  // A couple of background trees, like the original picker screenshots —
  // placed at fixed *screen*-space corners (an orthographic camera keeps a
  // point's screen position constant as it slides along the view direction,
  // so sliding each corner point down to ground level (z=0) still lands it
  // in the same visible spot without overlapping the castle).
  const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 0, 1)).normalize();
  const screenUp = new THREE.Vector3().crossVectors(right, camDir).normalize();
  const toGround = (fx: number, fy: number): THREE.Vector3 => {
    const p = center
      .clone()
      .addScaledVector(right, halfW * fx)
      .addScaledVector(screenUp, halfH * fy);
    return p.addScaledVector(camDir, -p.z / camDir.z);
  };
  const treeSpots: [number, number][] = [
    [-0.75, 0.8],
    [0.6, 0.85],
  ];
  for (let i = 0; i < treeSpots.length; i++) {
    const [fx, fy] = treeSpots[i];
    const jitter = ((castleNum * 13 + i * 29) % 7) / 30 - 0.1;
    const tree = makeTree(radius * (0.3 + 0.08 * ((castleNum + i) % 3)));
    tree.position.copy(toGround(fx + jitter, fy));
    scene.add(tree);
  }

  const r = getRenderer();
  r.render(scene, camera);
  const url = r.domElement.toDataURL("image/png");
  cache.set(castleNum, url);

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (obj.material instanceof THREE.Material) obj.material.dispose();
    }
  });
  for (const m of Object.values(mats)) m.dispose();

  return url;
}
