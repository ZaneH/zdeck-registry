"""Inspect a local prebuilt ZIP without extracting or executing plugin code. Python 3.10+."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import stat
import struct
import zipfile
from urllib.parse import urlsplit

LIMIT = 16 * 1024 * 1024


def require(ok):
    if not ok:
        raise ValueError("Invalid submission; see docs/submissions.md")


def local_file(path, root=None, limit=LIMIT):
    path = Path(path).absolute()
    require(".." not in path.parts)
    if root is not None:
        require(path.is_relative_to(Path(root).resolve()))
    require(all(not p.is_symlink() for p in [path, *path.parents]))
    require(path.is_file() and path.stat().st_size <= limit)
    data = path.read_bytes()
    require(len(data) <= limit)
    return data


def public_url(value):
    require(isinstance(value, str) and len(value) <= 2048 and re.fullmatch(r"[\x21-\x7e]+", value) and not any(c in value for c in "\\@?#"))
    url = urlsplit(value)
    require(url.scheme == "https" and url.hostname and url.netloc == url.hostname
            and re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)+", url.hostname)
            and not re.fullmatch(r"[\d.]+", url.hostname)
            and not re.search(r"\.(localhost|local|internal|home|lan)$", url.hostname))
    # No DNS/HTTP requests: these are reviewable source claims, never fetch instructions.
    return value


def strict_json(data):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result)
            result[key] = value
        return result
    return json.loads(data.decode("utf-8"), object_pairs_hook=unique,
                      parse_constant=lambda _: require(False))


def inspect_archive(data):
    require(0 < len(data) <= LIMIT and data[:4] == b"PK\x03\x04")
    # Conservative ZIP32 subset: no comments, extras, descriptors, prepended/hidden data or ZIP64.
    require(len(data) >= 22 and data[-22:-18] == b"PK\x05\x06")
    disk, start_disk, disk_count, count, size, start, comment = struct.unpack_from("<4H2IH", data, len(data) - 18)
    require(disk == start_disk == comment == 0 and disk_count == count and 0 < count <= 4096
            and start + size == len(data) - 22)
    # Preflight central entries before ZipFile allocates per-entry objects; do not trust EOCD count.
    cursor = start
    for _ in range(count):
        require(cursor + 46 <= start + size and data[cursor:cursor + 4] == b"PK\x01\x02")
        namesize, extrasize, commentsize, entry_disk = struct.unpack_from("<4H", data, cursor + 28)
        require(extrasize == commentsize == entry_disk == 0 and namesize <= 201)
        cursor += 46 + namesize
        require(cursor <= start + size)
    require(cursor == start + size)
    wanted = {"manifest.json": 16384, "README.md": 65536, "LICENSE": 65536, "package.json": 16384}
    selected, paths, seen = {}, {}, set()
    total, offset = 0, 0
    reserved = {"manifest.json", "main.js", "main.py", "package.json", "readme.md", "license",
                "node_modules", "node_modules/@zdeck", "node_modules/@zdeck/plugin-sdk",
                "node_modules/@zdeck/plugin-sdk/package.json", "node_modules/@zdeck/plugin-sdk/index.js",
                "zdeck_plugin_sdk", "zdeck_plugin_sdk/__init__.py", "zdeck_plugin_sdk/types.py"}
    exact = {name.lower(): name for name in [*reserved, "README.md", "LICENSE"]}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(len(archive.infolist()) == count and archive.start_dir == start and not archive.comment)
        for entry in archive.infolist():
            name = entry.filename
            require(name == entry.orig_filename and "\x00" not in name and name.isascii())
            directory = entry.is_dir()
            path = name[:-1] if directory else name
            parts = path.split("/")
            require(len(path) <= 200 and len(parts) <= 16 and path.lower() not in seen)
            seen.add(path.lower())
            for part in parts:
                require(re.fullmatch(r"[a-zA-Z0-9._@+-]{1,64}", part) and part not in [".", ".."]
                        and not part.endswith(".") and not re.match(r"(?i)^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)", part))
            for i in range(1, len(parts) + 1):
                prefix = "/".join(parts[:i])
                kind = i < len(parts) or directory
                require(prefix.lower() not in paths or paths[prefix.lower()] == (prefix, kind))
                paths[prefix.lower()] = (prefix, kind)
                require(prefix.lower() not in reserved or prefix == exact[prefix.lower()])
            mode = stat.S_IFMT(entry.external_attr >> 16)
            require(mode in [0, stat.S_IFDIR if directory else stat.S_IFREG]
                    and entry.compress_type in [zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED]
                    and entry.flag_bits in [0, 0x800] and not entry.extra and not entry.comment
                    and entry.file_size <= 8 * 1024 * 1024
                    and entry.file_size <= entry.compress_size * 200
                    and (not directory or entry.file_size == 0))
            total += entry.file_size
            require(total <= 64 * 1024 * 1024 and entry.header_offset == offset)
            require(data[offset:offset + 4] == b"PK\x03\x04")
            _, flags, method, _, _, crc, compressed, unpacked, namesize, extrasize = struct.unpack_from("<5H3I2H", data, offset + 4)
            rawname = name.encode("ascii")
            require((flags, method, crc, compressed, unpacked, namesize, extrasize) ==
                    (entry.flag_bits, entry.compress_type, entry.CRC, entry.compress_size, entry.file_size, len(rawname), 0)
                    and data[offset + 30:offset + 30 + namesize] == rawname)
            offset += 30 + namesize + entry.compress_size
            require(offset <= start)
            # Bounded read through CRC/EOF for every entry, never ZipFile.extract().
            with archive.open(entry) as stream:
                content = stream.read(entry.file_size + 1)
                require(len(content) == entry.file_size and stream.read(1) == b"")
            if name in wanted:
                require(len(content) <= wanted[name])
                selected[name] = content
        require(offset == start and all(name in selected for name in ["manifest.json", "README.md", "LICENSE"]))
        require(("main.js" in seen) != ("main.py" in seen))
        runtime = "node" if "main.js" in seen else "python"
        sdk = "node_modules/@zdeck/plugin-sdk/index.js" if runtime == "node" else "zdeck_plugin_sdk/__init__.py"
        require(sdk in seen and not paths[sdk][1] and not paths["main.js" if runtime == "node" else "main.py"][1])
    manifest = strict_json(selected["manifest.json"])
    require(isinstance(manifest, dict) and isinstance(manifest.get("id"), str) and re.fullmatch(r"[a-z][a-z0-9-]{0,63}", manifest["id"])
            and isinstance(manifest.get("version"), str) and re.fullmatch(r"[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}", manifest["version"])
            and type(manifest.get("protocolVersion")) is int and manifest["protocolVersion"] == 1)
    for name in ["README.md", "LICENSE"]:
        require(selected[name].decode("utf-8").strip())
    return manifest, runtime, selected


def prepare(archive_path, output, repo, commit, license_id=None, root=None):
    data = local_file(archive_path, root)
    manifest, runtime, selected = inspect_archive(data)
    public_url(repo)
    require(re.fullmatch(r"[a-f0-9]{40}", commit))
    package = strict_json(selected.get("package.json", b"{}"))
    require(isinstance(package, dict))
    scripts = package.get("scripts", {})
    require(isinstance(scripts, dict) and not any(name in scripts for name in ["preinstall", "install", "postinstall", "prepare", "prepublish"]))
    declared = package.get("license")
    license_id = license_id or declared
    require(isinstance(license_id, str) and re.fullmatch(r"[A-Za-z0-9.+-]{1,40}", license_id)
            and (declared is None or license_id == declared))
    id = manifest["id"]
    record = {"id": id, "version": manifest["version"], "repo": repo, "license": license_id,
              "readme": f"{id}.md", "status": "preview", "release": None}
    candidate = {"schema": 1, "state": "unsigned-unreviewed-candidate", "id": id, "version": manifest["version"],
                 "archive": {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)},
                 "protocol": 1, "detectedRuntime": runtime,
                 "source": {"repo": repo, "commit": commit, "license": license_id},
                 "platforms": [], "nativeQA": "not-established", "signable": False}
    out = Path(output).absolute()
    require(all(not p.is_symlink() for p in [out, *out.parents]))
    out.mkdir(parents=True, exist_ok=False)
    files = {f"registry/plugins/{id}.json": json.dumps(record, indent=2).encode() + b"\n",
             f"registry/readmes/{id}.md": selected["README.md"],
             "candidate.json": json.dumps(candidate, indent=2).encode() + b"\n",
             "manifest.json": selected["manifest.json"], "LICENSE": selected["LICENSE"],
             f"{id}.zdx": data,
             "PR.md": b"Unsigned candidate only. Copy the per-plugin record and README into a PR targeting dev.\nAttach candidate.json and identify the immutable archive/source commit for maintainer review.\nDo not commit private data, auto-publish, or claim tested platforms. Existing records require review, not blind replacement.\nNative full-manifest/SDK validation, source and licence review, platform QA, offline signing and publication remain separate.\n"}
    for name, content in files.items():
        file = out / name
        file.parent.mkdir(parents=True, exist_ok=True)
        with file.open("xb") as stream:
            stream.write(content)
    return candidate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--commit", required=True)
    parser.add_argument("--license", default=None)
    parser.add_argument("--source-root")
    args = parser.parse_args()
    try:
        prepare(args.archive, args.output, args.repo, args.commit, args.license or None, args.source_root)
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError, RecursionError, struct.error):
        parser.exit(1, "Submission rejected. No plugin code executed. See docs/submissions.md.\n")
    print("Unsigned submission bundle prepared. Nothing signed, published, installed or enabled.")


if __name__ == "__main__":
    main()
