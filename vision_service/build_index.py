from __future__ import annotations

import json
import os
from PIL import Image
import imagehash

REFERENCE_DIR = os.getenv("REFERENCE_DIR", "data/reference")
INDEX_PATH = os.getenv("INDEX_PATH", "data/index.json")
MANIFEST_PATH = os.getenv("MANIFEST_PATH", "data/reference/manifest.json")


def build_index() -> int:
    entries = []
    if not os.path.exists(REFERENCE_DIR):
        print(f"Reference dir not found: {REFERENCE_DIR}")
        return 0

    manifest = []
    if os.path.exists(MANIFEST_PATH):
        try:
            with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception:
            manifest = []

    if manifest:
        for item in manifest:
            file_path = item.get("file")
            name = item.get("name")
            element = item.get("element")
            if not file_path or not name:
                continue
            if not os.path.exists(file_path):
                continue
            try:
                image = Image.open(file_path).convert("RGB")
                w, h = image.size
                x0 = int(w * 0.1)
                x1 = int(w * 0.9)
                y0 = int(h * 0.18)
                y1 = int(h * 0.88)
                cropped = image.crop((x0, y0, x1, y1)) if x1 > x0 and y1 > y0 else image
                phash = imagehash.phash(cropped)
                dhash = imagehash.dhash(cropped)
                entries.append({
                    "name": name,
                    "element": element,
                    "file": file_path,
                    "phash": str(phash),
                    "dhash": str(dhash)
                })
            except Exception:
                continue
    else:
        for root, _dirs, files in os.walk(REFERENCE_DIR):
            for filename in files:
                if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
                    continue
                file_path = os.path.join(root, filename)
                name = os.path.splitext(filename)[0]
                element = None
                try:
                    image = Image.open(file_path).convert("RGB")
                    w, h = image.size
                    x0 = int(w * 0.1)
                    x1 = int(w * 0.9)
                    y0 = int(h * 0.18)
                    y1 = int(h * 0.88)
                    cropped = image.crop((x0, y0, x1, y1)) if x1 > x0 and y1 > y0 else image
                    phash = imagehash.phash(cropped)
                    dhash = imagehash.dhash(cropped)
                    entries.append({
                        "name": name,
                        "element": element,
                        "file": file_path,
                        "phash": str(phash),
                        "dhash": str(dhash)
                    })
                except Exception:
                    continue

    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)

    print(f"Index saved to {INDEX_PATH}. Entries: {len(entries)}")
    return len(entries)


if __name__ == "__main__":
    build_index()
