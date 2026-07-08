#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/build"

echo "🔨 Building Omega Launcher (Linux AppImage)..."
echo ""


cd "$PROJECT_ROOT"

export WEBKIT_DISABLE_DMABUF_RENDERER=1
export APPIMAGE_EXTRACT_AND_RUN=1
export NO_STRIP=true
npm run tauri build -- --bundles appimage

mkdir -p "$BUILD_DIR"

BUNDLE_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle/appimage"

if [ -d "$BUNDLE_DIR" ]; then
    cp "$BUNDLE_DIR"/*.AppImage "$BUILD_DIR/" 2>/dev/null || true
    echo ""
    echo "✅ Build complete! Files in $BUILD_DIR/:"
    ls -lh "$BUILD_DIR/"
else
    echo "❌ AppImage bundle directory not found at $BUNDLE_DIR"
    exit 1
fi
