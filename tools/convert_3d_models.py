#!/usr/bin/env python3
"""Convert the Shockwave 3D world dump into web-ready model assets.

Pipeline context (see PORTING_NOTES.md "the meshes are decodable"):
  1. chunks/XMED-5891.bin  (from ProjectorRays)  --carve 16-byte header-->
     assets/extracted/3d/castleConquest.w3d
  2. castleConquest.w3d --Shockwave 3D World Converter (Windows/Wine)-->
     castleConquest.obj + castleConquest.MTL + *.TIFF
  3. THIS SCRIPT: castleConquest.obj + TIFFs -->
     web/public/games/castle-conquest/models/models.obj   (cleaned, renamed groups)
     web/public/games/castle-conquest/models/tex/*.png    (textures)
     web/src/game/modelData.ts                            (generated: bboxes, materials)

Key facts about the converter's OBJ (verified 2026-07-05):
  * Coordinates are the game's world space: z up, x toward the enemy castle.
    No axis conversion is needed anywhere.
  * The 15 castle-piece master models (groups `p<name>0`, e.g. `ptowerA0`)
    are parked at the world origin with identity transforms, so their vertex
    coordinates ARE their local/pivot space. Pivots are NOT bbox centers:
    e.g. wallA spans x 0..5 (pivot on its back face), towerA's cylinder is
    centered at (+2.5, +2.5). The castle layout strings position pieces by
    these pivots, so keeping the offsets is what makes placement 1:1.
  * The ball master is parked at the player cannon (x ~ -270): it must be
    re-centered. Its mesh radius is ~1.6; gameClass scales the model 3.4x
    (6x when firing from cannonB), so the true visual radius is
    radius*3.4 / radius*6 (the old port misread the scale factors as radii).
  * `ballShadowShape` is the translucent shadow blob quad; gameClass moves it
    on x/y only (z stays authored ~0.31) and animates blend/scale with ball
    height. Re-centered on x/y here, z kept.
  * `ptree0ShapeN` (N=1..27) are vertical textured billboard quads, world
    space, with per-tree yaw/size as authored. `ptree0N` are matching
    HORIZONTAL quads with no texture (converter exported them white); in the
    game they are either invisible helpers or a canopy plane whose texture
    didn't survive - skipped (a white square floating at canopy height is
    definitely not what the original rendered).
  * Skipped groups: cameras/lights export as tiny 2-face marker quads
    (persp/top/front/side/cam*/directionalLight*/pivotcam*), `pisectPlane`
    (aim-ray helper), `pplayPlane1/2` (invisible black planes slightly BELOW
    ground level - Havok-era helpers), `group1`/`polySurface7` (1-unit junk),
    `ballShadow` (parent marker; the Shape child is the visible quad).

Run:  python3 tools/convert_3d_models.py     (idempotent, overwrites outputs)
"""

import json
import os
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "assets", "extracted", "3d")
OBJ_IN = os.path.join(SRC_DIR, "castleConquest.obj")
OUT_MODELS = os.path.join(ROOT, "web", "public", "games", "castle-conquest", "models")
OUT_TEX = os.path.join(OUT_MODELS, "tex")
OUT_TS = os.path.join(ROOT, "web", "src", "game", "modelData.ts")

# The 15 catalogue pieces (pieces.ts keys). OBJ group = "p" + name + "0".
PIECE_NAMES = [
    "wallA", "wallB", "towerA", "wallTopA", "wallTopB", "towerTopA",
    "drawbridgeA", "archA", "towerTopB", "wallPieceA", "supportA",
    "supportB", "cannonA", "cannonB", "flagPoleC",
]

# OBJ material name -> output material spec used by models.ts.
# Textures are converted TIFF->PNG into tex/. Colors are linear-ish sRGB hex
# from the MTL Kd lines (shadergold is the real flag color the port had to
# guess before: Kd 0.741,0.706,0 = #BDB400).
MATERIALS = {
    "shaderbrick": {"map": "shaderbrick"},
    "shadercannon1": {"map": "shadercannon1"},
    "shadercannon2": {"map": "shadercannon2"},
    "shaderdrawbridge": {"map": "shaderdrawbridge"},
    "shaderGround": {"map": "shaderGround"},
    "blinn4": {"map": "skydome"},
    # unlit: photographic cutouts crush to near-black under the scene's
    # Lambert lighting; render them full-bright like the emissive skydome
    "treeTexture": {"map": "treeTexture", "alphaTest": 0.5, "doubleSide": True, "unlit": True},
    "shadergold": {"color": "#BDB400", "specular": True},
    "shaderball": {"color": "#000000", "specular": True},
    # ballShadow blob: black translucent disc; gameClass animates opacity
    # (blend 60..80) and scale (1.3..1.6) with ball height at runtime.
    "lambert7": {"color": "#000000", "opacity": 0.68, "doubleSide": True, "unlit": True},
}

TIFF_TO_PNG = {
    "shaderbrick.TIFF": "shaderbrick.png",
    "shadercannon1.TIFF": "shadercannon1.png",
    "shadercannon2.TIFF": "shadercannon2.png",
    "shaderdrawbridge.TIFF": "shaderdrawbridge.png",
    "shaderGround.TIFF": "shaderGround.png",
    "blinn4.TIFF": "skydome.png",
    "treeTexture.TIFF": "treeTexture.png",
}


def parse_obj(path):
    v, vt, vn = [], [], []
    groups = OrderedDict()  # name -> {"mtl": str, "faces": [ [(vi,ti,ni),...] ]}
    cur = None
    for line in open(path):
        p = line.split()
        if not p:
            continue
        tag = p[0]
        if tag == "v":
            v.append([float(x) for x in p[1:4]])
        elif tag == "vt":
            vt.append([float(x) for x in p[1:3]])
        elif tag == "vn":
            vn.append([float(x) for x in p[1:4]])
        elif tag == "g":
            name = " ".join(p[1:])
            cur = groups.setdefault(name, {"mtl": None, "faces": []})
        elif tag == "usemtl" and cur is not None:
            cur["mtl"] = p[1]
        elif tag == "f" and cur is not None:
            face = []
            for w in p[1:]:
                parts = (w.split("/") + ["", ""])[:3]
                idx = []
                for k, arr in zip(parts, (v, vt, vn)):
                    if k == "":
                        idx.append(None)
                    else:
                        i = int(k)
                        idx.append(i - 1 if i > 0 else len(arr) + i)
                face.append(tuple(idx))
            cur["faces"].append(face)
    return v, vt, vn, groups


def bbox_of(verts, groups, names):
    mn = [1e30] * 3
    mx = [-1e30] * 3
    for n in names:
        for face in groups[n]["faces"]:
            for (vi, _, _) in face:
                for a in range(3):
                    mn[a] = min(mn[a], verts[vi][a])
                    mx[a] = max(mx[a], verts[vi][a])
    return mn, mx


class ObjWriter:
    """Re-emits selected groups with per-group vertex transform + reindexing."""

    def __init__(self):
        self.lines = ["# Generated by tools/convert_3d_models.py - do not edit",
                      "# Source: assets/extracted/3d/castleConquest.obj (from the original w3d)"]
        self.nv = self.nt = self.nn = 0

    def add(self, out_name, mtl_name, verts, vt, vn, groups, group_names, offset=(0, 0, 0)):
        vmap, tmap, nmap = {}, {}, {}
        vlines, tlines, nlines, flines = [], [], [], []
        for gname in group_names:
            for face in groups[gname]["faces"]:
                fw = []
                for (vi, ti, ni) in face:
                    if vi not in vmap:
                        vmap[vi] = len(vmap) + 1
                        x, y, z = verts[vi]
                        vlines.append(f"v {x - offset[0]:.4f} {y - offset[1]:.4f} {z - offset[2]:.4f}")
                    part = str(vmap[vi] + self.nv)
                    if ti is not None:
                        if ti not in tmap:
                            tmap[ti] = len(tmap) + 1
                            tlines.append(f"vt {vt[ti][0]:.5f} {vt[ti][1]:.5f}")
                        part += f"/{tmap[ti] + self.nt}"
                    else:
                        part += "/"
                    if ni is not None:
                        if ni not in nmap:
                            nmap[ni] = len(nmap) + 1
                            nlines.append(f"vn {vn[ni][0]:.4f} {vn[ni][1]:.4f} {vn[ni][2]:.4f}")
                        part += f"/{nmap[ni] + self.nn}"
                    fw.append(part)
                flines.append("f " + " ".join(fw))
        self.lines.append(f"o {out_name}")
        self.lines += vlines + tlines + nlines
        self.lines.append(f"usemtl {mtl_name}")
        self.lines += flines
        self.nv += len(vmap)
        self.nt += len(tmap)
        self.nn += len(nmap)


def main():
    from PIL import Image

    v, vt, vn, groups = parse_obj(OBJ_IN)
    os.makedirs(OUT_TEX, exist_ok=True)

    # --- textures ---
    for tiff, png in TIFF_TO_PNG.items():
        im = Image.open(os.path.join(SRC_DIR, tiff)).convert("RGBA")
        # Only the tree cutout actually uses alpha; flatten the rest to RGB.
        if png != "treeTexture.png":
            im = im.convert("RGB")
        im.save(os.path.join(OUT_TEX, png))
        print(f"tex: {tiff} -> tex/{png} {im.size}")

    w = ObjWriter()
    data = {"pieces": {}, "props": {}, "materials": MATERIALS}

    # --- castle pieces: local/pivot space, kept verbatim ---
    for name in PIECE_NAMES:
        g = "p" + name + "0"
        if g not in groups:
            sys.exit(f"missing OBJ group {g}")
        mn, mx = bbox_of(v, groups, [g])
        w.add(name, groups[g]["mtl"], v, vt, vn, groups, [g])
        data["pieces"][name] = {"bboxMin": [round(c, 3) for c in mn],
                                "bboxMax": [round(c, 3) for c in mx]}
        print(f"piece: {name:12s} bbox {mn[0]:7.2f}..{mx[0]:<7.2f} {mn[1]:7.2f}..{mx[1]:<7.2f} {mn[2]:7.2f}..{mx[2]:<7.2f}")

    # --- ball: recenter to bbox center, record true mesh radius ---
    mn, mx = bbox_of(v, groups, ["ball"])
    c = [(a + b) / 2 for a, b in zip(mn, mx)]
    r = 0.0
    for face in groups["ball"]["faces"]:
        for (vi, _, _) in face:
            d = sum((v[vi][a] - c[a]) ** 2 for a in range(3)) ** 0.5
            r = max(r, d)
    w.add("ball", groups["ball"]["mtl"], v, vt, vn, groups, ["ball"], offset=c)
    data["props"]["ball"] = {"meshRadius": round(r, 3),
                             "note": "gameClass scales the model 3.4x (6x from cannonB)"}
    print(f"ball: recentered from {[round(x,2) for x in c]}, mesh radius {r:.3f}")

    # --- ball shadow blob: recenter x/y only (game moves it on x/y, z authored) ---
    mn, mx = bbox_of(v, groups, ["ballShadowShape"])
    cxy = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, 0.0]
    w.add("ballShadow", groups["ballShadowShape"]["mtl"], v, vt, vn, groups,
          ["ballShadowShape"], offset=cxy)
    data["props"]["ballShadow"] = {"z": round(mn[2], 3), "radius": round((mx[0] - mn[0]) / 2, 3),
                                   "note": "opacity 0.6+0.2*zPerc, scale 1.3+0.3*zPerc (ballShadowFollow)"}

    # --- world-space scenery ---
    # The converter's ground UVs span only 0.431..0.569 across the whole
    # 5120-unit slab: the original tiling lived in the w3d *shader's* texture
    # transform, which the converter does not bake into UVs. Not recoverable,
    # so remap planar from x/y at one repeat per 32 units - the same
    # pixels-per-unit density as the brick texture on the walls (100px/25u),
    # and consistent with gameplay footage where the ground reads as solid
    # green with fine grain. (JUDGMENT CALL - revisit if better reference
    # footage turns up.)
    GROUND_UV_PERIOD = 32.0
    ground = groups["pground"]
    remapped_vt = list(vt)
    new_faces = []
    for face in ground["faces"]:
        nf = []
        for (vi, ti, ni) in face:
            remapped_vt.append([v[vi][0] / GROUND_UV_PERIOD, v[vi][1] / GROUND_UV_PERIOD])
            nf.append((vi, len(remapped_vt) - 1, ni))
        new_faces.append(nf)
    groups["pground"] = {"mtl": ground["mtl"], "faces": new_faces}
    vt = remapped_vt
    w.add("ground", groups["pground"]["mtl"], v, vt, vn, groups, ["pground"])
    w.add("skydome", groups["pSphere1"]["mtl"], v, vt, vn, groups, ["pSphere1"])
    trees = [g for g in groups if g.startswith("ptree0Shape")]
    trees.sort(key=lambda s: int(s[len("ptree0Shape"):]))
    w.add("trees", "treeTexture", v, vt, vn, groups, trees)
    mn, mx = bbox_of(v, groups, ["pSphere1"])
    data["props"]["skydome"] = {"bboxMin": [round(c, 2) for c in mn], "bboxMax": [round(c, 2) for c in mx]}
    print(f"scenery: ground, skydome (r~{(mx[0]-mn[0])/2:.0f}), {len(trees)} tree billboards")

    with open(os.path.join(OUT_MODELS, "models.obj"), "w") as f:
        f.write("\n".join(w.lines) + "\n")
    print(f"wrote {os.path.join(OUT_MODELS, 'models.obj')} ({len(w.lines)} lines)")

    # --- generated TS: bboxes + material specs the loader needs ---
    ts = [
        "// GENERATED by tools/convert_3d_models.py - DO NOT EDIT BY HAND.",
        "// Local-space (pivot-space) bounding boxes of the ORIGINAL castle-piece",
        "// meshes, measured from the w3d-extracted geometry. Pivots are not bbox",
        "// centers (e.g. wallA spans x 0..5): the layout strings place pieces by",
        "// pivot, so colliders are derived from these boxes at runtime (world.ts).",
        "",
        "export interface ModelBBox { bboxMin: [number, number, number]; bboxMax: [number, number, number]; }",
        "",
        f"export const PIECE_BBOX: Record<string, ModelBBox> = {json.dumps(data['pieces'], indent=2)};",
        "",
        f"/** True mesh radius of the ball master; gameClass scales it 3.4x (6x for cannonB). */",
        f"export const BALL_MESH_RADIUS = {data['props']['ball']['meshRadius']};",
        "",
        "export interface MaterialSpec { map?: string; color?: string; specular?: boolean; opacity?: number; alphaTest?: number; doubleSide?: boolean; unlit?: boolean; }",
        "",
        f"export const MODEL_MATERIALS: Record<string, MaterialSpec> = {json.dumps(MATERIALS, indent=2)};",
        "",
    ]
    with open(OUT_TS, "w") as f:
        f.write("\n".join(ts))
    print(f"wrote {OUT_TS}")


if __name__ == "__main__":
    main()
