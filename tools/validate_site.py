"""Check public-site resources and presentation, optionally against originals."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "docs"
PRIVATE_REFERENCE = re.compile(r"/(?:home|Users|mnt)/|\b10(?:\.\d{1,3}){3}\b|\b192\.168(?:\.\d{1,3}){2}\b")


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.strings = []
        self.links = []
        self.json_script = False
        self.data = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"style", "script"}:
            self.skip = True
        if tag == "script" and attrs.get("id") == "player-data":
            self.json_script = True
        for name in {"title", "alt", "aria-label", "placeholder"}:
            if name in attrs:
                self.strings.append(attrs[name])
        for name in {"href", "src", "data-player-src"}:
            if name in attrs:
                self.links.append(attrs[name])

    def handle_endtag(self, tag):
        if tag in {"style", "script"}:
            self.skip = False
            self.json_script = False

    def handle_data(self, value):
        if self.json_script:
            self.data = json.loads(value)
        elif not self.skip:
            self.strings.append(value)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", type=Path)
    args = parser.parse_args()
    errors, tracks, source_count, missing = [], 0, 0, []
    for file in sorted(SITE.rglob("*.html")):
        if PRIVATE_REFERENCE.search(file.read_text()):
            errors.append((str(file.relative_to(SITE)), "private server reference"))
        p = Page()
        p.feed(file.read_text())
        for value in p.strings:
            if re.search(r"[\u3400-\u9fff]", value):
                errors.append((str(file.relative_to(SITE)), "non-English visible content", value[:120]))
            if re.search("cadenza", value, re.I):
                errors.append((str(file.relative_to(SITE)), "old visible model name", value[:120]))
        for link in p.links:
            u = urlsplit(link)
            if u.scheme or u.netloc or not u.path:
                continue
            target = (file.parent / unquote(u.path)).resolve()
            if not target.exists():
                missing.append((str(file.relative_to(SITE)), link))
        if p.data:
            data = p.data
            original = json.loads((args.original / "players/data" / (data["id"] + ".json")).read_text()) if args.original else None
            for index, track in enumerate(data["tracks"]):
                tracks += 1
                for key in {"audio", "audioFallback", "excerptXml", "excerptMidi"}:
                    if track.get(key) and not (file.parent / track[key]).is_file():
                        missing.append((str(file.relative_to(SITE)), track[key]))
                for key in {"label", "name"}:
                    if re.search(r"[\u3400-\u9fff]|cadenza", track[key], re.I):
                        errors.append((str(file.relative_to(SITE)), "untranslated player label", track[key]))
                if original:
                    old = original["tracks"][index]
                    for key in {"id", "frames", "spans", "coreIndices", "contextIndices", "scoreDuration", "focusStart", "focusEnd", "sourceStart", "sourceEnd"}:
                        if track.get(key) != old.get(key):
                            errors.append((data["id"], "changed musical timeline", key))
    if args.original:
        for file in args.original.rglob("*"):
            if file.suffix.lower() not in {".musicxml", ".mid", ".m4a"}:
                continue
            relative = file.relative_to(args.original)
            target = SITE / relative
            if not target.is_file() or sha(file) != sha(target):
                errors.append((str(relative), "source hash changed"))
            source_count += 1
    report = {
        "html_pages": len(list(SITE.rglob("*.html"))),
        "interactive_players": len(list((SITE / "players").glob("*.html"))),
        "track_occurrences": tracks,
        "mp3_clips": len(list((SITE / "players/audio").glob("*.mp3"))),
        "aac_fallback_clips": len(list((SITE / "players/audio").glob("*.m4a"))),
        "original_files_hash_checked": source_count,
        "english_only_presentation": not errors,
        "publication_scope": "report, rendered score excerpts and synthesized excerpt audio only",
        "complete_original_inputs_published": False,
        "internal_server_paths_published": False,
        "errors": errors,
        "missing_local_resources": missing,
    }
    (ROOT / "tools/verification-local.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    raise SystemExit(bool(errors or missing))


if __name__ == "__main__":
    main()
