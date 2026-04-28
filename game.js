const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameModes = {
  normal: { name: 'Normal', waves: 15, hpMult: 1, spdMult: 1, moneyMult: 1, endless: false },
  hard: { name: 'Hard', waves: 30, hpMult: 1.5, spdMult: 1.5, moneyMult: 1, endless: false },
  extreme: { name: 'Extreme', waves: 50, hpMult: 2.5, spdMult: 2.5, moneyMult: 1, endless: false },
  death: { name: 'Death', waves: 100, hpMult: 5, spdMult: 5, moneyMult: 0.5, endless: false },
  endless: { name: 'Endless', waves: Infinity, hpMult: 1.15, spdMult: 1.08, moneyMult: 0.9, endless: true },
};

const state = {
  lives: 20,
  cash: 500,
  wave: 0,
  maxWave: 15,
  mode: 'normal',
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
  modeSelect: document.getElementById('modeSelect'),
  shopTowerMeta: document.getElementById('shopTowerMeta'),
  startBtn: document.getElementById('startBtn'),
  targetModeBtn: document.getElementById('targetModeBtn'),
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

const upgradeCosts = [0, 70, 120, 190, 300, 480];
const statusCaps = { slow: 0.8, mark: 0.6, bleed: 16, burn: 18, stun: 0.8, electrified: 10 };

const roleConfig = {
  sniper: { dmg: 14, atk: 1.2, rng: 30, damageType: 'kinetic', attackPattern: 'bullet' },
  flame: { dmg: 3, atk: 0.22, rng: 11, damageType: 'fire', attackPattern: 'cone', burn: 2 },
  frost: { dmg: 4, atk: 0.7, rng: 17, damageType: 'frost', attackPattern: 'bullet', slow: 0.2 },
  shock: { dmg: 5, atk: 0.4, rng: 15, damageType: 'shock', attackPattern: 'chain', chain: 2 },
  poison: { dmg: 3, atk: 0.6, rng: 15, damageType: 'poison', attackPattern: 'bullet', bleed: 2 },
  cannon: { dmg: 16, atk: 1.15, rng: 14, damageType: 'explosive', attackPattern: 'splash', splash: 52 },
  laser: { dmg: 6, atk: 0.2, rng: 19, damageType: 'energy', attackPattern: 'beam' },
  dart: { dmg: 2.2, atk: 0.28, rng: 13, damageType: 'kinetic', attackPattern: 'bullet' },
  support: { dmg: 2, atk: 0.75, rng: 14, damageType: 'support', attackPattern: 'aura', auraBuffDmg: 0.1, auraBuffAtk: 0.05 },
};

function makePathTiers(base) {
  const t = [0, 1, 2, 3, 4, 5].map(() => ({}));
  for (let i = 1; i <= 5; i++) {
    t[i] = {
      top: {
        dmg: (base.dmg || 1) * (1 + i * 0.62),
        pierce: 1 + Math.floor(i / 2),
        burn: Math.min(statusCaps.burn, (base.burn || 0) + i * 1.4),
        splash: (base.splash || 0) + i * 7,
      },
      mid: {
        atk: Math.max(0.045, (base.atk || 1) * (1 - i * 0.17)),
        chain: (base.chain || 1) + Math.floor(i / 2),
        projectiles: 1 + Math.floor(i / 2),
        auraBuffAtk: (base.auraBuffAtk || 0) + i * 0.02,
      },
      bot: {
        slow: Math.min(statusCaps.slow, (base.slow || 0) + i * 0.09),
        mark: Math.min(statusCaps.mark, (base.mark || 0) + i * 0.08),
        bleed: Math.min(statusCaps.bleed, (base.bleed || 0) + i * 1.6),
        stun: Math.min(statusCaps.stun, i >= 3 ? 0.12 * i : 0),
        armorPierce: i >= 4,
        auraBuffDmg: (base.auraBuffDmg || 0) + i * 0.04,
      },
    };
  }
  return t;
}

function towerDef(name, emoji, color, shape, role, cost, labels) {
  return {
    name,
    emoji,
    color,
    shape,
    role,
    cost,
    base: roleConfig[role],
    pathLabels: labels,
    tiers: makePathTiers(roleConfig[role]),
  };
}

const towerDefs = [
  towerDef('Sniper', '🔥', '#6b7280', 'barrel', 'sniper', 180, ['Damage', 'Speed', 'Mark']),
  towerDef('Flame Turret', '🔥', '#f97316', 'flame', 'flame', 145, ['Burn', 'Spray', 'Tar']),
  towerDef('Frost Cannon', '❄️', '#67e8f9', 'circle', 'frost', 160, ['Freeze', 'Shard Spam', 'Debuff']),
  towerDef('Shock Tower', '⚡', '#fde047', 'node', 'shock', 165, ['Chain', 'Speed', 'Overload']),
  towerDef('Poison Spire', '☠️', '#22c55e', 'spike', 'poison', 155, ['Stack', 'Spread', 'Decay']),
  towerDef('Cannon Tower', '💣', '#111827', 'cannon', 'cannon', 210, ['Explosion', 'Barrage', 'Armor']),
  towerDef('Laser Beam', '🔴', '#ef4444', 'beam', 'laser', 230, ['Ramp', 'Multi-beam', 'True Damage']),
  towerDef('Dart Gun', '🟡', '#9ca3af', 'circle', 'dart', 100, ['Sharp', 'Minigun', 'Bleed']),
  towerDef('Tesla Coil', '⚡', '#a855f7', 'coil', 'shock', 175, ['Chain', 'Storm', 'Stun']),
  towerDef('Mortar', '💥', '#475569', 'mortar', 'cannon', 220, ['Blast', 'Rapid Fire', 'Napalm']),
  towerDef('Wind Turbine', '🌪️', '#e5e7eb', 'fan', 'support', 155, ['Force', 'Pulse', 'Aura']),
  towerDef('Gravity Well', '🌀', '#7c3aed', 'swirl', 'support', 210, ['Singularity', 'Tick', 'Crush']),
  towerDef('Railgun', '⚡', '#cbd5e1', 'barrel', 'sniper', 245, ['Impact', 'Charge', 'Pierce']),
  towerDef('Plasma Emitter', '🔮', '#f472b6', 'orb', 'laser', 210, ['Burst', 'Overdrive', 'Unstable']),
  towerDef('Acid Sprayer', '🧪', '#16a34a', 'spray', 'poison', 175, ['Corrosion', 'Spray', 'Weakening']),
  towerDef('Ice Shard Launcher', '❄️', '#22d3ee', 'triangle', 'frost', 170, ['Shatter', 'Scatter', 'Freeze Stack']),
  towerDef('Chain Gun', '🔫', '#6b7280', 'barrel', 'dart', 160, ['Heavy Rounds', 'Spin-up', 'Suppression']),
  towerDef('Spike Trap', '🪤', '#9ca3af', 'spike', 'poison', 120, ['Lethal', 'Trigger', 'Bleed']),
  towerDef('Boomerang Thrower', '🔄', '#f59e0b', 'blade', 'dart', 135, ['Sharp Edge', 'Multi-throw', 'Cripple']),
  towerDef('Orbital Strike Beacon', '☄️', '#ef4444', 'beacon', 'cannon', 280, ['Strike', 'Cooldown', 'Burn Zone']),
  towerDef('Drone Swarm', '🤖', '#9ca3af', 'drone', 'dart', 190, ['Assault', 'Replication', 'Hunter']),
  towerDef('Rocket Launcher', '🚀', '#64748b', 'box', 'cannon', 235, ['Payload', 'Salvo', 'Cluster']),
  towerDef('Sandstorm Tower', '🌪️', '#d6b07d', 'cloud', 'support', 170, ['Storm', 'Expansion', 'Blind']),
  towerDef('Crystal Prism', '💎', '#60a5fa', 'crystal', 'laser', 225, ['Refraction', 'Focus', 'Amplify']),
  towerDef('Void Siphon', '🕳️', '#111827', 'orb', 'support', 240, ['Drain', 'Pulse', 'Execute']),
  towerDef('Magnet Tower', '🧲', '#ef4444', 'magnet', 'support', 180, ['Attraction', 'Pulse', 'Shock']),
  towerDef('Echo Turret', '🔁', '#94a3b8', 'echo', 'support', 200, ['Repeat', 'Tempo', 'Cascade']),
  towerDef('Pulse Cannon', '🔊', '#a78bfa', 'ring', 'shock', 185, ['Impact', 'Frequency', 'Shockwave']),
  towerDef('Toxic Cloud Generator', '☣️', '#65a30d', 'cloud', 'poison', 180, ['Toxicity', 'Spread', 'Weakening']),
  towerDef('Flame Whip Tower', '🔥', '#fb7185', 'whip', 'flame', 165, ['Lash', 'Speed', 'Burn']),
  towerDef('Lightning Rod', '⚡', '#facc15', 'rod', 'shock', 190, ['Strike', 'Charge', 'Storm']),
  towerDef('Sawblade Launcher', '⚙️', '#94a3b8', 'blade', 'dart', 165, ['Cut', 'Rapid Fire', 'Bleed']),
  towerDef('Sludge Pump', '🟫', '#92400e', 'spray', 'poison', 145, ['Viscosity', 'Flow', 'Toxic']),
  towerDef('Black Hole Generator', '🕳️', '#111827', 'swirl', 'support', 290, ['Gravity', 'Stability', 'Crush']),
  towerDef('Shard Launcher', '🔷', '#3b82f6', 'triangle', 'dart', 150, ['Sharp', 'Scatter', 'Pierce']),
  towerDef('EMP Spire', '⚡', '#38bdf8', 'spike', 'support', 200, ['Disable', 'Pulse', 'Breaker']),
  towerDef('Sun Beam Tower', '☀️', '#fbbf24', 'beam', 'laser', 235, ['Radiance', 'Flare', 'Burn']),
  towerDef('Moonlight Tower', '🌙', '#a78bfa', 'orb', 'support', 240, ['Empower', 'Tempo', 'Curse']),
  towerDef('Time Warp Tower', '⏳', '#60a5fa', 'ring', 'support', 260, ['Slow', 'Haste', 'Rewind']),
  towerDef('Mirror Tower', '🪞', '#cbd5e1', 'square', 'support', 260, ['Copy', 'Frequency', 'Multi-copy']),
  towerDef('Blood Ritual Tower', '🩸', '#dc2626', 'rune', 'sniper', 280, ['Sacrifice', 'Flow', 'Leech']),
  towerDef('Bone Spike Tower', '🦴', '#f5f5f4', 'spike', 'poison', 175, ['Impale', 'Eruption', 'Bleed']),
  towerDef('Steam Engine Tower', '♨️', '#94a3b8', 'pipe', 'cannon', 205, ['Pressure', 'Release', 'Overheat']),
  towerDef('Ink Cannon', '🖤', '#111827', 'cannon', 'cannon', 200, ['Density', 'Spray', 'Blind']),
  towerDef('Music Tower', '🎵', '#f472b6', 'note', 'support', 220, ['Harmony', 'Tempo', 'Discord']),
  towerDef('Paper Storm Tower', '📄', '#e5e7eb', 'cloud', 'dart', 170, ['Cut', 'Storm', 'Bleed']),
  towerDef('Glitch Tower', '🟣', '#a855f7', 'pixel', 'laser', 230, ['Chaos', 'Frequency', 'Corrupt']),
  towerDef('Pixel Blaster', '🟦', '#60a5fa', 'square', 'dart', 160, ['Power', 'Spam', 'Split']),
  towerDef('Neon Laser Tower', '🌈', '#f43f5e', 'beam', 'laser', 260, ['Intensity', 'Chain', 'Stun']),
  towerDef('Quantum Tower', '⚛️', '#c084fc', 'orb', 'laser', 320, ['Multi-state', 'Phase Speed', 'Phase Damage']),
];

let selectedTower = null;
let nextTowerId = 1;
let spawnQueue = [];
let spawnTimer = 0;
let selectedTowerDefIndex = 0;

class Enemy {
  constructor(type, modeMeta, wave) {
    this.type = type;
    this.stats = enemyTypes[type];
    const endlessScale = modeMeta.endless ? 1 + wave * 0.03 : 1;
    this.hp = this.stats.hp * modeMeta.hpMult * endlessScale;
    this.maxHp = this.hp;
    this.speed = this.stats.speed * modeMeta.spdMult * (modeMeta.endless ? 1 + wave * 0.012 : 1);
    this.pathIndex = 0;
    this.progress = 0;
    this.dead = false;
    this.effects = { slow: 0, slowTime: 0, freezeTime: 0, electrified: 0, wet: 0, tarred: 0, bleed: 0, burn: 0, mark: 0, markTime: 0, stun: 0 };
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
    if (e.burn > 0) this.hp -= e.burn * dt;
    if (this.hp <= 0) { this.dead = true; state.cash += Math.ceil(10 * gameModes[state.mode].moneyMult); return; }
    if (e.freezeTime > 0 || e.stun > 0) return;

    const start = pathPoints[this.pathIndex], end = pathPoints[this.pathIndex + 1];
    if (!end) { this.dead = true; state.lives -= 1; return; }
    const seg = Math.hypot(end.x - start.x, end.y - start.y);
    this.progress += this.speed * (1 - e.slow) * dt / seg;
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
    if (this.effects.wet > 0 && shot.damageType === 'frost') dmg *= 1.2;
    this.hp -= dmg;

    if (shot.slow) { this.effects.slow = Math.min(statusCaps.slow, Math.max(this.effects.slow, shot.slow)); this.effects.slowTime = 2.5; }
    if (shot.freeze) this.effects.freezeTime = Math.max(this.effects.freezeTime, shot.freeze);
    if (shot.bleed) this.effects.bleed = Math.min(statusCaps.bleed, Math.max(this.effects.bleed, shot.bleed));
    if (shot.burn) this.effects.burn = Math.min(statusCaps.burn, Math.max(this.effects.burn, shot.burn));
    if (shot.mark) { this.effects.mark = Math.min(statusCaps.mark, Math.max(this.effects.mark, shot.mark)); this.effects.markTime = 5; }
    if (shot.electrified) this.effects.electrified = Math.min(statusCaps.electrified, Math.max(this.effects.electrified, shot.electrified));
    if (shot.wet) this.effects.wet = Math.max(this.effects.wet, shot.wet);
    if (shot.tarred) this.effects.tarred = Math.max(this.effects.tarred, shot.tarred);
    if (shot.stun) this.effects.stun = Math.min(statusCaps.stun, Math.max(this.effects.stun, shot.stun));

    if (this.hp <= 0) { this.dead = true; state.cash += Math.ceil(10 * gameModes[state.mode].moneyMult); }
  }
  draw() {
    const p = this.getPosition();
    ctx.save();
    ctx.translate(p.x, p.y);
    if (this.stats.alpha) ctx.globalAlpha = this.stats.alpha;
    if (this.effects.electrified > 0) { ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 14; }
    drawShape(this.stats.shape, this.stats.size || 12, this.stats.color);
    ctx.globalAlpha = 1;
    if (this.effects.tarred > 0) drawDrips('rgba(0,0,0,0.8)');
    if (this.effects.wet > 0) drawDrips('rgba(80,180,255,0.85)');
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, (this.stats.size || 12) + 1.5, 0, Math.PI * 2);
    ctx.stroke();
    const barW = 22;
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-barW / 2, -((this.stats.size || 12) + 11), barW, 3);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-barW / 2, -((this.stats.size || 12) + 11), barW * ratio, 3);
    ctx.restore();
  }
}

class Tower {
  constructor(def, x, y) {
    this.id = nextTowerId++;
    this.def = def;
    this.x = x; this.y = y;
    this.paths = [0, 0, 0];
    this.cooldown = 0;
    this.targetMode = 'first';
    this.spin = 0;
  }

  stats() {
    const s = { ...this.def.base, pierce: 1, chain: this.def.base.chain || 1, projectiles: 1 };
    const lv = this.paths;
    ['top', 'mid', 'bot'].forEach((k, i) => {
      const bonus = this.def.tiers[lv[i]][k];
      Object.entries(bonus).forEach(([kk, vv]) => { if (typeof vv === 'number') s[kk] = vv; else s[kk] = vv; });
    });
    if (!s.atk) s.atk = this.def.base.atk;
    return s;
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

  targetSort(a, b) {
    const pa = a.e.pathIndex + a.e.progress;
    const pb = b.e.pathIndex + b.e.progress;
    if (this.targetMode === 'first') return pb - pa;
    if (this.targetMode === 'last') return pa - pb;
    if (this.targetMode === 'strong') return b.e.hp - a.e.hp;
    if (this.targetMode === 'close') return a.d - b.d;
    return pb - pa;
  }

  getInRange(enemies) {
    const s = this.stats();
    return enemies.filter(e => !e.dead)
      .map(e => {
        const p = e.getPosition();
        return { e, p, d: Math.hypot(p.x - this.x, p.y - this.y) };
      })
      .filter(x => x.d <= (s.rng || 10) * 14)
      .sort((a, b) => this.targetSort(a, b));
  }

  applyAuraBuff(allTowers) {
    const s = this.stats();
    if (!s.auraBuffDmg && !s.auraBuffAtk) return;
    const radius = (s.rng || 10) * 12;
    for (const t of allTowers) {
      if (t === this) continue;
      const d = Math.hypot(t.x - this.x, t.y - this.y);
      if (d <= radius) {
        t.tmpDmgBuff = Math.max(t.tmpDmgBuff || 0, s.auraBuffDmg || 0);
        t.tmpAtkBuff = Math.max(t.tmpAtkBuff || 0, s.auraBuffAtk || 0);
      }
    }
  }

  fire(dt, enemies) {
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    const s = this.stats();
    const baseAtk = Math.max(0.04, s.atk * (1 - (this.tmpAtkBuff || 0)));
    const inRange = this.getInRange(enemies);
    if (!inRange.length) return;

    const shot = {
      damage: (s.dmg || 1) * (1 + (this.tmpDmgBuff || 0)),
      armorPierce: !!s.armorPierce,
      slow: s.slow || 0,
      freeze: s.damageType === 'frost' ? 0.16 + (this.paths[0] >= 3 ? 0.16 : 0) : 0,
      bleed: s.bleed || 0,
      burn: s.damageType === 'fire' ? (s.burn || 0) : 0,
      mark: s.mark || 0,
      electrified: s.damageType === 'shock' ? 2.5 : 0,
      wet: s.damageType === 'frost' ? 1.5 : 0,
      tarred: this.def.name.includes('Flame') || this.def.name.includes('Acid') ? 1 : 0,
      stun: s.stun || 0,
      damageType: s.damageType,
    };

    const performHit = (target) => {
      target.e.applyHit(shot);
      renderProjectile(this, target, s);
      if (s.splash) {
        enemies.forEach((e2) => {
          if (e2.dead || e2 === target.e) return;
          const p2 = e2.getPosition();
          if (Math.hypot(p2.x - target.p.x, p2.y - target.p.y) <= s.splash) {
            e2.applyHit({ damage: shot.damage * 0.45, armorPierce: shot.armorPierce, damageType: shot.damageType });
          }
        });
      }
    };

    if (s.attackPattern === 'aura') {
      inRange.forEach((t) => t.e.applyHit({ ...shot, damage: shot.damage * 0.65 }));
      pulses.push({ x: this.x, y: this.y, r: (s.rng || 10) * 14, t: 0.18, color: this.def.color });
    } else if (s.attackPattern === 'cone') {
      inRange.slice(0, 3 + Math.floor((s.projectiles || 1) / 2)).forEach(performHit);
    } else if (s.attackPattern === 'beam') {
      inRange.slice(0, s.chain || 1).forEach((target) => {
        performHit(target);
        beams.push({ x: this.x, y: this.y, tx: target.p.x, ty: target.p.y, t: 0.08, color: this.def.color });
      });
    } else if (s.attackPattern === 'chain') {
      inRange.slice(0, s.chain || 2).forEach(performHit);
    } else {
      inRange.slice(0, s.pierce || 1).forEach(performHit);
    }

    this.cooldown = baseAtk;
  }
}

const towers = [];
const enemies = [];
const projectiles = [];
const beams = [];
const pulses = [];

function modeMeta() { return gameModes[state.mode]; }

function buildSpawnQueue(waveNumber) {
  const keys = Object.keys(enemyTypes);
  const q = [];
  const groups = Math.min(6 + waveNumber, 16);
  for (let i = 0; i < groups; i++) {
    const pick = keys[Math.floor(Math.random() * keys.length)];
    const count = 2 + Math.floor(waveNumber / 4) + Math.floor(Math.random() * 3);
    for (let c = 0; c < count; c++) q.push(pick);
  }
  return q;
}

function startGame() {
  if (state.started) return;
  const meta = modeMeta();
  state.started = true;
  state.wave = 1;
  state.maxWave = meta.endless ? '∞' : meta.waves;
  state.status = `Wave 1 (${meta.name})`;
  spawnQueue = buildSpawnQueue(1);
  ui.startBtn.disabled = true;
  ui.modeSelect.disabled = true;
}

function handleWave(dt) {
  if (!state.started || state.lives <= 0 || state.status === 'Win') return;
  const meta = modeMeta();
  spawnTimer -= dt;
  if (spawnQueue.length && spawnTimer <= 0) {
    const type = spawnQueue.shift();
    enemies.push(new Enemy(type, meta, state.wave));
    spawnTimer = 0.36;
  }
  if (!spawnQueue.length && !enemies.length) {
    if (!meta.endless && state.wave >= meta.waves) {
      state.status = 'Win';
      return;
    }
    state.wave += 1;
    state.status = `Wave ${state.wave} (${meta.name})`;
    spawnQueue = buildSpawnQueue(state.wave);
    spawnTimer = 0.9;
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
  if (x < 24 || x > canvas.width - 24 || y < 24 || y > canvas.height - 24) return false;
  return !towers.some((t) => Math.hypot(t.x - x, t.y - y) < 36);
}
function screenToCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  const px = ev.clientX ?? ev.touches?.[0]?.clientX ?? 0;
  const py = ev.clientY ?? ev.touches?.[0]?.clientY ?? 0;
  return { x: ((px - r.left) / r.width) * canvas.width, y: ((py - r.top) / r.height) * canvas.height };
}

function onCanvasInteract(ev) {
  ev.preventDefault();
  const { x, y } = screenToCanvas(ev);
  if (state.placingTower) {
    const def = towerDefs[selectedTowerDefIndex];
    if (state.cash < def.cost) { state.status = 'Not enough cash'; return; }
    if (!canPlaceTower(x, y)) { state.status = 'Invalid placement'; return; }
    state.cash -= def.cost;
    const tower = new Tower(def, x, y);
    towers.push(tower);
    selectedTower = tower;
    state.placingTower = false;
    ui.placeTowerBtn.classList.remove('secondary');
    if (!state.started) startGame();
    state.status = `Placed ${def.name}`;
    return;
  }
  selectedTower = towers.find((t) => Math.hypot(t.x - x, t.y - y) <= 18) || null;
}

canvas.addEventListener('pointerdown', onCanvasInteract);
canvas.addEventListener('mousedown', onCanvasInteract);
canvas.addEventListener('click', onCanvasInteract);
canvas.addEventListener('touchstart', onCanvasInteract, { passive: false });

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

function drawShape(shape, r, color) {
  ctx.fillStyle = color;
  if (shape === 'tinyDot') { ctx.beginPath(); ctx.arc(0, 0, Math.max(2, r), 0, Math.PI * 2); ctx.fill(); return; }
  if (shape === 'arrow') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.8); ctx.lineTo(0, r * 0.35); ctx.lineTo(-r * 0.9, r * 0.8); ctx.closePath(); ctx.fill(); return; }
  if (shape === 'triangle' || shape === 'smallTriangle' || shape === 'crackedTriangle') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, r); ctx.lineTo(-r * 0.85, r); ctx.closePath(); ctx.fill(); return; }
  if (shape === 'square' || shape === 'bigSquare' || shape === 'cube' || shape === 'blocky' || shape === 'skeletalSquare' || shape === 'cloudCube') { ctx.fillRect(-r, -r, r * 2, r * 2); return; }
  if (shape === 'hex') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI * 2 / 6) * i; const x = Math.cos(a) * r; const y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill(); return; }
  if (shape === 'ring') { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); return; }
  if (shape === 'magnet') { ctx.fillStyle = '#ef4444'; ctx.fillRect(-r, -r, r, r * 2); ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -r, r, r * 2); return; }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawDrips(color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-7 + i * 7, 13 + (i % 2) * 3, 2.2, 0, Math.PI * 2); ctx.fill(); }
}

function projectileStyle(damageType) {
  if (damageType === 'fire') return { color: '#fb923c', size: 5 };
  if (damageType === 'frost') return { color: '#67e8f9', size: 5 };
  if (damageType === 'shock') return { color: '#fde047', size: 5 };
  if (damageType === 'poison') return { color: '#22c55e', size: 5 };
  if (damageType === 'energy') return { color: '#f43f5e', size: 4 };
  if (damageType === 'explosive') return { color: '#f59e0b', size: 6 };
  if (damageType === 'support') return { color: '#a78bfa', size: 4 };
  return { color: '#e5e7eb', size: 4 };
}

function renderProjectile(tower, target, stats) {
  const style = projectileStyle(stats.damageType);
  projectiles.push({ x: tower.x, y: tower.y, tx: target.p.x, ty: target.p.y, t: 0.22, life: 0.22, ...style });
}

function towerStatsText(tower) {
  const s = tower.stats();
  return `${tower.def.emoji} ${tower.def.name}\nRole: ${tower.def.role} | Cost: ${tower.def.cost}g\nTop/Mid/Bot: ${tower.def.pathLabels.join(' / ')}\nDMG ${(s.dmg || 0).toFixed(1)} | ATK ${(1 / (s.atk || 1)).toFixed(2)}/s | RNG ${(s.rng || 0).toFixed(1)}\nPattern: ${s.attackPattern} | Type: ${s.damageType}\nPierce ${s.pierce || 1} Chain ${s.chain || 1} Projectiles ${s.projectiles || 1}\nSlow ${Math.round((s.slow || 0) * 100)}% | Mark +${Math.round((s.mark || 0) * 100)}% | Bleed ${(s.bleed || 0).toFixed(1)}/s\nBurn ${(s.burn || 0).toFixed(1)}/s | Stun ${(s.stun || 0).toFixed(2)}s | ArmorPierce ${s.armorPierce ? 'Yes' : 'No'}\nTarget: ${tower.targetMode}`;
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
    ui.targetModeBtn.disabled = false;
    ui.targetModeBtn.textContent = `Target: ${selectedTower.targetMode[0].toUpperCase()}${selectedTower.targetMode.slice(1)}`;
  } else {
    ui.selectedLabel.textContent = 'No tower selected';
    ui.p.forEach((el) => el.textContent = '0');
    ui.selectedStats.textContent = 'Select a tower to view stats.';
    ui.targetModeBtn.disabled = true;
    ui.targetModeBtn.textContent = 'Target: First';
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

function setupModeSelect() {
  Object.entries(gameModes).forEach(([key, meta]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = meta.name;
    ui.modeSelect.appendChild(opt);
  });
  ui.modeSelect.value = state.mode;
  ui.modeSelect.addEventListener('change', () => {
    state.mode = ui.modeSelect.value;
    state.maxWave = gameModes[state.mode].endless ? '∞' : gameModes[state.mode].waves;
    updateHud();
  });
}

for (const b of document.querySelectorAll('.upgradeRow button')) {
  b.addEventListener('click', () => { if (selectedTower) selectedTower.upgrade(Number(b.dataset.path)); });
}

ui.targetModeBtn.addEventListener('click', () => {
  if (!selectedTower) return;
  const modes = ['first', 'last', 'strong', 'close'];
  selectedTower.targetMode = modes[(modes.indexOf(selectedTower.targetMode) + 1) % modes.length];
});

ui.startBtn.addEventListener('click', startGame);
ui.placeTowerBtn.addEventListener('click', () => {
  const def = towerDefs[selectedTowerDefIndex];
  if (state.cash < def.cost) { state.status = 'Not enough cash'; return; }
  state.placingTower = !state.placingTower;
  ui.placeTowerBtn.classList.toggle('secondary', state.placingTower);
  state.status = state.placingTower ? 'Tap map to place tower' : state.status;
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
  const dt = Math.min((now - last) / 1000, 0.04) * (state.paused ? 0 : state.speed);
  last = now;

  if (!state.paused && state.lives > 0 && state.status !== 'Win') {
    handleWave(dt);

    towers.forEach((t) => { t.tmpDmgBuff = 0; t.tmpAtkBuff = 0; });
    towers.forEach((t) => t.applyAuraBuff(towers));
    towers.forEach((t) => t.fire(dt, enemies));

    enemies.forEach((e) => e.update(dt));
    projectiles.forEach((p) => p.t -= dt);
    beams.forEach((b) => b.t -= dt);
    pulses.forEach((p) => p.t -= dt);
  }

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].dead) enemies.splice(i, 1);
  for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].t <= 0) projectiles.splice(i, 1);
  for (let i = beams.length - 1; i >= 0; i--) if (beams[i].t <= 0) beams.splice(i, 1);
  for (let i = pulses.length - 1; i >= 0; i--) if (pulses[i].t <= 0) pulses.splice(i, 1);

  drawMap();

  towers.forEach((t) => {
    ctx.save();
    ctx.translate(t.x, t.y);
    drawShape(t.def.shape, 15, t.def.color);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 16.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (selectedTower === t) {
      const s = t.stats();
      ctx.strokeStyle = 'rgba(173,216,230,0.35)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, (s.rng || 10) * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  enemies.forEach((e) => e.draw());

  for (const p of projectiles) {
    const progress = 1 - p.t / p.life;
    const x = p.x + (p.tx - p.x) * progress;
    const y = p.y + (p.ty - p.y) * progress;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(2, p.size * 0.35);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 4);
    ctx.lineTo(x + 4, y + 4);
    ctx.stroke();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of beams) {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = Math.max(0.2, b.t / 0.08);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.tx, b.ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  for (const p of pulses) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = p.t / 0.18;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1 - p.t / 0.18), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
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

setupTowerSelect();
setupModeSelect();
state.maxWave = gameModes[state.mode].waves;
updateHud();
requestAnimationFrame(gameLoop);
