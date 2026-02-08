<p align="center">
  <img src="logo.png" alt="MCP Audio Extractor" width="200" height="200">
</p>

# MCP Audio Extractor

A Model Context Protocol (MCP) server that extracts audio from video URLs using yt-dlp. Supports YouTube, Bilibili, and 1000+ other sites.

## Features

- Extract audio from YouTube, Bilibili, and other video platforms
- Multiple output formats: MP3, M4A, AAC, OPUS, WAV, FLAC
- Best audio quality extraction
- Bilibili authentication support via SESSDATA cookie

## Prerequisites

Before using this MCP server, ensure you have:

1. **Node.js** >= 18.0.0
2. **yt-dlp** installed and available in PATH
   ```bash
   # Windows (with winget)
   winget install yt-dlp

   # macOS (with Homebrew)
   brew install yt-dlp

   # Linux
   sudo apt install yt-dlp  # or use pip: pip install yt-dlp
   ```
3. **ffmpeg** installed and available in PATH (for audio format conversion)
   ```bash
   # Windows (with winget)
   winget install ffmpeg

   # macOS (with Homebrew)
   brew install ffmpeg

   # Linux
   sudo apt install ffmpeg
   ```

## Installation

### For Cline / Claude Desktop

Add to your MCP settings configuration:

```json
{
  "mcpServers": {
    "audio-extractor": {
      "command": "npx",
      "args": ["-y", "mcp-audio-extractor"],
      "env": {
        "BILIBILI_SESSDATA": "your_sessdata_here"
      }
    }
  }
}
```

Or if you prefer to clone and run locally:

```json
{
  "mcpServers": {
    "audio-extractor": {
      "command": "npx",
      "args": ["tsx", "src/server/index.ts"],
      "cwd": "/path/to/mcp-audio-extractor",
      "env": {
        "BILIBILI_SESSDATA": "your_sessdata_here"
      }
    }
  }
}
```

### Manual Installation

```bash
git clone https://github.com/yamslin007/mcp-audio-video--extractor.git
cd mcp-audio-video--extractor
npm install
npm run build
```

## Available Tools

### `extract_audio`

Extract audio from a video URL and save as an audio file.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | - | Video URL (YouTube, Bilibili, etc.) |
| `format` | string | No | `"mp3"` | Audio format: `mp3`, `m4a`, `aac`, `opus`, `wav`, `flac` |
| `output_dir` | string | No | `"./output"` | Output directory for audio files |

**Example Usage:**

```
Extract the audio from this YouTube video as MP3: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

**Response:**

```
Successfully extracted audio!

File: ./output/Never Gonna Give You Up.mp3
Format: mp3
Duration: 3:32
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BILIBILI_SESSDATA` | (Optional) Bilibili authentication cookie for accessing member-only videos |

### Getting Bilibili SESSDATA

1. Log in to bilibili.com in your browser
2. Open Developer Tools (F12)
3. Go to Application > Cookies > bilibili.com
4. Find and copy the `SESSDATA` value

## Development

```bash
# Run server in development mode
npm run server

# Run with client for testing
npm run client

# Build for production
npm run build
```

## Supported Sites

This server uses yt-dlp, which supports 1000+ sites including:

- YouTube
- Bilibili
- Twitter/X
- TikTok
- Vimeo
- SoundCloud
- And many more...

See the full list: https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md

## License

MIT
