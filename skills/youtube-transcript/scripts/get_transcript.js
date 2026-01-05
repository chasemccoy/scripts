#!/usr/bin/env node

/**
 * Extract transcript from a YouTube video.
 *
 * Usage:
 *   node scripts/get_transcript.js <video_id_or_url> [--no-timestamps] [--raw]
 */

const { YoutubeTranscript } = require('youtube-transcript-plus');

function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
  };

  // First handle named entities
  text = text.replace(/&\w+;/g, (entity) => {
    return entities[entity] || entity;
  });

  // Then handle numeric entities like &#39; or &#x27;
  text = text.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(dec);
  });

  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return text;
}

function cleanText(text) {
  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Split into lines
  const lines = text.split('\n');

  // Join lines into paragraphs
  const paragraphs = [];
  let currentParagraph = '';
  let lastTimestamp = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Extract timestamp if present
    const timestampMatch = trimmedLine.match(/^\[(\d{1,2}:\d{2}(:\d{2})?)\]/);
    const hasSpeakerMarker = trimmedLine.startsWith('>>');

    // Remove timestamp for text processing
    const textWithoutTimestamp = trimmedLine.replace(/^\[\d{1,2}:\d{2}(:\d{2})?\]\s*/, '');

    // Start new paragraph on speaker changes or special markers
    if (hasSpeakerMarker || textWithoutTimestamp.startsWith('[applause]')) {
      if (currentParagraph) {
        paragraphs.push(currentParagraph);
        currentParagraph = '';
      }
      lastTimestamp = timestampMatch ? timestampMatch[1] : lastTimestamp;
      currentParagraph = (lastTimestamp ? `[${lastTimestamp}] ` : '') + textWithoutTimestamp;
    } else {
      // Continue building the paragraph
      if (currentParagraph) {
        currentParagraph += ' ' + textWithoutTimestamp;
      } else {
        lastTimestamp = timestampMatch ? timestampMatch[1] : lastTimestamp;
        currentParagraph = (lastTimestamp ? `[${lastTimestamp}] ` : '') + textWithoutTimestamp;
      }
    }
  }

  // Add the last paragraph
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  // Clean up extra whitespace and return
  return paragraphs
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0)
    .join('\n\n');
}

function extractVideoId(urlOrId) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match) {
      return match[1];
    }
  }

  throw new Error(`Could not extract video ID from: ${urlOrId}`);
}

function formatTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function getTranscript(videoId, withTimestamps = false) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);

  if (withTimestamps) {
    return transcript
      .map(snippet => `[${formatTimestamp(snippet.offset)}] ${snippet.text}`)
      .join('\n');
  } else {
    return transcript
      .map(snippet => snippet.text)
      .join('\n');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node get_transcript.js <video_id_or_url> [--no-timestamps] [--raw]');
    process.exit(1);
  }

  const videoInput = args[0];
  const withTimestamps = !args.includes('--no-timestamps');
  const shouldClean = !args.includes('--raw');

  try {
    const videoId = extractVideoId(videoInput);
    let transcript = await getTranscript(videoId, withTimestamps);

    if (shouldClean) {
      transcript = cleanText(transcript);
    }

    console.log(transcript);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
