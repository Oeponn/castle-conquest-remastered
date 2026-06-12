#!/usr/bin/env python3
"""Extract Castle Conquest cast members (bitmaps, sounds) from ProjectorRays chunk dumps.

Bitmaps: ediM (JPEG) + ALFA (PackBits 8-bit alpha) -> RGBA PNG (pixels unmodified)
         BITD (PackBits, 32-bit ARGB planes per row) + ALFA -> RGBA PNG
Sounds:  ediM (MP3) -> .mp3 ; sndH/sndS or 'snd ' resource -> .wav
"""
import json, re, struct, sys, zlib, collections, io
from pathlib import Path
from PIL import Image

CHUNKS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("assets/decompiled/castleConquest_36/chunks")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("assets/extracted")
(OUT / "images").mkdir(parents=True, exist_ok=True)
(OUT / "sounds").mkdir(parents=True, exist_ok=True)
(OUT / "misc").mkdir(parents=True, exist_ok=True)


def lenient_json(path):
    raw = path.read_bytes().decode("latin-1")
    raw = re.sub(r'\\(?!["\\/bfnrtu])', r"\\\\", raw)
    return json.loads(raw, strict=False)


def unpackbits(data, expected):
    """Apple PackBits decode -> exactly `expected` bytes (or best effort)."""
    out = bytearray()
    i = 0
    n = len(data)
    while i < n and len(out) < expected:
        b = data[i]
        i += 1
        if b > 127:  # repeat next byte (257 - b) times
            if i < n:
                out += bytes([data[i]]) * (257 - b)
                i += 1
        else:  # literal run of b+1 bytes
            out += data[i : i + b + 1]
            i += b + 1
    return bytes(out[:expected])


def decode_alfa(data, w, h):
    """ALFA chunk: PackBits rows of 8-bit alpha, rows padded to even bytes."""
    stride = w + (w & 1)
    raw = unpackbits(data, stride * h)
    if len(raw) < stride * h:
        raw += b"\xff" * (stride * h - len(raw))
    rows = b"".join(raw[y * stride : y * stride + w] for y in range(h))
    return Image.frombytes("L", (w, h), rows)


def decode_bitd32(data, w, h, pitch):
    """32-bit BITD: PackBits whole-image stream; each row = A,R,G,B planes of `w` bytes."""
    raw = unpackbits(data, pitch * h)
    if len(raw) < pitch * h:
        raw += b"\x00" * (pitch * h - len(raw))
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        row = raw[y * pitch : (y + 1) * pitch]
        for x in range(w):
            a, r, g, b = row[x], row[w + x], row[2 * w + x], row[3 * w + x]
            px[x, y] = (r, g, b, 255)  # alpha plane unused; ALFA chunk is authoritative
    return img


def parse_cast_bitmap_spec(d):
    t, il, sl = struct.unpack(">III", d[:12])
    sd = d[12 + il : 12 + il + sl]
    if len(sd) < 24:
        return None
    pitch = struct.unpack(">H", sd[0:2])[0] & 0x0FFF
    top, left, bottom, right = struct.unpack(">4h", sd[2:10])
    regY, regX = struct.unpack(">2h", sd[18:22])
    flags, bpp = sd[22], sd[23]
    return dict(pitch=pitch, w=right - left, h=bottom - top, regX=regX, regY=regY, bpp=bpp)


key = lenient_json(CHUNKS / "KEY_-3.json")
media = collections.defaultdict(dict)
for e in key["entries"]:
    media[e["castID"]][e["fourCC"]] = e["sectionID"]

manifest = {}
for f in sorted(CHUNKS.glob("CASt-*.json"), key=lambda p: int(p.stem.split("-")[1])):
    cid = int(f.stem.split("-")[1])
    c = lenient_json(f)
    name = c.get("info", {}).get("name", "") or f"member_{cid}"
    ctype = c.get("type")
    m = media.get(cid, {})
    safe = re.sub(r"[^A-Za-z0-9_-]", "_", name)

    if ctype == 1:  # bitmap
        spec = parse_cast_bitmap_spec((CHUNKS / f"CASt-{cid}.bin").read_bytes())
        img = None
        edim_path = CHUNKS / f"ediM-{m.get('ediM')}.bin" if "ediM" in m else None
        bitd_path = CHUNKS / f"BITD-{m.get('BITD')}.bin" if "BITD" in m else None
        if edim_path and edim_path.exists():
            img = Image.open(io.BytesIO(edim_path.read_bytes())).convert("RGBA")
        elif bitd_path and bitd_path.exists() and spec and spec["bpp"] == 32:
            img = decode_bitd32(bitd_path.read_bytes(), spec["w"], spec["h"], spec["pitch"])
        else:
            print(f"  !! {name}: no decodable media on disk (media={m}, spec={spec})")
        if img is not None:
            if "ALFA" in m and spec:
                al = (CHUNKS / f"ALFA-{m['ALFA']}.bin").read_bytes()
                alpha = decode_alfa(al, img.width, img.height)
                img.putalpha(alpha)
            out = OUT / "images" / f"{safe}.png"
            n = 2
            while out.exists():
                out = OUT / "images" / f"{safe}_{n}.png"
                n += 1
            img.save(out)
            manifest[out.name] = dict(
                member=name, castId=cid, w=img.width, h=img.height,
                regX=spec["regX"] if spec else img.width // 2,
                regY=spec["regY"] if spec else img.height // 2,
            )
            print(f"  bitmap {name} -> {out.name} ({img.width}x{img.height})")

    elif ctype == 6:  # sound
        if "ediM" in m:  # mp3
            mp3 = (CHUNKS / f"ediM-{m['ediM']}.bin").read_bytes()
            (OUT / "sounds" / f"{safe}.mp3").write_bytes(mp3)
            print(f"  sound  {name} -> {safe}.mp3 ({len(mp3)}b)")
        # 'snd ' resources are converted separately (see WAV conversion)

json.dump(manifest, open(OUT / "images" / "manifest.json", "w"), indent=1)
print("done")
