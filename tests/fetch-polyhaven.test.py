import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "plugins/brand-studio/skills/brand-design/scripts/fetch-polyhaven.py"
spec = importlib.util.spec_from_file_location("fetch_polyhaven", SCRIPT)
downloader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(downloader)


class IncludePaths(unittest.TestCase):
    def download(self, out, include):
        files = {"gltf": {"2k": {"gltf": {"url": "https://fixture.invalid/model.gltf", "include": {include: {"url": "https://fixture.invalid/bytes"}}}}}}
        info = {"name": "Fixture", "authors": ["Fixture"]}
        with patch.object(downloader, "get_json", side_effect=[info, files]), \
             patch.object(downloader, "fetch", return_value=b"AUDIT-DUMMY"), \
             patch("urllib.request.urlopen", side_effect=AssertionError("network is forbidden")), \
             contextlib.redirect_stdout(io.StringIO()):
            downloader.get("fixture", "2k", out)

    def test_rejects_include_escapes_without_overwriting(self):
        for kind in ("traversal", "absolute", "symlink"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                base = Path(tmp)
                out = base / "out"
                folder = out / "fixture"
                folder.mkdir(parents=True)
                marker = base / "outside-marker.bin"
                marker.write_bytes(b"ORIGINAL")
                include = "../../outside-marker.bin" if kind == "traversal" else str(marker)
                if kind == "symlink":
                    (folder / "linked").symlink_to(base, target_is_directory=True)
                    include = "linked/outside-marker.bin"
                rejected = False
                try:
                    self.download(out, include)
                except ValueError:
                    rejected = True
                self.assertEqual(marker.read_bytes(), b"ORIGINAL", "provider include overwrote the dummy sibling")
                self.assertTrue(rejected, "provider include escape was accepted")

    def test_accepts_nested_includes(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out"
            self.download(out, "textures/checker.png")
            self.assertEqual((out / "fixture/textures/checker.png").read_bytes(), b"AUDIT-DUMMY")
            self.assertTrue((out / "fixture/model.gltf").is_file())
            self.assertTrue((out / "fixture.json").is_file())


if __name__ == "__main__":
    unittest.main()
