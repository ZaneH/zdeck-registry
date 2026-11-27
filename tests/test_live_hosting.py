import hashlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from live_hosting import get, run, validate


class LiveHostingTests(unittest.TestCase):
    def test_exact_positive_release(self):
        body = b"fixture only"
        headers = {"content-type": "application/zip", "x-content-type-options": "nosniff", "cache-control": "public, immutable, no-transform"}
        validate(200, headers, body, 200, "application/zip", hashlib.sha256(body).hexdigest())
        for status, changes, digest in [(302, {"location": "/elsewhere"}, None), (200, {"content-encoding": "gzip"}, None), (200, {"content-type": "text/html"}, None), (200, {}, "a" * 64), (200, {"cache-control": "no-cache"}, hashlib.sha256(body).hexdigest())]:
            with self.assertRaises(ValueError):
                validate(status, {**headers, **changes}, body, 200, "application/zip", digest)

    def test_probe_caps_and_private_dns_fail_before_fetch(self):
        with patch("live_hosting.socket.getaddrinfo", return_value=[(None, None, None, None, ("127.0.0.1", 443))]), patch("live_hosting.get") as fetch:
            with self.assertRaises(ValueError):
                run()
            fetch.assert_not_called()
        with patch("live_hosting.PinnedHTTPS") as connection:
            response = connection.return_value.getresponse.return_value
            response.getheaders.return_value = []
            response.read1.return_value = b"a" * 11
            with self.assertRaises(ValueError):
                get("1.1.1.1", "/healthz", 10)
            connection.return_value.close.assert_called_once()
        for path in ["https://other.test/", "/foo?bar", "/foo#bar", "/foo\\\\bar", "/foo\\r\\n"]:
            with self.assertRaises(ValueError):
                get("1.1.1.1", path, 10)

    def test_negative_not_spa_or_cached_immutable(self):
        headers = {"x-content-type-options": "nosniff", "cache-control": "no-store, no-transform"}
        validate(404, headers, b"missing", 404)
        for status, changes in [(200, {}), (404, {"location": "/"}), (404, {"cache-control": "immutable"}), (404, {"cache-control": "no-cache"}), (404, {"x-content-type-options": ""})]:
            with self.assertRaises(ValueError):
                validate(status, {**headers, **changes}, b"missing", 404)


if __name__ == "__main__":
    unittest.main()
