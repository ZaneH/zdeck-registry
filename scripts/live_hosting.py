"""Bounded, read-only HTTPS checks for the owned zreg.zaaane.com host. No credentials/proxies."""
import argparse
from datetime import datetime, timezone
import hashlib
import http.client
import ipaddress
import json
from pathlib import Path
import re
import socket
import ssl
import time
from urllib.parse import urlsplit

HOST = "zreg.zaaane.com"
LIMIT = 16 * 1024 * 1024
HEADERS = ["content-type", "content-encoding", "content-length", "location", "cache-control",
           "x-content-type-options", "strict-transport-security", "content-security-policy",
           "x-frame-options", "referrer-policy", "server", "cf-cache-status"]


def check(ok, message):
    if not ok:
        raise ValueError(message)


def validate(status, headers, body, expected, mime=None, digest=None):
    check(status == expected, f"Expected {expected}, got {status}")
    check("location" not in headers, "Unexpected redirect Location")
    check(not headers.get("content-encoding"), "Unexpected content encoding")
    check(headers.get("x-content-type-options") == "nosniff", "Missing nosniff")
    if mime:
        check(headers.get("content-type", "").split(";")[0].strip() == mime, "Incorrect MIME")
    if expected == 404:
        check("immutable" not in headers.get("cache-control", "").lower(), "Immutable negative cache")
        check("no-store" in headers.get("cache-control", "").lower(), "Missing negative no-store")
    if digest:
        check(hashlib.sha256(body).hexdigest() == digest, "Downloaded bytes differ from reviewed local bytes")
        check("immutable" in headers.get("cache-control", "").lower() and "no-transform" in headers.get("cache-control", "").lower(), "Missing immutable/no-transform policy")


class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, address):
        super().__init__(HOST, port=443, timeout=15, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        # Normal TLS/SNI/certificate validation for HOST over the prevalidated public address.
        sock = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(sock, server_hostname=HOST)
        except BaseException:
            sock.close()
            raise


def get(address, path, cap):
    check(path.startswith("/") and not any(c in path for c in "?#\\\r\n"), "Invalid probe path")
    connection = PinnedHTTPS(address)
    try:
        connection.request("GET", path, headers={"Accept-Encoding": "gzip, br", "User-Agent": "zDeck-live-hosting-check/1"})
        response = connection.getresponse()
        headers = {k.lower(): v for k, v in response.getheaders()}
        chunks, size = [], 0
        deadline = time.monotonic() + 50
        while True:
            check(time.monotonic() < deadline, "Response exceeded body deadline")
            chunk = response.read1(min(65536, cap + 1 - size))
            if not chunk:
                break
            size += len(chunk)
            check(size <= cap, "Response exceeds bounded probe size")
            chunks.append(chunk)
        return response.status, headers, b"".join(chunks)
    finally:
        connection.close()


def run(record=None, archive=None):
    addresses = sorted({item[4][0] for item in socket.getaddrinfo(HOST, 443, type=socket.SOCK_STREAM)})
    check(0 < len(addresses) <= 16 and all(ipaddress.ip_address(ip).is_global for ip in addresses), "DNS includes unsupported non-public addresses")
    probes = [("/", 200, "text/html", None, 131072), ("/healthz", 200, "text/plain", hashlib.sha256(b"ok\n").hexdigest(), 1024)]
    missing = ["/releases", "/artifacts", "/releases/invalid.json", "/artifacts/invalid.zdx",
               "/releases/zdeck-hosting-probe-missing/9999.9999.9999.json", "/artifacts/zdeck-hosting-probe-missing/9999.9999.9999.zdx"]
    probes += [(path, 404, None, None, 32768) for path in missing]
    if record:
        check(archive is not None, "--record requires --archive for exact byte comparison")
        check(Path(record).stat().st_size <= 32768, "Local record too large")
        raw = Path(record).read_bytes()
        check(len(raw) <= 32768, "Local record too large")
        import base64
        envelope = json.loads(raw.decode("utf-8"))
        payload = json.loads(base64.b64decode(envelope["payload"], validate=True).decode("utf-8"))
        id, version = payload["id"], payload["version"]
        check(re.fullmatch(r"[a-z][a-z0-9-]{0,63}", id) and re.fullmatch(r"[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}", version), "Invalid record identity")
        url = urlsplit(payload["artifact"]["url"])
        path = f"/artifacts/{id}/{version}.zdx"
        check(url.scheme == "https" and url.netloc == HOST and url.path == path and not url.query and not url.fragment, "Only exact owned-host artifact paths are probed")
        check(Path(archive).stat().st_size <= LIMIT, "Local archive too large")
        data = Path(archive).read_bytes()
        check(len(data) == payload["artifact"]["bytes"] and hashlib.sha256(data).hexdigest() == payload["artifact"]["sha256"], "Local archive differs from local signed facts")
        probes += [(f"/releases/{id}/{version}.json", 200, "application/json", hashlib.sha256(raw).hexdigest(), 32768),
                   (path, 200, "application/zip", hashlib.sha256(data).hexdigest(), len(data))]
    else:
        probes += [("/releases/home-assistant/0.2.0.json", 404, None, None, 32768),
                   ("/artifacts/home-assistant/0.2.0.zdx", 404, None, None, 32768)]
    result = {"checkedAt": datetime.now(timezone.utc).isoformat(), "host": HOST, "dns": addresses,
              "connectedAddress": addresses[0], "checks": [],
              "gaps": ["One pinned DNS answer checked, not every edge/location or installed native handler.",
                       "Local expected record must be independently signature-verified before this serving-only check."]}
    for path, expected, mime, digest, cap in probes:
        item = {"path": path}
        try:
            status, headers, body = get(addresses[0], path, cap)
            item.update(status=status, headers={k: headers[k] for k in HEADERS if k in headers}, bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
            # Health bytes are exact but deliberately not immutable.
            validate(status, headers, body, expected, mime, digest if path != "/healthz" else None)
            if path == "/healthz":
                check(body == b"ok\n", "Unexpected health body")
            if path == "/":
                absent = [name for name in ["strict-transport-security", "content-security-policy", "x-frame-options", "referrer-policy"] if name not in headers]
                if absent:
                    result["gaps"].append("Site security headers absent: " + ", ".join(absent))
            item["ok"] = True
        except (ValueError, OSError, http.client.HTTPException) as error:
            item.update(ok=False, error=str(error))
        result["checks"].append(item)
    if not record:
        result["gaps"].append("No published JSON/ZIP supplied: positive artifact MIME/encoding/digest/immutability remain unverified.")
    result["ok"] = all(item["ok"] for item in result["checks"])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record", help="Previously signature-verified local public envelope")
    parser.add_argument("--archive", help="Corresponding reviewed local .zdx")
    args = parser.parse_args()
    check(args.record is not None or args.archive is None, "--archive requires --record")
    result = run(args.record, args.archive)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["ok"] else 1)


if __name__ == "__main__":
    main()
