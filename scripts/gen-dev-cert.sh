#!/usr/bin/env bash
# Generate a self-signed TLS cert for LAN dev so the video call page runs in a
# secure context (browsers only expose camera/mic over HTTPS or localhost).
#
# The cert lists your LAN IP (+ localhost) in its SAN so the TLS handshake
# succeeds when devices connect by IP. It's self-signed, so each device shows a
# one-time "not private" warning to click through — that's expected.
#
# Usage:
#   ./scripts/gen-dev-cert.sh            # auto-detect LAN IP (en0, then en1)
#   ./scripts/gen-dev-cert.sh 192.168.1.42   # or pass the IP explicitly
#
# Re-run it whenever your LAN IP changes (new network), then restart:
#   docker compose up
set -euo pipefail

cd "$(dirname "$0")/.."

IP="${1:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)}"
if [ -z "${IP:-}" ]; then
  echo "Could not auto-detect your LAN IP. Pass it explicitly:" >&2
  echo "  ./scripts/gen-dev-cert.sh <your-lan-ip>" >&2
  exit 1
fi

mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/key.pem -out certs/cert.pem -days 365 \
  -subj "/CN=mediflow-dev" \
  -addext "subjectAltName=IP:${IP},IP:127.0.0.1,DNS:localhost" >/dev/null 2>&1

echo "Generated certs/cert.pem for IP ${IP} (+ localhost)."
echo "Now run:  docker compose up"
echo "Then open on each device:  https://${IP}/"
