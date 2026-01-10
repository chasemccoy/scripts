---
name: optimize-video
description: Optimize videos for web playback using FFmpeg. Converts videos to H.264/AAC format with efficient compression and fast-start capability. Use when user asks to optimize, compress, or convert videos for web use.
allowed-tools: Bash
---

# Optimize Video for Web

Optimize videos for web playback using FFmpeg. Converts videos to H.264 with AAC audio, optimized for fast online streaming with good quality and efficient file size.

## Dependencies

This skill requires FFmpeg to be installed. Check if FFmpeg is available:

```bash
ffmpeg -version
```

If not installed, install via Homebrew:

```bash
brew install ffmpeg
```

## Usage

### Basic optimization

```bash
bash ~/Repositories/scripts/skills/optimize-video/optimize.sh input.mp4 output.mp4
```

### Using the function directly

You can also invoke the FFmpeg command directly:

```bash
ffmpeg -i input.mp4 -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k -movflags +faststart output.mp4
```

## What it does

The optimization process:

1. **Video codec (H.264)**: Uses `libx264` encoder, widely supported for web playback
2. **Encoding speed**: `fast` preset balances encoding time with compression efficiency
3. **Quality (CRF 22)**: Constant Rate Factor of 22 provides good balance between quality and file size (lower = better quality, larger file; higher = lower quality, smaller file)
4. **Audio codec (AAC)**: Universal format for web and mobile
5. **Audio bitrate (128 kbps)**: Good audio quality with moderate file size
6. **Fast start**: `+faststart` flag moves metadata to file beginning, enabling streaming to start before full download

## Parameters explained

- `-c:v libx264`: Video codec (H.264)
- `-preset fast`: Encoding speed preset
- `-crf 22`: Quality level (18-28 typical range)
- `-c:a aac`: Audio codec
- `-b:a 128k`: Audio bitrate
- `-movflags +faststart`: Enable fast streaming start

## Customization

Adjust CRF for different quality/size tradeoffs:
- **CRF 18-20**: Higher quality, larger files
- **CRF 22-23**: Balanced (recommended)
- **CRF 24-28**: Smaller files, lower quality

Adjust preset for speed/compression tradeoff:
- `ultrafast`, `superfast`, `veryfast`: Faster encoding, larger files
- `fast`: Good balance (recommended)
- `medium`, `slow`, `slower`: Better compression, slower encoding

## Notes

- Input can be any video format FFmpeg supports (mp4, mov, avi, mkv, etc.)
- Output should be .mp4 for best web compatibility
- Processing time depends on video length and your machine's capabilities
- The script will overwrite the output file if it exists
