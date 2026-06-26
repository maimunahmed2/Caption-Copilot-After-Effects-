#!/usr/bin/env node

/*
transcribe-local-whispercpp.js
Helper for Phrase Caption Pilot v4.

This calls local whisper.cpp and converts the CLI output into CaptionPilot JSON.

Required:
- Node.js 18+
- whisper-cli.exe from whisper.cpp
- ggml model .bin
- ffmpeg.exe recommended/required for mp3/mp4/m4a/etc.

The helper converts input media to 16kHz mono PCM WAV because whisper.cpp CLI commonly expects 16-bit WAV.
Then it runs:
whisper-cli -m model.bin -f converted.wav -ml 1 -l en -t 4
*/

const fs = require("fs");
const path = require("path");
const os = require("os");
const cp = require("child_process");

function getArg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i + 1] || null;
}

function q(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function runCommand(command, options = {}) {
  try {
    return cp.execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 64,
      ...options
    });
  } catch (err) {
    const stdout = err.stdout ? String(err.stdout) : "";
    const stderr = err.stderr ? String(err.stderr) : "";
    throw new Error(`Command failed:\n${command}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
  }
}

function runCommandCombined(command) {
  try {
    return cp.execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 128
    });
  } catch (err) {
    const stdout = err.stdout ? String(err.stdout) : "";
    const stderr = err.stderr ? String(err.stderr) : "";
    // whisper.cpp sometimes writes useful timestamp lines to stdout and progress to stderr.
    // But if command fails, still expose both.
    throw new Error(`Command failed:\n${command}\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
  }
}

function toSeconds(h, m, s) {
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function parseWhisperCppOutput(output) {
  const words = [];
  const lines = String(output).split(/\r?\n/);

  const re = /^\s*\[(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)\s*-->\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)\]\s*(.*?)\s*$/;

  for (const line of lines) {
    const match = line.match(re);
    if (!match) continue;

    const start = toSeconds(match[1], match[2], match[3]);
    const end = toSeconds(match[4], match[5], match[6]);
    let text = (match[7] || "").trim();

    if (!text) continue;

    // whisper.cpp -ml 1 may output punctuation as separate tokens.
    // For captions, punctuation should usually attach to the previous word.
    if (/^[,.;:!?…]+$/.test(text) && words.length > 0) {
      words[words.length - 1].word += text;
      words[words.length - 1].end = Math.max(words[words.length - 1].end, end);
      continue;
    }

    // Remove odd leading markers but keep natural punctuation.
    text = text.replace(/^[-–—]\s*/, "").trim();
    if (!text) continue;

    words.push({ word: text, start, end });
  }

  return words.filter(w => w.word && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start);
}

function convertToWav(request, tempWavPath) {
  const ffmpeg = request.ffmpegPath || "ffmpeg";
  const audio = request.audioPath;

  const command =
    `${q(ffmpeg)} -y -i ${q(audio)} -ar 16000 -ac 1 -c:a pcm_s16le ${q(tempWavPath)}`;

  runCommand(command);
}

async function main() {
  let tempWavPath = null;

  try {
    const requestPath = getArg("--request");
    if (!requestPath) {
      throw new Error("Usage: node transcribe-local-whispercpp.js --request request.json");
    }

    const request = JSON.parse(fs.readFileSync(requestPath, "utf8"));

    if (!request.audioPath) throw new Error("Missing audioPath.");
    if (!request.outputPath) throw new Error("Missing outputPath.");
    if (!request.whisperPath) throw new Error("Missing whisperPath.");
    if (!request.modelPath) throw new Error("Missing modelPath.");

    if (!fs.existsSync(request.audioPath)) throw new Error(`Audio file not found: ${request.audioPath}`);
    if (!fs.existsSync(request.whisperPath)) throw new Error(`whisper-cli not found: ${request.whisperPath}`);
    if (!fs.existsSync(request.modelPath)) throw new Error(`Model file not found: ${request.modelPath}`);

    const tempName = `captionpilot_${Date.now()}_${Math.random().toString(16).slice(2)}.wav`;
    tempWavPath = path.join(os.tmpdir(), tempName);

    convertToWav(request, tempWavPath);

    const threads = Number.isFinite(Number(request.threads)) ? Number(request.threads) : 4;
    const language = request.language && String(request.language).trim() ? String(request.language).trim() : "en";

    const whisperCommand =
      `${q(request.whisperPath)} ` +
      `-m ${q(request.modelPath)} ` +
      `-f ${q(tempWavPath)} ` +
      `-ml 1 ` +
      `-l ${language} ` +
      `-t ${threads}`;

    const output = runCommandCombined(whisperCommand);
    const words = parseWhisperCppOutput(output);

    if (!words.length) {
      throw new Error(
        "No word timestamps parsed from whisper.cpp output.\n\n" +
        "Try a clearer WAV file, check that whisper-cli runs manually, or use a newer whisper.cpp build."
      );
    }

    const normalized = {
      source: "local-whisper.cpp",
      createdAt: new Date().toISOString(),
      audioPath: request.audioPath,
      language,
      text: words.map(w => w.word).join(" "),
      words
    };

    fs.writeFileSync(request.outputPath, JSON.stringify(normalized, null, 2), "utf8");

    console.log("CAPTIONPILOT_OK");
    console.log(JSON.stringify({
      outputPath: request.outputPath,
      words: words.length
    }, null, 2));
  } catch (err) {
    console.error("CAPTIONPILOT_ERROR");
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(1);
  } finally {
    if (tempWavPath && fs.existsSync(tempWavPath)) {
      try { fs.unlinkSync(tempWavPath); } catch (_) {}
    }
  }
}

main();
