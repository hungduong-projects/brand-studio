#!/usr/bin/env python3
"""Find and download CC0 3D models and HDR lighting from Poly Haven for a brand study.

  search models|hdris [--category NAME] [--match WORDS] [--limit 20]
      List assets: id, name, authors, categories.
  get <id> [--res 1k|2k|4k] [--out DIR]
      Models: download the glTF with its .bin and textures into DIR/<id>/.
      HDRIs: download DIR/<id>_<res>.hdr.
      Either way, write DIR/<id>.json with the name, authors, licence and source URL.

Every Poly Haven asset is CC0 1.0. CC0 clears copyright only: a model of a real product can
still carry a maker's name, logo or serial in its textures. Inspect every texture map
(colour, normal and roughness) before you publish; see references/showcase.md.
"""
import argparse, json, sys, urllib.request
from pathlib import Path

API = "https://api.polyhaven.com"
UA = {"User-Agent": "brand-studio-fetch/1.0 (CC0 asset research)"}


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def get_json(path: str):
    return json.loads(fetch(API + path))


def search(kind, category, match, limit):
    assets = get_json(f"/assets?t={kind}" + (f"&c={category}" if category else ""))
    words = [w.lower() for w in (match or "").split()]
    rows = []
    for asset_id, a in assets.items():
        text = " ".join([asset_id, a["name"], *a.get("tags", []), *a.get("categories", [])]).lower()
        if all(w in text for w in words):
            rows.append((a.get("download_count", 0), asset_id, a))
    for _, asset_id, a in sorted(rows, reverse=True)[:limit]:
        print(f"{asset_id}\t{a['name']}\t{', '.join(a['authors'])}\t{', '.join(a.get('categories', []))}")


def save(url: str, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(fetch(url))
    print(f"wrote {path} ({path.stat().st_size // 1024} KB)")


def get(asset_id, res, out: Path):
    info = get_json(f"/info/{asset_id}")
    files = get_json(f"/files/{asset_id}")
    if "gltf" in files:
        entry = files["gltf"][res]["gltf"]
        folder = out / asset_id
        save(entry["url"], folder / Path(entry["url"]).name)
        for rel, item in entry.get("include", {}).items():
            save(item["url"], folder / rel)
    elif "hdri" in files:
        entry = files["hdri"][res]["hdr"]
        save(entry["url"], out / f"{asset_id}_{res}.hdr")
    else:
        sys.exit(f"{asset_id}: no glTF or HDR files")
    record = {
        "id": asset_id,
        "name": info["name"],
        "authors": list(info["authors"]),
        "licence": "CC0 1.0",
        "source": f"https://polyhaven.com/a/{asset_id}",
        "resolution": res,
        "trademark_review": "pending: inspect every texture map for names, logos and serials before publishing",
    }
    (out / f"{asset_id}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"wrote {out / (asset_id + '.json')}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    s = sub.add_parser("search")
    s.add_argument("kind", choices=["models", "hdris"])
    s.add_argument("--category")
    s.add_argument("--match")
    s.add_argument("--limit", type=int, default=20)
    g = sub.add_parser("get")
    g.add_argument("id")
    g.add_argument("--res", default="2k")
    g.add_argument("--out", default="source-3d")
    args = parser.parse_args()
    if args.command == "search":
        search(args.kind, args.category, args.match, args.limit)
    else:
        get(args.id, args.res, Path(args.out))


if __name__ == "__main__":
    main()
