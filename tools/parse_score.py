#!/usr/bin/env python3
"""Parse the raw Director score chunk (VWSC) that ProjectorRays dumps but
doesn't decode, and print each sprite channel's cast member and rect per frame.

This recovers the score-authored sprite placements that aren't in the Lingo
source — e.g. the accuracy marker notch (sprite 32), whose fixed position is
what normalizes the third-tap accuracy in gameClass.throwControl.

Usage:
    python3 tools/parse_score.py assets/decompiled/castleConquest_36/chunks/VWSC-6181.bin [frame]

Format notes (verified against this movie, Director 8.5):
- The chunk is an offset-table container: u32 totalLength, i32 -3, u32 12,
  u32 entryCount, u32 entryCount+1, u32 sizeSum, then entryCount+1 u32 offsets,
  then the entry data. Entry 0 is the frame stream.
- Frame stream: u32 framesLength, u32 frame1Offset(=20), u32 numFrames,
  u16 version, u16 spriteRecordSize (48 here), u16 numChannels, u16 displayed.
  Then per frame: u16 frameLength, followed by {u16 len, u16 offset, bytes}
  deltas applied to a persistent channel buffer (offset = absolute byte offset,
  i.e. channelIndex * spriteRecordSize + fieldOffset).
- 48-byte sprite record (big-endian): +4 u16 castLib, +6 u16 castMember,
  +12 i16 locV, +14 i16 locH, +16 i16 height, +18 i16 width. loc is the
  member's registration point position (reg is stored in the cast; see
  assets/extracted/images/manifest.json for the bitmaps).
- Channel index = sprite number + 5 (channels 0-5 are the score's non-sprite
  channels). Calibration used: sprite 7 = the 427x305 3D viewport, sprite 26 =
  launchControls_02 (105x346), sprite 27's needle at the dial center (74,256),
  sprite 42 = toolbarCover (105x348).
"""
import struct
import sys

SPRITE_CHANNEL_OFFSET = 5


def parse_frames(path):
    data = open(path, "rb").read()

    def u32(o):
        return struct.unpack(">I", data[o : o + 4])[0]

    entry_count = u32(12)
    offsets = [u32(0x18 + 4 * i) for i in range(entry_count + 1)]
    base = 0x18 + 4 * (entry_count + 1)
    fd = data[base + offsets[0] : base + offsets[1]]

    frames_len, frame1_off, num_frames = struct.unpack(">III", fd[0:12])
    version, rec_size, num_ch, num_disp = struct.unpack(">HHHH", fd[12:20])
    print(
        f"# frames {num_frames}, record size {rec_size}, "
        f"channels {num_ch} ({num_disp} displayed), version {version}"
    )

    buf = bytearray((num_disp + SPRITE_CHANNEL_OFFSET + 1) * rec_size)
    snaps = {}
    pos = frame1_off
    frame = 0
    while pos < frames_len and pos < len(fd):
        (flen,) = struct.unpack(">H", fd[pos : pos + 2])
        if flen < 2:
            break
        end = pos + flen
        p = pos + 2
        while p < end:
            clen, off = struct.unpack(">HH", fd[p : p + 4])
            p += 4
            buf[off : off + clen] = fd[p : p + clen]
            p += clen
        frame += 1
        snaps[frame] = bytes(buf)
        pos = end
    return snaps, rec_size


def dump_frame(snap, rec_size, frame):
    print(f"--- frame {frame} ---")
    print("sprite | lib:member |  locV locH |    h    w")
    for ch in range(len(snap) // rec_size):
        r = snap[ch * rec_size : (ch + 1) * rec_size]
        if not any(r):
            continue
        lib, mem, = struct.unpack(">HH", r[4:8])
        lv, lh, h, w = struct.unpack(">hhhh", r[12:20])
        spr = ch - SPRITE_CHANNEL_OFFSET
        name = f"{spr:4d}" if spr >= 1 else f"  m{ch}"  # non-sprite channel
        print(f"{name:6s} | {lib:3d}:{mem:5d} | {lv:5d} {lh:4d} | {h:4d} {w:4d}")


if __name__ == "__main__":
    snaps, rec_size = parse_frames(sys.argv[1])
    if len(sys.argv) > 2:
        which = [int(sys.argv[2])]
    else:
        which = [max(snaps)]  # last frame has the most channels populated
    for f in which:
        dump_frame(snaps[f], rec_size, f)
