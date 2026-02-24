// ============== AUDIO ENGINE ==============
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;
    this.bgNodes = null;
    this.masterGain = null;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  setMute(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  getNoteFrequency(lane, variation = 0) {
    const baseNotes = [
      [261.63, 293.66, 329.63],
      [392.00, 440.00, 493.88],
      [523.25, 587.33, 659.25],
      [783.99, 880.00, 987.77]
    ];
    const notes = baseNotes[lane] || baseNotes[0];
    return notes[variation % notes.length];
  }

  playNote(lane) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freq = this.getNoteFrequency(lane, Math.floor(Math.random() * 3));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playMiss() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playGameOver() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [200, 150, 100].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.2, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.3);
    });
  }

  startBackgroundBeat() {
    if (!this.ctx) return;
    this.stopBackgroundBeat();

    const bpm = 120;
    const beatLen = 60 / bpm;
    let nextBeat = this.ctx.currentTime + 0.05;

    const kickDrum = (t) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    };

    const hiHat = (t, accent = false) => {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      source.buffer = buf;
      gain.gain.setValueAtTime(accent ? 0.12 : 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
    };

    const bass = (t, freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + beatLen * 0.9);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + beatLen);
    };

    const bassLine = [65.41, 65.41, 87.31, 82.41, 65.41, 65.41, 73.42, 77.78];
    let beatCount = 0;

    const scheduleBeat = () => {
      while (nextBeat < this.ctx.currentTime + 0.3) {
        const beat = beatCount % 4;
        if (beat === 0 || beat === 2) kickDrum(nextBeat);
        hiHat(nextBeat, beat === 0 || beat === 2);
        hiHat(nextBeat + beatLen * 0.5, false);
        bass(nextBeat, bassLine[beatCount % bassLine.length]);
        nextBeat += beatLen;
        beatCount++;
      }
    };

    scheduleBeat();
    this._bgInterval = setInterval(scheduleBeat, 100);
  }

  stopBackgroundBeat() {
    if (this._bgInterval) {
      clearInterval(this._bgInterval);
      this._bgInterval = null;
    }
  }
}

// ============== DIFFICULTY CONFIGS ==============
const DIFFICULTIES = {
  easy: {
    baseSpeed: 2.5,
    maxSpeed: 8,
    speedIncrement: 0.1,
    speedIncreaseInterval: 7000,
    baseSpawnInterval: 900,
    minSpawnInterval: 500,
    hitTolerance: 60,
    maxLives: 5
  },
  normal: {
    baseSpeed: 3,
    maxSpeed: 12,
    speedIncrement: 0.15,
    speedIncreaseInterval: 5000,
    baseSpawnInterval: 700,
    minSpawnInterval: 300,
    hitTolerance: 45,
    maxLives: 3
  },
  hard: {
    baseSpeed: 4.5,
    maxSpeed: 16,
    speedIncrement: 0.25,
    speedIncreaseInterval: 3500,
    baseSpawnInterval: 500,
    minSpawnInterval: 200,
    hitTolerance: 30,
    maxLives: 2
  }
};

// ============== GAME CONFIG ==============
const CONFIG = {
  lanes: 4,
  laneColors: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
  noteHeight: 80,
  hitZoneY: 100
};

const KEY_MAP = { 'd': 0, 'D': 0, 'f': 1, 'F': 1, 'j': 2, 'J': 2, 'k': 3, 'K': 3 };

const COMBO_MILESTONES = [
  { count: 10, label: '10 COMBO!', color: '#48dbfb' },
  { count: 25, label: '25 COMBO!', color: '#feca57' },
  { count: 50, label: '50 COMBO! 🔥', color: '#ff9ff3' },
  { count: 100, label: '100 COMBO!!', color: '#00e5bf' }
];

// ============== GAME STATE ==============
let diff = { ...DIFFICULTIES.normal };
let selectedDifficulty = 'normal';

let state = {
  playing: false,
  paused: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  notesHit: 0,
  notesMissed: 0,
  lives: diff.maxLives,
  speed: diff.baseSpeed,
  notes: [],
  lastSpawn: 0,
  lastSpeedIncrease: 0,
  startTime: 0,
  invincible: false
};

// ============== LOCAL STORAGE ==============
function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('beatrain_stats') || '{}');
  } catch { return {}; }
}

function saveStats(stats) {
  localStorage.setItem('beatrain_stats', JSON.stringify(stats));
}

function getHighScore(difficulty) {
  return loadStats()[`hs_${difficulty}`] || 0;
}

function updateHighScore(difficulty, score) {
  const stats = loadStats();
  const key = `hs_${difficulty}`;
  const prev = stats[key] || 0;
  const isNew = score > prev;
  if (isNew) {
    stats[key] = score;
    saveStats(stats);
  }
  return isNew;
}

// ============== CANVAS SETUP ==============
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const audio = new AudioEngine();

let canvasW = 0, canvasH = 0, laneW = 0;

function resizeCanvas() {
  const area = document.getElementById('gameArea');
  const rect = area.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvasW = rect.width;
  canvasH = rect.height;
  laneW = canvasW / CONFIG.lanes;
}

// ============== NOTE DRAWING ==============
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawMusicNote(x, y, w, h, lane, type) {
  const color = CONFIG.laneColors[lane];
  const cx = x + w / 2;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.translate(cx, y + h / 2);
  switch (type) {
    case 0: drawQuarterNote(0, 0, 20, color); break;
    case 1: drawEighthNote(0, 0, 20, color); break;
    case 2: drawBeamedNotes(0, 0, 18, color); break;
    case 3: drawSixteenthNote(0, 0, 20, color); break;
  }
  ctx.restore();
}

function drawQuarterNote(x, y, size, color) {
  ctx.beginPath();
  ctx.ellipse(x, y + 8, size * 0.4, size * 0.28, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y + 5);
  ctx.lineTo(x + size * 0.3, y - size * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawEighthNote(x, y, size, color) {
  ctx.beginPath();
  ctx.ellipse(x, y + 8, size * 0.4, size * 0.28, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y + 5);
  ctx.lineTo(x + size * 0.3, y - size * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y - size * 0.8);
  ctx.quadraticCurveTo(x + size * 0.7, y - size * 0.5, x + size * 0.5, y - size * 0.1);
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawBeamedNotes(x, y, size, color) {
  ctx.beginPath();
  ctx.ellipse(x - size * 0.4, y + 6, size * 0.35, size * 0.25, -0.25, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.3, y + 2, size * 0.35, size * 0.25, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.1, y + 4);
  ctx.lineTo(x - size * 0.1, y - size * 0.7);
  ctx.moveTo(x + size * 0.6, y);
  ctx.lineTo(x + size * 0.6, y - size * 0.7);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.1, y - size * 0.7);
  ctx.lineTo(x + size * 0.6, y - size * 0.7);
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawSixteenthNote(x, y, size, color) {
  ctx.beginPath();
  ctx.ellipse(x, y + 8, size * 0.4, size * 0.28, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y + 5);
  ctx.lineTo(x + size * 0.3, y - size * 0.8);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y - size * 0.8);
  ctx.quadraticCurveTo(x + size * 0.7, y - size * 0.6, x + size * 0.5, y - size * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.3, y - size * 0.6);
  ctx.quadraticCurveTo(x + size * 0.7, y - size * 0.4, x + size * 0.5, y - size * 0.1);
  ctx.stroke();
}

// ============== RENDERING ==============
function drawLanes() {
  for (let i = 0; i < CONFIG.lanes; i++) {
    const grad = ctx.createLinearGradient(0, canvasH - 150, 0, canvasH);
    const baseColor = CONFIG.laneColors[i];
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, hexToRgba(baseColor, 0.055));
    ctx.fillStyle = grad;
    ctx.fillRect(i * laneW, canvasH - 150, laneW, 150);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < CONFIG.lanes; i++) {
    ctx.beginPath();
    ctx.moveTo(i * laneW, 0);
    ctx.lineTo(i * laneW, canvasH);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvasW, canvasH);
  drawLanes();
  state.notes.forEach(note => {
    if (!note.hit) {
      drawMusicNote(note.lane * laneW, note.y, laneW, CONFIG.noteHeight, note.lane, note.type);
    }
  });
}

// ============== GAME LOGIC ==============
function spawnNote(timestamp) {
  const interval = Math.max(
    diff.minSpawnInterval,
    diff.baseSpawnInterval - (state.speed - diff.baseSpeed) * 30
  );
  if (timestamp - state.lastSpawn >= interval) {
    const lane = Math.floor(Math.random() * CONFIG.lanes);
    state.notes.push({ lane, y: -CONFIG.noteHeight, type: Math.floor(Math.random() * 4), hit: false });
    state.lastSpawn = timestamp;
  }
}

function updateSpeed(timestamp) {
  if (timestamp - state.lastSpeedIncrease >= diff.speedIncreaseInterval) {
    if (state.speed < diff.maxSpeed) {
      state.speed += diff.speedIncrement;
      document.getElementById('speedDisplay').textContent = state.speed.toFixed(1);
    }
    state.lastSpeedIncrease = timestamp;
  }
}

function update(timestamp) {
  if (!state.playing || state.paused) return;

  spawnNote(timestamp);
  updateSpeed(timestamp);

  const hitLine = canvasH - CONFIG.hitZoneY;

  state.notes = state.notes.filter(note => {
    note.y += state.speed;

    if (!note.hit && note.y > hitLine + diff.hitTolerance) {
      note.hit = true;
      state.notesMissed++;
      if (!state.invincible) {
        loseLife();
        showFeedback(note.lane, 'MISS', '#ff4757');
        state.combo = 0;
        updateUI();
      }
    }

    return note.y < canvasH + 50;
  });
}

function gameLoop(timestamp) {
  if (!state.playing) return;
  update(timestamp);
  render();
  requestAnimationFrame(gameLoop);
}

// ============== INPUT HANDLING ==============
function flashLane(lane) {
  const flashes = document.querySelectorAll('.lane-flash');
  if (flashes[lane]) {
    flashes[lane].classList.remove('flash');
    void flashes[lane].offsetWidth; // reflow to restart anim
    flashes[lane].classList.add('flash');
  }
}

function triggerLanePress(laneIndex) {
  const lanes = document.querySelectorAll('.touch-lane');
  if (lanes[laneIndex]) {
    lanes[laneIndex].classList.add('pressed');
    setTimeout(() => lanes[laneIndex].classList.remove('pressed'), 150);
  }
}

function handleInput(lane) {
  if (!state.playing || state.paused) return;

  const hitLine = canvasH - CONFIG.hitZoneY;
  let closestNote = null;
  let minDist = diff.hitTolerance;

  state.notes.forEach(note => {
    if (note.lane === lane && !note.hit) {
      const noteCenter = note.y + CONFIG.noteHeight / 2;
      const dist = Math.abs(noteCenter - hitLine);
      if (dist < minDist) {
        minDist = dist;
        closestNote = note;
      }
    }
  });

  if (closestNote) {
    closestNote.hit = true;
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.notesHit++;

    const accuracy = 1 - (minDist / diff.hitTolerance);
    const points = Math.floor(100 * accuracy * (1 + state.combo * 0.1));
    state.score += points;

    audio.playNote(lane);
    flashLane(lane);

    let text, color;
    if (minDist < diff.hitTolerance * 0.33) {
      text = 'PERFECT'; color = '#00e5bf';
    } else if (minDist < diff.hitTolerance * 0.66) {
      text = 'GREAT'; color = '#feca57';
    } else {
      text = 'OK'; color = '#48dbfb';
    }
    showFeedback(lane, text, color);

    // Check combo milestone
    checkComboMilestone(state.combo);

  } else {
    if (!state.invincible) {
      loseLife();
      audio.playMiss();
      showFeedback(lane, 'MISS', '#ff4757');
      state.combo = 0;
    }
  }

  updateUI();
}

function checkComboMilestone(combo) {
  const milestone = COMBO_MILESTONES.find(m => m.count === combo);
  if (!milestone) return;

  // Change hit-line color
  document.querySelector('.hit-line').style.cssText =
    `background: ${milestone.color}; box-shadow: 0 0 20px ${milestone.color}, 0 0 40px ${milestone.color}40;`;
  document.documentElement.style.setProperty('--hit-line-color', milestone.color);

  // Show banner
  const banner = document.getElementById('comboBanner');
  banner.textContent = milestone.label;
  banner.style.color = milestone.color;
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 1300);
}

// ============== LIVES & FEEDBACK ==============
function loseLife() {
  state.lives--;
  updateLivesDisplay();

  document.querySelector('.game-wrapper').classList.add('screen-shake');
  setTimeout(() => document.querySelector('.game-wrapper').classList.remove('screen-shake'), 300);

  // Invincibility grace period (1 second)
  state.invincible = true;
  const overlay = document.getElementById('invincibleOverlay');
  overlay.classList.add('active');
  setTimeout(() => {
    state.invincible = false;
    overlay.classList.remove('active');
  }, 1000);

  if (state.lives <= 0) endGame();
}

function updateLivesDisplay() {
  const hearts = document.querySelectorAll('.life');
  hearts.forEach((heart, i) => {
    heart.classList.toggle('lost', i >= state.lives);
  });
}

function showFeedback(lane, text, color) {
  const area = document.getElementById('gameArea');
  const feedback = document.createElement('div');
  feedback.className = 'hit-feedback';
  feedback.textContent = text;
  feedback.style.color = color;
  feedback.style.left = (lane * laneW + laneW / 2) + 'px';
  feedback.style.top = (canvasH - CONFIG.hitZoneY - 50) + 'px';
  area.appendChild(feedback);
  setTimeout(() => feedback.remove(), 500);
}

// ============== UI UPDATES ==============
function updateUI() {
  document.getElementById('scoreDisplay').textContent = state.score;
  document.getElementById('comboDisplay').textContent = state.combo;
}

function buildLivesUI(maxLives) {
  const container = document.getElementById('livesContainer');
  container.innerHTML = '';
  for (let i = 0; i < maxLives; i++) {
    container.innerHTML += `<div class="life"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>`;
  }
}

function updateStartScreenStats() {
  const hs = getHighScore(selectedDifficulty);
  document.getElementById('highscoreValue').textContent = hs > 0 ? hs.toLocaleString() : '—';
}

// ============== ACCURACY RATING ==============
function getAccuracyRating(notesHit, notesMissed) {
  const total = notesHit + notesMissed;
  if (total === 0) return { rank: 'C', cls: 'c-rank' };
  const pct = notesHit / total;
  if (pct >= 0.95) return { rank: 'S', cls: 's-rank' };
  if (pct >= 0.80) return { rank: 'A', cls: 'a-rank' };
  if (pct >= 0.60) return { rank: 'B', cls: 'b-rank' };
  return { rank: 'C', cls: 'c-rank' };
}

// ============== PAUSE ==============
function togglePause() {
  if (!state.playing) return;
  state.paused = !state.paused;
  const pauseScreen = document.getElementById('pauseScreen');
  const pauseBtn = document.getElementById('pauseBtn');

  if (state.paused) {
    pauseScreen.classList.add('active');
    pauseBtn.textContent = '▶';
    audio.stopBackgroundBeat();
  } else {
    pauseScreen.classList.remove('active');
    pauseBtn.textContent = '⏸';
    audio.startBackgroundBeat();
    requestAnimationFrame(gameLoop);
  }
}

// ============== GAME FLOW ==============
function startGame() {
  audio.init();
  diff = { ...DIFFICULTIES[selectedDifficulty] };

  state = {
    playing: true,
    paused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    notesHit: 0,
    notesMissed: 0,
    lives: diff.maxLives,
    speed: diff.baseSpeed,
    notes: [],
    lastSpawn: 0,
    lastSpeedIncrease: 0,
    startTime: performance.now(),
    invincible: false
  };

  // Reset hit-line color
  const hitLine = document.querySelector('.hit-line');
  hitLine.style.cssText = '';

  buildLivesUI(diff.maxLives);
  updateUI();
  updateLivesDisplay();
  document.getElementById('speedDisplay').textContent = diff.baseSpeed.toFixed(1);
  document.getElementById('startScreen').classList.remove('active');
  document.getElementById('gameOverScreen').classList.remove('active');
  document.getElementById('pauseScreen').classList.remove('active');
  document.getElementById('pauseBtn').textContent = '⏸';
  document.getElementById('pauseBtn').style.display = '';

  audio.startBackgroundBeat();
  requestAnimationFrame(gameLoop);
}

function endGame() {
  state.playing = false;
  audio.stopBackgroundBeat();
  audio.playGameOver();

  document.getElementById('pauseBtn').style.display = 'none';

  // Stats
  const rating = getAccuracyRating(state.notesHit, state.notesMissed);
  const isNewBest = updateHighScore(selectedDifficulty, state.score);

  document.getElementById('finalScore').textContent = state.score.toLocaleString();
  document.getElementById('finalCombo').textContent = state.maxCombo;
  document.getElementById('finalNotes').textContent = state.notesHit;

  const badge = document.getElementById('accuracyBadge');
  badge.textContent = rating.rank;
  badge.className = `accuracy-badge ${rating.cls}`;

  const newBest = document.getElementById('newBestBadge');
  newBest.classList.toggle('visible', isNewBest);

  document.getElementById('gameOverScreen').classList.add('active');
}

// ============== DIFFICULTY SELECTOR ==============
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = btn.dataset.diff;
    updateStartScreenStats();
  });
});

// ============== MUTE ==============
let isMuted = false;
document.getElementById('muteBtn').addEventListener('click', () => {
  isMuted = !isMuted;
  audio.setMute(isMuted);
  const btn = document.getElementById('muteBtn');
  btn.classList.toggle('muted', isMuted);
  btn.textContent = isMuted ? '🔇' : '🔊';
});

// ============== PAUSE BUTTON ==============
document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('resumeBtn').addEventListener('click', togglePause);

// ============== GAME BUTTONS ==============
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// ============== KEYBOARD ==============
const pressedKeys = new Set();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { togglePause(); return; }
  if (KEY_MAP.hasOwnProperty(e.key) && !pressedKeys.has(e.key)) {
    pressedKeys.add(e.key);
    const laneIdx = KEY_MAP[e.key];
    triggerLanePress(laneIdx);
    handleInput(laneIdx);
  }
});

document.addEventListener('keyup', (e) => {
  pressedKeys.delete(e.key);
});

// ============== TOUCH CONTROLS ==============
document.querySelectorAll('.touch-lane').forEach(lane => {
  const laneIndex = parseInt(lane.dataset.lane);
  lane.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput(laneIndex);
  }, { passive: false });
  lane.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleInput(laneIndex);
  });
});

// ============== RESIZE ==============
window.addEventListener('resize', resizeCanvas);

// ============== INIT ==============
resizeCanvas();
buildLivesUI(DIFFICULTIES.normal.maxLives);
updateStartScreenStats();
document.getElementById('pauseBtn').style.display = 'none';
