---
name: youtube-transcript
description: Extract transcripts from YouTube videos. Use when the user asks for a transcript, subtitles, or captions of a YouTube video and provides a YouTube URL (youtube.com/watch?v=, youtu.be/, or similar). Supports output with or without timestamps.
allowed-tools: Bash, Write
---

# YouTube Transcript

Extract transcripts from YouTube videos using the youtube-transcript package.

## Dependencies

This skill requires Node.js dependencies to be installed. If not already installed, run:

```bash
cd ~/Repositories/scripts/skills/youtube-transcript && npm install
```

The agent can install these dependencies automatically when needed.

## Usage

Run the script with a YouTube URL or video ID:

```bash
node scripts/get_transcript.js "VIDEO_URL_OR_ID"
```

Without timestamps:

```bash
node scripts/get_transcript.js "VIDEO_URL_OR_ID" --no-timestamps
```

Raw text (without cleaning):

```bash
node scripts/get_transcript.js "VIDEO_URL_OR_ID" --raw
```

Raw text without timestamps:

```bash
node scripts/get_transcript.js "VIDEO_URL_OR_ID" --no-timestamps --raw
```

## Defaults

- **With timestamps** (default): `[MM:SS] text` format (or `[HH:MM:SS]` for longer videos)
- **Without timestamps**: Plain text, one line per caption segment
- **Clean text** (default): Decodes HTML entities, joins broken lines into proper paragraphs
- **Raw text** (`--raw` flag): Includes HTML entities and original line breaks

## Supported URL Formats

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://youtube.com/embed/VIDEO_ID`
- Raw video ID (11 characters)

## Output

- CRITICAL: YOU MUST NEVER MODIFY THE RETURNED TRANSCRIPT
- If the transcript is without timestamps, you SHOULD clean it up so that it is arranged by complete paragraphs and the lines don't cut in the middle of sentences.
- If you were asked to save the transcript to a specific file, save it to the requested file.
- If no output file was specified, use the YouTube video ID with a `-transcript.txt` suffix.

## Notes

- Fetches auto-generated or manually added captions (whichever is available)
- Requires the video to have captions enabled
- Falls back to auto-generated captions if manual ones aren't available
