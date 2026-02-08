import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { extractAudio } from "./audio.js";

const server = new McpServer({
  name: "audio-extractor",
  version: "1.0.0",
});

// Tool: extract_audio
server.tool(
  "extract_audio",
  "Extract audio from a video URL and save as audio file. Supports YouTube, Bilibili, and other sites supported by yt-dlp.",
  {
    url: z.string().url().describe("Video URL (YouTube, Bilibili, etc.)"),
    format: z.enum(["mp3", "m4a", "aac", "opus", "wav", "flac"]).default("mp3").describe("Audio format (default: mp3)"),
    output_dir: z.string().default("./output").describe("Output directory for audio files"),
  },
  async ({ url, format, output_dir }) => {
    const result = await extractAudio(url, format, output_dir);

    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: `Successfully extracted audio!\n\nFile: ${result.filePath}\nFormat: ${result.format}\nDuration: ${result.duration}`,
          },
        ],
      };
    } else {
      return {
        content: [{ type: "text", text: `Error: ${result.error}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Audio Extractor Server running on stdio");
}

main().catch(console.error);
