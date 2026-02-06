# Vision Service (MVP)

## Setup

1. Create a venv and install deps:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

2. Put monster reference icons in `data/reference/`.
   - Each file name becomes the monster name used in matching.
   - Or generate from DB:
     1) `node backend/export_monsters_for_vision.mjs`
     2) `python download_reference_icons.py`

3. Build index:

```bash
python build_index.py
```

4. Run the API:

```bash
uvicorn app:app --reload --port 8008
```

## Environment

- `REFERENCE_DIR` (default `data/reference`)
- `INDEX_PATH` (default `data/index.json`)
- `MATCH_MAX_DIST` (default `18`)
- `GRID_ROWS` / `GRID_COLS` (default `0` = auto-detect tiles)
- `GRID_MARGIN_X` / `GRID_MARGIN_Y`
- `GRID_GAP_X` / `GRID_GAP_Y`

## API

`POST /detect`
- multipart form-data field `images`
- returns `names` list and `detected` with confidence and bbox

## Grid calibration (optional)

Use a screenshot to infer grid parameters:

```bash
python calibrate_grid.py data/samples/your_screenshot.png
```

This writes `data/grid_spec.json` with suggested values for:
`GRID_ROWS`, `GRID_COLS`, `GRID_MARGIN_X`, `GRID_MARGIN_Y`, `GRID_GAP_X`, `GRID_GAP_Y`.
