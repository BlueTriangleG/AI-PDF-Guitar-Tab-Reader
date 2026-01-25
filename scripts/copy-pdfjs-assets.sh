#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PUBLIC_DIR="$ROOT_DIR/src/renderer/public/pdfjs"
SRC_DIR="$ROOT_DIR/node_modules/pdfjs-dist"

if [ ! -d "$SRC_DIR" ]; then
  echo "pdfjs-dist not installed yet. Run npm install first."
  exit 1
fi

mkdir -p "$PUBLIC_DIR"
rm -rf "$PUBLIC_DIR/cmaps" "$PUBLIC_DIR/standard_fonts"
cp -R "$SRC_DIR/cmaps" "$PUBLIC_DIR/"
cp -R "$SRC_DIR/standard_fonts" "$PUBLIC_DIR/"

echo "Copied PDF.js assets to $PUBLIC_DIR"
