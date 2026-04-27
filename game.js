const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const state = {
  lives: 20,
  cash: 999,
  wave: 1,
  paused: false,
  speed: 1,
  time: 0,
};

const ui = {
  lives: document.getElementById('lives'),
  cash: document.getElementById('cash'),
  wave: document.getElementById('wave'),
  p: [document.getElementById('p0'), document.getElementById('p1'), document.getElementById('p2')],
  pauseBtn: document.getElementById('pauseBtn'),
  speedBtn: document.getElementById('speedBtn'),
  pauseMenu: document.getElementById('pauseMenu'),
  resumeBtn: document.getElementById('resumeBtn')
};

const pathPoints = [
  { x: 20, y: 80 }, { x: 390, y: 80 }, { x: 390, y: 250 },
  { x: 40, y: 250 }, { x: 40, y: 470 }, { x: 380, y: 470 },
  { x: 380, y: 700 }
];

const enemyTypes = {
  normal: { hp: 30, speed: 40, color: '#e11d48', shape: 'circle' },
  fast: { hp: 20, speed: 75, color: '#facc15', shape: 'triangle' },
  tank: { hp: 110, speed: 24, color: '#111', shape: 'square' },
  armored: { hp: 80, speed: 30, color: '#9333ea', shape: 'hex', armor: 7, metal: true },
};

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
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const segment = Math.hypot(dx, dy);
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
        particles.push({ ...this.getPosition(), t: 0.4, color: 'rgba(255,40,40,0.6)', kind: 'bleed' });
      }
      if (e.bleed.time <= 0) e.bleed = null;
    }
    if (this.hp <= 0) {
      this.dead = true;
      state.cash += 8;
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
    if (proj.bleed) {
      this.effects.bleed = { ...proj.bleed, time: proj.bleed.duration, tickAccum: 0 };
    }
    if (proj.push) {
      const back = proj.push / 100;
      this.progress = Math.max(0, this.progress - back);
    }

    if (this.hp <= 0) {
      this.dead = true;
      state.cash += 8;
    }
  }

  draw() {
    const p = this.getPosition();
    ctx.save();
    ctx.translate(p.x, p.y);

    const c = this.effects.freezeTime > 0 ? '#67e8f9' : this.stats.color;
    if (this.effects.electrified > 0) {
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 16;
    }

    ctx.fillStyle = c;
    drawShape(this.stats.shape, 14);

    if (this.effects.tarred > 0) drawDrips('rgba(0,0,0,0.8)');
    if (this.effects.wet > 0) drawDrips('rgba(80,180,255,0.8)');

    ctx.restore();
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.paths = [0, 0, 0];
    this.cooldown = 0;
  }

  getStats() {
    const levels = this.paths;
    const entries = [upgradeData[0][levels[0]], upgradeData[1][levels[1]], upgradeData[2][levels[2]]];
    return entries.reduce((acc, cur) => ({ ...acc, ...cur }), { dmg: 1, atk: 1, rng: 5 });
  }

  canUpgrade(path) {
    const current = this.paths[path];
    if (current >= 5) return false;
    const used = this.paths.filter(v => v > 0).length;
    if (this.paths[path] === 0 && used >= 2) return false;

    const otherPaths = this.paths.map((v, i) => i !== path ? v : 0);
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

    const stats = this.getStats();
    const rngPx = stats.rng * 14;
    const inRange = enemies.filter(e => !e.dead).map(e => ({ e, p: e.getPosition() }))
      .filter(({ p }) => Math.hypot(p.x - this.x, p.y - this.y) <= rngPx)
      .sort((a, b) => (b.e.pathIndex + b.e.progress) - (a.e.pathIndex + a.e.progress));
    if (!inRange.length) return;

    const pierce = stats.pierce || 1;
    const shot = {
      damage: stats.dmg,
      slow: stats.slow,
      push: stats.push,
      armorPierce: !!stats.armorPierce,
      bleed: stats.bleed,
      freeze: stats.freeze,
      electrified: stats.electrified,
      tarred: stats.tarred,
      wet: stats.wet,
      tagFrozen: this.paths[2] > 0,
    };

    const hitTargets = inRange.slice(0, pierce);
    for (const t of hitTargets) {
      t.e.applyHit(shot);
      projectiles.push({ x: this.x, y: this.y, tx: t.p.x, ty: t.p.y, t: 0.08 });
    }
    this.cooldown = Math.max(0.03, stats.atk);
  }

  draw() {
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
    ctx.fill();

    const stats = this.getStats();
    ctx.strokeStyle = 'rgba(200,200,200,0.15)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, stats.rng * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const towers = [new Tower(210, 360)];
const enemies = [];
const projectiles = [];
const particles = [];

let spawnTimer = 0;
function spawnWave(dt) {
  spawnTimer -= dt;
  if (spawnTimer > 0) return;
  spawnTimer = 0.8;
  const roll = Math.random();
  const type = roll < 0.45 ? 'normal' : roll < 0.7 ? 'fast' : roll < 0.9 ? 'tank' : 'armored';
  enemies.push(new Enemy(type));
}

function drawMap() {
  ctx.fillStyle = '#203146';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 24;
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
    ctx.arc(-8 + i * 8, 14 + (i % 2) * 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateHud() {
  ui.lives.textContent = state.lives;
  ui.cash.textContent = Math.floor(state.cash);
  ui.wave.textContent = state.wave;
  towers[0].paths.forEach((v, i) => ui.p[i].textContent = v);
}

for (const b of document.querySelectorAll('.upgradeRow button')) {
  b.addEventListener('click', () => towers[0].upgrade(Number(b.dataset.path)));
}

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
  state.time += dt;

  if (!state.paused && state.lives > 0) {
    spawnWave(dt);
    towers.forEach(t => t.update(dt, enemies));
    enemies.forEach(e => e.update(dt));
    for (const p of projectiles) p.t -= dt;
    for (const p of particles) p.t -= dt;
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].t <= 0) projectiles.splice(i, 1);
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].t <= 0) particles.splice(i, 1);

  drawMap();
  towers.forEach(t => t.draw());
  enemies.forEach(e => e.draw());
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

  if (state.lives <= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('Game Over', 105, 350);
  }

  updateHud();
  requestAnimationFrame(gameLoop);
}

updateHud();
requestAnimationFrame(gameLoop);
