"""Resize/compress wedding photos for web use.

Reads from Photo/ (kept untouched) and writes web-sized copies into
assets/img/. Long edge capped at MAX_EDGE px, saved as JPEG quality
JPEG_QUALITY (PNG stays PNG but is also downscaled).
"""
import os
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "Photo"
DST_DIR = ROOT / "assets" / "img"
MAX_EDGE = 1600
JPEG_QUALITY = 82

def process(src_path: Path, dst_path: Path):
    with Image.open(src_path) as im:
        im = ImageOps.exif_transpose(im)  # bake in correct rotation
        w, h = im.size
        scale = min(1.0, MAX_EDGE / max(w, h))
        if scale < 1.0:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

        dst_path.parent.mkdir(parents=True, exist_ok=True)
        ext = dst_path.suffix.lower()
        if ext in (".jpg", ".jpeg"):
            if im.mode != "RGB":
                im = im.convert("RGB")
            im.save(dst_path, "JPEG", quality=JPEG_QUALITY, optimize=True)
        elif ext == ".png":
            im.save(dst_path, "PNG", optimize=True)
        else:
            im.save(dst_path)

def main():
    count = 0
    total_src = 0
    total_dst = 0
    for src in sorted(SRC_DIR.rglob("*")):
        if not src.is_file():
            continue
        if src.suffix.lower() not in (".jpg", ".jpeg", ".png"):
            continue
        rel = src.relative_to(SRC_DIR)
        dst = DST_DIR / rel
        process(src, dst)
        s_size = src.stat().st_size
        d_size = dst.stat().st_size
        total_src += s_size
        total_dst += d_size
        count += 1
        print(f"{rel}  {s_size/1_048_576:.1f}MB -> {d_size/1_048_576:.1f}MB")

    print(f"\n{count} images processed")
    print(f"total: {total_src/1_048_576:.1f}MB -> {total_dst/1_048_576:.1f}MB")

if __name__ == "__main__":
    main()
