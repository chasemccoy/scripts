#!/bin/bash

# Optimize video for web playback
# Usage: ./optimize.sh input.mp4 output.mp4

set -e

if [ $# -lt 2 ]; then
  echo "Usage: $0 <input-video> <output-video>"
  echo ""
  echo "Example: $0 input.mp4 output.mp4"
  exit 1
fi

INPUT="$1"
OUTPUT="$2"

if [ ! -f "$INPUT" ]; then
  echo "Error: Input file '$INPUT' not found"
  exit 1
fi

echo "Optimizing video for web..."
echo "Input: $INPUT"
echo "Output: $OUTPUT"
echo ""

ffmpeg -i "$INPUT" \
  -c:v libx264 \
  -preset fast \
  -crf 22 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  "$OUTPUT"

echo ""
echo "Optimization complete!"
echo "Output saved to: $OUTPUT"

# Show file size comparison
if command -v du &> /dev/null; then
  INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
  OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)
  echo ""
  echo "Original size: $INPUT_SIZE"
  echo "Optimized size: $OUTPUT_SIZE"
fi
