import json
import os
from typing import List, Dict

import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

SOURCE_JSON = os.getenv("MONSTER_LIST", "data/monsters.json")
REFERENCE_DIR = os.getenv("REFERENCE_DIR", "data/reference")
MANIFEST_PATH = os.getenv("MANIFEST_PATH", "data/reference/manifest.json")
BASE_URL = "https://swarfarm.com/static/herders/images/monsters"


def sanitize_filename(name: str) -> str:
    return "".join(ch for ch in name if ch.isalnum() or ch in (" ", "-", "_", ".")).rstrip()


def download_icons():
    if not os.path.exists(SOURCE_JSON):
        raise FileNotFoundError(f"Monster list not found: {SOURCE_JSON}")

    with open(SOURCE_JSON, "r", encoding="utf-8") as f:
        monsters: List[Dict] = json.load(f)

    os.makedirs(REFERENCE_DIR, exist_ok=True)
    manifest = []

    def task(m):
        name = m.get("name")
        image_filename = m.get("image_filename")
        com2us_id = m.get("com2us_id")
        element = m.get("element")
        if not name or not image_filename:
            return None

        safe = sanitize_filename(name)
        file_name = f"{safe}.png"
        file_path = os.path.join(REFERENCE_DIR, file_name)

        if os.path.exists(file_path):
            file_name = f"{safe}__{com2us_id}.png"
            file_path = os.path.join(REFERENCE_DIR, file_name)
            if os.path.exists(file_path):
                return {
                    "name": name,
                    "file": file_path,
                    "com2us_id": com2us_id,
                    "image_filename": image_filename,
                    "element": element
                }

        url = f"{BASE_URL}/{image_filename}"
        try:
            res = requests.get(url, timeout=15)
            if res.status_code != 200:
                return None
            with open(file_path, "wb") as imgf:
                imgf.write(res.content)
            return {
                "name": name,
                "file": file_path,
                "com2us_id": com2us_id,
                "image_filename": image_filename,
                "element": element
            }
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(task, m) for m in monsters]
        for future in as_completed(futures):
            result = future.result()
            if result:
                manifest.append(result)

    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Downloaded {len(manifest)} icons. Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    download_icons()
