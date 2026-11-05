import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config via env vars (all with sensible defaults) ──────────────────────────
const PORT            = parseInt(process.env.PORT, 10) || 3000;
const FFMPEG_PATH     = process.env.FFMPEG_PATH || (process.platform === 'win32' ? 'ffmpeg' : (fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : 'ffmpeg'));
const downloadsDir    = process.env.DOWNLOADS_DIR || path.join(__dirname, 'downloads');
const MAX_CLIP_SECS   = parseInt(process.env.MAX_CLIP_SECONDS, 10) || 1800;  // 30 min
const CLEANUP_AGE_MS  = 3_600_000;   // 1 hour
const CLEANUP_TICK_MS = 300_000;     // 5 min

ffmpeg.setFfmpegPath(FFMPEG_PATH);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

// ── Periodic cleanup of old clips ─────────────────────────────────────────────
setInterval(() => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const fp = path.join(downloadsDir, file);
      fs.stat(fp, (err, stats) => {
        if (!err && now - stats.mtimeMs > CLEANUP_AGE_MS) fs.unlink(fp, () => {});
      });
    });
  });
}, CLEANUP_TICK_MS);

// ── Validation ─────────────────────────────────────────────────────────────────
function validUrl(url) {
  if (typeof url !== 'string' || url.length > 2048) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// ── Cookie detection for YouTube authentication / bot challenges ───────────────
function getCookieArgs() {
  // 1. Explicit env var
  if (process.env.COOKIES_PATH && fs.existsSync(process.env.COOKIES_PATH)) {
    return ['--cookies', process.env.COOKIES_PATH];
  }
  // 2. Local cookies.txt file
  const localCookies = path.join(__dirname, 'cookies.txt');
  if (fs.existsSync(localCookies)) {
    return ['--cookies', localCookies];
  }
  // 3. Auto-detect Zen Browser on Linux (checks profiles with actual cookies.sqlite)
  const zenDir = path.join(os.homedir(), '.zen');
  if (fs.existsSync(zenDir)) {
    try {
      const profiles = fs.readdirSync(zenDir).filter(f => fs.existsSync(path.join(zenDir, f, 'cookies.sqlite')));
      if (profiles.length > 0) {
        return ['--cookies-from-browser', `firefox:${path.join(zenDir, profiles[0])}`];
      }
    } catch {}
  }
  // 4. Auto-detect standard Firefox
  const ffDir = path.join(os.homedir(), '.mozilla', 'firefox');
  if (fs.existsSync(ffDir)) {
    try {
      const profiles = fs.readdirSync(ffDir).filter(f => fs.existsSync(path.join(ffDir, f, 'cookies.sqlite')));
      if (profiles.length > 0) {
        return ['--cookies-from-browser', `firefox:${path.join(ffDir, profiles[0])}`];
      }
    } catch {}
  }
  // 5. Auto-detect Google Chrome
  const chromeCookieDb = path.join(os.homedir(), '.config', 'google-chrome', 'Default', 'Cookies');
  if (fs.existsSync(chromeCookieDb)) {
    return ['--cookies-from-browser', 'chrome'];
  }
  return [];
}

function cleanYtDlpError(stderr) {
  if (!stderr) return 'Failed to process YouTube video';
  if (stderr.includes('Sign in to confirm you’re not a bot') || stderr.includes('Sign in to confirm that you\'re not a bot')) {
    return 'YouTube bot-check triggered. Provide a cookies.txt file or use an active browser session.';
  }
  if (stderr.includes('Video unavailable') || stderr.includes('This video is not available')) {
    return 'This video is unavailable or has been removed.';
  }
  if (stderr.includes('Private video')) {
    return 'This video is private.';
  }
  // Find clean first error line
  const errLine = stderr.split('\n').find(l => l.startsWith('ERROR:'));
  if (errLine) {
    return errLine.replace(/ERROR:\s*(\[youtube\]\s*[\w-]+\s*:\s*)?/i, '').trim();
  }
  return 'Failed to extract video information from YouTube';
}

// ── yt-dlp helpers with automatic fallback ─────────────────────────────────────
function fetchVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const cookieArgs = getCookieArgs();
    const run = (extraArgs = []) => {
      const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', ...cookieArgs, ...extraArgs, url]);
      let data = '', stderr = '';
      proc.stdout.on('data', c => data += c.toString());
      proc.stderr.on('data', c => stderr += c.toString());
      proc.on('close', code => {
        if (code === 0 && data) {
          try {
            return resolve(JSON.parse(data));
          } catch (e) {
            return reject(new Error('Failed to parse video metadata'));
          }
        }
        // If first attempt failed, try android,web fallback
        if (extraArgs.length === 0) {
          return run(['--extractor-args', 'youtube:player_client=android,web']);
        }
        console.error('yt-dlp metadata failed. Stderr:', stderr);
        reject(new Error(cleanYtDlpError(stderr)));
      });
      proc.on('error', err => reject(err));
    };
    run();
  });
}

function resolveStreamUrls(url, formatSelector) {
  return new Promise((resolve, reject) => {
    const cookieArgs = getCookieArgs();
    const run = (extraArgs = []) => {
      const proc = spawn('yt-dlp', ['-g', '-f', formatSelector, '--no-playlist', ...cookieArgs, ...extraArgs, url]);
      let urls = '', stderr = '';
      proc.stdout.on('data', c => urls += c.toString());
      proc.stderr.on('data', c => stderr += c.toString());
      proc.on('close', code => {
        const streams = urls.trim().split('\n').map(s => s.trim()).filter(s => s.startsWith('http'));
        if (code === 0 && streams.length > 0) {
          return resolve(streams);
        }
        if (extraArgs.length === 0) {
          return run(['--extractor-args', 'youtube:player_client=android,web']);
        }
        console.error('yt-dlp stream extraction failed. Stderr:', stderr);
        reject(new Error(cleanYtDlpError(stderr)));
      });
      proc.on('error', err => reject(err));
    };
    run();
  });
}

// ── /api/info ─────────────────────────────────────────────────────────────────
app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });
    const info = await fetchVideoMetadata(url);
    res.json({
      title: info.title,
      thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url,
      duration: info.duration,
      author: info.uploader || info.channel
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── /api/formats ──────────────────────────────────────────────────────────────
app.post('/api/formats', async (req, res) => {
  try {
    const { url } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });
    const info = await fetchVideoMetadata(url);
    const formats = (info.formats || [])
      .filter(f => f.ext !== 'mhtml' && (f.vcodec !== 'none' || f.acodec !== 'none'))
      .map(f => ({
        id: f.format_id,
        ext: f.ext,
        height: f.height || 0,
        width: f.width || 0,
        fps: f.fps || 0,
        vcodec: f.vcodec || 'none',
        acodec: f.acodec || 'none',
        tbr: f.tbr || 0,
        abr: f.abr || 0,
        filesize: f.filesize || f.filesize_approx || 0,
        note: f.format_note || ''
      }));
    res.json({
      formats,
      title: info.title,
      duration: info.duration,
      thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url,
      author: info.uploader || info.channel
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── /api/cut ──────────────────────────────────────────────────────────────────
app.post('/api/cut', async (req, res) => {
  try {
    const { url, start, end, format = 'mp4', quality = 'auto' } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const startSec = Number(start), endSec = Number(end), duration = endSec - startSec;
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || duration <= 0) {
      return res.status(400).json({ error: 'Invalid range (must be > 0s)' });
    }
    if (duration > MAX_CLIP_SECS) {
      return res.status(400).json({ error: `Clip too long — maximum is ${MAX_CLIP_SECS}s (${Math.round(MAX_CLIP_SECS / 60)} min)` });
    }

    const id = uuidv4();
    const ext = format === 'mp3' ? 'mp3' : format === 'm4a' ? 'm4a' : 'mp4';
    const outputPath = path.join(downloadsDir, `${id}.${ext}`);
    const isAudio = ext === 'mp3' || ext === 'm4a';
    const videoOnly = !isAudio && String(quality).startsWith('v:');
    const audioBitrate = isAudio && String(quality).startsWith('audio:')
      ? String(quality).split(':')[1]
      : '192';

    let formatSelector;
    if (isAudio) {
      formatSelector = 'bestaudio/best';
    } else if (videoOnly) {
      formatSelector = String(quality).slice(2);
    } else if (!quality || quality === 'auto') {
      formatSelector = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';
    } else if (String(quality).startsWith('h')) {
      const h = parseInt(String(quality).slice(1), 10) || 1080;
      formatSelector = `bestvideo[height<=${h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${h}]+bestaudio/best[height<=${h}][ext=mp4]/best[height<=${h}]/best`;
    } else {
      formatSelector = String(quality);
    }

    const streams = await resolveStreamUrls(url, formatSelector);
    console.log(`Cut ${startSec}s–${endSec}s (${duration}s) ${ext} | ${quality} | ${streams.length} stream(s)`);

    const opts = { isAudio, videoOnly, audioBitrate };
    const args = ['-y'];
    if (isAudio) {
      args.push('-ss', String(startSec), '-i', streams[0], '-t', String(duration), '-vn');
      args.push(...(ext === 'mp3'
        ? ['-acodec', 'libmp3lame', '-b:a', `${audioBitrate}k`]
        : ['-acodec', 'aac', '-b:a', `${audioBitrate}k`]));
    } else {
      streams.forEach(s => args.push('-ss', String(startSec), '-i', s));
      args.push('-t', String(duration), '-c:v', 'copy');
      if (videoOnly) args.push('-an');
      else args.push('-c:a', 'aac', '-b:a', '160k');
      args.push('-movflags', '+faststart');
    }
    args.push(outputPath);
    runFfmpeg(args, outputPath, streams, startSec, duration, res, id, ext, opts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ffmpeg helpers ────────────────────────────────────────────────────────────
function respond(res, out, id, ext, start, dur) {
  if (!fs.existsSync(out)) return res.status(500).json({ error: 'No output' });
  const stat = fs.statSync(out);
  res.json({
    success: true,
    downloadUrl: `/download/${id}.${ext}`,
    filename: `clip_${start}s_${dur}s.${ext}`,
    size: stat.size
  });
}

function runFfmpeg(args, outputPath, streams, start, dur, res, id, ext, opts) {
  const ff = spawn(FFMPEG_PATH, args);
  let err = '';
  ff.stderr.on('data', c => err += c.toString());
  ff.on('close', code => {
    if (code === 0 && fs.existsSync(outputPath)) return respond(res, outputPath, id, ext, start, dur);
    console.error('Stream-copy failed, re-encoding:', err.slice(-600));
    fallbackEncode(streams, start, dur, outputPath, res, id, ext, opts);
  });
  ff.on('error', e => res.status(500).json({ error: e.message }));
}

function fallbackEncode(streams, start, dur, out, res, id, ext, opts) {
  const args = ['-y'];
  if (opts.isAudio) {
    args.push('-ss', String(start), '-i', streams[0], '-t', String(dur), '-vn');
    args.push(...(ext === 'mp3'
      ? ['-acodec', 'libmp3lame', '-b:a', `${opts.audioBitrate}k`]
      : ['-acodec', 'aac', '-b:a', `${opts.audioBitrate}k`]));
  } else {
    streams.forEach(s => args.push('-ss', String(start), '-i', s));
    args.push('-t', String(dur), '-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    if (opts.videoOnly) args.push('-an');
    else args.push('-c:a', 'aac', '-b:a', '160k');
    args.push('-movflags', '+faststart');
  }
  args.push(out);
  const ff = spawn(FFMPEG_PATH, args);
  let err = '';
  ff.stderr.on('data', c => err += c.toString());
  ff.on('close', code => {
    if (code !== 0 || !fs.existsSync(out)) {
      console.error('Re-encode failed:', err.slice(-600));
      return res.status(500).json({ error: 'Cut failed' });
    }
    respond(res, out, id, ext, start, dur);
  });
}

// ── /download/:file ───────────────────────────────────────────────────────────
app.get('/download/:file', (req, res) => {
  const fp = path.join(downloadsDir, path.basename(req.params.file));
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  const stat = fs.statSync(fp);
  const mime = { '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' }[path.extname(fp)] || 'application/octet-stream';
  res.set({
    'Content-Type': mime,
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${req.params.file}"`,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(fp).pipe(res);
});

app.listen(PORT, '0.0.0.0', () => console.log(`Savepoint → http://0.0.0.0:${PORT}`));
