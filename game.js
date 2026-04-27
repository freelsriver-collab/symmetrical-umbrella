const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const state = {
  lives: 20,
  cash: 500,
  wave: 0,
  maxWave: 5,
  paused: false,
  started: false,
  speed: 1,
  status: 'Ready',
  placingTower: false,
};

const ui = {
  lives: document.getElementById('lives'),
  cash: document.getElementById('cash'),
  wave: document.getElementById('wave'),
  maxWave: document.getElementById('maxWave'),
  status: document.getElementById('status'),
  p: [document.getElementById('p0'), document.getElementById('p1'), document.getElementById('p2')],
  selectedLabel: document.getElementById('selectedLabel'),
  startBtn: document.getElementById('startBtn'),
  placeTowerBtn: document.getElementById('placeTowerBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  speedBtn: document.getElementById('speedBtn'),
  pauseMenu: document.getElementById('pauseMenu'),
  resumeBtn: document.getElementById('resumeBtn'),
};

const BASIC_TOWER_COST = 100;
const ROAD_HALF_WIDTH = 28;

const pathPoints = [
  { x: 40, y: 70 }, { x: 1080, y: 70 }, { x: 1080, y: 210 },
  { x: 90, y: 210 }, { x: 90, y: 430 }, { x: 1020, y: 430 },
  { x: 1020, y: 650 }
];

const enemyTypes = {
  normal: { hp: 45, speed: 45, color: '#ef4444', shape: 'circle' },
  fast: { hp: 30, speed: 88, color: '#facc15', shape: 'triangle' },
  tank: { hp: 170, speed: 26, color: '#111111', shape: 'square' },
  armored: { hp: 120, speed: 34, color: '#9333ea', shape: 'hex', armor: 7, metal: true },
};

const waveData = [
  [ ['normal', 8], ['fast', 4] ],
  [ ['normal', 10], ['tank', 4] ],
  [ ['fast', 10], ['armored', 6] ],
  [ ['tank', 8], ['armored', 8], ['fast', 8] ],
  [ ['normal', 12], ['fast', 12], ['tank', 8], ['armored', 12] ],
];

const upgradeData = {
  0: [
    { dmg: 1, atk: 1, rng: 5 },
    { dmg: 2, atk: 1, rng: 5 },
    { dmg: 4, atk: 0.8, rng: 7 },
    { dmg: 8, atk: 0.8, rng: 9, slow: 0.2, pierce: 3 },
    { dmg: 16, atk: 0.6, rng: 12, slow: 0.3, pierce: 5 },
    { dmg: 48, atk: 0.9, rng: 20, slow: 0.5, pierce: 20 },
  ],
  1: [
    { dmg: 1, atk: 1, rng: 5 },
    { dmg: 1.5, atk: 0.8, rng: 7 },
    { dmg: 3, atk: 0.5, rng: 9 },
    { dmg: 4, atk: 0.3, rng: 11, push: 18 },
    { dmg: 8, atk: 0.1, rng: 15, push: 28, armorPierce: true },
    { dmg: 12, atk: 0.01, rng: 18, armorPierce: true, bleed: { dps: 2, duration: 5, tick: 0.3 } },
  ],
  2: [
    { dmg: 1, atk: 1, rng: 5 },
    { dmg: 1, atk: 1, rng: 10, slow: 0.2 },
    { dmg: 2, atk: 0.9, rng: 11, slow: 0.3, bleed: { dps: 5, duration: 5, tick: 1 } },
    { dmg: 2, atk: 0.7, rng: 15, slow: 0.5, freeze: 0.4, electrified: 4 },
    { dmg: 4, atk: 0.5, rng: 20, slow: 0.5, freeze: 0.4, electrified: 4, tarred: 4, wet: 4 },
    { dmg: 5, atk: 0.5, rng: 20, slow: 0.6, freeze: 0.48, electrified: 4.8, tarred: 4.8, wet: 4.8, bleed: { dps: 6, duration: 6, tick: 1 } },
  ],
};

const upgradeCosts = [0, 50, 80, 140, 240, 420];

let selectedTower = null;
let nextTowerId = 1;
let spawnQueue = [];
let spawnTimer = 0;

class Enemy {
  constructor(type) {
    this.type = type;
    this.stats = enemyTypes[type];
    this.hp = this.stats.hp;
    this.pathIndex = 0;
    this.progress = 0;
    this.dead = false;
    this.effects = { slow: 0, slowTime: 0, freezeTime: 0, electrified: 0, tarred: 0, wet: 0, bleed: null };
  }

  getPosition() {
    const a = pathPoints[this.pathIndex];
    const b = pathPoints[this.pathIndex + 1];
    if (!b) return { ...a };
    return { x: a.x + (b.x - a.x) * this.progress, y: a.y + (b.y - a.y) * this.progress };
  }

  update(dt) {
    if (this.dead) return;
    this.updateEffects(dt);
    if (this.effects.freezeTime > 0) return;

    const start = pathPoints[this.pathIndex];
    const end = pathPoints[this.pathIndex + 1];
    if (!end) {
      this.dead = true;
      state.lives -= 1;
      return;
    }

    const segment = Math.hypot(end.x - start.x, end.y - start.y);
    const move = this.stats.speed * (1 - this.effects.slow) * dt;
    this.progress += move / segment;
    while (this.progress >= 1 && !this.dead) {
      this.progress -= 1;
      this.pathIndex += 1;
      if (!pathPoints[this.pathIndex + 1]) {
        this.dead = true;
        state.lives -= 1;
      }
    }
  }

  updateEffects(dt) {
    const e = this.effects;
    e.slowTime = Math.max(0, e.slowTime - dt);
    if (e.slowTime === 0) e.slow = 0;
    e.freezeTime = Math.max(0, e.freezeTime - dt);
    e.electrified = Math.max(0, e.electrified - dt);
    e.tarred = Math.max(0, e.tarred - dt);
    e.wet = Math.max(0, e.wet - dt);

    if (e.bleed) {
      e.bleed.time -= dt;
      e.bleed.tickAccum += dt;
      if (e.bleed.tickAccum >= e.bleed.tick) {
        e.bleed.tickAccum = 0;
        this.hp -= e.bleed.dps * e.bleed.tick;
        particles.push({ ...this.getPosition(), t: 0.4, color: 'rgba(255,40,40,0.6)' });
      }
      if (e.bleed.time <= 0) e.bleed = null;
    }

    if (this.hp <= 0) {
      this.dead = true;
      state.cash += 10;
    }
  }

  applyHit(proj) {
    const armor = this.stats.armor || 0;
    const canDamage = armor === 0 || proj.armorPierce || proj.damage >= armor;
    if (!canDamage) return;

    let damage = proj.damage;
    if (this.stats.metal && this.effects.electrified > 0) damage *= 1.5;
    if (this.effects.wet > 0 && proj.tagFrozen) damage *= 1.2;
    this.hp -= damage;

    if (proj.slow) {
      this.effects.slow = Math.max(this.effects.slow, proj.slow);
      this.effects.slowTime = Math.max(this.effects.slowTime, 2.5);
    }
    if (proj.freeze) this.effects.freezeTime = Math.max(this.effects.freezeTime, proj.freeze);
    if (proj.electrified) this.effects.electrified = Math.max(this.effects.electrified, proj.electrified);
    if (proj.tarred) this.effects.tarred = Math.max(this.effects.tarred, proj.tarred);
    if (proj.wet) {
      this.effects.wet = Math.max(this.effects.wet, proj.wet);
      this.effects.slow = Math.max(this.effects.slow, 0.05);
      this.effects.slowTime = Math.max(this.effects.slowTime, proj.wet);
    }
    if (proj.bleed) this.effects.bleed = { ...proj.bleed, time: proj.bleed.duration, tickAccum: 0 };
    if (proj.push) this.progress = Math.max(0, this.progress - proj.push / 100);

    if (this.hp <= 0) {
      this.dead = true;
      state.cash += 10;
    }
  }

  draw() {
    const p = this.getPosition();
    ctx.save();
    ctx.translate(p.x, p.y);

    const c = this.effects.freezeTime > 0 ? '#67e8f9' : this.stats.color;
    if (this.effects.electrified > 0) {
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 18;
    }

    ctx.fillStyle = c;
    drawShape(this.stats.shape, 12);
    if (this.effects.tarred > 0) drawDrips('rgba(0,0,0,0.82)');
    if (this.effects.wet > 0) drawDrips('rgba(80,180,255,0.82)');

    ctx.restore();
  }
}

class Tower {
  constructor(x, y) {
    this.id = nextTowerId++;
    this.x = x;
    this.y = y;
    this.paths = [0, 0, 0];
    this.cooldown = 0;
  }

  getStats() {
    const lv = this.paths;
    const entries = [upgradeData[0][lv[0]], upgradeData[1][lv[1]], upgradeData[2][lv[2]]];
    return entries.reduce((acc, cur) => ({ ...acc, ...cur }), { dmg: 1, atk: 1, rng: 5 });
  }

  canUpgrade(path) {
    const current = this.paths[path];
    if (current >= 5) return false;
    const used = this.paths.filter(v => v > 0).length;
    if (this.paths[path] === 0 && used >= 2) return false;

    const otherPaths = this.paths.map((v, i) => (i !== path ? v : 0));
    const otherMax = Math.max(...otherPaths);
    if (current >= 2 && otherMax > 2) return false;
    if (current < 2 && otherMax > 2 && current + 1 > 2) return false;

    return state.cash >= upgradeCosts[current + 1];
  }

  upgrade(path) {
    if (!this.canUpgrade(path)) return;
    const next = this.paths[path] + 1;
    state.cash -= upgradeCosts[next];
    this.paths[path] = next;
    updateHud();
  }

  update(dt, enemies) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const s = this.getStats();
    const rangePx = s.rng * 14;
    const inRange = enemies.filter(e => !e.dead)
      .map(e => ({ e, p: e.getPosition() }))
      .filter(({ p }) => Math.hypot(p.x - this.x, p.y - this.y) <= rangePx)
      .sort((a, b) => (b.e.pathIndex + b.e.progress) - (a.e.pathIndex + a.e.progress));
    if (!inRange.length) return;

    const shot = {
      damage: s.dmg,
      slow: s.slow,
      push: s.push,
      armorPierce: !!s.armorPierce,
      bleed: s.bleed,
      freeze: s.freeze,
      electrified: s.electrified,
      tarred: s.tarred,
      wet: s.wet,
      tagFrozen: this.paths[2] > 0,
    };

    const targets = inRange.slice(0, s.pierce || 1);
    for (const t of targets) {
      t.e.applyHit(shot);
      projectiles.push({ tx: t.p.x, ty: t.p.y, t: 0.07 });
    }
    this.cooldown = Math.max(0.03, s.atk);
  }

  draw() {
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 16, 0, Math.PI * 2);
    ctx.fill();

    if (selectedTower === this) {
      const s = this.getStats();
      ctx.strokeStyle = 'rgba(173,216,230,0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, s.rng * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

const towers = [];
const enemies = [];
const projectiles = [];
const particles = [];

function buildSpawnQueue(waveNumber) {
  const spec = waveData[waveNumber - 1] || [];
  const queue = [];
  for (const [type, count] of spec) {
    for (let i = 0; i < count; i++) queue.push(type);
  }
  return queue;
}

function startGame() {
  if (state.started) return;
  state.started = true;
  state.wave = 1;
  state.status = 'Wave 1';
  spawnQueue = buildSpawnQueue(state.wave);
  ui.startBtn.disabled = true;
  updateHud();
}

function handleWave(dt) {
  if (!state.started || state.lives <= 0 || state.status === 'Win') return;

  spawnTimer -= dt;
  if (spawnQueue.length > 0 && spawnTimer <= 0) {
    const type = spawnQueue.shift();
    enemies.push(new Enemy(type));
    spawnTimer = 0.55;
  }

  if (spawnQueue.length === 0 && enemies.length === 0) {
    if (state.wave >= state.maxWave) {
      state.status = 'Win';
      return;
    }
    state.wave += 1;
    state.status = `Wave ${state.wave}`;
    spawnQueue = buildSpawnQueue(state.wave);
    spawnTimer = 1.2;
  }
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function isOnRoad(x, y) {
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i];
    const b = pathPoints[i + 1];
    if (pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y) <= ROAD_HALF_WIDTH) return true;
  }
  return false;
}

function canPlaceTower(x, y) {
  if (x < 24 || x > canvas.width - 24 || y < 24 || y > canvas.height - 24) return false;
  if (isOnRoad(x, y)) return false;
  for (const t of towers) {
    if (Math.hypot(t.x - x, t.y - y) < 36) return false;
  }
  return true;
}

function screenToCanvas(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

canvas.addEventListener('click', (ev) => {
  const { x, y } = screenToCanvas(ev);

  if (state.placingTower) {
    if (state.cash < BASIC_TOWER_COST) return;
    if (!canPlaceTower(x, y)) return;
    state.cash -= BASIC_TOWER_COST;
    const tower = new Tower(x, y);
    towers.push(tower);
    selectedTower = tower;
    state.placingTower = false;
    ui.placeTowerBtn.classList.remove('secondary');
    updateHud();
    return;
  }

  let hit = null;
  for (const t of towers) {
    if (Math.hypot(t.x - x, t.y - y) <= 18) {
      hit = t;
      break;
    }
  }
  selectedTower = hit;
  updateHud();
});

function drawMap() {
  ctx.fillStyle = '#203146';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = ROAD_HALF_WIDTH * 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function drawShape(shape, r) {
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, r);
    ctx.lineTo(-r, r);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'square') {
    ctx.fillRect(-r, -r, r * 2, r * 2);
  } else if (shape === 'hex') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 / 6) * i;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawDrips(color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-7 + i * 7, 13 + (i % 2) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateHud() {
  ui.lives.textContent = state.lives;
  ui.cash.textContent = Math.floor(state.cash);
  ui.wave.textContent = state.wave;
  ui.maxWave.textContent = state.maxWave;
  ui.status.textContent = state.lives <= 0 ? 'Game Over' : state.status;

  if (selectedTower) {
    ui.selectedLabel.textContent = `Tower #${selectedTower.id}`;
    selectedTower.paths.forEach((v, i) => ui.p[i].textContent = v);
  } else {
    ui.selectedLabel.textContent = 'No tower selected';
    ui.p.forEach((el) => el.textContent = '0');
  }

  for (const b of document.querySelectorAll('.upgradeRow button')) {
    b.disabled = !selectedTower;
  }
}

for (const b of document.querySelectorAll('.upgradeRow button')) {
  b.addEventListener('click', () => {
    if (!selectedTower) return;
    selectedTower.upgrade(Number(b.dataset.path));
  });
}

ui.startBtn.addEventListener('click', startGame);
ui.placeTowerBtn.addEventListener('click', () => {
  if (state.cash < BASIC_TOWER_COST) return;
  state.placingTower = !state.placingTower;
  ui.placeTowerBtn.classList.toggle('secondary', state.placingTower);
});
ui.pauseBtn.addEventListener('click', () => {
  state.paused = !state.paused;
  ui.pauseMenu.classList.toggle('hidden', !state.paused);
  ui.pauseBtn.textContent = state.paused ? 'Paused' : 'Pause';
});
ui.resumeBtn.addEventListener('click', () => {
  state.paused = false;
  ui.pauseMenu.classList.add('hidden');
  ui.pauseBtn.textContent = 'Pause';
});
ui.speedBtn.addEventListener('click', () => {
  state.speed = state.speed === 1 ? 2 : 1;
  ui.speedBtn.textContent = `${state.speed}x`;
});

let last = performance.now();
function gameLoop(now) {
  const rawDt = (now - last) / 1000;
  last = now;
  const dt = Math.min(rawDt, 0.04) * (state.paused ? 0 : state.speed);

  if (!state.paused && state.lives > 0 && state.status !== 'Win') {
    handleWave(dt);
    towers.forEach((t) => t.update(dt, enemies));
    enemies.forEach((e) => e.update(dt));
    for (const p of projectiles) p.t -= dt;
    for (const p of particles) p.t -= dt;
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].t <= 0) projectiles.splice(i, 1);
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].t <= 0) particles.splice(i, 1);

  drawMap();
  towers.forEach((t) => t.draw());
  enemies.forEach((e) => e.draw());

  for (const p of projectiles) {
    ctx.fillStyle = '#d1d5db';
    ctx.beginPath();
    ctx.arc(p.tx, p.ty, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }

  if (state.lives <= 0 || state.status === 'Win') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(state.status === 'Win' ? 'You Win!' : 'Game Over', 430, 360);
  }

  updateHud();
  requestAnimationFrame(gameLoop);
}

updateHud();
requestAnimationFrame(gameLoop);
