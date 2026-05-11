import Phaser from 'phaser';
import SaveManager from '../systems/SaveManager.js';
import { drawPanel, addScanlines, playRetroSound, FONT } from '../utils/RetroUI.js';

// Node positions matched to the pixelated Jaipur map image (1280×720)
const NODES = [
  { level: 1, name: 'SMS Medical\nCollege',  scene: 'Level1', x: 490, y: 372 },
  { level: 2, name: 'Smriti Van',            scene: 'Level2', x: 218, y: 510 },
  { level: 3, name: 'WTP Mall',              scene: 'Level3', x: 565, y: 448 },
  { level: 4, name: 'Jal Mahal',             scene: 'Level4', x: 252, y: 265 },
  { level: 5, name: 'Metro',                 scene: 'Level5', x: 142, y: 592 },
  { level: 6, name: 'Pink City',             scene: 'Level6', x: 920, y: 295 },
  { level: 7, name: 'Nahargarh\nFort',       scene: 'Level7', x: 580, y: 72  },
];

// Road connections visible on the Jaipur map
const PATHS = [[0,1],[0,2],[1,4],[2,3],[2,5],[3,6],[5,6]];

export default class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
    this._sel = 0;
    this._ready = false;
    this._nodeGfx = [];
    this._labelTexts = [];
  }

  preload() {
    this.load.image('jaipur_map', 'assets/backgrounds/jaipur_map.png');
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this._save = SaveManager.load() ?? { unlockedLevels: [1], completedLevels: [], memories: [] };
    this._findFirstUnlocked();

    this._buildBg(W, H);
    this._buildPaths();
    this._buildNodes();
    this._buildHUD(W, H);
    this._buildInfoPanel(W, H);
    addScanlines(this);

    this.keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.time.delayedCall(700, () => { this._ready = true; });
    this._refreshSelection();
  }

  _findFirstUnlocked() {
    // Start cursor on last completed+1, or first unlocked
    const completed = this._save.completedLevels ?? [];
    const maxDone = completed.length ? Math.max(...completed) : 0;
    const target = maxDone + 1;
    const idx = NODES.findIndex(n => n.level === target);
    this._sel = idx >= 0 ? idx : 0;
  }

  // ── background ────────────────────────────────────────────────────────────

  _buildBg(W, H) {
    // Pixelated Jaipur map as full background
    this.add.image(0, 0, 'jaipur_map')
      .setOrigin(0, 0)
      .setDisplaySize(W, H)
      .setDepth(0);

    // Dark vignette around edges so nodes/UI stand out
    const vig = this.add.graphics().setDepth(1);
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vig.fillRect(0, 0, W, 80);   // top
    vig.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vig.fillRect(0, H - 100, W, 100); // bottom

    // Gold border
    const border = this.add.graphics().setDepth(2);
    border.lineStyle(3, 0xFFD700, 0.5);
    border.strokeRect(16, 16, W - 32, H - 32);

    // Title banner — semi-transparent backing so it's readable over the image
    const titleBg = this.add.graphics().setDepth(3);
    titleBg.fillStyle(0x000000, 0.52);
    titleBg.fillRect(W / 2 - 200, 28, 400, 28);

    this.add.text(W / 2, 42, 'M A P  O F  J A I P U R', {
      fontFamily: FONT, fontSize: '13px', fill: '#FFD700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(4);
  }

  // ── paths ─────────────────────────────────────────────────────────────────

  _buildPaths() {
    const g = this.add.graphics().setDepth(2);
    PATHS.forEach(([ai, bi]) => {
      const a = NODES[ai], b = NODES[bi];
      const unlockA = this._save.unlockedLevels.includes(a.level);
      const unlockB = this._save.unlockedLevels.includes(b.level);
      const active = unlockA && unlockB;
      g.lineStyle(3, active ? 0xFFD700 : 0x2a2a4a, active ? 0.7 : 0.4);
      // Dashed feel: alternate segments
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        if (s % 2 === 1) continue;
        const t0 = s / steps, t1 = (s + 0.85) / steps;
        g.lineBetween(
          Phaser.Math.Linear(a.x, b.x, t0), Phaser.Math.Linear(a.y, b.y, t0),
          Phaser.Math.Linear(a.x, b.x, t1), Phaser.Math.Linear(a.y, b.y, t1),
        );
      }
    });
  }

  // ── nodes ─────────────────────────────────────────────────────────────────

  _buildNodes() {
    NODES.forEach((node, i) => {
      const unlocked  = this._save.unlockedLevels.includes(node.level);
      const completed = this._save.completedLevels.includes(node.level);

      // Node circle background
      const g = this.add.graphics().setDepth(3);
      this._nodeGfx.push(g);
      this._drawNode(g, node, unlocked, completed, false);

      // Level number badge
      this.add.text(node.x, node.y, String(node.level), {
        fontFamily: FONT, fontSize: '11px', fill: unlocked ? '#FFFFFF' : '#333350',
      }).setOrigin(0.5).setDepth(6);

      // Label beneath
      const lbl = this.add.text(node.x, node.y + 30, node.name, {
        fontFamily: FONT, fontSize: '7px',
        fill: unlocked ? '#BBBBDD' : '#2a2a44',
        align: 'center',
      }).setOrigin(0.5, 0).setDepth(6);
      this._labelTexts.push(lbl);

      // Completed star
      if (completed) {
        this.add.text(node.x + 18, node.y - 18, '★', {
          fontFamily: FONT, fontSize: '10px', fill: '#FFD700',
        }).setOrigin(0.5).setDepth(7);
      }

      // Locked icon
      if (!unlocked) {
        this.add.text(node.x, node.y, '🔒', { fontSize: '13px' }).setOrigin(0.5).setDepth(7);
      }

      // Touch tap
      const zone = this.add.zone(node.x, node.y, 60, 60).setInteractive();
      zone.on('pointerdown', () => {
        if (this._sel !== i) { this._sel = i; playRetroSound('move'); this._refreshSelection(); }
        else this._enterLevel();
      });
    });
  }

  _drawNode(g, node, unlocked, completed, selected) {
    g.clear();
    const r = selected ? 22 : 18;
    // Glow for selected
    if (selected) { g.fillStyle(0xFFD700, 0.18); g.fillCircle(node.x, node.y, r + 10); }
    // Fill
    g.fillStyle(unlocked ? (completed ? 0x1a3a1a : 0x1a1a3a) : 0x0d0d1e, 1);
    g.fillCircle(node.x, node.y, r);
    // Border
    const bc = selected ? 0xFFFFFF : (unlocked ? (completed ? 0x44FF88 : 0xFFD700) : 0x333355);
    g.lineStyle(selected ? 3 : 2, bc, 1);
    g.strokeCircle(node.x, node.y, r);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD(W, H) {
    const s = this._save;
    const done = (s.completedLevels ?? []).length;
    const mem  = (s.memories ?? []).length;
    drawPanel(this, 30, 60, 240, 70, 20);
    this.add.text(50, 76, `LEVELS:  ${done} / 7`, { fontFamily: FONT, fontSize: '10px', fill: '#AAAACC' }).setDepth(21);
    this.add.text(50, 100, `MEMORIES: ${mem} / 7`, { fontFamily: FONT, fontSize: '10px', fill: '#AAAACC' }).setDepth(21);
  }

  // ── info panel ────────────────────────────────────────────────────────────

  _buildInfoPanel(W, H) {
    const pH = 80;
    drawPanel(this, 20, H - pH - 20, W - 40, pH, 20);

    this._infoName = this.add.text(W / 2, H - pH + 4, '', {
      fontFamily: FONT, fontSize: '13px', fill: '#FFD700',
    }).setOrigin(0.5, 0).setDepth(22);

    this._infoStatus = this.add.text(W / 2, H - pH + 26, '', {
      fontFamily: FONT, fontSize: '9px', fill: '#AAAACC',
    }).setOrigin(0.5, 0).setDepth(22);

    this._infoHint = this.add.text(W / 2, H - pH + 46, '', {
      fontFamily: FONT, fontSize: '9px', fill: '#666688',
    }).setOrigin(0.5, 0).setDepth(22);
  }

  _refreshSelection() {
    NODES.forEach((node, i) => {
      const unlocked  = this._save.unlockedLevels.includes(node.level);
      const completed = this._save.completedLevels.includes(node.level);
      this._drawNode(this._nodeGfx[i], node, unlocked, completed, i === this._sel);
    });

    const node = NODES[this._sel];
    const unlocked  = this._save.unlockedLevels.includes(node.level);
    const completed = this._save.completedLevels.includes(node.level);
    const levelName = node.name.replace('\n', ' ');

    this._infoName.setText(`LEVEL ${node.level}  —  ${levelName}`);
    this._infoStatus.setText(
      !unlocked ? 'LOCKED  ·  Complete previous level to unlock'
      : completed ? 'COMPLETED  ★  Replay anytime'
      : 'UNLOCKED  ·  Ready to play',
    );
    this._infoHint.setText(unlocked ? 'ENTER / Z to enter   ·   ESC for Title' : 'ESC for Title');
  }

  // ── update ────────────────────────────────────────────────────────────────

  update() {
    if (!this._ready) return;

    const { up, down, left, right, enter, z, esc } = this.keys;

    if (Phaser.Input.Keyboard.JustDown(esc)) {
      playRetroSound('back');
      this._fade('MenuScene');
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(enter) || Phaser.Input.Keyboard.JustDown(z)) {
      this._enterLevel(); return;
    }
    // Directional nav — find nearest node in direction
    let moved = false;
    if (Phaser.Input.Keyboard.JustDown(up))    { this._moveDir(0, -1); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(down))  { this._moveDir(0,  1); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(left))  { this._moveDir(-1, 0); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(right)) { this._moveDir( 1, 0); moved = true; }
    if (moved) { playRetroSound('move'); this._refreshSelection(); }
  }

  _moveDir(dx, dy) {
    const cur = NODES[this._sel];
    let best = -1, bestScore = Infinity;
    NODES.forEach((n, i) => {
      if (i === this._sel) return;
      const nx = n.x - cur.x, ny = n.y - cur.y;
      // Must be broadly in the right direction
      if (dx !== 0 && Math.sign(nx) !== dx) return;
      if (dy !== 0 && Math.sign(ny) !== dy) return;
      const score = Math.abs(nx) + Math.abs(ny);
      if (score < bestScore) { bestScore = score; best = i; }
    });
    if (best >= 0) this._sel = best;
  }

  _enterLevel() {
    const node = NODES[this._sel];
    if (!this._save.unlockedLevels.includes(node.level)) {
      playRetroSound('error');
      // Brief shake on locked node gfx
      this.tweens.add({ targets: this._nodeGfx[this._sel], x: this._nodeGfx[this._sel].x + 4, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    this._ready = false;
    playRetroSound('select');
    this._fade(node.scene);
  }

  _fade(key, data = {}) {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
