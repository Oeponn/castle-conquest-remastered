// Castle-select preview thumbnails. The original picker screen (Director
// score, sprite attachments not recovered) showed a small rendered snapshot
// of each castle's actual layout on a green tile — we render the same piece
// data used in the real game (positions 1:1 from the decompiled Lingo castle
// strings) from a fixed isometric angle. Since 2026-07-05 the pieces are the
// ORIGINAL meshes (textured brick, gold flags, real cannons) and the corner
// trees are the original billboard texture, so the tiles now show the real
// thing. Pieces are placed by their authored PIVOT (no size/2 — see
// world.ts pivot note).
//
// NOTE: renderCastleThumbnail requires models.ts/loadModels() to have
// resolved (App gates the UI on it).

import * as THREE from "three";
import { getCastleDataList } from "./castles";
import { buildPieceMesh } from "./world";
import { getModelTexture } from "./models";

const W = 220;
const H = 150;
// Pixel-sampled from an original Garrison castle-select screenshot: the grid
// tiles are a saturated grass green (~#458635), not the muted teal guessed
// at first.
const GROUND_COLOR = 0x458635;

let renderer: THREE.WebGLRenderer | null = null;
const cache = new Map<number, string>();

function getRenderer(): THREE.WebGLRenderer {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H, false);
  }
  return renderer;
}

/** Billboard quad with the original tree texture (105x206 cutout), roughly
 * the aspect/size of the authored tree quads (~17 wide x 23 tall units). */
function makeTree(scale: number, faceDir: THREE.Vector3): THREE.Object3D {
  const mat = new THREE.MeshLambertMaterial({
    map: getModelTexture("treeTexture"),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const wByH = 105 / 206;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(scale * wByH, scale), mat);
  // PlaneGeometry faces +z; stand it up and yaw it toward the camera.
  quad.rotation.set(Math.PI / 2, 0, Math.atan2(faceDir.y, faceDir.x) + Math.PI / 2, "ZXY");
  quad.position.z = scale / 2;
  const g = new THREE.Group();
  g.add(quad);
  return g;
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

  const group = new THREE.Group();
  for (const pd of getCastleDataList(castleNum)) {
    const mesh = buildPieceMesh(pd.name);
    mesh.position.set(pd.x, pd.y, pd.z);
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
    const tree = makeTree(radius * (0.5 + 0.1 * ((castleNum + i) % 3)), camDir);
    tree.position.copy(toGround(fx + jitter, fy));
    scene.add(tree);
  }

  const r = getRenderer();
  r.render(scene, camera);
  const url = r.domElement.toDataURL("image/png");
  cache.set(castleNum, url);
  return url;
}
