import argparse
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np


@dataclass
class GridSpec:
    rows: int
    cols: int
    margin_x: int
    margin_y: int
    gap_x: int
    gap_y: int
    cell_w: int
    cell_h: int


def cluster_positions(values: List[int], tol: int) -> List[int]:
    values = sorted(values)
    clusters = []
    for v in values:
        if not clusters or abs(v - clusters[-1][-1]) > tol:
            clusters.append([v])
        else:
            clusters[-1].append(v)
    return [int(np.median(c)) for c in clusters]


def detect_tiles(image: np.ndarray) -> List[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, 50, 150)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    tiles = []
    h, w = gray.shape

    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        if cw < 40 or ch < 40:
            continue
        if cw > w * 0.6 or ch > h * 0.6:
            continue
        ratio = cw / float(ch)
        if ratio < 0.85 or ratio > 1.15:
            continue
        area = cw * ch
        if area < 2000:
            continue
        tiles.append((x, y, cw, ch))

    return tiles


def infer_grid(tiles: List[Tuple[int, int, int, int]], image_shape: Tuple[int, int]) -> GridSpec | None:
    if not tiles:
        return None

    xs = [x for x, _, _, _ in tiles]
    ys = [y for _, y, _, _ in tiles]
    ws = [w for _, _, w, _ in tiles]
    hs = [h for _, _, _, h in tiles]

    median_w = int(np.median(ws))
    median_h = int(np.median(hs))
    tol = max(3, int(median_w * 0.25))

    col_positions = cluster_positions(xs, tol)
    row_positions = cluster_positions(ys, tol)

    cols = len(col_positions)
    rows = len(row_positions)

    col_positions.sort()
    row_positions.sort()

    margin_x = col_positions[0]
    margin_y = row_positions[0]

    gaps_x = [col_positions[i + 1] - col_positions[i] - median_w for i in range(cols - 1)]
    gaps_y = [row_positions[i + 1] - row_positions[i] - median_h for i in range(rows - 1)]

    gap_x = int(np.median(gaps_x)) if gaps_x else 0
    gap_y = int(np.median(gaps_y)) if gaps_y else 0

    return GridSpec(
        rows=rows,
        cols=cols,
        margin_x=margin_x,
        margin_y=margin_y,
        gap_x=gap_x,
        gap_y=gap_y,
        cell_w=median_w,
        cell_h=median_h
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('image', help='Path to a screenshot image')
    parser.add_argument('--out', default='data/grid_spec.json', help='Output json')
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    img = cv2.imread(str(image_path))
    if img is None:
        raise SystemExit('Failed to read image')

    tiles = detect_tiles(img)
    grid = infer_grid(tiles, img.shape[:2])
    if not grid:
        raise SystemExit('Could not infer grid')

    out = {
        'rows': grid.rows,
        'cols': grid.cols,
        'margin_x': grid.margin_x,
        'margin_y': grid.margin_y,
        'gap_x': grid.gap_x,
        'gap_y': grid.gap_y,
        'cell_w': grid.cell_w,
        'cell_h': grid.cell_h
    }

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding='utf-8')
    print(json.dumps(out, indent=2))


if __name__ == '__main__':
    main()