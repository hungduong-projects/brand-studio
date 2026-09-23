#!/usr/bin/env python3
"""Find, download and crop public-domain museum art for a brand study.

  search <words> [--source met|aic|all] [--limit 12]
      List public-domain works with images: id, artist, date, title.
  get met:<id> | aic:<id> | iiif:<image-service-url> --name <slug> [--out DIR]
      Download the original, write <slug>.json provenance next to it.
  crop <image> --name <slug> [--detail x0,y0,x1,y1] [--trim x0,y0,x1,y1] [--out DIR]
      Write <slug>-1000.webp, <slug>-2000.webp and <slug>-detail.webp (900px square).

Sources and rights: The Met Open Access (isPublicDomain), Art Institute of Chicago
(is_public_domain, CC0 data), and any IIIF image service you point at (Getty Open
Content, National Gallery of Art). Always open the museum record and confirm the
rights line before publishing; the JSON records what the API said.
"""
import argparse, json, sys, urllib.parse, urllib.request
from pathlib import Path

UA = {"User-Agent": "brand-studio-fetch/1.0 (open-access research)"}


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def met_search(q, limit):
    ids = json.loads(fetch(f"https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q={urllib.parse.quote(q)}"))["objectIDs"] or []
    out = []
    for i in ids[: limit * 3]:
        o = met_object(i)
        if o["isPublicDomain"] and o["primaryImage"]:
            out.append((f"met:{i}", o["artistDisplayName"], o["objectDate"], o["title"]))
        if len(out) == limit:
            break
    return out


def met_object(i):
    return json.loads(fetch(f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{i}"))


AIC_FIELDS = "id,title,artist_display,date_display,image_id,is_public_domain"


def aic_search(q, limit):
    data = json.loads(fetch(f"https://api.artic.edu/api/v1/artworks/search?q={urllib.parse.quote(q)}&limit={limit * 2}&fields={AIC_FIELDS}"))["data"]
    return [(f"aic:{a['id']}", a["artist_display"].split("\n")[0], a["date_display"], a["title"]) for a in data if a["is_public_domain"] and a["image_id"]][:limit]


def get(ref, name, out):
    kind, _, key = ref.partition(":")
    if kind == "met":
        o = met_object(key)
        if not o["isPublicDomain"]:
            sys.exit(f"{ref} is not public domain on the Met API")
        url, record = o["primaryImage"], {"museum": "The Metropolitan Museum of Art", "page": o["objectURL"], "artist": o["artistDisplayName"], "title": o["title"], "date": o["objectDate"], "rights": "isPublicDomain: true (Met Open Access)"}
    elif kind == "aic":
        a = json.loads(fetch(f"https://api.artic.edu/api/v1/artworks/{key}?fields={AIC_FIELDS}"))["data"]
        if not a["is_public_domain"]:
            sys.exit(f"{ref} is not public domain on the AIC API")
        url, record = f"https://www.artic.edu/iiif/2/{a['image_id']}/full/1686,/0/default.jpg", {"museum": "Art Institute of Chicago", "page": f"https://www.artic.edu/artworks/{key}", "artist": a["artist_display"], "title": a["title"], "date": a["date_display"], "rights": "is_public_domain: true (AIC API)"}
    elif kind == "iiif":
        # e.g. iiif:https://media.getty.edu/iiif/image/<id>  or  iiif:https://api.nga.gov/iiif/<id>
        url, record = f"{key.rstrip('/')}/full/3000,/0/default.jpg", {"museum": "(fill in)", "page": "(fill in the object record URL)", "rights": "(copy the rights line from the object record)"}
    else:
        sys.exit("ref must start with met:, aic: or iiif:")
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{name}.jpg"
    path.write_bytes(fetch(url))
    record.update(source=url, file=path.name)
    (out / f"{name}.json").write_text(json.dumps(record, indent=2) + "\n")
    print(f"saved {path} ({path.stat().st_size // 1024} KB) and {name}.json")


def box(text):
    return tuple(int(v) for v in text.split(","))


def crop(image, name, detail, trim, out):
    from PIL import Image
    img = Image.open(image).convert("RGB")
    if trim:
        img = img.crop(box(trim))
    out.mkdir(parents=True, exist_ok=True)
    for width in (1000, 2000):
        w = min(width, img.width)
        img.resize((w, round(img.height * w / img.width)), Image.LANCZOS).save(out / f"{name}-{width}.webp", quality=82, method=6)
    if detail:
        Image.open(image).convert("RGB").crop(box(detail)).resize((900, 900), Image.LANCZOS).save(out / f"{name}-detail.webp", quality=84, method=6)
    print(f"wrote {name}-1000/-2000{' and -detail' if detail else ''}.webp to {out}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("words", nargs="+"); s.add_argument("--source", default="all", choices=["met", "aic", "all"]); s.add_argument("--limit", type=int, default=12)
    g = sub.add_parser("get"); g.add_argument("ref"); g.add_argument("--name", required=True); g.add_argument("--out", type=Path, default=Path("source-art"))
    c = sub.add_parser("crop"); c.add_argument("image"); c.add_argument("--name", required=True); c.add_argument("--detail"); c.add_argument("--trim"); c.add_argument("--out", type=Path, default=Path("public/images"))
    a = p.parse_args()
    if a.cmd == "search":
        q = " ".join(a.words)
        rows = (met_search(q, a.limit) if a.source in ("met", "all") else []) + (aic_search(q, a.limit) if a.source in ("aic", "all") else [])
        for ref, artist, date, title in rows:
            print(f"{ref:<14} {artist[:28]:<28} {date[:14]:<14} {title[:70]}")
    elif a.cmd == "get":
        get(a.ref, a.name, a.out)
    else:
        crop(a.image, a.name, a.detail, a.trim, a.out)


if __name__ == "__main__":
    main()
