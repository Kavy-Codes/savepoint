// ============================================
// ZDOG SCENES
// ============================================
let heroIllo = null, orb1Illo = null, orb2Illo = null, orb3Illo = null;
let logoYTIllo = null, thumbPlayIllo = null, arrowIllo = null, toastIllo = null;
let animHero = null, animOrbs = null, animLogoYT = null, animThumbPlay = null, animArrow = null, animToast = null;
let confettiIllo = null, animConfetti = null;
const confettiPieces = [];
let scissorsIllo = null, animScissors = null, scissorBladeA = null, scissorBladeB = null, scissorsEnergy = 1;
let pointerX = 0, pointerY = 0;

function initAllZdog() {
  initHeroScene();
  initOrbs();
  initYTLogo();
  initThumbPlay();
  initArrow();
  initToast();
  initScissors();
  initConfetti();
}

function initHeroScene() {
  const canvas = document.getElementById('hero-scene');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    heroIllo = new Zdog.Illustration({
      element: canvas,
      resize: 'fullscreen',
      rotate: { x: -0.15, y: 0 }
    });
    buildHeroScene(heroIllo);
    heroIllo.updateRenderGraph();
    animateHero();
  } catch (e) { console.warn('Hero scene failed:', e); }
}

function buildHeroScene(illo) {
  const W = window.innerWidth, H = window.innerHeight;
  const count = Math.min(70, Math.floor((W * H) / 150000));
  for (let i = 0; i < count; i++) {
    const size = 1.5 + Math.random() * 5;
    const type = Math.random();
    const x = (Math.random() - 0.5) * W * 1.4;
    const y = (Math.random() - 0.5) * H * 1.4;
    const z = (Math.random() - 0.5) * 500;
    const color = Math.random() > 0.75 ? '#ff5500' : '#ff0000';
    const opacity = 0.1 + Math.random() * 0.18;
    const speed = 0.0002 + Math.random() * 0.0005;
    const angle = Math.random() * Math.PI * 2;
    const radius = 50 + Math.random() * 250;

    if (type < 0.4) {
      new Zdog.Box({
        addTo: illo, width: size, height: size, depth: size, stroke: 0.5, fill: true, color,
        translate: { x, y, z }, opacity,
        rotate: { x: Math.random(), y: Math.random(), z: Math.random() },
        userData: { angle, radius, speed, baseX: x, baseY: y, baseZ: z, type: 'box' }
      });
    } else if (type < 0.7) {
      new Zdog.Ellipse({
        addTo: illo, diameter: size, stroke: 0.5, fill: true, color,
        translate: { x, y, z }, opacity,
        userData: { angle, radius, speed, baseX: x, baseY: y, baseZ: z, type: 'circle' }
      });
    } else {
      new Zdog.Shape({
        addTo: illo,
        path: [{ x: 0, y: -size }, { x: size, y: 0 }, { x: 0, y: size }, { x: -size, y: 0 }],
        closed: true, stroke: 0.5, fill: true, color,
        translate: { x, y, z }, opacity,
        rotate: { z: Math.random() * Math.PI },
        userData: { angle, radius, speed, baseX: x, baseY: y, baseZ: z, type: 'diamond' }
      });
    }
  }
}

function animateHero() {
  if (!heroIllo) return;
  let t = 0;
  (function tick() {
    t += 0.006;
    heroIllo.rotate.y += 0.0001;
    heroIllo.rotate.x = -0.15 + Math.sin(t * 0.25) * 0.04;
    heroIllo.translate.x += (-pointerX * 28 - heroIllo.translate.x) * 0.03;
    heroIllo.translate.y += (-pointerY * 28 - heroIllo.translate.y) * 0.03;
    heroIllo.children.forEach((c, i) => {
      if (!c.userData?.speed) return;
      const u = c.userData;
      u.angle += u.speed;
      const r = u.radius + Math.sin(t * 0.4 + i) * 40;
      c.translate.x = u.baseX + Math.cos(u.angle) * r;
      c.translate.y = u.baseY + Math.sin(u.angle) * r * 0.7;
      c.translate.z = u.baseZ + Math.cos(t * 0.25 + i) * 50;
      if (u.type === 'box') { c.rotate.x += 0.002; c.rotate.y += 0.0015; }
    });
    heroIllo.updateRenderGraph();
    animHero = requestAnimationFrame(tick);
  })();
}

function initOrbs() {
  ['orb-1', 'orb-2', 'orb-3'].forEach((id, idx) => {
    const canvas = document.getElementById(id);
    if (!canvas || typeof Zdog === 'undefined') return;
    try {
      const illo = new Zdog.Illustration({ element: canvas, width: canvas.width, height: canvas.height });
      const count = 20 + idx * 10;
      for (let i = 0; i < count; i++) {
        const size = 8 + Math.random() * 40;
        const a = (i / count) * Math.PI * 2;
        const r = 80 + Math.random() * 100;
        new Zdog.Ellipse({
          addTo: illo, diameter: size, stroke: 0, fill: true, color: '#ff0000',
          translate: { x: Math.cos(a) * r, y: Math.sin(a) * r, z: (Math.random() - 0.5) * 50 },
          opacity: 0.05 + Math.random() * 0.07,
          userData: { angle: a, radius: r, speed: 0.0004 + Math.random() * 0.0006, index: i }
        });
      }
      if (idx === 0) orb1Illo = illo;
      else if (idx === 1) orb2Illo = illo;
      else orb3Illo = illo;
      illo.updateRenderGraph();
    } catch (e) { console.warn(`Orb ${id} failed:`, e); }
  });
  animateOrbs();
}

function animateOrbs() {
  let t = 0;
  (function tick() {
    t += 0.004;
    [orb1Illo, orb2Illo, orb3Illo].forEach((illo, oi) => {
      if (!illo) return;
      illo.children.forEach((c, i) => {
        if (!c.userData?.speed) return;
        const u = c.userData;
        u.angle += u.speed * (1 + oi * 0.25);
        const r = u.radius + Math.sin(t + u.index) * 25;
        c.translate.x = Math.cos(u.angle) * r;
        c.translate.y = Math.sin(u.angle) * r * 0.75;
        c.translate.z = Math.sin(t * 0.4 + u.index) * 35;
        c.opacity = 0.04 + Math.sin(t * 0.7 + u.index) * 0.035;
      });
      illo.updateRenderGraph();
    });
    animOrbs = requestAnimationFrame(tick);
  })();
}

// ===== SAVEPOINT LOGO: solid extruded mark, continuous spin in place =====
function initYTLogo() {
  const canvas = document.getElementById('logo-yt');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    logoYTIllo = new Zdog.Illustration({
      element: canvas,
      width: 160,
      height: 160,
      rotate: { x: -0.16, y: 0.4 },
      dragRotate: true
    });
    buildYTLogo(logoYTIllo, 1);
    logoYTIllo.updateRenderGraph();
    animateYTLogo();
  } catch (e) { console.warn('Logo failed:', e); }
}

function initThumbPlay() {
  const canvas = document.getElementById('thumb-play');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    thumbPlayIllo = new Zdog.Illustration({ element: canvas, width: 80, height: 80, rotate: { x: -0.25, y: 0 } });
    buildYTLogo(thumbPlayIllo, 0.52);
    thumbPlayIllo.updateRenderGraph();
    animateThumbPlay();
  } catch (e) { console.warn('Thumb play failed:', e); }
}

function initArrow() {
  const canvas = document.getElementById('arrow-canvas');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    arrowIllo = new Zdog.Illustration({ element: canvas, width: 40, height: 40 });
    const red = '#ff0000';
    new Zdog.Shape({ addTo: arrowIllo, path: [{ x: -9, y: -7 }, { x: 0, y: 0 }, { x: -9, y: 7 }], stroke: 3, color: red, translate: { z: 4 } });
    new Zdog.Shape({ addTo: arrowIllo, path: [{ x: 9, y: -7 }, { x: 0, y: 0 }, { x: 9, y: 7 }], stroke: 3, color: red, translate: { z: -4 } });
    arrowIllo.updateRenderGraph();
    animateArrow();
  } catch (e) { console.warn('Arrow failed:', e); }
}

function initToast() {
  const canvas = document.getElementById('toast-canvas');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    toastIllo = new Zdog.Illustration({ element: canvas, width: 60, height: 60, rotate: { x: -0.2, y: 0 } });
    new Zdog.Shape({
      addTo: toastIllo,
      path: [{ x: -15, y: 0 }, { x: -4, y: 11 }, { x: 15, y: -11 }],
      stroke: 5, color: '#22c55e', translate: { z: 8 }
    });
    toastIllo.updateRenderGraph();
  } catch (e) { console.warn('Toast failed:', e); }
}

// Solid YouTube mark: extruded red rounded rect + white play triangle on BOTH faces. No ring, no dots.
function buildYTLogo(illo, s) {
  const scale = s || 1;
  const red = '#ff0000';
  const w = 104 * scale;
  const h = 74 * scale;
  const r = 22 * scale;
  const depth = 18 * scale;
  const layers = 9;

  // Extruded rounded rect body
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    new Zdog.RoundedRect({
      addTo: illo,
      width: w,
      height: h,
      cornerRadius: r,
      stroke: false,
      fill: true,
      color: i === layers - 1 ? red : '#cc0000',
      translate: { z: -depth / 2 + t * depth }
    });
  }

  const playPath = [
    { x: -12 * scale, y: -16 * scale },
    { x: 18 * scale, y: 0 },
    { x: -12 * scale, y: 16 * scale }
  ];

  // Front face triangle only
  new Zdog.Shape({
    addTo: illo,
    path: playPath,
    closed: true,
    stroke: false,
    fill: true,
    color: '#ffffff',
    translate: { z: depth / 2 + 0.3, x: 3 * scale }
  });
}

function animateYTLogo() {
  if (!logoYTIllo) return;
  cancelAnimationFrame(animLogoYT);
  (function tick() {
    logoYTIllo.rotate.y += 0.03;
    logoYTIllo.rotate.x += (-0.16 - logoYTIllo.rotate.x) * 0.06;
    logoYTIllo.updateRenderGraph();
    animLogoYT = requestAnimationFrame(tick);
  })();
}

function animateThumbPlay() {
  if (!thumbPlayIllo) return;
  let t = 0;
  (function tick() {
    t += 0.02;
    thumbPlayIllo.rotate.y = Math.sin(t * 0.8) * 0.35;
    thumbPlayIllo.rotate.x = -0.25 + Math.cos(t * 1.2) * 0.1;
    thumbPlayIllo.updateRenderGraph();
    animThumbPlay = requestAnimationFrame(tick);
  })();
}

function animateArrow() {
  if (!arrowIllo) return;
  let t = 0;
  (function tick() {
    t += 0.02;
    const bounce = Math.abs(Math.sin(t * 1.4));
    arrowIllo.rotate.y = bounce * 0.25;
    arrowIllo.children.forEach(c => {
      if (c.path && c.path.length === 3) c.opacity = 0.65 + bounce * 0.35;
    });
    arrowIllo.updateRenderGraph();
    animArrow = requestAnimationFrame(tick);
  })();
}

function animateToast() {
  if (!toastIllo) return;
  cancelAnimationFrame(animToast);
  let t = 0;
  (function tick() {
    t += 0.05;
    toastIllo.rotate.y = Math.sin(t * 0.9) * 0.5;
    toastIllo.rotate.x = -0.2 + Math.cos(t * 0.7) * 0.08;
    toastIllo.updateRenderGraph();
    animToast = requestAnimationFrame(tick);
  })();
}

// ===== SCISSORS COMPANION =====
function initScissors() {
  const canvas = document.getElementById('scissors-canvas');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    scissorsIllo = new Zdog.Illustration({ element: canvas, width: 56, height: 56, rotate: { x: -0.28, y: 0.4 } });
    const white = '#f5f5f5', red = '#ff0000', gold = '#ffd400';

    scissorBladeA = new Zdog.Anchor({ addTo: scissorsIllo, rotate: { z: 0.3 } });
    new Zdog.Shape({ addTo: scissorBladeA, path: [{ x: 0, y: 0 }, { x: 19, y: 0 }], stroke: 4.5, color: white, translate: { z: 2 } });
    new Zdog.Shape({ addTo: scissorBladeA, path: [{ x: 0, y: 0 }, { x: -11, y: -6 }], stroke: 3.5, color: white, translate: { z: 2 } });
    new Zdog.Ellipse({ addTo: scissorBladeA, diameter: 8.5, stroke: 3, color: red, translate: { x: -14.5, y: -7.5, z: 2 }, fill: false });

    scissorBladeB = new Zdog.Anchor({ addTo: scissorsIllo, rotate: { z: -0.3 } });
    new Zdog.Shape({ addTo: scissorBladeB, path: [{ x: 0, y: 0 }, { x: 19, y: 0 }], stroke: 4.5, color: white, translate: { z: -2 } });
    new Zdog.Shape({ addTo: scissorBladeB, path: [{ x: 0, y: 0 }, { x: -11, y: 6 }], stroke: 3.5, color: white, translate: { z: -2 } });
    new Zdog.Ellipse({ addTo: scissorBladeB, diameter: 8.5, stroke: 3, color: red, translate: { x: -14.5, y: 7.5, z: -2 }, fill: false });

    new Zdog.Ellipse({ addTo: scissorsIllo, diameter: 5, stroke: 4, color: gold, translate: { z: 4 }, fill: false });

    scissorsIllo.updateRenderGraph();
    animateScissors();
  } catch (e) { console.warn('Scissors failed:', e); }
}

function animateScissors() {
  if (!scissorsIllo) return;
  let t = 0;
  (function tick() {
    scissorsEnergy += (1 - scissorsEnergy) * 0.02;
    t += 0.045 * Math.min(scissorsEnergy, 4);
    const open = 0.22 + Math.abs(Math.sin(t)) * 0.38;
    if (scissorBladeA) scissorBladeA.rotate.z = open;
    if (scissorBladeB) scissorBladeB.rotate.z = -open;
    scissorsIllo.rotate.y += 0.012;
    scissorsIllo.rotate.x = -0.28 + Math.sin(t * 0.4) * 0.06;
    scissorsIllo.updateRenderGraph();
    animScissors = requestAnimationFrame(tick);
  })();
}

// ===== CONFETTI BURST =====
function initConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas || typeof Zdog === 'undefined') return;
  try {
    confettiIllo = new Zdog.Illustration({ element: canvas, resize: 'fullscreen' });
    const colors = ['#ff0000', '#ffffff', '#ffd400', '#ff4d4d', '#ff8a8a', '#cc0000'];
    for (let i = 0; i < 90; i++) {
      const piece = new Zdog.Box({
        addTo: confettiIllo,
        width: 6 + Math.random() * 6,
        height: 6 + Math.random() * 6,
        depth: 1.5,
        stroke: false,
        fill: true,
        color: colors[i % colors.length],
        visible: false
      });
      piece.userData = { vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, delay: 0 };
      confettiPieces.push(piece);
    }
    confettiIllo.updateRenderGraph();
  } catch (e) { console.warn('Confetti failed:', e); }
}

function burstConfetti() {
  if (!confettiIllo || !confettiPieces.length) return;
  const H = window.innerHeight;
  cancelAnimationFrame(animConfetti);
  confettiPieces.forEach(p => {
    const u = p.userData;
    p.visible = true;
    p.opacity = 1;
    p.translate.set({ x: (Math.random() - 0.5) * 160, y: H / 2 + 10, z: (Math.random() - 0.5) * 120 });
    p.rotate.set({ x: Math.random() * Math.PI, y: Math.random() * Math.PI, z: Math.random() * Math.PI });
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 9 + Math.random() * 12;
    u.vx = Math.cos(angle) * speed;
    u.vy = Math.sin(angle) * speed;
    u.vz = (Math.random() - 0.5) * 6;
    u.rx = (Math.random() - 0.5) * 0.5;
    u.ry = (Math.random() - 0.5) * 0.5;
    u.delay = Math.random() * 0.18;
  });
  let t = 0;
  (function tick() {
    t += 1 / 60;
    confettiPieces.forEach(p => {
      const u = p.userData;
      if (u.delay > 0) { u.delay -= 1 / 60; p.opacity = 0; return; }
      p.opacity = Math.min(1, p.opacity + 0.15);
      u.vy -= 0.42;
      u.vx *= 0.995;
      p.translate.x += u.vx;
      p.translate.y += u.vy;
      p.translate.z += u.vz;
      p.rotate.x += u.rx;
      p.rotate.y += u.ry;
      if (p.translate.y > H / 2 + 30 || t > 3.4) p.visible = false;
    });
    confettiIllo.updateRenderGraph();
    if (t < 3.6) animConfetti = requestAnimationFrame(tick);
  })();
}

// ============================================
// STATE & HELPERS
// ============================================
let currentUrl = '';
let currentDuration = 0;
let formatsCache = [];
let qualityOptions = [];
let selectedQuality = 'auto';
let progressTimer = null;

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function secToHMS(s) {
  s = Math.max(0, Math.floor(s));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
function hmsToSec(h, m, s) { return (h || 0) * 3600 + (m || 0) * 60 + (s || 0); }
function fmtHMS(s) {
  const { h, m, s: sec } = secToHMS(s);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function fmtShort(s) {
  const { h, m, s: sec } = secToHMS(s);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}
function setFields(prefix, secs) {
  const { h, m, s: sec } = secToHMS(secs);
  $(`#${prefix}H`).value = h;
  $(`#${prefix}M`).value = String(m).padStart(2, '0');
  $(`#${prefix}S`).value = String(sec).padStart(2, '0');
  updateDurationPreview();
}
function getFields(prefix) {
  const h = parseInt($(`#${prefix}H`).value, 10) || 0;
  const m = parseInt($(`#${prefix}M`).value, 10) || 0;
  const s = parseInt($(`#${prefix}S`).value, 10) || 0;
  return hmsToSec(Math.min(h, 99), Math.min(m, 59), Math.min(s, 59));
}
function parseTimeString(str) {
  const parts = String(str).trim().split(':').map(p => parseInt(p, 10));
  if (!parts.length || parts.some(isNaN)) return null;
  if (parts.length === 3) return hmsToSec(parts[0], parts[1], parts[2]);
  if (parts.length === 2) return hmsToSec(0, parts[0], parts[1]);
  if (parts.length === 1) return parts[0] || 0;
  return null;
}

function showStatus(msg, type) {
  const el = $('#statusMsg');
  el.textContent = msg;
  el.className = 'status ' + type;
  if (type === 'success') setTimeout(() => { if (el.textContent === msg) el.className = 'status'; }, 6000);
}
function showLoadError(msg) {
  const el = $('#loadError');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}
function setLoading(btn, loading, text) {
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<span>${text}</span><svg class="btn-ico spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg><span class="btn-ripple"></span>`;
  } else {
    btn.innerHTML = `<span>${btn.dataset.text || 'Load Video'}</span><svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12l-7 7-7-7M12 5v14"/></svg><span class="btn-ripple"></span>`;
  }
}
function showControls(show) {
  $('#controlsSection').classList.toggle('hidden', !show);
  $('#cardTitle').textContent = show ? 'Select Your Clip' : 'Paste YouTube URL';
  $('#stepBadge').textContent = show ? '02' : '01';
}
function showProgress(show) {
  const wrap = $('#progressWrap'), fill = $('#progressFill'), txt = $('#progressText');
  if (show) {
    wrap.classList.remove('hidden');
    fill.style.width = '0%';
    txt.textContent = 'Initializing stream…';
  } else {
    setTimeout(() => wrap.classList.add('hidden'), 1400);
  }
}
function simProgress() {
  const fill = $('#progressFill'), txt = $('#progressText');
  const msgs = ['Fetching stream segments…', 'Seeking to start position…', 'Downloading clip only…', 'Processing video…', 'Finalizing…'];
  let p = 0;
  progressTimer = setInterval(() => {
    p = Math.min(p + Math.random() * 7 + 3, 92);
    fill.style.width = p + '%';
    txt.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  }, 700);
}
function stopProgress() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

// ============================================
// FORMATS
// ============================================
const FORMATS = [
  { value: 'mp4', label: 'MP4', sub: 'video', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>` },
  { value: 'mp3', label: 'MP3', sub: 'audio', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>` },
  { value: 'm4a', label: 'M4A', sub: 'audio', icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>` }
];

function renderFormats() {
  $('#formatPills').innerHTML = FORMATS.map(f => `
    <button class="format-pill ${f.value === 'mp4' ? 'active' : ''}" type="button" data-format="${f.value}" role="radio" aria-checked="${f.value === 'mp4'}">
      ${f.icon}<span>${f.label}</span><span class="pill-sub">${f.sub}</span>
    </button>
  `).join('');
  $$('.format-pill').forEach(btn => btn.addEventListener('click', () => {
    $$('.format-pill').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    selectedQuality = 'auto';
    buildQualityOptions();
  }));
}
function getSelectedFormat() { return $('.format-pill.active')?.dataset.format || 'mp4'; }

// ============================================
// QUALITY DROPDOWN
// ============================================
const CODEC_NAMES = {
  avc1: 'H.264', avc3: 'H.264', av01: 'AV1', av1: 'AV1',
  vp9: 'VP9', vp09: 'VP9', hev1: 'HEVC', hvc1: 'HEVC',
  mp4a: 'AAC', opus: 'Opus', vorbis: 'Vorbis'
};

function codecName(codec) {
  if (!codec || codec === 'none') return '';
  const c = String(codec).toLowerCase();
  const key = Object.keys(CODEC_NAMES).find(k => c.startsWith(k));
  return key ? CODEC_NAMES[key] : String(codec).split('.')[0].toUpperCase();
}

function estMBPerMin(tbr, height) {
  if (tbr && tbr > 0) return Math.max(0.4, ((tbr + 128) * 60) / 8 / 1024);
  if (height >= 2160) return 55;
  if (height >= 1440) return 30;
  if (height >= 1080) return 20;
  if (height >= 720) return 11;
  if (height >= 480) return 7;
  return 4;
}

function buildQualityOptions() {
  const format = getSelectedFormat();
  const isAudio = format === 'mp3' || format === 'm4a';
  const qualityLabelEl = $('#qualityLabel');
  if (qualityLabelEl) qualityLabelEl.textContent = isAudio ? 'Audio Quality' : 'Video Quality';
  const countEl = $('#qualityCount');
  qualityOptions = [];

  if (isAudio) {
    const ext = format.toUpperCase();
    qualityOptions = [
      { group: 'Audio', id: 'audio:best', label: 'Best available', meta: `${ext} • VBR • highest quality`, badge: 'Best', badgeType: 'best', mbPerMin: 2.4 },
      { group: 'Audio', id: 'audio:320', label: '320 kbps', meta: `${ext} • constant bitrate`, badge: 'HQ', badgeType: 'hd', mbPerMin: 2.4 },
      { group: 'Audio', id: 'audio:192', label: '192 kbps', meta: `${ext} • balanced`, badge: '', badgeType: '', mbPerMin: 1.44 },
      { group: 'Audio', id: 'audio:128', label: '128 kbps', meta: `${ext} • smaller file`, badge: '', badgeType: '', mbPerMin: 0.96 }
    ];
    if (countEl) countEl.textContent = '4 bitrates';
  } else {
    const vids = formatsCache.filter(f => f.vcodec && f.vcodec !== 'none' && f.height >= 360);
    const bestByHeight = new Map();
    for (const f of vids) {
      const fps = f.fps || 30;
      const cur = bestByHeight.get(f.height);
      if (!cur) { bestByHeight.set(f.height, { ...f, fps }); continue; }
      const curFps = cur.fps || 30;
      if (fps > curFps + 1 || (Math.abs(fps - curFps) <= 1 && (f.tbr || 0) > (cur.tbr || 0))) {
        bestByHeight.set(f.height, { ...f, fps });
      }
    }
    const heights = [...bestByHeight.values()].sort((a, b) => b.height - a.height).slice(0, 6);

    qualityOptions.push({
      group: 'Recommended',
      id: 'auto',
      label: 'Auto (best)',
      meta: 'Best video + audio • highest available',
      badge: 'Best',
      badgeType: 'best',
      mbPerMin: heights[0] ? estMBPerMin(heights[0].tbr, heights[0].height) : 20
    });

    for (const f of heights) {
      const fps = Math.round(f.fps || 30);
      qualityOptions.push({
        group: 'Video + Audio',
        id: `h${f.height}`,
        label: `${f.height}p${fps > 30 ? ' ' + fps + 'fps' : ''}`,
        meta: `MP4 • ${codecName(f.vcodec)} • ${fps} fps • ~${estMBPerMin(f.tbr, f.height).toFixed(0)} MB/min`,
        badge: f.height >= 2160 ? '4K' : f.height >= 720 ? 'HD' : 'SD',
        badgeType: f.height >= 2160 ? 'uhd' : f.height >= 720 ? 'hd' : 'sd',
        mbPerMin: estMBPerMin(f.tbr, f.height)
      });
    }

    for (const f of heights.slice(0, 4)) {
      const fps = Math.round(f.fps || 30);
      qualityOptions.push({
        group: 'Video only · silent',
        id: `v:${f.id}`,
        label: `${f.height}p • no audio`,
        meta: `${f.ext.toUpperCase()} • ${codecName(f.vcodec)} • ${fps} fps • muted`,
        badge: 'Mute',
        badgeType: 'sd',
        mbPerMin: estMBPerMin(f.tbr, f.height)
      });
    }
    if (countEl) countEl.textContent = `${heights.length} resolutions`;
  }

  if (!qualityOptions.some(o => o.id === selectedQuality)) {
    selectedQuality = qualityOptions[0]?.id || 'auto';
  }
  renderQualityTrigger();
  renderQualityPanel();
  updateDurationPreview();
}

function getOption(id) { return qualityOptions.find(o => o.id === id); }

function renderQualityTrigger() {
  const opt = getOption(selectedQuality) || qualityOptions[0];
  if (!opt) return;
  const ddSelected = $('#ddSelected');
  if (ddSelected) ddSelected.innerHTML = `<span class="dd-label">${opt.label}</span><span class="dd-meta">${opt.meta}</span>`;
}

function renderQualityPanel() {
  const panel = $('#qualityPanel');
  if (!panel) return;
  const groups = [];
  let current = null;
  for (const o of qualityOptions) {
    if (!current || current.name !== o.group) {
      current = { name: o.group, items: [] };
      groups.push(current);
    }
    current.items.push(o);
  }

  panel.innerHTML = groups.map(g => `
    <div class="quality-dd-group">
      <div class="quality-dd-group-label">${g.name}</div>
      ${g.items.map(o => `
        <button class="quality-dd-item ${o.id === selectedQuality ? 'selected' : ''}" type="button" role="option" aria-selected="${o.id === selectedQuality}" data-id="${o.id}">
          <span class="dd-item-main">
            <span class="dd-item-label">${o.label}</span>
            <span class="dd-item-meta-text">${o.meta}</span>
          </span>
          ${o.badge ? `<span class="dd-item-badge ${o.badgeType}">${o.badge}</span>` : ''}
          <svg class="dd-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
      `).join('')}
    </div>
  `).join('');

  panel.querySelectorAll('.quality-dd-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedQuality = btn.dataset.id;
      closeQualityDropdown();
      renderQualityTrigger();
      renderQualityPanel();
      updateDurationPreview();
    });
  });
}

function openQualityDropdown() {
  $('#qualityPanel').classList.remove('hidden');
  $('#qualityTrigger').setAttribute('aria-expanded', 'true');
}
function closeQualityDropdown() {
  $('#qualityPanel').classList.add('hidden');
  $('#qualityTrigger').setAttribute('aria-expanded', 'false');
}
function toggleQualityDropdown() {
  if ($('#qualityPanel').classList.contains('hidden')) openQualityDropdown();
  else closeQualityDropdown();
}

function updateDurationPreview() {
  const start = getFields('start');
  const end = getFields('end');
  const dur = end - start;
  const preview = $('#durationPreview');
  const opt = getOption(selectedQuality);
  const mbPerMin = opt?.mbPerMin || 12;

  preview.classList.toggle('invalid', dur <= 0);
  if (dur <= 0) {
    $('#durValue').textContent = '—';
    $('#durSize').textContent = 'End must be after start';
    return;
  }
  $('#durValue').textContent = fmtHMS(dur);
  const est = Math.max(0.1, (dur / 60) * mbPerMin);
  $('#durSize').textContent = dur <= 0
    ? 'End must be after start'
    : `~${est < 10 ? est.toFixed(1) : Math.round(est)} MB · ${opt?.label || 'auto'}` + (dur > 1800 ? ' (30min+ not recommended)' : '');
}

// ============================================
// LOAD VIDEO
// ============================================
const FALLBACK_THUMB = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="#0f0f12" width="320" height="180"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ff0000" font-size="15" font-family="sans-serif">No Thumbnail</text></svg>');

function defaultFormats() {
  return [2160, 1440, 1080, 720, 480, 360].map(h => ({
    id: `h${h}`, ext: 'mp4', height: h, fps: h >= 1080 ? 60 : 30,
    vcodec: 'avc1', acodec: 'none', tbr: 0
  }));
}

function renderVideoInfo(info) {
  $('#thumb').src = info.thumbnail || FALLBACK_THUMB;
  $('#vidTitle').textContent = info.title || 'Untitled video';
  $('#vidAuthor').textContent = info.author || 'YouTube';
  currentDuration = info.duration || 0;
  $('#vidDur').textContent = fmtShort(currentDuration);
  $('#durBadge').textContent = fmtShort(currentDuration);
  setFields('start', 0);
  setFields('end', currentDuration);
}

async function loadVideo() {
  const url = $('#ytUrl').value.trim();
  if (!url) { showLoadError('Paste a YouTube URL first'); return; }
  if (!/youtube\.com|youtu\.be/.test(url)) { showLoadError('That does not look like a YouTube URL'); return; }

  currentUrl = url;
  const btn = $('#loadBtn');
  btn.dataset.text = 'Load Video';
  setLoading(btn, true, 'Loading…');
  showStatus('Fetching video info…', 'loading');

  try {
    const res = await fetch('/api/formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    formatsCache = data.formats?.length ? data.formats : defaultFormats();
    renderVideoInfo(data);
    selectedQuality = 'auto';
    buildQualityOptions();
    showControls(true);
    showStatus('Video loaded — pick your range and quality', 'success');
    $('#controlsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    try {
      const infoRes = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const info = await infoRes.json();
      if (info.error) throw new Error(info.error);
      formatsCache = defaultFormats();
      renderVideoInfo(info);
      selectedQuality = 'auto';
      buildQualityOptions();
      showControls(true);
      showStatus('Video loaded (format list unavailable, using defaults)', 'success');
    } catch (e2) {
      showLoadError('Error: ' + err.message);
      showStatus('Failed to load video', 'error');
    }
  } finally {
    setLoading(btn, false);
  }
}

// ============================================
// CUT & DOWNLOAD
// ============================================
async function cutVideo() {
  const startSec = getFields('start');
  const endSec = getFields('end');
  const dur = endSec - startSec;
  const format = getSelectedFormat();

  if (!currentUrl) { showStatus('Load a video first', 'error'); return; }
  if (dur <= 0) { showStatus('End time must be after start time', 'error'); return; }
  if (dur > 1800) { showStatus('Clips over 30 minutes may fail — stream URLs expire', 'loading'); }

  const btn = $('#cutBtn');
  btn.dataset.text = 'Cut & Download';
  scissorsEnergy = 5;
  setLoading(btn, true, 'Cutting…');
  showProgress(true);
  showStatus('Connecting to YouTube streams…', 'loading');
  simProgress();

  try {
    const res = await fetch('/api/cut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, start: startSec, end: endSec, format, quality: selectedQuality })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    $('#progressFill').style.width = '100%';
    $('#progressText').textContent = 'Download ready';
    showStatus(`Clip ready (${(data.size / 1024 / 1024).toFixed(1)} MB) — starting download…`, 'success');

    try {
      const resp = await fetch(data.downloadUrl);
      if (!resp.ok) throw new Error('Download failed');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
    } catch {
      window.location.href = data.downloadUrl + '?t=' + Date.now();
    }

    setTimeout(() => showToast(`${data.filename} • ${(data.size / 1024 / 1024).toFixed(1)} MB • ${fmtHMS(dur)}`), 700);
  } catch (e) {
    showStatus('Error: ' + e.message, 'error');
  } finally {
    scissorsEnergy = 2.4;
    setLoading(btn, false);
    stopProgress();
    showProgress(false);
  }
}

function showToast(details) {
  $('#toastDetails').textContent = details;
  $('#successToast').classList.remove('hidden');
  burstConfetti();
  animateToast();
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(hideToast, 8000);
}
function hideToast() {
  $('#successToast').classList.add('hidden');
  cancelAnimationFrame(animToast);
}

// ============================================
// EVENTS & INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initAllZdog();
  renderFormats();
  buildQualityOptions();

  $('#loadBtn').addEventListener('click', loadVideo);
  $('#ytUrl').addEventListener('keydown', e => { if (e.key === 'Enter') loadVideo(); });
  $('#cutBtn').addEventListener('click', cutVideo);
  $('#cutBtn').addEventListener('mouseenter', () => { scissorsEnergy = 3.4; });
  $('#qualityTrigger').addEventListener('click', toggleQualityDropdown);
  $('#toastDismiss').addEventListener('click', hideToast);

  document.addEventListener('mousemove', e => {
    pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  $('#pasteBtn').addEventListener('click', async () => {
    const btn = $('#pasteBtn');
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        $('#ytUrl').value = text.trim();
        btn.textContent = 'Pasted';
        btn.classList.add('done');
        setTimeout(() => { btn.textContent = 'Paste'; btn.classList.remove('done'); }, 1600);
      }
    } catch {
      $('#ytUrl').focus();
      showLoadError('Clipboard permission denied — paste manually');
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.quality-dropdown')) closeQualityDropdown();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeQualityDropdown();
  });

  $$('.time-field').forEach(input => {
    input.addEventListener('blur', () => {
      let v = parseInt(input.value, 10);
      if (isNaN(v)) v = 0;
      if (input.id.includes('M') || input.id.endsWith('S')) v = Math.max(0, Math.min(v, 59));
      else v = Math.max(0, Math.min(v, 99));
      input.value = input.id.endsWith('H') ? v : String(v).padStart(2, '0');
      updateDurationPreview();
    });
    input.addEventListener('input', updateDurationPreview);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const fields = ['startH', 'startM', 'startS', 'endH', 'endM', 'endS'];
        const idx = fields.indexOf(input.id);
        if (idx < fields.length - 1) $('#' + fields[idx + 1]).focus();
        else cutVideo();
      }
    });
    input.addEventListener('paste', e => {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!text.includes(':')) return;
      e.preventDefault();
      const secs = parseTimeString(text);
      if (secs === null) return;
      setFields(input.id.startsWith('start') ? 'start' : 'end', secs);
    });
  });

  window.addEventListener('beforeunload', () => {
    stopProgress();
    [animHero, animOrbs, animLogoYT, animThumbPlay, animArrow, animToast, animScissors, animConfetti].forEach(id => id && cancelAnimationFrame(id));
  });
});
