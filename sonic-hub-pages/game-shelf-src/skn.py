# -*- coding: utf-8 -*-
"""A skin of Lines 98 (.skn: a RAR archive of the board's bitmaps and SKIN.INI), remade for the Wine his machines run.

Boxedwine's Wine (1.7.55) draws the board of the Fruit skin (1.BMP: 410×461, 8-bit, run-length coded) as its left
columns and grey stripes. The file is sound: any viewer opens it whole, and every row of its coding ends where it
should. plain() gives the same skin with its run-length-coded 8-bit bitmaps written without compression, pixel for
pixel the same pictures (checked before it returns). Only RAR itself writes RAR's compressed methods, so the archive is
written the stored way (method 0x30) — a marker, an archive header, before each file a header with its sizes, CRC, time
and name, an end mark — which the game's unrar.dll reads like any other.

  python3 skn.py fruit.skn fruit-plain.skn        needs libarchive-c (reads the skin as it came) and pillow
"""
import datetime
import io
import struct
import sys
import zlib


def _block(kind, flags, body):
    """a RAR block: the CRC16 of what follows it, its type, flags, size, body"""
    rest = struct.pack("<BHH", kind, flags, 7 + len(body)) + body
    return struct.pack("<H", zlib.crc32(rest) & 0xFFFF) + rest


def _dos_time(t):
    return ((t.year - 1980) << 25) | (t.month << 21) | (t.day << 16) | (t.hour << 11) | (t.minute << 5) | (t.second // 2)


def stored(files):
    """a RAR archive (the format of RAR 1.5 to 4) of files kept as they are: (name, bytes, datetime) each"""
    out = [b"Rar!\x1a\x07\x00", _block(0x73, 0, struct.pack("<HI", 0, 0))]
    for name, data, when in files:
        n = name.encode("cp437")
        # packed size, size, host (Windows), CRC32, time, version needed (2.0), method (stored), name length, attributes
        body = struct.pack("<IIBIIBBHI", len(data), len(data), 2, zlib.crc32(data) & 0xFFFFFFFF, _dos_time(when), 20, 0x30,
                           len(n), 0x20) + n
        out += [_block(0x74, 0x8000, body), data]      # 0x8000: the packed size above is the data that follows
    out.append(_block(0x7B, 0x4000, b""))
    return b"".join(out)


def _uncompressed(bmp):
    """a run-length-coded 8-bit bitmap as the same picture without compression; any other file as it is"""
    from PIL import Image
    if bmp[:2] != b"BM" or struct.unpack("<I", bmp[30:34])[0] != 1:
        return bmp
    was = Image.open(io.BytesIO(bmp))
    buf = io.BytesIO()
    was.save(buf, "BMP")
    now = Image.open(io.BytesIO(buf.getvalue()))
    if now.size != was.size or now.convert("RGB").tobytes() != was.convert("RGB").tobytes():
        raise ValueError("the bitmap did not come out the same")
    return buf.getvalue()


def plain(skin):
    """the skin (bytes of a .skn) with its 8-bit run-length-coded bitmaps uncompressed: same files, names and times"""
    import libarchive
    files = []
    with libarchive.memory_reader(skin) as archive:
        for e in archive:
            data = b"".join(e.get_blocks())
            files.append((e.pathname, _uncompressed(data), datetime.datetime.fromtimestamp(e.mtime)))
    return stored(files)


if __name__ == "__main__":
    with open(sys.argv[1], "rb") as f:
        made = plain(f.read())
    with open(sys.argv[2], "wb") as f:
        f.write(made)
    print(len(made), "bytes")
