#!/bin/sh
# Copy photos from a folder into src/photos, shrunk to MAX px on the long edge.
# Originals are never modified. Uses macOS's built-in `sips`.
# Usage: npm run add-photos ~/Pictures/portfolio            → singles
#        npm run add-photos ~/Pictures/japan "2026 Japan"  → a series folder
set -eu

MAX=3000
QUALITY=85
SRC="${1:?usage: npm run add-photos <folder>}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/photos${2:+/$2}"

[ -d "$SRC" ] || { echo "error: not a folder: $SRC" >&2; exit 1; }
mkdir -p "$DEST"

added=0
for f in "$SRC"/*; do
  ext="$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')"
  case "$ext" in jpg|jpeg|heic|png|tif|tiff) ;; *) continue ;; esac

  name="$(basename "${f%.*}").jpg"
  if [ -e "$DEST/$name" ]; then echo "skip (already added): $name"; continue; fi

  w="$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')"
  h="$(sips -g pixelHeight "$f" | awk '/pixelHeight/ {print $2}')"
  long=$(( w > h ? w : h ))
  resize=""
  [ "$long" -gt "$MAX" ] && resize="-Z $MAX"   # never upscale

  # shellcheck disable=SC2086
  if sips -s format jpeg -s formatOptions "$QUALITY" $resize "$f" --out "$DEST/$name" >/dev/null; then
    echo "added: $name"
    added=$((added + 1))
  else
    echo "error: failed to convert $f" >&2
  fi
done

echo "$added photo(s) added to $DEST"
