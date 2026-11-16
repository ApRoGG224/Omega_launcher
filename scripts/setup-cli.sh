#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
CLI_PATH="$BIN_DIR/omega"

mkdir -p "$BIN_DIR"

cat << 'EOF' > "$CLI_PATH"
#!/usr/bin/env bash
PROJECT_DIR="/home/bogdan/Документи/Omega_launcher"

cd "$PROJECT_DIR" && exec npm run tauri dev -- "$@"
EOF

chmod +x "$CLI_PATH"
echo "✅ Installed 'omega' command (running npm run tauri dev) to $CLI_PATH"
