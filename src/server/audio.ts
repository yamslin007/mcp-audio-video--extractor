import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import type { ExtractAudioResult } from "../types.js";

const execFileAsync = promisify(execFile);

export async function extractAudio(
  url: string,
  format: string = "mp3",
  outputDir: string = "./output"
): Promise<ExtractAudioResult> {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Record existing files BEFORE extraction
    const existingFiles = new Set(await fs.readdir(outputDir));

    const outputTemplate = path.join(outputDir, "%(title)s.%(ext)s");

    // Build yt-dlp arguments for audio extraction
    const args = [
      "-x",                    // Extract audio
      "--audio-format", format, // Convert to specified format
      "--audio-quality", "0",  // Best quality
      "-o", outputTemplate,
      "--no-playlist",         // Don't download playlist
      url,
    ];

    // Add cookies for Bilibili if available
    if (url.includes("bilibili.com") || url.includes("b23.tv")) {
      const sessdata = process.env.BILIBILI_SESSDATA;
      if (sessdata) {
        // Create a temporary cookies file for yt-dlp
        const cookieContent = `# Netscape HTTP Cookie File
.bilibili.com\tTRUE\t/\tFALSE\t0\tSESSDATA\t${sessdata}
`;
        const cookiePath = path.join(outputDir, ".cookies.txt");
        await fs.writeFile(cookiePath, cookieContent);
        args.unshift("--cookies", cookiePath);
      }
    }

    const { stdout, stderr } = await execFileAsync("yt-dlp", args, {
      timeout: 300000,  // 5 minutes for audio download
      maxBuffer: 10 * 1024 * 1024,  // 10MB buffer
    });

    const output = stdout + stderr;

    // Find the newly created audio file
    const audioFile = await findNewAudioFile(outputDir, format, existingFiles);
    if (!audioFile) {
      return { success: false, error: "Audio extracted but file not found" };
    }

    // Get audio duration using ffprobe if available
    let duration = "unknown";
    try {
      const { stdout: probeOut } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audioFile,
      ], { timeout: 10000 });
      const seconds = parseFloat(probeOut.trim());
      if (!isNaN(seconds)) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        duration = `${mins}:${secs.toString().padStart(2, "0")}`;
      }
    } catch {
      // ffprobe not available or failed, duration remains "unknown"
    }

    // Clean up temp cookies file
    try {
      await fs.unlink(path.join(outputDir, ".cookies.txt"));
    } catch {
      // Ignore if file doesn't exist
    }

    return {
      success: true,
      filePath: audioFile,
      duration,
      format,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to extract audio: ${message}` };
  }
}

async function findNewAudioFile(
  outputDir: string,
  format: string,
  existingFiles: Set<string>
): Promise<string | null> {
  try {
    const allFiles = await fs.readdir(outputDir);
    // Audio file extensions to look for
    const audioExts = [format, "mp3", "m4a", "aac", "opus", "wav", "flac"];

    // Only consider NEW files (not existing before extraction)
    const newAudioFiles = allFiles.filter((f) => {
      const ext = f.split(".").pop()?.toLowerCase() || "";
      return audioExts.includes(ext) && !existingFiles.has(f);
    });

    if (newAudioFiles.length === 0) {
      return null;
    }

    // Return most recently modified audio file
    const withStats = await Promise.all(
      newAudioFiles.map(async (f) => ({
        name: f,
        mtime: (await fs.stat(path.join(outputDir, f))).mtime,
      }))
    );
    withStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return path.join(outputDir, withStats[0].name);
  } catch {
    return null;
  }
}
