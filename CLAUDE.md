# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) learning project with two components:
1. **MCP Server**: Provides video audio extraction tools via yt-dlp
2. **MCP Client**: Kimi K2 LLM-driven client that calls server tools via MCP protocol

## Commands

```bash
# Install dependencies
npm install

# Run MCP server standalone (for manual JSON-RPC testing via stdin)
npx tsx src/server/index.ts

# Run full client (auto-spawns server as subprocess)
npx tsx src/client/index.ts

# Verify yt-dlp installation
yt-dlp --version
```

## Architecture

```
src/
├── server/
│   ├── index.ts      # MCP server entry - uses McpServer + StdioServerTransport
│   └── audio.ts      # yt-dlp wrapper for audio extraction
├── client/
│   └── index.ts      # MCP client entry - uses Client + StdioClientTransport
└── types.ts          # Shared type definitions
```

**Data Flow:**
```
User Input → Kimi K2 API → tool_calls → MCP Client → MCP Server → yt-dlp → Audio file
                ↑                                        ↓
                └────────── tool results ←───────────────┘
```

## MCP Server Tools

| Tool | Description |
|------|-------------|
| `extract_audio` | Extract audio from video URL to audio file. Params: `url` (required), `format` (default: "mp3", options: mp3/m4a/aac/opus/wav/flac), `output_dir` (default: "./output") |

## Key Implementation Details

### MCP SDK Usage

**Server:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Register tools with: server.tool(name, description, zodSchema, handler)
// Handler returns: { content: [{ type: "text", text: "..." }], isError?: true }
```

**Client:**
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
```

### Kimi K2 API

- Base URL: `https://api.moonshot.cn/v1`
- Model: `kimi-k2-thinking-turbo` (has `reasoning_content` in response)
- Fallback model: `moonshot-v1-auto`
- Uses OpenAI-compatible SDK with `tool_choice: "auto"`

### MCP → OpenAI Tool Format Conversion

```typescript
// MCP format: { name, description, inputSchema: { type, properties, required } }
// OpenAI format: { type: "function", function: { name, description, parameters: {...} } }
```

### Agentic Loop

Loop while `finish_reason === "tool_calls"`, stop when `finish_reason === "stop"`.

## Security Requirements

- Use `child_process.execFile` (NOT `exec`) for yt-dlp calls to prevent command injection
- Pass URL as argument, never concatenate into command string

## yt-dlp Commands

```bash
# Extract audio as MP3
yt-dlp -x --audio-format mp3 --audio-quality 0 -o "output/%(title)s.%(ext)s" "VIDEO_URL"

# Extract audio as M4A (no conversion, faster)
yt-dlp -x --audio-format m4a -o "output/%(title)s.%(ext)s" "VIDEO_URL"
```

## Environment

- Requires `.env` file with `MOONSHOT_API_KEY`
- Optional: `BILIBILI_SESSDATA` for Bilibili authentication
- yt-dlp and ffmpeg must be in system PATH
- Output directory: `./output/` (auto-created)
