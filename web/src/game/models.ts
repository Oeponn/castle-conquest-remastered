// Loads the ORIGINAL game meshes extracted from the Shockwave 3D world.
//
// Asset chain (full story in PORTING_NOTES.md "the meshes are decodable"):
//   original .dcr -> ProjectorRays chunk XMED-5891 -> castleConquest.w3d
//   -> Shockwave 3D World Converter (uses Director's own decoder) -> OBJ/TIFF
//   -> tools/convert_3d_models.py -> public/.../models/models.obj + tex/*.png
//      + the generated src/game/modelData.ts (bboxes, material specs).
//
// models.obj object names: the 15 piece names from pieces.ts (wallA, towerA,
// ... in PIVOT space - vertex coords relative to the authored pivot the
// castle layout strings position, NOT bbox-centered), plus "ball" and
// "ballShadow" (re-centered), and world-space scenery "ground", "skydome",
// "trees". One material per object, resolved here from MODEL_MATERIALS.

import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MODEL_MATERIALS, MaterialSpec } from "./modelData";

const MODELS_URL = () => `${import.meta.env.BASE_URL}games/castle-conquest/models/`;

const templates = new Map<string, THREE.Mesh>();
const textures = new Map<string, THREE.Texture>();
let loadPromise: Promise<void> | null = null;

function makeMaterial(spec: MaterialSpec, name: string): THREE.Material {
  const params: THREE.MeshLambertMaterialParameters & THREE.MeshPhongMaterialParameters = {};
  if (spec.map) {
    let tex = textures.get(spec.map);
    if (!tex) {
      tex = new THREE.TextureLoader().load(`${MODELS_URL()}tex/${spec.map}.png`);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      textures.set(spec.map, tex);
    }
    params.map = tex;
  }
  if (spec.color) params.color = new THREE.Color(spec.color);
  if (spec.opacity !== undefined) {
    params.transparent = true;
    params.opacity = spec.opacity;
    params.depthWrite = false;
  }
  if (spec.alphaTest !== undefined) params.alphaTest = spec.alphaTest;
  if (spec.doubleSide) params.side = THREE.DoubleSide;
  // The skydome shader is set fully emissive by gameClass
  // (`w.shader("blinn4").emissive = rgb(255,255,255)`) = unlit, full-bright.
  if (name === "blinn4") {
    return new THREE.MeshBasicMaterial({ ...params, side: THREE.DoubleSide, depthWrite: false });
  }
  if (spec.unlit) {
    return new THREE.MeshBasicMaterial(params);
  }
  // shaderball / shadergold carry a specular highlight in the MTL (Ks 0.35 /
  // 0.40, Ns ~36) - the shiny black cannonball and gold flag of the original.
  if (spec.specular) {
    return new THREE.MeshPhongMaterial({ ...params, specular: 0x595959, shininess: 30 });
  }
  return new THREE.MeshLambertMaterial(params);
}

/** Fetch + parse models.obj once; safe to call repeatedly. */
export function loadModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = fetch(`${MODELS_URL()}models.obj`)
      .then((r) => {
        if (!r.ok) throw new Error(`models.obj: HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        const root = new OBJLoader().parse(text);
        const mats = new Map<string, THREE.Material>();
        for (const child of root.children) {
          if (!(child instanceof THREE.Mesh)) continue;
          // OBJLoader names each mesh's placeholder material after the
          // `usemtl` line; swap it for the real material spec.
          const mtlName = (child.material as THREE.Material).name;
          let mat = mats.get(mtlName);
          if (!mat) {
            const spec = MODEL_MATERIALS[mtlName];
            mat = spec ? makeMaterial(spec, mtlName) : new THREE.MeshLambertMaterial({ color: 0x888888 });
            mats.set(mtlName, mat);
          }
          child.material = mat;
          templates.set(child.name, child as THREE.Mesh);
        }
      });
  }
  return loadPromise;
}

export function modelsLoaded(): boolean {
  return templates.size > 0;
}

/** A renderable clone (shared geometry + material). Throws if not loaded. */
export function getModelMesh(name: string): THREE.Mesh {
  const t = templates.get(name);
  if (!t) throw new Error(`model "${name}" not loaded (call loadModels() first)`);
  return new THREE.Mesh(t.geometry, t.material);
}

/** Clone with its OWN material instance (for animated opacity, e.g. ballShadow). */
export function getModelMeshOwnMaterial(name: string): THREE.Mesh {
  const m = getModelMesh(name);
  m.material = (m.material as THREE.Material).clone();
  return m;
}

export function getModelTexture(name: string): THREE.Texture | undefined {
  return textures.get(name);
}
