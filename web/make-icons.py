#!/usr/bin/env python3
"""Generate app icons with no image-library dependency.

Draws a baseball on the scoreboard-green ground: cream leather, clay seams.
Pure stdlib -- zlib and struct are enough to write a valid PNG.
"""
import math, struct, zlib

BOARD = (0x10, 0x1A, 0x13)
LEATHER = (0xED, 0xEF, 0xE6)
SEAM = (0xD2, 0x60, 0x3F)


def write_png(path, size, pixels):
    raw = b''.join(b'\x00' + bytes(row) for row in pixels)

    def chunk(tag, data):
        body = tag + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def blend(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def render(size):
    cx = cy = size / 2.0
    r = size * 0.33          # ball radius
    # Seam arcs bow toward the centre from each side without meeting. The arc
    # circle's near edge sits at (seam_off - seam_r) from the ball centre, so
    # 1.50 - 1.05 = 0.45r puts each apex in the outer third -- cross these and
    # you get a lens shape, not a baseball.
    seam_r = r * 1.05
    seam_off = r * 1.50
    seam_w = max(1.4, size * 0.018)
    aa = size / 256.0        # antialiasing width, scaled

    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            d = math.hypot(px - cx, py - cy)

            # ground -> leather
            ball_t = max(0.0, min(1.0, (r - d) / aa + 0.5))
            color = blend(BOARD, LEATHER, ball_t)

            if ball_t > 0:
                # two mirrored seam arcs, only where they cross the ball
                near = 1e9
                for sign in (-1, 1):
                    ad = math.hypot(px - (cx + sign * seam_off), py - cy)
                    near = min(near, abs(ad - seam_r))
                seam_t = max(0.0, min(1.0, (seam_w / 2 - near) / aa + 0.5)) * ball_t
                if seam_t > 0:
                    color = blend(color, SEAM, seam_t)

            row += bytes(color)
        rows.append(row)
    return rows


for size, name in ((512, 'public/icon-512.png'), (192, 'public/icon-192.png'), (180, 'public/apple-touch-icon.png')):
    write_png(name, size, render(size))
    print('wrote', name)
