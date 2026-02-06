from __future__ import annotations

import io
import json
import os
from dataclasses import dataclass
from typing import List, Tuple, Optional, Set

import cv2
import imagehash
import numpy as np
from fastapi import FastAPI, File, UploadFile
from PIL import Image


REFERENCE_DIR = os.getenv("REFERENCE_DIR", "data/reference")
INDEX_PATH = os.getenv("INDEX_PATH", "data/index.json")
MANIFEST_PATH = os.getenv("MANIFEST_PATH", "data/reference/manifest.json")
MATCH_MAX_DIST = int(os.getenv("MATCH_MAX_DIST", "22"))
MATCH_MIN_MARGIN = int(os.getenv("MATCH_MIN_MARGIN", "0"))

GRID_ROWS = int(os.getenv("GRID_ROWS", "0"))
GRID_COLS = int(os.getenv("GRID_COLS", "0"))
GRID_MARGIN_X = int(os.getenv("GRID_MARGIN_X", "0"))
GRID_MARGIN_Y = int(os.getenv("GRID_MARGIN_Y", "0"))
GRID_GAP_X = int(os.getenv("GRID_GAP_X", "0"))
GRID_GAP_Y = int(os.getenv("GRID_GAP_Y", "0"))


@dataclass
class RefEntry:
    name: str
    file: str
    phash: imagehash.ImageHash
    element: Optional[str] = None
    dhash: Optional[imagehash.ImageHash] = None


app = FastAPI()


_ref_index: List[RefEntry] = []
_ambiguous_names: Set[str] = set()


def load_index() -> List[RefEntry]:
    if not os.path.exists(INDEX_PATH):
        return []
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    entries = []
    for item in raw:
        entries.append(
            RefEntry(
                name=item["name"],
                file=item["file"],
                phash=imagehash.hex_to_hash(item["phash"]),  # type: ignore
                element=item.get("element"),
                dhash=imagehash.hex_to_hash(item["dhash"]) if item.get("dhash") else None  # type: ignore
            )
        )
    return entries


def build_index() -> List[RefEntry]:
    entries: List[RefEntry] = []
    if not os.path.exists(REFERENCE_DIR):
        return entries

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
                phash = imagehash.phash(image)
                dhash = imagehash.dhash(image)
                entries.append(RefEntry(name=name, file=file_path, phash=phash, element=element, dhash=dhash))
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
                    phash = imagehash.phash(image)
                    dhash = imagehash.dhash(image)
                    entries.append(RefEntry(name=name, file=file_path, phash=phash, element=element, dhash=dhash))
                except Exception:
                    continue

    os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(
            [{"name": e.name, "element": e.element, "file": e.file, "phash": str(e.phash), "dhash": str(e.dhash) if e.dhash else None} for e in entries],
            f,
            ensure_ascii=False,
            indent=2,
        )

    return entries


def ensure_index() -> None:
    global _ref_index
    _ref_index = load_index()
    if not _ref_index:
        _ref_index = build_index()
    name_counts: dict[str, set[str]] = {}
    for entry in _ref_index:
        if not entry.element:
            continue
        name_counts.setdefault(entry.name, set()).add(entry.element)
    global _ambiguous_names
    _ambiguous_names = {name for name, elems in name_counts.items() if len(elems) > 1}


def crop_grid(image: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
    height, width = image.shape[:2]

    if GRID_ROWS <= 0 or GRID_COLS <= 0:
        return detect_tiles(image)

    cell_width = (width - 2 * GRID_MARGIN_X - (GRID_COLS - 1) * GRID_GAP_X) // GRID_COLS
    cell_height = (height - 2 * GRID_MARGIN_Y - (GRID_ROWS - 1) * GRID_GAP_Y) // GRID_ROWS

    crops = []
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            x = GRID_MARGIN_X + c * (cell_width + GRID_GAP_X)
            y = GRID_MARGIN_Y + r * (cell_height + GRID_GAP_Y)
            w = cell_width
            h = cell_height
            crop = image[y:y + h, x:x + w]
            if crop.size == 0:
                continue
            crops.append((crop, (x, y, w, h)))

    return crops


def detect_tiles(image: np.ndarray) -> List[Tuple[np.ndarray, Tuple[int, int, int, int]]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 21, 5)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    tiles = []
    h, w = gray.shape

    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw < 45 or ch < 45:
            continue
        if cw > w * 0.5 or ch > h * 0.5:
            continue
        ratio = cw / float(ch)
        if ratio < 0.85 or ratio > 1.15:
            continue
        if x > w * 0.78:
            continue
        tiles.append((x, y, cw, ch))

    if not tiles:
        return [(image, (0, 0, w, h))]

    # Filter by median size to remove UI buttons
    ws = [t[2] for t in tiles]
    hs = [t[3] for t in tiles]
    median_w = float(np.median(ws))
    median_h = float(np.median(hs))
    size_filtered = [
        t for t in tiles
        if abs(t[2] - median_w) <= median_w * 0.3 and abs(t[3] - median_h) <= median_h * 0.3
    ]

    # Deduplicate by center proximity
    centers = []
    unique = []
    for x, y, cw, ch in size_filtered:
        cx = x + cw / 2
        cy = y + ch / 2
        if any(abs(cx - ux) < median_w * 0.35 and abs(cy - uy) < median_h * 0.35 for ux, uy in centers):
            continue
        centers.append((cx, cy))
        unique.append((x, y, cw, ch))

    # Infer grid from partial tiles to fill missing slots
    grid = infer_grid_from_tiles(image, unique, median_w, median_h)
    if grid:
        return grid

    # Fallback: use detected tiles directly
    unique.sort(key=lambda t: (t[1], t[0]))
    return [(image[y:y + ch, x:x + cw], (x, y, cw, ch)) for x, y, cw, ch in unique if image[y:y + ch, x:x + cw].size > 0]


def cluster_positions(values: List[float], tol: float) -> List[float]:
    values = sorted(values)
    clusters: List[List[float]] = []
    for v in values:
        if not clusters or abs(v - clusters[-1][-1]) > tol:
            clusters.append([v])
        else:
            clusters[-1].append(v)
    return [float(np.median(c)) for c in clusters]


def infer_grid_from_tiles(image: np.ndarray, tiles: List[Tuple[int, int, int, int]], median_w: float, median_h: float):
    if len(tiles) < 8:
        return None

    xs = [x + w / 2 for x, y, w, h in tiles]
    ys = [y + h / 2 for x, y, w, h in tiles]

    col_centers = cluster_positions(xs, median_w * 0.6)
    row_centers = cluster_positions(ys, median_h * 0.6)

    if not col_centers or not row_centers:
        return None

    # Keep only dense rows (avoid right panel icons)
    row_counts = {rc: 0 for rc in row_centers}
    for _, y, _, h in tiles:
        cy = y + h / 2
        closest = min(row_centers, key=lambda r: abs(r - cy))
        row_counts[closest] += 1

    max_count = max(row_counts.values()) if row_counts else 0
    keep_rows = [r for r, c in row_counts.items() if c >= max(3, int(max_count * 0.6))]
    if len(keep_rows) < 2:
        return None

    filtered_tiles = []
    for x, y, w, h in tiles:
        cy = y + h / 2
        closest = min(keep_rows, key=lambda r: abs(r - cy))
        if abs(closest - cy) <= median_h * 0.6:
            filtered_tiles.append((x, y, w, h))

    xs = [x + w / 2 for x, y, w, h in filtered_tiles]
    ys = [y + h / 2 for x, y, w, h in filtered_tiles]
    col_centers = cluster_positions(xs, median_w * 0.6)
    row_centers = cluster_positions(ys, median_h * 0.6)

    if len(col_centers) < 4 or len(row_centers) < 4:
        return None

    col_counts = {cc: 0 for cc in col_centers}
    for x, y, w, h in filtered_tiles:
        cx = x + w / 2
        closest = min(col_centers, key=lambda c: abs(c - cx))
        col_counts[closest] += 1

    max_col_count = max(col_counts.values()) if col_counts else 0
    keep_cols = [c for c, count in col_counts.items() if count >= max(3, int(max_col_count * 0.6))]
    if len(keep_cols) < 4:
        keep_cols = col_centers

    col_centers = sorted(keep_cols)

    col_centers.sort()
    row_centers.sort()
    col_spacing = float(np.median([col_centers[i + 1] - col_centers[i] for i in range(len(col_centers) - 1)])) if len(col_centers) > 1 else median_w
    row_spacing = float(np.median([row_centers[i + 1] - row_centers[i] for i in range(len(row_centers) - 1)])) if len(row_centers) > 1 else median_h

    crops = []
    for ry in row_centers:
        for rx in col_centers:
            x = int(rx - median_w / 2)
            y = int(ry - median_h / 2)
            cw = int(median_w)
            ch = int(median_h)
            if x < 0 or y < 0:
                continue
            crop = image[y:y + ch, x:x + cw]
            if crop.size == 0:
                continue
            crops.append((crop, (x, y, cw, ch)))

    return crops


def best_match(img: np.ndarray) -> Tuple[RefEntry | None, int, int]:
    if not _ref_index:
        return None, 999

    h, w = img.shape[:2]
    x0 = int(w * 0.1)
    x1 = int(w * 0.9)
    y0 = int(h * 0.18)
    y1 = int(h * 0.88)
    cropped = img[y0:y1, x0:x1] if y1 > y0 and x1 > x0 else img

    pil = Image.fromarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
    ph = imagehash.phash(pil)

    best_entry: RefEntry | None = None
    best_dist = 999
    second_best = 999

    for entry in _ref_index:
        dist = ph - entry.phash
        if dist < best_dist:
            second_best = best_dist
            best_dist = dist
            best_entry = entry
        elif dist < second_best:
            second_best = dist

    margin = second_best - best_dist if second_best < 999 else 999
    return best_entry, best_dist, margin


@app.on_event("startup")
async def startup_event() -> None:
    ensure_index()


@app.post("/detect")
async def detect(images: List[UploadFile] = File(...)):
    ensure_index()

    all_matches = []
    for upload in images:
        raw = await upload.read()
        np_img = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
        if img is None:
            continue

        crops = crop_grid(img)
        for crop, bbox in crops:
            entry, dist, margin = best_match(crop)
            if entry is None:
                continue
            if dist > MATCH_MAX_DIST:
                continue
            if margin < MATCH_MIN_MARGIN:
                continue

            confidence = max(0.0, 1.0 - (dist / 64.0))
            label = entry.name
            if entry.element and entry.name in _ambiguous_names:
                label = f"{entry.element} {entry.name}"
            all_matches.append({
                "name": label,
                "base_name": entry.name,
                "element": entry.element,
                "distance": dist,
                "confidence": round(confidence, 4),
                "bbox": bbox,
            })

    names = [m["name"] for m in all_matches]
    return {
        "detected": all_matches,
        "names": names,
        "count": len(names)
    }
