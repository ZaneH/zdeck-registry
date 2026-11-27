import io
import json
from pathlib import Path
import stat
import struct
import sys
import tempfile
import unittest
import warnings
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from submission import inspect_archive, prepare, public_url


def archive(extra=None, entries=None):
    files = [("manifest.json", json.dumps({"id": "fixture", "version": "1.2.3", "protocolVersion": 1})),
             ("main.js", "throw Error('must never run')"), ("node_modules/@zdeck/plugin-sdk/index.js", "throw Error('must never run')"),
             ("README.md", "# Fixture only"), ("LICENSE", "MIT fixture"), ("package.json", '{"license":"MIT"}')]
    data = io.BytesIO()
    with warnings.catch_warnings(), zipfile.ZipFile(data, "w") as z:
        warnings.simplefilter("ignore", UserWarning)  # Deliberately duplicate hostile fixture names.
        for name, value in (entries if entries is not None else files + (extra or [])):
            z.writestr(name, value)
    return data.getvalue()


class SubmissionTests(unittest.TestCase):
    def test_bundle_identity_digest_optional_metadata_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            source = root / "fixture.zdx"
            source.write_bytes(archive())
            out = root / "out"
            candidate = prepare(source, out, "https://github.com/example/fixture", "a" * 40, root=root)
            record = json.loads((out / "registry/plugins/fixture.json").read_text())
            self.assertEqual(record["status"], "preview")
            self.assertIsNone(record["release"])
            self.assertNotIn("platforms", record)
            self.assertNotIn("runtime", record)
            self.assertNotIn("author", record)
            self.assertFalse(candidate["signable"])
            self.assertEqual(candidate["platforms"], [])
            self.assertEqual((out / "fixture.zdx").read_bytes(), source.read_bytes())
            with self.assertRaises(FileExistsError):
                prepare(source, out, "https://github.com/example/fixture", "a" * 40)
            for kwargs in [dict(commit="dev"), dict(repo="https://127.0.0.1/x"), dict(license_id="Other")]:
                args = dict(repo="https://github.com/example/fixture", commit="a" * 40)
                args.update(kwargs)
                with self.assertRaises(ValueError):
                    prepare(source, root / "bad", **args)
                self.assertFalse((root / "bad").exists())

    def test_no_source_escape_or_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / "input").mkdir()
            source = root / "fixture.zdx"
            source.write_bytes(archive())
            (root / "input/link.zdx").symlink_to(source)
            for file in [source, root / "input/../fixture.zdx", root / "input/link.zdx"]:
                with self.assertRaises(ValueError):
                    prepare(file, root / "out", "https://github.com/example/fixture", "a" * 40, root=root / "input")

    def test_portable_paths_duplicates_aliases_links_and_extras(self):
        for name in ["../escape", "/escape", "C:/escape", "back\\slash", "foo/../../escape", "aux.txt", "trailing.", "MAIN.JS", "main.js/child", "README.md", "foo/Bar", "foo/bar"]:
            with self.subTest(name=name), self.assertRaises(ValueError):
                extras = [(name, "bad")]
                if name.startswith("foo/") and "escape" not in name:
                    extras = [("foo/BAR", "first"), (name, "alias")]
                inspect_archive(archive(extras))
        symlink = zipfile.ZipInfo("link")
        symlink.create_system = 3
        symlink.external_attr = (stat.S_IFLNK | 0o777) << 16
        extra = zipfile.ZipInfo("extra")
        extra.extra = b"\x00\x00\x00\x00"
        for entry in [symlink, extra]:
            with self.assertRaises(ValueError):
                inspect_archive(archive([(entry, "target")]))

    def test_hidden_data_crc_local_header_and_size_limits(self):
        original = archive()
        bad_header = bytearray(original)
        struct.pack_into("<I", bad_header, 14, 0)
        bad_count = bytearray(original)
        struct.pack_into("<HH", bad_count, len(bad_count) - 14, 1, 1)
        for data in [b"prefix" + original, original + b"suffix", bytes(bad_header), bytes(bad_count), b"PK\x03\x04", archive([("huge", b"x" * (8 * 1024 * 1024 + 1))])]:

            with self.assertRaises((ValueError, zipfile.BadZipFile)):
                inspect_archive(data)
        corrupt = bytearray(original)
        corrupt[50] ^= 1
        with self.assertRaises((ValueError, zipfile.BadZipFile)):
            inspect_archive(corrupt)

    def test_invalid_manifest_and_missing_root_metadata(self):
        for value in [b'{"id":"fixture","id":"other","version":"1.2.3","protocolVersion":1}', b'{}', b'{"id":"../escape","version":"1.2.3","protocolVersion":1}', '{"id":"fixture","version":"١.2.3","protocolVersion":1}'.encode() ]:
            with self.assertRaises(ValueError):
                inspect_archive(archive(entries=[("manifest.json", value), ("main.js", "x"), ("README.md", "x"), ("LICENSE", "x"), ("node_modules/@zdeck/plugin-sdk/index.js", "x")]))
        with self.assertRaises(ValueError):
            inspect_archive(archive(entries=[("wrapper/manifest.json", "{}")]))

    def test_url_claims_never_allow_fetch_instructions(self):
        for value in ["http://github.com/a", "https://user:pass@github.com/a", "https://127.0.0.1/a", "https://[::1]/a", "https://evil.local/a", "https://github.com:443/a", "https://github.com/a?x", "https://github.com/a#x", "https://github.com\\evil/a", "file:///tmp/a", "https://github.com/a\n"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                public_url(value)


if __name__ == "__main__":
    unittest.main()
