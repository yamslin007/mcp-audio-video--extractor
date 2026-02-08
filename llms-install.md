# LLM Installation Guide for MCP Audio Extractor

This guide helps AI assistants (like Cline) install and configure the MCP Audio Extractor server.

## Prerequisites Check

Before installing, verify these dependencies are available:

```bash
# Check yt-dlp
yt-dlp --version

# Check ffmpeg
ffmpeg -version

# Check Node.js version (must be >= 18)
node --version
```

If any are missing, install them:
- **yt-dlp**: `winget install yt-dlp` (Windows) or `brew install yt-dlp` (macOS)
- **ffmpeg**: `winget install ffmpeg` (Windows) or `brew install ffmpeg` (macOS)

## MCP Configuration

Add the following to the MCP settings file:

### For Cline (VS Code Extension)

Edit the MCP settings in Cline's configuration:

```json
{
  "mcpServers": {
    "audio-extractor": {
      "command": "npx",
      "args": ["-y", "mcp-audio-extractor"]
    }
  }
}
```

### For Claude Desktop

Edit `claude_desktop_config.json`:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "audio-extractor": {
      "command": "npx",
      "args": ["-y", "mcp-audio-extractor"]
    }
  }
}
```

## Verification

After configuration, the `extract_audio` tool should be available with these parameters:
- `url` (required): Video URL
- `format` (optional): mp3, m4a, aac, opus, wav, flac (default: mp3)
- `output_dir` (optional): Output directory (default: ./output)

## Troubleshooting

1. **"yt-dlp not found"**: Install yt-dlp and ensure it's in PATH
2. **"ffmpeg not found"**: Install ffmpeg for audio format conversion
3. **Permission errors**: Ensure output directory is writable
