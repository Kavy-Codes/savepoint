<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo.svg">
    <img src="public/logo.svg" alt="Savepoint" width="180">
  </picture>
</p>

<h1 align="center">Savepoint</h1>

<p align="center">
  <strong>Cut any moment from a YouTube video — download only the clip, never the full file.</strong>
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> •
  <a href="#quick-start"><strong>Quick Start</strong></a> •
  <a href="#how-it-works"><strong>How It Works</strong></a> •
  <a href="#api"><strong>API</strong></a> •
  <a href="#roadmap"><strong>Roadmap</strong></a>
</p>

---

## Features

| Feature | Details |
|---------|---------|
| **Stream-seek clipping** | yt-dlp resolves direct stream URLs → ffmpeg seeks to your start time and reads **only your range**. A 30-second clip transfers ~5 MB, not gigabytes. |
| **Precision timestamps** | HH:MM:SS inputs with keyboard-friendly navigation and paste-to-parse (`12:34:56`). |
| **Quality combos** | `Auto (best)`, per-resolution **Video + Audio** merges (MP4, codec, fps, MB/min), **Video only** (silent), plus audio bitrates (Best / 320 / 192 / 128 kbps) for MP3 & M4A. |
| **Formats** | MP4 (video), MP3, M4A (audio) — all with proper browser downloads (shows in your downloads bar). |
| **30-min recommended max** | Stream-seek is fast and reliable up to ~30 minutes. Longer clips may hit stream URL expiry. Configurable via `MAX_CLIP_SECONDS`. |
| **Premium UI** | Dark theme, Space Grotesk + JetBrains Mono, Zdog 3D: rotating Savepoint logo (drag it), animated scissors companion, confetti burst on success, pointer-parallax background. |
| **Zero bloat** | Single Express server, vanilla JS frontend, system ffmpeg + yt-dlp. No Electron, no heavy frameworks. |

---

## Quick Start

### Prerequisites
- **Node.js** 18+
- **ffmpeg** in PATH (tested with 6.0+)
- **yt-dlp** in PATH (tested with 2024+)

```bash
# Windows (winget - recommended)
winget install Gyan.FFmpeg yt-dlp.yt-dlp OpenJS.NodeJS.LTS

# Windows (Scoop / Chocolatey)
scoop install ffmpeg yt-dlp nodejs-lts
# or: choco install ffmpeg yt-dlp nodejs-lts

# Ubuntu/Debian
sudo apt install ffmpeg yt-dlp

# Arch
sudo pacman -S ffmpeg yt-dlp

# macOS (Homebrew)
brew install ffmpeg yt-dlp
```

### Install & Run

```bash
git clone https://github.com/Kavy-Codes/savepoint.git
cd savepoint
npm install          # or: pnpm install
npm start            # starts server on http://localhost:3000
```

> **Windows users**: Works identically in PowerShell or Command Prompt. If ffmpeg is in your system PATH, Savepoint detects it automatically. If installed to a custom directory, set `$env:FFMPEG_PATH="C:\path\to\ffmpeg.exe"` before starting.

Open **http://localhost:3000** — paste a YouTube URL, pick your range, choose quality/format, hit **Cut & Download**.

### Docker (optional)

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache ffmpeg yt-dlp python3
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t savepoint .
docker run -p 3000:3000 savepoint
```

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  You Paste  │────▶│  yt-dlp -g   │────▶│  Direct Stream   │
│  URL + Range│     │  (no download)│    │  URLs (m3u8/mp4) │
└─────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Browser   │◀────│   Express    │◀────│  ffmpeg -ss -i   │
│  Downloads  │     │  /api/cut    │     │  -t (stream copy)│
└─────────────┘     └──────────────┘     └──────────────────┘
```

1. **Load** — `/api/formats` calls `yt-dlp --dump-json` once. Returns clean format list (height, fps, codec, bitrate) + metadata.
2. **Select** — UI builds quality combos: merged video+audio per resolution, video-only, audio bitrates.
3. **Cut** — `/api/cut` runs `yt-dlp -g -f <selector>` to get **direct stream URLs only**. ffmpeg seeks with `-ss` **before each `-i`** (video + audio both seeked), reads exactly `duration` seconds with `-t`, stream-copies when possible (`-c:v copy`), falls back to re-encode on failure.
4. **Download** — Express streams the clip with `Content-Disposition: attachment` → browser shows it in the downloads bar.

**No full video ever touches your disk.** Only the requested byte range is transferred.

---

## API

### `POST /api/formats`
```json
{ "url": "https://youtu.be/VIDEO_ID" }
```
Returns:
```json
{
  "formats": [{ "id": "137", "ext": "mp4", "height": 1080, "fps": 30, "vcodec": "avc1", "acodec": "none", "tbr": 2500 }],
  "title": "Video Title",
  "duration": 7978,
  "thumbnail": "https://...",
  "author": "Channel Name"
}
```

### `POST /api/cut`
```json
{
  "url": "https://youtu.be/VIDEO_ID",
  "start": 691,
  "end": 696,
  "format": "mp4",      // mp4 | mp3 | m4a
  "quality": "auto"     // auto | h1080 | h720 | v:137 | audio:320 | audio:best ...
}
```
Returns:
```json
{
  "success": true,
  "downloadUrl": "/download/uuid.mp4",
  "filename": "clip_691s_5s.mp4",
  "size": 5663562
}
```

### `GET /download/:file`
Streams the file with `Content-Disposition: attachment`.

---

## Project Structure

```
savepoint/
├── server.js           # Express + yt-dlp/ffmpeg orchestration
├── package.json
├── public/
│   ├── index.html      # Single-page app
│   ├── style.css       # Premium dark theme, responsive
│   ├── app.js          # Zdog scenes + UI logic (vanilla)
│   ├── favicon.svg     # Savepoint mark (dark rounded square, red play)
│   └── logo.svg        # 512×512 mark for README/social
```

---

## Configuration

Environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `DOWNLOADS_DIR` | `./downloads` | Temp clip storage (auto-cleaned after 1h) |
| `FFMPEG_PATH` | `/usr/bin/ffmpeg` | ffmpeg binary |
| `MAX_CLIP_SECONDS` | `1800` | Hard limit per clip (30 min) |

---

## Roadmap

- [ ] **Keyboard shortcuts** — `Space` play/pause preview, `←/→` nudge timestamps
- [ ] **Chapter markers** — fetch YouTube chapters as markers
- [ ] **Batch queue** — cut multiple ranges in one session
- [ ] **WebM/VP9 output** — for smaller clips at same quality
- [ ] **Self-hosted yt-dlp binary** — optional bundled version for locked-down servers

---

## License

MIT — free for personal use. **Respect YouTube's Terms of Service and content owners' rights.** Not affiliated with YouTube.

---

<p align="center">
  Made with ❤️ using Node.js, ffmpeg, yt-dlp & Zdog
</p>