#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Snacky — Wireless Device Development Helper
# ═══════════════════════════════════════════════════════════════════════════════
#
# Detects your Mac's LAN IP, generates apps/mobile/.env.wireless with the
# correct SUPABASE_URL, and starts Metro bound to 0.0.0.0 so a physical
# device on the same WiFi network can connect.
#
# Usage:
#   ./scripts/start-wireless.sh             # generate env + start Metro
#   ./scripts/start-wireless.sh --env-only  # only generate .env.wireless
#
# To build the app pointing at the wireless env:
#   ENVFILE=.env.wireless pnpm ios
#   ENVFILE=.env.wireless pnpm android
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$REPO_ROOT/apps/mobile"
BASE_ENV="$MOBILE_DIR/.env"
WIRELESS_ENV="$MOBILE_DIR/.env.wireless"

ENV_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --env-only) ENV_ONLY=true ;;
    --help|-h)
      printf "Usage: %s [--env-only]\n" "$0"
      printf "  --env-only  Generate .env.wireless without starting Metro\n"
      exit 0
      ;;
    *) printf "Unknown argument: %s\n" "$arg" >&2; exit 1 ;;
  esac
done

# ── Detect LAN IP ────────────────────────────────────────────────────────────

LAN_IP=""
for iface in en0 en1 en2 en3; do
  LAN_IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
  if [[ -n "$LAN_IP" ]]; then
    break
  fi
done

if [[ -z "$LAN_IP" ]]; then
  printf "Error: Could not detect LAN IP. Are you connected to WiFi?\n" >&2
  exit 1
fi

printf "✓ Detected LAN IP: %s\n" "$LAN_IP"

# ── Generate .env.wireless ───────────────────────────────────────────────────

if [[ ! -f "$BASE_ENV" ]]; then
  printf "Error: %s not found. Run 'pnpm setup' first.\n" "$BASE_ENV" >&2
  exit 1
fi

# Copy base .env, replacing SUPABASE_URL with the LAN address
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^SUPABASE_URL= ]]; then
    printf "SUPABASE_URL=http://%s:54321\n" "$LAN_IP"
  else
    printf "%s\n" "$line"
  fi
done < "$BASE_ENV" > "$WIRELESS_ENV"

printf "✓ Generated %s\n" "apps/mobile/.env.wireless"
printf "  SUPABASE_URL=http://%s:54321\n" "$LAN_IP"

if $ENV_ONLY; then
  printf "\nTo build & run:\n"
  printf "  ENVFILE=.env.wireless pnpm ios      # or android\n"
  printf "  pnpm start:wireless                 # Metro on 0.0.0.0\n"
  exit 0
fi

# ── Start Metro on all interfaces ────────────────────────────────────────────

printf "\n→ Starting Metro on 0.0.0.0:8081 …\n"
printf "  Your device should connect to http://%s:8081\n\n" "$LAN_IP"

cd "$MOBILE_DIR"
ENVFILE=.env.wireless npx react-native start --host 0.0.0.0
