#!/bin/bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CLI_DIR="$ROOT_DIR/src/infrastructure/pdf/pdfkit-cli"
OUT_DIR="$CLI_DIR/bin"

mkdir -p "$OUT_DIR"

swiftc \
  -O \
  -framework PDFKit \
  -framework AppKit \
  "$CLI_DIR/PdfKitCli.swift" \
  -o "$OUT_DIR/pdfkit-cli"

echo "Built pdfkit-cli at $OUT_DIR/pdfkit-cli"
