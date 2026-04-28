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
  selectedStats: document.getElementById('selectedStats'),
  towerSelect: document.getElementById('towerSelect'),
  shopTowerMeta: document.getElementById('shopTowerMeta'),
  startBtn: document.getElementById('startBtn'),
  placeTowerBtn: document.getElementById('placeTowerBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  speedBtn: document.getElementById('speedBtn'),
  pauseMenu: document.getElementById('pauseMenu'),
  resumeBtn: document.getElementById('resumeBtn'),
};

const ROAD_HALF_WIDTH = 28;
const pathPoints = [
  { x: 40, y: 70 }, { x: 1080, y: 70 }, { x: 1080, y: 210 }, { x: 90, y: 210 },
  { x: 90, y: 430 }, { x: 1020, y: 430 }, { x: 1020, y: 650 }
];

function enemyDef(name, hp, spd, color, shape, extra = {}) {
  return { name, hp, speed: spd * 30, color, shape, ...extra };
}

const enemyTypes = {
  normal: enemyDef('Normal', 45, 1.5, '#ef4444', 'circle'),
  fast: enemyDef('Fast', 30, 2.9, '#facc15', 'triangle'),
  tank: enemyDef('Tank', 170, 0.85, '#111111', 'square'),
  armored: enemyDef('Armored', 120, 1.1, '#9333ea', 'hex', { armor: 7, metal: true }),
  swarmling: enemyDef('Swarmling', 5, 1.5, '#dc2626', 'tinyDot', { size: 5 }),
  charger: enemyDef('Charger', 35, 2.5, '#f97316', 'arrow'),
  brute: enemyDef('Brute', 90, 0.6, '#7f1d1d', 'square'),
  shieldUnit: enemyDef('Shield Unit', 30, 1, '#2563eb', 'hex', { armor: 10, metal: true }),
  phantom: enemyDef('Phantom', 25, 1.5, 'rgba(255,255,255,0.55)', 'circle', { alpha: 0.6 }),
  juggernaut: enemyDef('Juggernaut', 150, 0.4, '#050505', 'bigSquare', { armor: 15, metal: true, size: 17 }),
  scout: enemyDef('Scout', 10, 3, '#22c55e', 'smallTriangle', { size: 9 }),
  splitter: enemyDef('Splitter', 25, 1, '#ef4444', 'crackedCircle'),
  toxicBlob: enemyDef('Toxic Blob', 35, 0.8, '#16a34a', 'slime'),
  frostWalker: enemyDef('Frost Walker', 40, 0.9, '#7dd3fc', 'square'),
  shockUnit: enemyDef('Shock Unit', 30, 1.2, '#fde047', 'hex', { electrified: true, metal: true }),
  heavyGuard: enemyDef('Heavy Guard', 80, 0.7, '#581c87', 'hex', { armor: 12, metal: true }),
  bomber: enemyDef('Bomber', 20, 1, '#dc2626', 'coreCircle'),
  leech: enemyDef('Leech', 18, 1.3, '#0a0a0a', 'oval'),
  glassCannon: enemyDef('Glass Cannon', 10, 2, '#67e8f9', 'crackedTriangle'),
  warMachine: enemyDef('War Machine', 120, 0.6, '#9ca3af', 'square', { armor: 20, metal: true }),
  swarmQueen: enemyDef('Swarm Queen', 200, 0.7, '#b91c1c', 'blob', { size: 18 }),
  wisp: enemyDef('Wisp', 15, 2, '#ffffff', 'orbGlow'),
  crusher: enemyDef('Crusher', 110, 0.5, '#374151', 'cube', { size: 16 }),
  speedDemon: enemyDef('Speed Demon', 25, 3.5, '#eab308', 'blur'),
  ironclad: enemyDef('Ironclad', 100, 0.8, '#64748b', 'hex', { armor: 25, metal: true }),
  splitSwarm: enemyDef('Split Swarm', 30, 1.2, '#ef4444', 'cluster'),
  corruptor: enemyDef('Corruptor', 45, 1, '#7e22ce', 'glitch'),
  flameSpirit: enemyDef('Flame Spirit', 35, 1.3, '#fb923c', 'flameOrb'),
  iceGolem: enemyDef('Ice Golem', 120, 0.5, '#22d3ee', 'bigSquare', { size: 16 }),
  stormCore: enemyDef('Storm Core', 60, 1.2, '#facc15', 'lightningBall'),
  parasite: enemyDef('Parasite', 8, 2, '#111827', 'tinyDot', { size: 4 }),
  overloader: enemyDef('Overloader', 70, 1, '#a855f7', 'hex', { armor: 10, metal: true }),
  titan: enemyDef('Titan', 250, 0.3, '#111111', 'bigSquare', { size: 19 }),
  bladeRunner: enemyDef('Blade Runner', 30, 2.5, '#9ca3af', 'triangle'),
  nanoSwarm: enemyDef('Nano Swarm', 15, 1.8, '#94a3b8', 'pixels'),
  reactorUnit: enemyDef('Reactor Unit', 90, 0.9, '#ef4444', 'coreCircle', { metal: true }),
  voidWalker: enemyDef('Void Walker', 80, 1, '#4c1d95', 'voidCircle'),
  magnetizedUnit: enemyDef('Magnetized Unit', 50, 1, '#ef4444', 'magnet', { armor: 8, metal: true }),
  pulseBeast: enemyDef('Pulse Beast', 70, 1.1, '#a78bfa', 'ring'),
  riftEntity: enemyDef('Rift Entity', 95, 1, '#7c3aed', 'distort'),
  bloodSpawn: enemyDef('Blood Spawn', 60, 1, '#b91c1c', 'dripBlob'),
  boneWalker: enemyDef('Bone Walker', 75, 0.9, '#e7e5e4', 'skeletalSquare'),
  steamConstruct: enemyDef('Steam Construct', 65, 1, '#94a3b8', 'cloudCube'),
  inkHorror: enemyDef('Ink Horror', 85, 0.8, '#0f0f0f', 'dripBlob'),
  soundWaver: enemyDef('Sound Waver', 40, 1.5, '#c4b5fd', 'vibrate'),
  paperPhantom: enemyDef('Paper Phantom', 30, 1.7, '#f8fafc', 'sheet'),
  glitchEntity: enemyDef('Glitch Entity', 70, 1.2, '#a855f7', 'glitch'),
  pixelBeast: enemyDef('Pixel Beast', 90, 0.9, '#60a5fa', 'blocky'),
  neonRunner: enemyDef('Neon Runner', 35, 3, '#f43f5e', 'blur'),
  quantumCore: enemyDef('Quantum Core', 150, 1, '#c084fc', 'orbGlow', { metal: true }),
};

const waveData = [
  [['normal', 8], ['fast', 4], ['swarmling', 12], ['scout', 8]],
  [['brute', 8], ['charger', 8], ['shieldUnit', 6], ['splitter', 8]],
  [['toxicBlob', 8], ['frostWalker', 8], ['shockUnit', 8], ['heavyGuard', 6]],
  [['warMachine', 6], ['juggernaut', 6], ['speedDemon', 8], ['ironclad', 5], ['wisp', 8], ['crusher', 5]],
  [['titan', 2], ['swarmQueen', 2], ['quantumCore', 2], ['neonRunner', 10], ['glitchEntity', 8], ['overloader', 6]],
];

const upgradeCosts = [0, 50, 80, 140, 240, 420];

const roleBase = {
  sniper: { dmg: 9, atk: 1.4, rng: 28 },
  flame: { dmg: 2, atk: 0.35, rng: 10, burn: 3 },
  frost: { dmg: 3, atk: 0.7, rng: 16, slow: 0.2 },
  shock: { dmg: 3, atk: 0.45, rng: 14, chain: 2, electrified: 2 },
  poison: { dmg: 2, atk: 0.65, rng: 14, bleed: 2 },
  cannon: { dmg: 10, atk: 1.2, rng: 14, splash: 42 },
  laser: { dmg: 5, atk: 0.25, rng: 18 },
  dart: { dmg: 1.5, atk: 0.3, rng: 12 },
  support: { dmg: 1, atk: 0.8, rng: 14, mark: 0.1 },
};

function makePathStats(base, style) {
  const tiers = [0, 1, 2, 3, 4, 5].map(() => ({}));
  for (let t = 1; t <= 5; t++) {
    if (style === 'top') {
      tiers[t].dmg = (base.dmg || 1) * (1 + t * 0.7);
      tiers[t].pierce = 1 + Math.floor(t / 2);
      tiers[t].burn = (base.burn || 0) + t * 0.8;
    }
    if (style === 'mid') {
      tiers[t].atk = Math.max(0.05, (base.atk || 1) * (1 - t * 0.16));
      tiers[t].chain = (base.chain || 1) + Math.floor(t / 2);
      tiers[t].splash = (base.splash || 0) + t * 8;
    }
    if (style === 'bot') {
      tiers[t].slow = Math.min(0.75, (base.slow || 0) + t * 0.08);
      tiers[t].mark = (base.mark || 0) + t * 0.06;
      tiers[t].bleed = (base.bleed || 0) + t * 1.2;
      tiers[t].armorPierce = t >= 4;
      tiers[t].stun = t >= 3 ? 0.1 * t : 0;
      tiers[t].electrified = (base.electrified || 0) + t * 0.5;
    }
  }
  return tiers;
}

function towerDef(name, emoji, color, shape, role, cost, topLabel, midLabel, botLabel) {
  const base = roleBase[role];
  return {
    name,
    emoji,
    color,
    shape,
    cost,
    base,
    pathLabels: [topLabel, midLabel, botLabel],
    paths: [makePathStats(base, 'top'), makePathStats(base, 'mid'), makePathStats(base, 'bot')],
  };
}

const towerDefs = [
  towerDef('Sniper', '🔥', '#6b7280', 'barrel', 'sniper', 160, 'Damage', 'Speed', 'Mark'),
  towerDef('Flame Turret', '🔥', '#f97316', 'flame', 'flame', 130, 'Burn', 'Spray', 'Tar'),
  towerDef('Frost Cannon', '❄️', '#67e8f9', 'circle', 'frost', 140, 'Freeze', 'Shard Spam', 'Debuff'),
  towerDef('Shock Tower', '⚡', '#fde047', 'node', 'shock', 150, 'Chain', 'Speed', 'Overload'),
  towerDef('Poison Spire', '☠️', '#22c55e', 'spike', 'poison', 145, 'Stack', 'Spread', 'Decay'),
  towerDef('Cannon Tower', '💣', '#111827', 'cannon', 'cannon', 170, 'Explosion', 'Barrage', 'Armor'),
  towerDef('Laser Beam', '🔴', '#ef4444', 'beam', 'laser', 180, 'Ramp', 'Multi-beam', 'True Damage'),
  towerDef('Dart Gun', '🟡', '#9ca3af', 'circle', 'dart', 100, 'Sharp', 'Minigun', 'Bleed'),
  towerDef('Tesla Coil', '⚡', '#a855f7', 'coil', 'shock', 165, 'Chain', 'Storm', 'Stun'),
  towerDef('Mortar', '💥', '#475569', 'mortar', 'cannon', 185, 'Blast', 'Rapid Fire', 'Napalm'),
  towerDef('Wind Turbine', '🌪️', '#e5e7eb', 'fan', 'support', 130, 'Force', 'Pulse', 'Aura'),
  towerDef('Gravity Well', '🌀', '#7c3aed', 'swirl', 'support', 180, 'Singularity', 'Tick', 'Crush'),
  towerDef('Railgun', '⚡', '#cbd5e1', 'barrel', 'sniper', 210, 'Impact', 'Charge', 'Pierce'),
  towerDef('Plasma Emitter', '🔮', '#f472b6', 'orb', 'laser', 175, 'Burst', 'Overdrive', 'Unstable'),
  towerDef('Acid Sprayer', '🧪', '#16a34a', 'spray', 'poison', 150, 'Corrosion', 'Spray', 'Weakening'),
  towerDef('Ice Shard Launcher', '❄️', '#22d3ee', 'triangle', 'frost', 160, 'Shatter', 'Scatter', 'Freeze Stack'),
  towerDef('Chain Gun', '🔫', '#6b7280', 'barrel', 'dart', 140, 'Heavy Rounds', 'Spin-up', 'Suppression'),
  towerDef('Spike Trap', '🪤', '#9ca3af', 'spike', 'poison', 110, 'Lethal', 'Trigger', 'Bleed'),
  towerDef('Boomerang Thrower', '🔄', '#f59e0b', 'blade', 'dart', 130, 'Sharp Edge', 'Multi-throw', 'Cripple'),
  towerDef('Orbital Strike Beacon', '☄️', '#ef4444', 'beacon', 'cannon', 230, 'Strike', 'Cooldown', 'Burn Zone'),
  towerDef('Drone Swarm', '🤖', '#9ca3af', 'drone', 'dart', 170, 'Assault', 'Replication', 'Hunter'),
  towerDef('Rocket Launcher', '🚀', '#64748b', 'box', 'cannon', 190, 'Payload', 'Salvo', 'Cluster'),
  towerDef('Sandstorm Tower', '🌪️', '#d6b07d', 'cloud', 'support', 145, 'Storm', 'Expansion', 'Blind'),
  towerDef('Crystal Prism', '💎', '#60a5fa', 'crystal', 'laser', 180, 'Refraction', 'Focus', 'Amplify'),
  towerDef('Void Siphon', '🕳️', '#111827', 'orb', 'support', 200, 'Drain', 'Pulse', 'Execute'),
  towerDef('Magnet Tower', '🧲', '#ef4444', 'magnet', 'support', 150, 'Attraction', 'Pulse', 'Shock'),
  towerDef('Echo Turret', '🔁', '#94a3b8', 'echo', 'support', 170, 'Repeat', 'Tempo', 'Cascade'),
  towerDef('Pulse Cannon', '🔊', '#a78bfa', 'ring', 'shock', 165, 'Impact', 'Frequency', 'Shockwave'),
  towerDef('Toxic Cloud Generator', '☣️', '#65a30d', 'cloud', 'poison', 155, 'Toxicity', 'Spread', 'Weakening'),
  towerDef('Flame Whip Tower', '🔥', '#fb7185', 'whip', 'flame', 150, 'Lash', 'Speed', 'Burn'),
  towerDef('Lightning Rod', '⚡', '#facc15', 'rod', 'shock', 170, 'Strike', 'Charge', 'Storm'),
  towerDef('Sawblade Launcher', '⚙️', '#94a3b8', 'blade', 'dart', 150, 'Cut', 'Rapid Fire', 'Bleed'),
  towerDef('Sludge Pump', '🟫', '#92400e', 'spray', 'poison', 135, 'Viscosity', 'Flow', 'Toxic'),
  towerDef('Black Hole Generator', '🕳️', '#111827', 'swirl', 'support', 220, 'Gravity', 'Stability', 'Crush'),
  towerDef('Shard Launcher', '🔷', '#3b82f6', 'triangle', 'dart', 140, 'Sharp', 'Scatter', 'Pierce'),
  towerDef('EMP Spire', '⚡', '#38bdf8', 'spike', 'support', 175, 'Disable', 'Pulse', 'Breaker'),
  towerDef('Sun Beam Tower', '☀️', '#fbbf24', 'beam', 'laser', 180, 'Radiance', 'Flare', 'Burn'),
  towerDef('Moonlight Tower', '🌙', '#a78bfa', 'orb', 'support', 190, 'Empower', 'Tempo', 'Curse'),
  towerDef('Time Warp Tower', '⏳', '#60a5fa', 'ring', 'support', 210, 'Slow', 'Haste', 'Rewind'),
  towerDef('Mirror Tower', '🪞', '#cbd5e1', 'square', 'support', 200, 'Copy', 'Frequency', 'Multi-copy'),
  towerDef('Blood Ritual Tower', '🩸', '#dc2626', 'rune', 'sniper', 220, 'Sacrifice', 'Flow', 'Leech'),
  towerDef('Bone Spike Tower', '🦴', '#f5f5f4', 'spike', 'poison', 150, 'Impale', 'Eruption', 'Bleed'),
  towerDef('Steam Engine Tower', '♨️', '#94a3b8', 'pipe', 'cannon', 170, 'Pressure', 'Release', 'Overheat'),
  towerDef('Ink Cannon', '🖤', '#111827', 'cannon', 'cannon', 160, 'Density', 'Spray', 'Blind'),
  towerDef('Music Tower', '🎵', '#f472b6', 'note', 'support', 175, 'Harmony', 'Tempo', 'Discord'),
  towerDef('Paper Storm Tower', '📄', '#e5e7eb', 'cloud', 'dart', 150, 'Cut', 'Storm', 'Bleed'),
  towerDef('Glitch Tower', '🟣', '#a855f7', 'pixel', 'laser', 180, 'Chaos', 'Frequency', 'Corrupt'),
  towerDef('Pixel Blaster', '🟦', '#60a5fa', 'square', 'dart', 145, 'Power', 'Spam', 'Split'),
  towerDef('Neon Laser Tower', '🌈', '#f43f5e', 'beam', 'laser', 190, 'Intensity', 'Chain', 'Stun'),
  towerDef('Quantum Tower', '⚛️', '#c084fc', 'orb', 'laser', 220, 'Multi-state', 'Phase Speed', 'Phase Damage'),
];

let selectedTower = null;
let nextTowerId = 1;
let spawnQueue = [];
let spawnTimer = 0;
let selectedTowerDefIndex = 0;

class Enemy {
  constructor(type) {
    this.stats = enemyTypes[type];
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.pathIndex = 0;
    this.progress = 0;
    this.dead = false;
    this.effects = { slow: 0, slowTime: 0, freezeTime: 0, electrified: 0, wet: 0, tarred: 0, bleed: 0, mark: 0, markTime: 0, stun: 0 };
  }
  getPosition() {
    const a = pathPoints[this.pathIndex], b = pathPoints[this.pathIndex + 1];
    if (!b) return { ...a };
    return { x: a.x + (b.x - a.x) * this.progress, y: a.y + (b.y - a.y) * this.progress };
  }
  update(dt) {
    if (this.dead) return;
    const e = this.effects;
    e.slowTime = Math.max(0, e.slowTime - dt); if (!e.slowTime) e.slow = 0;
    e.freezeTime = Math.max(0, e.freezeTime - dt);
    e.markTime = Math.max(0, e.markTime - dt); if (!e.markTime) e.mark = 0;
    e.electrified = Math.max(0, e.electrified - dt);
    e.wet = Math.max(0, e.wet - dt);
    e.tarred = Math.max(0, e.tarred - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.bleed > 0) this.hp -= e.bleed * dt;
    if (this.hp <= 0) { this.dead = true; state.cash += 10; return; }
    if (e.freezeTime > 0 || e.stun > 0) return;

    const start = pathPoints[this.pathIndex], end = pathPoints[this.pathIndex + 1];
    if (!end) { this.dead = true; state.lives -= 1; return; }
    const segment = Math.hypot(end.x - start.x, end.y - start.y);
    this.progress += this.stats.speed * (1 - e.slow) * dt / segment;
    while (this.progress >= 1 && !this.dead) {
      this.progress -= 1; this.pathIndex += 1;
      if (!pathPoints[this.pathIndex + 1]) { this.dead = true; state.lives -= 1; }
    }
  }
  applyHit(shot) {
    const armor = this.stats.armor || 0;
    if (armor && !shot.armorPierce && shot.damage < armor) return;
    let dmg = shot.damage * (1 + this.effects.mark);
    if (this.stats.metal && this.effects.electrified > 0) dmg *= 1.5;
    if (this.effects.wet > 0 && shot.freeze) dmg *= 1.2;
    this.hp -= dmg;

    if (shot.slow) { this.effects.slow = Math.max(this.effects.slow, shot.slow); this.effects.slowTime = 2.5; }
    if (shot.freeze) this.effects.freezeTime = Math.max(this.effects.freezeTime, shot.freeze);
    if (shot.bleed) this.effects.bleed = Math.max(this.effects.bleed, shot.bleed);
    if (shot.mark) { this.effects.mark = Math.max(this.effects.mark, shot.mark); this.effects.markTime = 5; }
    if (shot.electrified) this.effects.electrified = Math.max(this.effects.electrified, shot.electrified);
    if (shot.wet) this.effects.wet = Math.max(this.effects.wet, shot.wet);
    if (shot.tarred) this.effects.tarred = Math.max(this.effects.tarred, shot.tarred);
    if (shot.stun) this.effects.stun = Math.max(this.effects.stun, shot.stun);

    if (this.hp <= 0) { this.dead = true; state.cash += 10; }
  }
  draw() {
    const p = this.getPosition();
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = this.effects.freezeTime > 0 ? '#67e8f9' : this.stats.color;
    if (this.effects.electrified > 0) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 16; }
    drawShape(this.stats.shape, this.stats.size || 12, this.stats.color);
    if (this.effects.tarred > 0) drawDrips('rgba(0,0,0,0.8)');
    if (this.effects.wet > 0) drawDrips('rgba(80,180,255,0.85)');
    ctx.restore();
  }
}

class Tower {
  constructor(def, x, y) {
    this.id = nextTowerId++;
    this.def = def;
    this.x = x;
    this.y = y;
    this.paths = [0, 0, 0];
    this.cooldown = 0;
  }
  stats() {
    const out = { ...this.def.base };
    for (let p = 0; p < 3; p++) {
      const bonus = this.def.paths[p][this.paths[p]];
      Object.entries(bonus).forEach(([k, v]) => out[k] = typeof v === 'number' ? v : v);
    }
    out.pierce = out.pierce || 1;
    out.atk = out.atk || 1;
    return out;
  }
  canUpgrade(path) {
    const cur = this.paths[path];
    if (cur >= 5 || state.cash < upgradeCosts[cur + 1]) return false;
    const used = this.paths.filter(v => v > 0).length;
    if (cur === 0 && used >= 2) return false;
    const otherMax = Math.max(...this.paths.map((v, i) => (i === path ? 0 : v)));
    if (cur >= 2 && otherMax > 2) return false;
    if (cur < 2 && otherMax > 2 && cur + 1 > 2) return false;
    return true;
  }
  upgrade(path) {
    if (!this.canUpgrade(path)) return;
    const next = this.paths[path] + 1;
    state.cash -= upgradeCosts[next];
    this.paths[path] = next;
  }
  update(dt, enemies) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const s = this.stats();
    const inRange = enemies.filter(e => !e.dead)
      .map(e => ({ e, p: e.getPosition() }))
      .filter(({ p }) => Math.hypot(p.x - this.x, p.y - this.y) <= (s.rng || 10) * 14)
      .sort((a, b) => (b.e.pathIndex + b.e.progress) - (a.e.pathIndex + a.e.progress));
    if (!inRange.length) return;

    const targets = inRange.slice(0, s.chain || s.pierce || 1);
    for (const t of targets) {
      t.e.applyHit({
        damage: s.dmg || 1,
        armorPierce: !!s.armorPierce,
        slow: s.slow || 0,
        freeze: s.freeze || 0,
        bleed: s.bleed || 0,
        mark: s.mark || 0,
        electrified: s.electrified || 0,
        wet: s.wet || 0,
        tarred: s.tarred || 0,
        stun: s.stun || 0,
      });
      projectiles.push({ tx: t.p.x, ty: t.p.y, color: this.def.color, t: 0.09 });
      if (s.splash) {
        enemies.forEach((e2) => {
          if (e2.dead || e2 === t.e) return;
          const p2 = e2.getPosition();
          if (Math.hypot(p2.x - t.p.x, p2.y - t.p.y) <= s.splash) e2.applyHit({ damage: (s.dmg || 1) * 0.45, armorPierce: !!s.armorPierce });
        });
      }
    }
    this.cooldown = Math.max(0.05, s.atk);
  }
  draw() {
    drawShape(this.def.shape, 15, this.def.color);
    ctx.save();
    ctx.translate(this.x, this.y);
    if (selectedTower === this) {
      const s = this.stats();
      ctx.strokeStyle = 'rgba(200,220,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, (s.rng || 10) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const towers = [];
const enemies = [];
const projectiles = [];

function buildSpawnQueue(waveNumber) {
  const spec = waveData[waveNumber - 1] || [];
  const q = [];
  for (const [type, count] of spec) for (let i = 0; i < count; i++) q.push(type);
  const allTypes = Object.keys(enemyTypes).filter((k) => !['normal', 'fast', 'tank', 'armored'].includes(k));
  const bonusCount = 10 + waveNumber * 6;
  for (let i = 0; i < bonusCount; i++) {
    const pick = allTypes[Math.floor(Math.random() * allTypes.length)];
    q.push(pick);
  }
  return q;
}
function startGame() {
  if (state.started) return;
  state.started = true; state.wave = 1; state.status = 'Wave 1';
  spawnQueue = buildSpawnQueue(state.wave);
  ui.startBtn.disabled = true;
}
function handleWave(dt) {
  if (!state.started || state.lives <= 0 || state.status === 'Win') return;
  spawnTimer -= dt;
  if (spawnQueue.length && spawnTimer <= 0) {
    enemies.push(new Enemy(spawnQueue.shift()));
    spawnTimer = 0.55;
  }
  if (!spawnQueue.length && !enemies.length) {
    if (state.wave >= state.maxWave) { state.status = 'Win'; return; }
    state.wave += 1; state.status = `Wave ${state.wave}`;
    spawnQueue = buildSpawnQueue(state.wave); spawnTimer = 1.2;
  }
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function isOnRoad(x, y) {
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const a = pathPoints[i], b = pathPoints[i + 1];
    if (pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y) <= ROAD_HALF_WIDTH) return true;
  }
  return false;
}
function canPlaceTower(x, y) {
  if (x < 24 || x > canvas.width - 24 || y < 24 || y > canvas.height - 24 || isOnRoad(x, y)) return false;
  return !towers.some((t) => Math.hypot(t.x - x, t.y - y) < 36);
}
function screenToCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * canvas.width, y: ((ev.clientY - r.top) / r.height) * canvas.height };
}

canvas.addEventListener('click', (ev) => {
  const { x, y } = screenToCanvas(ev);
  if (state.placingTower) {
    const def = towerDefs[selectedTowerDefIndex];
    if (state.cash < def.cost || !canPlaceTower(x, y)) return;
    state.cash -= def.cost;
    const tower = new Tower(def, x, y);
    towers.push(tower); selectedTower = tower;
    state.placingTower = false; ui.placeTowerBtn.classList.remove('secondary');
    return;
  }
  selectedTower = towers.find((t) => Math.hypot(t.x - x, t.y - y) <= 18) || null;
});

function drawMap() {
  ctx.fillStyle = '#203146'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = ROAD_HALF_WIDTH * 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (let i = 1; i < pathPoints.length; i++) ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
  ctx.stroke(); ctx.lineWidth = 1;
}
function drawShape(shape, r, color) {
  ctx.save();
  ctx.translate(this?.x || 0, this?.y || 0);
  ctx.fillStyle = color || '#fff';
  if (shape === 'tinyDot') { ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r), 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (shape === 'arrow') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.8); ctx.lineTo(0, r * 0.35); ctx.lineTo(-r * 0.9, r * 0.8); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
  if (shape === 'triangle') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
  if (shape === 'smallTriangle' || shape === 'crackedTriangle') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, r); ctx.lineTo(-r * 0.85, r); ctx.closePath(); ctx.fill(); if (shape === 'crackedTriangle') { ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(-2, -r * 0.3); ctx.lineTo(2, r * 0.7); ctx.stroke(); } ctx.restore(); return; }
  if (shape === 'square') { ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore(); return; }
  if (shape === 'bigSquare' || shape === 'cube' || shape === 'blocky' || shape === 'skeletalSquare' || shape === 'cloudCube') { ctx.fillRect(-r, -r, r * 2, r * 2); if (shape === 'skeletalSquare') { ctx.strokeStyle = '#444'; ctx.strokeRect(-r + 3, -r + 3, r * 2 - 6, r * 2 - 6); } if (shape === 'cloudCube') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(-4, -4, 5, 0, Math.PI * 2); ctx.arc(3, -4, 5, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); return; }
  if (shape === 'hex') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI * 2 / 6) * i; const x = Math.cos(a) * r; const y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill(); ctx.restore(); return; }
  if (shape === 'coreCircle') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (shape === 'oval') { ctx.scale(1.3, 0.8); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (shape === 'crackedCircle' || shape === 'slime' || shape === 'blob' || shape === 'dripBlob' || shape === 'voidCircle') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); if (shape === 'crackedCircle') { ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(0, r * 0.1); ctx.lineTo(r * 0.3, r * 0.6); ctx.stroke(); } if (shape === 'dripBlob') { ctx.beginPath(); ctx.arc(-5, r * 0.95, 2, 0, Math.PI * 2); ctx.arc(3, r * 0.9, 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); return; }
  if (shape === 'orbGlow' || shape === 'flameOrb' || shape === 'lightningBall') { ctx.shadowColor = color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (shape === 'cluster' || shape === 'pixels') { for (let i = 0; i < 4; i++) { ctx.fillRect(-r + i * (r * 0.45), -r + (i % 2) * (r * 0.55), Math.max(3, r * 0.38), Math.max(3, r * 0.38)); } ctx.restore(); return; }
  if (shape === 'glitch' || shape === 'distort') { ctx.fillRect(-r, -r * 0.7, r * 1.8, r * 0.5); ctx.fillRect(-r * 0.6, -r * 0.1, r * 1.4, r * 0.5); ctx.fillRect(-r * 0.9, r * 0.5, r * 1.9, r * 0.4); ctx.restore(); return; }
  if (shape === 'blur' || shape === 'vibrate') { ctx.globalAlpha = 0.45; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.5 + i * r * 0.5, 0, r * 0.6, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill(); ctx.restore(); return; }
  if (shape === 'ring') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); return; }
  if (shape === 'sheet') { ctx.fillRect(-r * 0.7, -r, r * 1.4, r * 1.8); ctx.strokeStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r); ctx.lineTo(-r * 0.2, r * 0.8); ctx.stroke(); ctx.restore(); return; }
  if (shape === 'magnet') { ctx.fillStyle = '#ef4444'; ctx.fillRect(-r, -r, r, r * 2); ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -r, r, r * 2); ctx.fillStyle = '#111'; ctx.fillRect(-r * 0.2, r * 0.15, r * 0.4, r * 0.7); ctx.restore(); return; }
  if (shape === 'beam' || shape === 'barrel' || shape === 'cannon' || shape === 'box') { ctx.fillRect(-r * 0.7, -r * 0.45, r * 1.4, r * 0.9); ctx.restore(); return; }
  if (shape === 'spike') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, r); ctx.lineTo(-r * 0.8, r); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
  if (shape === 'fan' || shape === 'swirl' || shape === 'ring' || shape === 'coil') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); return; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function drawDrips(color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-7 + i * 7, 13 + (i % 2) * 3, 2.2, 0, Math.PI * 2); ctx.fill(); }
}

function towerStatsText(tower) {
  const s = tower.stats();
  return `${tower.def.emoji} ${tower.def.name}\nCost: ${tower.def.cost}g\nTop/Mid/Bot: ${tower.def.pathLabels.join(' / ')}\nDMG: ${(s.dmg || 0).toFixed(1)} | ATK: ${(1 / (s.atk || 1)).toFixed(2)}/s | RNG: ${(s.rng || 0).toFixed(1)}\nPierce/Chain: ${s.pierce || 1}/${s.chain || 1} | Splash: ${Math.floor(s.splash || 0)}\nSlow:${Math.round((s.slow || 0) * 100)}% Mark:+${Math.round((s.mark || 0) * 100)}% Bleed:${(s.bleed || 0).toFixed(1)}/s\nArmorPierce:${s.armorPierce ? 'Yes' : 'No'} Stun:${(s.stun || 0).toFixed(2)}s`;
}

function updateHud() {
  ui.lives.textContent = state.lives;
  ui.cash.textContent = Math.floor(state.cash);
  ui.wave.textContent = state.wave;
  ui.maxWave.textContent = state.maxWave;
  ui.status.textContent = state.lives <= 0 ? 'Game Over' : state.status;

  const def = towerDefs[selectedTowerDefIndex];
  ui.shopTowerMeta.textContent = `${def.emoji} ${def.name} | ${def.cost}g | ${def.pathLabels.join(' / ')}`;
  ui.placeTowerBtn.textContent = `Place ${def.name} (${def.cost}g)`;

  if (selectedTower) {
    ui.selectedLabel.textContent = `Tower #${selectedTower.id}`;
    selectedTower.paths.forEach((v, i) => ui.p[i].textContent = v);
    ui.selectedStats.textContent = towerStatsText(selectedTower);
  } else {
    ui.selectedLabel.textContent = 'No tower selected';
    ui.p.forEach((el) => el.textContent = '0');
    ui.selectedStats.textContent = 'Select a tower to view stats.';
  }
  document.querySelectorAll('.upgradeRow button').forEach((b) => b.disabled = !selectedTower);
}

function setupTowerSelect() {
  towerDefs.forEach((def, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${def.emoji} ${def.name} (${def.cost}g)`;
    ui.towerSelect.appendChild(opt);
  });
  ui.towerSelect.addEventListener('change', () => {
    selectedTowerDefIndex = Number(ui.towerSelect.value);
    updateHud();
  });
}

for (const b of document.querySelectorAll('.upgradeRow button')) {
  b.addEventListener('click', () => { if (selectedTower) selectedTower.upgrade(Number(b.dataset.path)); });
}
ui.startBtn.addEventListener('click', startGame);
ui.placeTowerBtn.addEventListener('click', () => {
  const def = towerDefs[selectedTowerDefIndex];
  if (state.cash < def.cost) return;
  state.placingTower = !state.placingTower;
  ui.placeTowerBtn.classList.toggle('secondary', state.placingTower);
});
ui.pauseBtn.addEventListener('click', () => {
  state.paused = !state.paused; ui.pauseMenu.classList.toggle('hidden', !state.paused);
  ui.pauseBtn.textContent = state.paused ? 'Paused' : 'Pause';
});
ui.resumeBtn.addEventListener('click', () => {
  state.paused = false; ui.pauseMenu.classList.add('hidden'); ui.pauseBtn.textContent = 'Pause';
});
ui.speedBtn.addEventListener('click', () => {
  state.speed = state.speed === 1 ? 2 : 1; ui.speedBtn.textContent = `${state.speed}x`;
});

let last = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - last) / 1000, 0.04) * (state.paused ? 0 : state.speed);
  last = now;
  if (!state.paused && state.lives > 0 && state.status !== 'Win') {
    handleWave(dt); towers.forEach((t) => t.update(dt, enemies)); enemies.forEach((e) => e.update(dt));
    projectiles.forEach((p) => p.t -= dt);
  }
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].t <= 0) projectiles.splice(i, 1);

  drawMap();
  towers.forEach((t) => { ctx.save(); ctx.translate(t.x, t.y); drawShape(t.def.shape, 15, t.def.color); ctx.restore(); if (selectedTower === t) { const s = t.stats(); ctx.strokeStyle = 'rgba(173,216,230,0.35)'; ctx.beginPath(); ctx.arc(t.x, t.y, (s.rng || 10) * 14, 0, Math.PI * 2); ctx.stroke(); } });
  enemies.forEach((e) => e.draw());
  projectiles.forEach((p) => { ctx.fillStyle = p.color || '#d1d5db'; ctx.beginPath(); ctx.arc(p.tx, p.ty, 3, 0, Math.PI * 2); ctx.fill(); });

  if (state.lives <= 0 || state.status === 'Win') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText(state.status === 'Win' ? 'You Win!' : 'Game Over', 430, 360);
  }

  updateHud();
  requestAnimationFrame(gameLoop);
}

setupTowerSelect();
updateHud();
requestAnimationFrame(gameLoop);
