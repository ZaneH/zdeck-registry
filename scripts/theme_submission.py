"""Prepare a source-preview theme registry PR, never a theme package. Python 3.10+."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import unicodedata
import zlib

from submission import local_file, public_url, strict_json

FIXTURE = "zdeck-sample-deck-1"
PREVIEW_LIMIT = 2 * 1024 * 1024
DIMENSIONS = {"desktop": (1200, 800), "phone": (390, 844)}


def require(ok):
    if not ok:
        raise ValueError("Invalid theme submission; see docs/submissions.md")


def text(value, limit):
    return (isinstance(value, str) and bool(value.strip()) and len(value) <= limit
            and not any(unicodedata.category(char) in ["Cc", "Cs"] for char in value))


def inspect_preview(data, dimensions):
    """Check bounded PNG structure and dimensions, not visual accuracy or source equivalence."""
    require(0 < len(data) <= PREVIEW_LIMIT and data[:8] == b"\x89PNG\r\n\x1a\n")
    cursor, count, image_data = 8, 0, False
    while cursor < len(data):
        require(count < 4096 and cursor + 12 <= len(data))
        size = struct.unpack_from(">I", data, cursor)[0]
        kind = data[cursor + 4:cursor + 8]
        end = cursor + 12 + size
        require(end <= len(data) and re.fullmatch(b"[A-Za-z]{4}", kind))
        payload = data[cursor + 8:end - 4]
        require(zlib.crc32(kind + payload) == struct.unpack_from(">I", data, end - 4)[0])
        if count == 0:
            require(kind == b"IHDR" and size == 13)
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            require((width, height) == dimensions and depth == 8 and color in [2, 6]
                    and compression == filtering == interlace == 0)
        else:
            require(kind != b"IHDR" and kind not in [b"acTL", b"fcTL", b"fdAT"])
        if kind == b"IDAT":
            image_data = image_data or size > 0
        if kind == b"IEND":
            require(size == 0 and image_data and end == len(data))
            return
        count += 1
        cursor = end
    require(False)


def prepare(metadata, readme, desktop_preview, phone_preview, output, repo, commit, root=None):
    info = strict_json(local_file(metadata, root, 16384))
    require(isinstance(info, dict) and set(info) <= {"id", "name", "summary", "author", "license", "tags"})
    require(isinstance(info.get("id"), str) and re.fullmatch(r"[a-z][a-z0-9-]{0,63}", info["id"]))
    for key, limit in [("name", 80), ("summary", 200), ("author", 80), ("license", 40)]:
        require(text(info.get(key), limit))
    tags = info.get("tags", [])
    require(isinstance(tags, list) and len(tags) <= 8
            and all(isinstance(tag, str) and re.fullmatch(r"[a-z0-9][a-z0-9-]{0,31}", tag) for tag in tags)
            and len(set(tags)) == len(tags))
    public_url(repo)
    require(isinstance(commit, str) and re.fullmatch(r"[a-f0-9]{40}", commit))
    markdown = local_file(readme, root, 65536)
    require(bool(markdown.decode("utf-8").strip()))
    images = {"desktop": local_file(desktop_preview, root, PREVIEW_LIMIT),
              "phone": local_file(phone_preview, root, PREVIEW_LIMIT)}
    for view, data in images.items():
        inspect_preview(data, DIMENSIONS[view])
    identity = info["id"]
    record = {**info, "kind": "source-preview", "repo": repo, "sourceCommit": commit,
              "readme": f"{identity}.md", "preview": {"fixture": FIXTURE}}
    for view in images:
        record["preview"][view] = {"src": f"previews/{identity}/{view}.png",
                                    "alt": f"{info['name']} on the standard zDeck {view} sample deck."}
    candidate = {"schema": 1, "state": "unsigned-unreviewed-theme-source-preview", "id": identity,
                 "source": {"repo": repo, "commit": commit, "license": info["license"]},
                 "fixture": FIXTURE, "installable": False, "signable": False,
                 "evidence": {view: {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data),
                                     "width": DIMENSIONS[view][0], "height": DIMENSIONS[view][1]}
                              for view, data in images.items()}}
    files = {f"registry/themes/{identity}.json": json.dumps(record, indent=2).encode() + b"\n",
             f"registry/theme-readmes/{identity}.md": markdown,
             **{f"registry/previews/{identity}/{view}.png": data for view, data in images.items()},
             "candidate.json": json.dumps(candidate, indent=2).encode() + b"\n",
             "PR.md": ("Theme source preview only; not an installable package.\n"
                       "Copy registry/ into a PR targeting dev. Attach candidate.json and identify the source commit.\n"
                       "Review the existing ID before replacing a record. Review source, licence and screenshot accuracy.\n"
                       "The generator checks PNG structure/dimensions, not image decoding, visual quality, accessibility,\n"
                       "platform compatibility, or correspondence between the claimed source and screenshots.\n"
                       "No code executed, package created, signing, upload, publication or installation occurred.\n").encode()}
    out = Path(output).absolute()
    require(".." not in out.parts and all(not p.is_symlink() for p in [out, *out.parents]))
    out.mkdir(parents=True, exist_ok=False)
    for name, content in files.items():
        path = out / name
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("xb") as stream:
            stream.write(content)
    return candidate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ["metadata", "readme", "desktop-preview", "phone-preview", "output", "repo", "commit"]:
        parser.add_argument(f"--{flag}", required=True)
    parser.add_argument("--source-root")
    args = parser.parse_args()
    try:
        prepare(args.metadata, args.readme, args.desktop_preview, args.phone_preview,
                args.output, args.repo, args.commit, args.source_root)
    except (ValueError, OSError, RuntimeError, RecursionError, struct.error):
        parser.exit(1, "Theme submission rejected. Nothing published or installed. See docs/submissions.md.\n")
    print("Theme source-preview submission prepared. Nothing signed, uploaded, published or installed.")


if __name__ == "__main__":
    main()
