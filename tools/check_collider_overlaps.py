#!/usr/bin/env python3
"""Check all 12 castle layouts for collider interpenetration at spawn.

Replicates world.ts pieceCollider: bbox from the generated modelData.ts,
z floored to 0, COLLIDER_TRIM caps, flag slim box. All layout yaws are
multiples of 90 deg, so world colliders stay axis-aligned and AABB overlap
tests are EXACT. The enemy side is the true mirror (scale.x=-1) of the
player side, so checking side 1 covers both.

Run after ANY change to COLLIDER_TRIM / pieceCollider (keep TRIM below in
sync with world.ts!). No output = no overlaps = castles won't explode when
a hit wakes them (cannon-es resolves spawn penetration violently; Havok
absorbed it — see PORTING_NOTES "ORIGINAL MESHES IN")."""
import json, re, math, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
md = open(root + "/web/src/game/modelData.ts").read()
bboxes = json.loads(re.search(r"PIECE_BBOX: Record<string, ModelBBox> = (\{.*?\n\});", md, re.S).group(1))
cs = open(root + "/web/src/game/castles.ts").read()
castles = dict(re.findall(r'(\d+): "([^"]+)"', cs))

TRIM = {"towerTopA": (10, None), "towerTopB": (10, 12.45), "wallTopA": (15, 10.0),
        "wallTopB": (15, 10.0), "wallA": (15, None), "wallB": (15, None),
        "wallPieceA": (15, None), "drawbridgeA": (29.9, None)}

def collider(name):
    if name == "flagPoleC":
        return (2.5, 2.5, 5.3), (1.5, 1.5, 5.3)  # center, half extents
    bb = bboxes[name]
    x0, y0, _ = bb["bboxMin"]; x1, y1, z1 = bb["bboxMax"]
    h, hy = TRIM.get(name, (z1, None))
    hy = hy or (y1-y0)/2
    return ((x0+x1)/2, (y0+y1)/2, h/2), ((x1-x0)/2, hy, h/2)

def world_aabb(name, x, y, z, rz):
    (cx, cy, cz), (hx, hy, hz) = collider(name)
    th = math.radians(rz)
    c, s = round(math.cos(th)), round(math.sin(th))
    wx, wy = x + cx*c - cy*s, y + cx*s + cy*c
    ex, ey = abs(hx*c) + abs(hy*s), abs(hx*s) + abs(hy*c)
    return (wx-ex, wy-ey, z+cz-hz), (wx+ex, wy+ey, z+cz+hz)

worst = {}
for num, data in sorted(castles.items(), key=lambda kv: int(kv[0])):
    items = data.split(",")
    pieces = [(items[i], float(items[i+1]), float(items[i+2]), float(items[i+3]), float(items[i+4]))
              for i in range(0, len(items)-4, 5)]
    boxes = [(p[0], world_aabb(*p)) for p in pieces]
    for i in range(len(boxes)):
        for j in range(i+1, len(boxes)):
            (n1, (a0, a1)), (n2, (b0, b1)) = boxes[i], boxes[j]
            pen = [min(a1[k], b1[k]) - max(a0[k], b0[k]) for k in range(3)]
            if all(p > 0.05 for p in pen):
                d = min(pen)
                key = tuple(sorted((n1, n2)))
                if d > worst.get(key, (0,))[0]:
                    worst[key] = (d, num, pieces[i], pieces[j], [round(p,2) for p in pen])

for key, (d, num, p1, p2, pen) in sorted(worst.items(), key=lambda kv: -kv[1][0]):
    print(f"castle {num}: {key[0]} x {key[1]}  min-pen {d:.2f}  (pen xyz {pen})")
    print(f"    {p1}\n    {p2}")
