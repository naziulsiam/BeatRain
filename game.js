'use strict';

class Soundscape {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.effects = null;
    this.muted = false;
    this.timer = null;
    this.padNodes = [];
    this.beat = 0;
  }

  async init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.effects = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.music.gain.value = 0.2;
      this.effects.gain.value = 0.72;
      this.music.connect(this.master);
      this.effects.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMuted(value) {
    this.muted = value;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(value ? 0 : 0.72, this.ctx.currentTime, 0.035);
    }
  }

  tone(frequency, duration, options = {}) {
    if (!this.ctx || !this.effects) return;
    const now = this.ctx.currentTime + (options.delay || 0);
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    oscillator.type = options.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + duration);
    filter.type = 'lowpass';
    filter.frequency.value = options.filter || 2800;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    if (this.ctx.createStereoPanner && Number.isFinite(options.pan)) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = options.pan;
      gain.connect(panner);
      panner.connect(this.effects);
    } else {
      gain.connect(this.effects);
    }
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
  }

  hit(lane, quality) {
    const scale = [261.63, 329.63, 392, 523.25];
    const root = scale[lane];
    const volume = quality === 'PERFECT' ? 0.2 : quality === 'GREAT' ? 0.16 : 0.12;
    const pan = -0.72 + lane * 0.48;
    this.tone(root, 0.34, { type: 'triangle', volume, pan, filter: 2400 });
    this.tone(root * 2, 0.24, { type: 'sine', volume: volume * 0.42, pan, delay: 0.018 });
  }

  miss() {
    this.tone(145, 0.2, { type: 'sine', endFrequency: 78, volume: 0.09, filter: 500 });
  }

  milestone() {
    [523.25, 659.25, 783.99].forEach((note, index) => this.tone(note, 0.42, { delay: index * 0.07, volume: 0.11, type: 'triangle' }));
  }

  gameOver() {
    [392, 329.63, 261.63].forEach((note, index) => this.tone(note, 0.55, { delay: index * 0.14, volume: 0.11, type: 'sine' }));
  }

  startMusic() {
    if (!this.ctx || this.timer) return;
    const now = this.ctx.currentTime;
    const padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();
    padGain.gain.setValueAtTime(0.0001, now);
    padGain.gain.exponentialRampToValueAtTime(0.07, now + 1.8);
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 620;
    padGain.connect(padFilter);
    padFilter.connect(this.music);
    [65.41, 98].forEach((frequency, index) => {
      const oscillator = this.ctx.createOscillator();
      oscillator.type = index ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index ? 4 : -4;
      oscillator.connect(padGain);
      oscillator.start();
      this.padNodes.push(oscillator);
    });
    this.padNodes.push(padGain);
    this.beat = 0;
    this.timer = window.setInterval(() => this.pulse(), 500);
    this.pulse();
  }

  pulse() {
    if (!this.ctx || !this.music) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const notes = [130.81, 146.83, 164.81, 146.83, 130.81, 174.61, 164.81, 146.83];
    oscillator.type = 'sine';
    oscillator.frequency.value = notes[this.beat % notes.length];
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    oscillator.start(now);
    oscillator.stop(now + 0.46);
    this.beat += 1;
  }

  stopMusic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.padNodes.forEach(node => {
      try {
        if (typeof node.stop === 'function') node.stop();
        if (node.gain && this.ctx) node.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      } catch (_) { /* Node may already be stopped. */ }
    });
    this.padNodes = [];
  }
}

const DIFFICULTIES = {
  easy: { label: 'DRIFT', speed: 0.28, maxSpeed: 0.42, spawn: 0.92, minSpawn: 0.7, tolerance: 0.135, lives: 5 },
  normal: { label: 'FLOW', speed: 0.34, maxSpeed: 0.54, spawn: 0.75, minSpawn: 0.5, tolerance: 0.105, lives: 4 },
  hard: { label: 'RUSH', speed: 0.42, maxSpeed: 0.68, spawn: 0.58, minSpawn: 0.36, tolerance: 0.08, lives: 3 }
};

const COLORS = ['#ff7a88', '#ffd36a', '#66ccff', '#bc8cff'];
const KEY_TO_LANE = { d: 0, f: 1, j: 2, k: 3 };
const sound = new Soundscape();
const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d', { alpha: false });
const stage = document.getElementById('stage');
const shell = document.getElementById('gameShell');
const judgement = document.getElementById('judgement');

let width = 0;
let height = 0;
let dpr = 1;
let selectedDifficulty = 'normal';
let config = DIFFICULTIES.normal;
let animationFrame = 0;
let lastFrame = 0;
let countdownToken = 0;
let isMuted = false;
const heldKeys = new Set();

let state = freshState();

function freshState() {
  return {
    playing: false,
    paused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    hits: 0,
    misses: 0,
    lives: config.lives,
    speed: config.speed,
    spawnClock: 0,
    elapsed: 0,
    notes: [],
    particles: [],
    laneGlow: [0, 0, 0, 0],
    visualTime: 0
  };
}

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = Math.max(1, rect.width);
  height = Math.max(1, rect.height);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem('beatrain_stats_v2') || '{}'); }
  catch (_) { return {}; }
}

function bestScore() {
  return loadStats()[selectedDifficulty] || 0;
}

function saveScore() {
  const stats = loadStats();
  const previous = stats[selectedDifficulty] || 0;
  const improved = state.score > previous;
  if (improved) {
    stats[selectedDifficulty] = state.score;
    try { localStorage.setItem('beatrain_stats_v2', JSON.stringify(stats)); } catch (_) { /* Storage can be disabled. */ }
  }
  return improved;
}

function updateBestScore() {
  const best = bestScore();
  document.getElementById('bestScore').textContent = best ? best.toLocaleString() : '—';
}

function laneGeometry(lane, progress) {
  const t = Math.max(0, Math.min(1.18, progress));
  const depth = Math.pow(Math.min(1, t), 1.62);
  const horizonY = height * 0.11;
  const hitY = height * 0.82;
  const topWidth = width * 0.16;
  const bottomWidth = width * 0.92;
  const roadWidth = topWidth + (bottomWidth - topWidth) * depth;
  const left = width / 2 - roadWidth / 2;
  const laneWidth = roadWidth / 4;
  return { x: left + laneWidth * (lane + 0.5), y: horizonY + (hitY - horizonY) * depth, laneWidth, depth };
}

function roadEdge(side, progress) {
  const geometry = laneGeometry(side < 0 ? 0 : 3, progress);
  return side < 0 ? geometry.x - geometry.laneWidth / 2 : geometry.x + geometry.laneWidth / 2;
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function renderBackground() {
  const bg = context.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, '#07111e');
  bg.addColorStop(0.52, '#08131f');
  bg.addColorStop(1, '#03070d');
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  const horizon = context.createRadialGradient(width / 2, height * 0.12, 0, width / 2, height * 0.12, width * 0.52);
  horizon.addColorStop(0, 'rgba(98,231,245,.18)');
  horizon.addColorStop(0.35, 'rgba(98,231,245,.04)');
  horizon.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = horizon;
  context.fillRect(0, 0, width, height * 0.58);

  context.fillStyle = 'rgba(255,255,255,.12)';
  for (let i = 0; i < 28; i += 1) {
    const seed = (i * 73) % 101;
    const x = (seed / 101) * width;
    const y = ((i * 47) % 83) / 83 * height * 0.45;
    const pulse = 0.35 + Math.sin(state.visualTime * 0.0015 + i) * 0.25;
    context.globalAlpha = pulse;
    context.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }
  context.globalAlpha = 1;
}

function renderRoad() {
  const horizonY = height * 0.11;
  const hitY = height * 0.82;
  const leftTop = roadEdge(-1, 0);
  const rightTop = roadEdge(1, 0);
  const leftBottom = roadEdge(-1, 1.18);
  const rightBottom = roadEdge(1, 1.18);

  const road = context.createLinearGradient(0, horizonY, 0, hitY);
  road.addColorStop(0, 'rgba(12,25,40,.52)');
  road.addColorStop(1, 'rgba(10,18,30,.94)');
  context.beginPath();
  context.moveTo(leftTop, horizonY);
  context.lineTo(rightTop, horizonY);
  context.lineTo(rightBottom, height);
  context.lineTo(leftBottom, height);
  context.closePath();
  context.fillStyle = road;
  context.fill();

  for (let lane = 0; lane < 4; lane += 1) {
    if (state.laneGlow[lane] <= 0) continue;
    const top = laneGeometry(lane, 0);
    const bottom = laneGeometry(lane, 1.18);
    const gradient = context.createLinearGradient(0, horizonY, 0, height);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, hex(COLORS[lane], state.laneGlow[lane] * 0.22));
    context.beginPath();
    context.moveTo(top.x - top.laneWidth / 2, horizonY);
    context.lineTo(top.x + top.laneWidth / 2, horizonY);
    context.lineTo(bottom.x + bottom.laneWidth / 2, height);
    context.lineTo(bottom.x - bottom.laneWidth / 2, height);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();
  }

  context.lineWidth = 1;
  for (let boundary = 0; boundary <= 4; boundary += 1) {
    const topRoad = width * 0.16;
    const bottomRoad = width * 0.92;
    const topX = width / 2 - topRoad / 2 + topRoad * boundary / 4;
    const bottomX = width / 2 - bottomRoad / 2 + bottomRoad * boundary / 4;
    const gradient = context.createLinearGradient(0, horizonY, 0, height);
    gradient.addColorStop(0, 'rgba(145,205,225,.05)');
    gradient.addColorStop(1, 'rgba(145,205,225,.22)');
    context.strokeStyle = gradient;
    context.beginPath();
    context.moveTo(topX, horizonY);
    context.lineTo(bottomX, height);
    context.stroke();
  }

  const gridOffset = (state.visualTime * 0.00012) % 0.12;
  for (let i = 0; i < 10; i += 1) {
    const progress = (i * 0.12 + gridOffset) % 1.2;
    const a = laneGeometry(0, progress);
    const b = laneGeometry(3, progress);
    context.strokeStyle = `rgba(130,195,215,${0.035 + a.depth * 0.11})`;
    context.beginPath();
    context.moveTo(a.x - a.laneWidth / 2, a.y);
    context.lineTo(b.x + b.laneWidth / 2, b.y);
    context.stroke();
  }

  const left = roadEdge(-1, 1);
  const right = roadEdge(1, 1);
  const hitGradient = context.createLinearGradient(left, 0, right, 0);
  hitGradient.addColorStop(0, 'rgba(98,231,245,0)');
  hitGradient.addColorStop(.25, 'rgba(98,231,245,.9)');
  hitGradient.addColorStop(.75, 'rgba(98,242,198,.9)');
  hitGradient.addColorStop(1, 'rgba(98,242,198,0)');
  context.save();
  context.shadowColor = '#62e7f5';
  context.shadowBlur = 18;
  context.strokeStyle = hitGradient;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(left, hitY);
  context.lineTo(right, hitY);
  context.stroke();
  context.restore();
}

function renderNote(note) {
  const geometry = laneGeometry(note.lane, note.progress);
  const tileWidth = Math.max(8, geometry.laneWidth * 0.68);
  const tileHeight = Math.max(5, 8 + geometry.depth * 28);
  const x = geometry.x - tileWidth / 2;
  const y = geometry.y - tileHeight / 2;
  const depth = Math.max(2, 2 + geometry.depth * 7);
  const color = COLORS[note.lane];

  context.save();
  context.globalAlpha = Math.min(1, 0.3 + geometry.depth * 1.1);
  context.shadowColor = color;
  context.shadowBlur = 6 + geometry.depth * 18;
  roundedRect(context, x, y + depth, tileWidth, tileHeight, 4 + geometry.depth * 8);
  context.fillStyle = hex(color, .3 + geometry.depth * .3);
  context.fill();
  roundedRect(context, x, y, tileWidth, tileHeight, 4 + geometry.depth * 8);
  const face = context.createLinearGradient(x, y, x, y + tileHeight);
  face.addColorStop(0, '#f8fbff');
  face.addColorStop(.22, color);
  face.addColorStop(1, hex(color, .64));
  context.fillStyle = face;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255,255,255,.7)';
  context.lineWidth = Math.max(.5, geometry.depth * 1.5);
  context.stroke();
  context.fillStyle = 'rgba(255,255,255,.75)';
  roundedRect(context, x + tileWidth * .16, y + tileHeight * .17, tileWidth * .68, Math.max(1, tileHeight * .12), 4);
  context.fill();
  context.restore();
}

function renderParticles() {
  state.particles.forEach(particle => {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function render() {
  renderBackground();
  renderRoad();
  state.notes.forEach(renderNote);
  renderParticles();
}

function hex(value, alpha) {
  const clean = value.replace('#', '');
  const number = Number.parseInt(clean, 16);
  return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${alpha})`;
}

function spawnNote() {
  const recent = state.notes.filter(note => note.progress < .2).map(note => note.lane);
  const choices = [0, 1, 2, 3].filter(lane => !recent.includes(lane));
  const lane = choices.length ? choices[Math.floor(Math.random() * choices.length)] : Math.floor(Math.random() * 4);
  state.notes.push({ lane, progress: 0, id: `${Date.now()}-${Math.random()}` });
}

function update(delta) {
  if (!state.playing || state.paused) return;
  state.elapsed += delta;
  state.spawnClock += delta;
  const level = Math.min(1, state.elapsed / 80);
  state.speed = config.speed + (config.maxSpeed - config.speed) * level;
  const spawnInterval = config.spawn + (config.minSpawn - config.spawn) * level;
  if (state.spawnClock >= spawnInterval) {
    state.spawnClock %= spawnInterval;
    spawnNote();
  }

  state.notes.forEach(note => { note.progress += state.speed * delta; });
  const missed = state.notes.filter(note => note.progress > 1 + config.tolerance && !note.missed);
  missed.forEach(note => {
    note.missed = true;
    state.misses += 1;
    state.combo = 0;
    state.lives -= 1;
    sound.miss();
    showJudgement('MISS', '#ff657a');
    updateHud();
    updateLives();
    shell.classList.remove('shake');
    void shell.offsetWidth;
    shell.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(35);
    if (state.lives <= 0) finishGame();
  });
  state.notes = state.notes.filter(note => note.progress < 1.22 && !note.hit);

  state.particles.forEach(particle => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 45 * delta;
    particle.life -= delta * 1.8;
  });
  state.particles = state.particles.filter(particle => particle.life > 0);
  state.laneGlow = state.laneGlow.map(value => Math.max(0, value - delta * 2.8));
  document.getElementById('paceLabel').textContent = `${config.label} ${(state.speed / config.speed).toFixed(1)}×`;
}

function loop(timestamp) {
  const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
  lastFrame = timestamp;
  state.visualTime = timestamp;
  update(delta);
  render();
  animationFrame = requestAnimationFrame(loop);
}

function pressLane(lane) {
  const button = document.querySelector(`[data-lane="${lane}"]`);
  button.classList.remove('pressed');
  void button.offsetWidth;
  button.classList.add('pressed');
  window.setTimeout(() => button.classList.remove('pressed'), 120);
  state.laneGlow[lane] = 1;
  if (!state.playing || state.paused) return;

  let closest = null;
  let distance = Infinity;
  state.notes.forEach(note => {
    if (note.lane !== lane || note.hit || note.missed) return;
    const candidate = Math.abs(1 - note.progress);
    if (candidate < distance) { closest = note; distance = candidate; }
  });
  if (!closest || distance > config.tolerance) return;

  closest.hit = true;
  state.hits += 1;
  state.combo += 1;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const accuracy = 1 - distance / config.tolerance;
  const quality = accuracy > .72 ? 'PERFECT' : accuracy > .38 ? 'GREAT' : 'GOOD';
  const base = quality === 'PERFECT' ? 120 : quality === 'GREAT' ? 90 : 65;
  const multiplier = 1 + Math.min(state.combo, 50) * .025;
  state.score += Math.round(base * multiplier);
  sound.hit(lane, quality);
  burst(lane, closest.progress, quality === 'PERFECT' ? 14 : 8);
  showJudgement(quality, quality === 'PERFECT' ? '#62f2c6' : quality === 'GREAT' ? '#ffd36a' : '#66ccff');
  if (navigator.vibrate) navigator.vibrate(quality === 'PERFECT' ? 14 : 8);
  if ([10, 25, 50, 100].includes(state.combo)) {
    sound.milestone();
    showJudgement(`${state.combo} COMBO`, '#ffffff');
  }
  updateHud();
}

function burst(lane, progress, amount) {
  const geometry = laneGeometry(lane, progress);
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 35 + Math.random() * 90;
    state.particles.push({
      x: geometry.x,
      y: geometry.y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      size: 2 + Math.random() * 3,
      life: .7 + Math.random() * .3,
      color: COLORS[lane]
    });
  }
}

function showJudgement(text, color) {
  judgement.textContent = text;
  judgement.style.color = color;
  judgement.classList.remove('show');
  void judgement.offsetWidth;
  judgement.classList.add('show');
}

function updateHud() {
  document.getElementById('scoreDisplay').textContent = state.score.toLocaleString();
  document.getElementById('comboDisplay').textContent = state.combo;
}

function buildLives() {
  document.getElementById('lives').innerHTML = Array.from({ length: config.lives }, () => '<span class="life"></span>').join('');
}

function updateLives() {
  document.querySelectorAll('.life').forEach((life, index) => life.classList.toggle('lost', index >= state.lives));
}

function setScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === id));
}

async function countdown() {
  const token = ++countdownToken;
  const display = document.getElementById('countdown');
  for (const label of ['3', '2', '1', 'GO']) {
    if (token !== countdownToken) return false;
    display.textContent = label;
    display.classList.remove('show');
    void display.offsetWidth;
    display.classList.add('show');
    await new Promise(resolve => window.setTimeout(resolve, label === 'GO' ? 460 : 650));
  }
  return token === countdownToken;
}

async function startGame() {
  await sound.init();
  sound.stopMusic();
  config = DIFFICULTIES[selectedDifficulty];
  state = freshState();
  state.playing = true;
  state.paused = true;
  buildLives();
  updateHud();
  updateLives();
  resizeCanvas();
  setScreen('');
  const completed = await countdown();
  if (!completed || !state.playing) return;
  state.paused = false;
  state.spawnClock = config.spawn * .58;
  lastFrame = performance.now();
  sound.startMusic();
}

function togglePause(forcePause = false) {
  if (!state.playing) return;
  const shouldPause = forcePause || !state.paused;
  if (state.paused === shouldPause) return;
  state.paused = shouldPause;
  if (shouldPause) {
    sound.stopMusic();
    setScreen('pauseScreen');
  } else {
    setScreen('');
    lastFrame = performance.now();
    sound.startMusic();
  }
}

function quitToMenu() {
  countdownToken += 1;
  state.playing = false;
  state.paused = false;
  sound.stopMusic();
  setScreen('startScreen');
  updateBestScore();
}

function finishGame() {
  if (!state.playing) return;
  state.playing = false;
  state.paused = false;
  sound.stopMusic();
  sound.gameOver();
  const total = state.hits + state.misses;
  const accuracy = total ? state.hits / total : 0;
  const rank = accuracy >= .95 ? 'S' : accuracy >= .82 ? 'A' : accuracy >= .66 ? 'B' : 'C';
  document.getElementById('rank').textContent = rank;
  document.getElementById('resultTitle').textContent = rank === 'S' ? 'Beautiful flow.' : rank === 'A' ? 'Great rhythm.' : rank === 'B' ? 'Good momentum.' : 'Keep finding the beat.';
  document.getElementById('finalScore').textContent = state.score.toLocaleString();
  document.getElementById('finalCombo').textContent = state.maxCombo;
  document.getElementById('finalAccuracy').textContent = `${Math.round(accuracy * 100)}%`;
  document.getElementById('newBest').classList.toggle('visible', saveScore());
  setScreen('resultScreen');
}

document.querySelectorAll('[data-difficulty]').forEach(button => {
  button.addEventListener('click', () => {
    selectedDifficulty = button.dataset.difficulty;
    document.querySelectorAll('[data-difficulty]').forEach(item => item.classList.toggle('active', item === button));
    updateBestScore();
  });
});

document.querySelectorAll('[data-lane]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    pressLane(Number(button.dataset.lane));
  });
});

document.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'escape' || key === 'p') {
    event.preventDefault();
    togglePause();
    return;
  }
  if (Object.prototype.hasOwnProperty.call(KEY_TO_LANE, key) && !heldKeys.has(key)) {
    event.preventDefault();
    heldKeys.add(key);
    pressLane(KEY_TO_LANE[key]);
  }
});

document.addEventListener('keyup', event => heldKeys.delete(event.key.toLowerCase()));
document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('replayButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', () => togglePause());
document.getElementById('resumeButton').addEventListener('click', () => togglePause());
document.getElementById('quitButton').addEventListener('click', quitToMenu);
document.getElementById('menuButton').addEventListener('click', quitToMenu);
document.getElementById('soundButton').addEventListener('click', event => {
  isMuted = !isMuted;
  sound.setMuted(isMuted);
  event.currentTarget.setAttribute('aria-pressed', String(isMuted));
  event.currentTarget.setAttribute('aria-label', isMuted ? 'Enable sound' : 'Mute sound');
  event.currentTarget.textContent = isMuted ? '×' : '♫';
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.playing && !state.paused) togglePause(true);
});
window.addEventListener('blur', () => {
  if (state.playing && !state.paused) togglePause(true);
});
window.addEventListener('resize', resizeCanvas, { passive: true });
window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 150), { passive: true });

resizeCanvas();
buildLives();
updateBestScore();
animationFrame = requestAnimationFrame(loop);
