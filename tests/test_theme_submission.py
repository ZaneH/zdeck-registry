import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from theme_submission import DIMENSIONS, inspect_preview, prepare


def png(width, height):
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload))
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress((b"\0" + b"\0" * width * 3) * height))
            + chunk(b"IEND", b""))


class ThemeSubmissionTests(unittest.TestCase):
    def inputs(self, root, metadata=None):
        metadata = metadata if metadata is not None else {"id": "test-theme", "name": "Test theme", "summary": "Fixture only.",
                                                        "author": "Example", "license": "MIT", "tags": ["terminal"]}
        (root / "metadata.json").write_text(json.dumps(metadata))
        (root / "README.md").write_text("# Test theme\nA test fixture, not a real theme.\n")
        for view, dimensions in DIMENSIONS.items():
            (root / f"{view}.png").write_bytes(png(*dimensions))
        return dict(metadata=root / "metadata.json", readme=root / "README.md", desktop_preview=root / "desktop.png",
                    phone_preview=root / "phone.png", output=root / "out", repo="https://github.com/example/theme",
                    commit="a" * 40, root=root)

    def test_prepares_local_source_preview_without_package_or_install_claim(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            args = self.inputs(root)
            candidate = prepare(**args)
            out = root / "out"
            record = json.loads((out / "registry/themes/test-theme.json").read_text())
            self.assertEqual(record["kind"], "source-preview")
            self.assertEqual(record["sourceCommit"], "a" * 40)
            self.assertEqual(record["preview"]["fixture"], "zdeck-sample-deck-1")
            self.assertEqual(record["preview"]["phone"]["src"], "previews/test-theme/phone.png")
            for field in ["release", "runtime", "builtin", "provenance", "status"]:
                self.assertNotIn(field, record)
            self.assertFalse(candidate["installable"])
            self.assertFalse(candidate["signable"])
            self.assertEqual(candidate["evidence"]["desktop"]["width"], 1200)
            self.assertEqual((out / "registry/previews/test-theme/phone.png").read_bytes(), (root / "phone.png").read_bytes())
            self.assertEqual((out / "registry/theme-readmes/test-theme.md").read_bytes(), (root / "README.md").read_bytes())
            self.assertFalse(list(out.rglob("*.zdx")))
            with self.assertRaises(FileExistsError):
                prepare(**args)

    def test_rejects_invalid_or_privileged_metadata_before_creating_output(self):
        cases = [{"id": "../escape"}, {"license": ""}, {"name": "bad\nname"}, {"summary": "x" * 201},
                 {"tags": ["a", "a"]}, {"tags": ["url(x)"]}, {"tags": [{}]}, {"author": "\ud800"},
                 {"release": {}}, {"builtin": "glass"}, {"kind": "built-in"}, {"provenance": {"kind": "official"}}]
        for patch in cases:
            with self.subTest(patch=patch), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve()
                args = self.inputs(root)
                meta = json.loads((root / "metadata.json").read_text())
                (root / "metadata.json").write_text(json.dumps({**meta, **patch}))
                with self.assertRaises(ValueError):
                    prepare(**args)
                self.assertFalse((root / "out").exists())

    def test_rejects_duplicate_json_unsafe_source_and_oversized_readme(self):
        for mode in ["duplicate", "commit", "repo", "readme"]:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp).resolve()
                args = self.inputs(root)
                if mode == "duplicate":
                    (root / "metadata.json").write_text('{"id":"test-theme","id":"other"}')
                elif mode == "commit":
                    args["commit"] = "dev"
                elif mode == "repo":
                    args["repo"] = "https://127.0.0.1/theme"
                else:
                    (root / "README.md").write_bytes(b"x" * 65537)
                with self.assertRaises(ValueError):
                    prepare(**args)
                self.assertFalse((root / "out").exists())

    def test_png_dimensions_structure_crc_truncation_trailing_and_size_limits(self):
        valid = png(390, 844)
        inspect_preview(valid, (390, 844))
        for data in [png(960, 680), b"<svg/>", valid[:32], valid[:-12], valid + b"trailing",
                     valid[:40] + bytes([valid[40] ^ 1]) + valid[41:], b"x" * (2 * 1024 * 1024 + 1)]:
            with self.subTest(length=len(data)), self.assertRaises(ValueError):
                inspect_preview(data, (390, 844))

    def test_symlink_and_source_root_escape_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            args = self.inputs(root)
            (root / "link.png").symlink_to(root / "phone.png")
            args["phone_preview"] = root / "link.png"
            with self.assertRaises(ValueError):
                prepare(**args)
            args["phone_preview"] = root / "phone.png"
            args["root"] = root / "elsewhere"
            with self.assertRaises(ValueError):
                prepare(**args)
            self.assertFalse((root / "out").exists())

    def test_cli_has_explicit_source_preview_result(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            args = self.inputs(root)
            command = [sys.executable, "-B", str(Path(__file__).resolve().parents[1] / "scripts/theme_submission.py")]
            for key, value in args.items():
                command += ["--source-root" if key == "root" else f"--{key.replace('_', '-')}", str(value)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Nothing signed, uploaded, published or installed", result.stdout)
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 1)


if __name__ == "__main__":
    unittest.main()
