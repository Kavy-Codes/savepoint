import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FFMPEG_PATH = '/usr/bin/ffmpeg';
ffmpeg.setFfmpegPath(FFMPEG_PATH);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) fs.mkdirSync(downloadsDir, { recursive: true });

setInterval(() => {
  fs.readdir(downloadsDir, (err, files) => {
    if (err) return;
    const now = Date.now();
    files.forEach(file => {
      const fp = path.join(downloadsDir, file);
      fs.stat(fp, (err, stats) => {
        if (!err && now - stats.mtimeMs > 3600000) fs.unlink(fp, () => {});
      });
    });
  });
}, 300000);

function validUrl(url) {
  return typeof url === 'string' && (url.includes('youtube.com') || url.includes('youtu.be'));
}

app.post('/api/info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });
    const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
    let data = '';
    proc.stdout.on('data', c => data += c.toString());
    proc.on('close', code => {
      if (code !== 0 || !data) return res.status(500).json({ error: 'Failed to fetch video' });
      try {
        const info = JSON.parse(data);
        res.json({
          title: info.title,
          thumbnail: info.thumbnail || info.thumbnails?.[info.thumbnails.length - 1]?.url,
          duration: info.duration,
          author: info.uploader || info.channel
        });
      } catch { res.status(500).json({ error: 'Parse failed' }); }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/formats', async (req, res) => {
  try {
    const { url } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });
    const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
    let data = '';
    proc.stdout.on('data', c => data += c.toString());
    proc.stderr.on('data', c => console.error('yt-dlp formats stderr:', c.toString().slice(-300)));
    proc.on('close', code => {
      if (code !== 0 || !data) return res.status(500).json({ error: 'Failed to list formats' });
      try {
        const info = JSON.parse(data);
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
      } catch { res.status(500).json({ error: 'Parse failed' }); }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cut', async (req, res) => {
  try {
    const { url, start, end, format = 'mp4', quality = 'auto' } = req.body;
    if (!validUrl(url)) return res.status(400).json({ error: 'Invalid YouTube URL' });

    const startSec = Number(start), endSec = Number(end), duration = endSec - startSec;
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec) || duration <= 0 || duration > 600) {
      return res.status(400).json({ error: 'Invalid range (1s–10min)' });
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

    const proc = spawn('yt-dlp', ['-g', '-f', formatSelector, '--no-playlist', url]);
    let urls = '';
    proc.stdout.on('data', c => urls += c.toString());
    proc.stderr.on('data', c => console.error('yt-dlp stream stderr:', c.toString().slice(-300)));
    proc.on('close', code => {
      if (code !== 0 || !urls.trim()) return res.status(500).json({ error: 'No stream URLs' });
      const streams = urls.trim().split('\n').map(s => s.trim()).filter(s => s.startsWith('http'));
      if (!streams.length) return res.status(500).json({ error: 'No stream URLs' });
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
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.listen(3000, '0.0.0.0', () => console.log('Savepoint → http://0.0.0.0:3000'));
