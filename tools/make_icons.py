"""Generuje ikony PNG aplikacji (bez zewnętrznych bibliotek): python3 tools/make_icons.py"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")

BG = (17, 24, 39)
STRIPES = [(20, 20, 20), (221, 0, 0), (255, 206, 0)]
WHITE = (243, 244, 246)

FONT = {
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
}


def render(size):
    px = [[BG for _ in range(size)] for _ in range(size)]

    # flaga z zaokrąglonymi rogami
    fx0, fx1 = int(size * 0.18), int(size * 0.82)
    fy0, fy1 = int(size * 0.16), int(size * 0.52)
    rad = size * 0.06
    h = (fy1 - fy0) / 3
    for y in range(fy0, fy1):
        for x in range(fx0, fx1):
            cx = min(max(x, fx0 + rad), fx1 - 1 - rad)
            cy = min(max(y, fy0 + rad), fy1 - 1 - rad)
            if (x - cx) ** 2 + (y - cy) ** 2 > rad ** 2:
                continue
            px[y][x] = STRIPES[min(2, int((y - fy0) / h))]

    # napis "B2"
    cell = max(1, int(size * 0.045))
    text = "B2"
    gap = cell
    w = len(text) * 5 * cell + gap * (len(text) - 1)
    x0 = (size - w) // 2
    y0 = int(size * 0.60)
    for i, ch in enumerate(text):
        for r, row in enumerate(FONT[ch]):
            for c, bit in enumerate(row):
                if bit != "1":
                    continue
                for dy in range(cell):
                    for dx in range(cell):
                        x = x0 + i * (5 * cell + gap) + c * cell + dx
                        y = y0 + r * cell + dy
                        if 0 <= x < size and 0 <= y < size:
                            px[y][x] = WHITE
    return px


def write_png(path, px):
    size = len(px)
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)

    def chunk(t, data):
        c = struct.pack(">I", len(data)) + t + data
        return c + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, size in [("apple-touch-icon.png", 180), ("icon-192.png", 192), ("icon-512.png", 512)]:
        write_png(os.path.join(OUT, name), render(size))
        print("ok", name)
