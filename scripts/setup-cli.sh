#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
CLI_PATH="$BIN_DIR/omega"

mkdir -p "$BIN_DIR"

cat << 'EOF' > "$CLI_PATH"
#!/usr/bin/env bash
PROJECT_DIR="/home/bogdan/Документи/Omega_launcher"

# Supported options:
#   omega                    -> Default: runs with hardware compositing and native DMABUF (optimal for Intel/Mesa)
#   omega --no-compositing   -> Sets WEBKIT_DISABLE_COMPOSITING_MODE=1 (disables WebKitGTK compositing mode)
#   omega --no-dmabuf        -> Sets WEBKIT_DISABLE_DMABUF_RENDERER=1

ARGS=()
for arg in "$@"; do
  case "$arg" in
    --no-compositing|--disable-compositing|-nc)
      export WEBKIT_DISABLE_COMPOSITING_MODE=1
      echo "⚡ [omega] Starting with WEBKIT_DISABLE_COMPOSITING_MODE=1 (Compositing Disabled)"
      ;;
    --no-dmabuf|--disable-dmabuf)
      export WEBKIT_DISABLE_DMABUF_RENDERER=1
      echo "⚡ [omega] Starting with WEBKIT_DISABLE_DMABUF_RENDERER=1 (DMABUF Disabled)"
      ;;
    *)
      ARGS+=("$arg")
      ;;
  esac
done

cd "$PROJECT_DIR" && exec npm run tauri dev -- "${ARGS[@]}"
EOF

chmod +x "$CLI_PATH"
echo "✅ Installed 'omega' command (running npm run tauri dev) to $CLI_PATH"
