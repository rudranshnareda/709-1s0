import Phaser from 'phaser';
import SaveManager from '../systems/SaveManager.js';
import { drawPanel, addScanlines, playRetroSound, FONT } from '../utils/RetroUI.js';

// Metadata for each memory gem
const MEMORIES = [
  { id: 'memory_01', level: 1, title: 'First Day',    caption: 'The beginning of everything.',    color: 0xAA2222 },
  { id: 'memory_02', level: 2, title: 'The Garden',   caption: 'She loved the flowers here.',     color: 0x228833 },
  { id: 'memory_03', level: 3, title: 'Mall Date',    caption: 'Monster Energy and laughter.',    color: 0x6622AA },
  { id: 'memory_04', level: 4, title: 'Jal Mahal',   caption: 'The lake reflected the moon.',    color: 0x224488 },
  { id: 'memory_05', level: 5, title: 'Last Metro',  caption: 'We almost missed the train.',     color: 0xAA6622 },
  { id: 'memory_06', level: 6, title: 'Old City',    caption: 'Lost in the pink streets.',       color: 0xAA2266 },
  { id: 'memory_07', level: 7, title: 'The Fort',    caption: 'We could see all of Jaipur.',     color: 0x886622 },
];

const COLS = 4;
const CARD_W = 180, CARD_H = 150;
const GAP_X = 22, GAP_Y = 28;

export default class MemoryGalleryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MemoryGalleryScene' });
    this._sel = 0;
    this._ready = false;
  }

  create(data) {
    this._from = data?.from ?? 'MenuScene';
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    const collected = (SaveManager.load()?.memories ?? []);
    this._collected = collected;

    this._buildBg(W, H);
    this._buildHeader(W);
    this._buildCards(W, H, collected);
    this._buildFooter(W, H);
    addScanlines(this);

    this.keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
      back:  Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(600, () => { this._ready = true; });
    this._refreshSelection();
  }

  _buildBg(W, H) {
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x04041a, 1);
    bg.fillRect(0, 0, W, H);
    bg.lineStyle(2, 0xFFD700, 0.25);
    bg.strokeRect(16, 16, W - 32, H - 32);
  }

  _buildHeader(W) {
    const count = this._collected.length;
    this.add.text(W / 2, 36, 'M E M O R Y  G A L L E R Y', {
      fontFamily: FONT, fontSize: '14px', fill: '#FFD700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5);

    this.add.text(W / 2, 64, `Memories Restored:  ${count} / ${MEMORIES.length}`, {
      fontFamily: FONT, fontSize: '9px', fill: '#8888AA',
    }).setOrigin(0.5).setDepth(5);

    // Progress bar
    const barX = W / 2 - 120, barY = 80;
    const bg = this.add.graphics().setDepth(5);
    bg.fillStyle(0x222240, 1); bg.fillRect(barX, barY, 240, 8);
    bg.lineStyle(1, 0xFFD700, 0.4); bg.strokeRect(barX, barY, 240, 8);
    if (count > 0) {
      bg.fillStyle(0xFFD700, 1);
      bg.fillRect(barX, barY, Math.round(240 * count / MEMORIES.length), 8);
    }
  }

  _buildCards(W, H, collected) {
    const rows = Math.ceil(MEMORIES.length / COLS);
    const totalW = COLS * CARD_W + (COLS - 1) * GAP_X;
    const totalH = rows * CARD_H + (rows - 1) * GAP_Y;
    const startX = (W - totalW) / 2;
    const startY = 110;

    this._cardGfx = [];
    this._cardTexts = [];

    MEMORIES.forEach((mem, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = startX + col * (CARD_W + GAP_X);
      const cy = startY + row * (CARD_H + GAP_Y);
      const unlocked = collected.includes(mem.id);

      const g = this.add.graphics().setDepth(4);
      this._cardGfx.push(g);
      this._drawCard(g, cx, cy, mem, unlocked, false);

      // Level badge
      this.add.text(cx + CARD_W - 10, cy + 8, `L${mem.level}`, {
        fontFamily: FONT, fontSize: '7px',
        fill: unlocked ? '#FFD700' : '#333355',
      }).setOrigin(1, 0).setDepth(6);

      if (unlocked) {
        // Title
        this.add.text(cx + CARD_W / 2, cy + CARD_H - 42, mem.title, {
          fontFamily: FONT, fontSize: '8px', fill: '#FFFFFF', align: 'center',
          wordWrap: { width: CARD_W - 16 },
        }).setOrigin(0.5, 0).setDepth(6);
        // Caption
        this.add.text(cx + CARD_W / 2, cy + CARD_H - 24, mem.caption, {
          fontFamily: FONT, fontSize: '6px', fill: '#8888AA', align: 'center',
          wordWrap: { width: CARD_W - 16 },
        }).setOrigin(0.5, 0).setDepth(6);
      } else {
        this.add.text(cx + CARD_W / 2, cy + CARD_H / 2 + 6, '?', {
          fontFamily: FONT, fontSize: '24px', fill: '#222244',
        }).setOrigin(0.5).setDepth(6);
        this.add.text(cx + CARD_W / 2, cy + CARD_H - 18, 'NOT FOUND', {
          fontFamily: FONT, fontSize: '7px', fill: '#333355',
        }).setOrigin(0.5, 0).setDepth(6);
      }

      // Touch
      const zone = this.add.zone(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H).setInteractive();
      zone.on('pointerdown', () => {
        if (this._sel !== i) { this._sel = i; playRetroSound('move'); this._refreshSelection(); }
      });
    });
  }

  _drawCard(g, cx, cy, mem, unlocked, selected) {
    g.clear();
    if (selected) { g.fillStyle(0xFFD700, 0.12); g.fillRect(cx - 4, cy - 4, CARD_W + 8, CARD_H + 8); }
    // Card background
    g.fillStyle(unlocked ? mem.color : 0x0c0c22, 1);
    const alpha = unlocked ? 0.28 : 0.7;
    g.fillStyle(unlocked ? mem.color : 0x0a0a1e, alpha);
    g.fillRect(cx, cy, CARD_W, CARD_H);
    // Inner image placeholder (top 60% of card)
    const imgH = Math.round(CARD_H * 0.58);
    g.fillStyle(unlocked ? mem.color : 0x08081a, unlocked ? 0.55 : 0.9);
    g.fillRect(cx + 6, cy + 6, CARD_W - 12, imgH - 6);
    // Border
    const bc = selected ? 0xFFFFFF : (unlocked ? 0xFFD700 : 0x222244);
    g.lineStyle(selected ? 3 : 2, bc, 1);
    g.strokeRect(cx, cy, CARD_W, CARD_H);
    // Separator line between image and text area
    g.lineStyle(1, unlocked ? 0xFFD700 : 0x1a1a33, 0.4);
    g.lineBetween(cx, cy + imgH, cx + CARD_W, cy + imgH);
  }

  _buildFooter(W, H) {
    this.add.text(W / 2, H - 28, 'ARROW KEYS  NAVIGATE    ESC  BACK', {
      fontFamily: FONT, fontSize: '8px', fill: '#333355',
    }).setOrigin(0.5).setDepth(5);
  }

  _refreshSelection() {
    const collected = this._collected;
    MEMORIES.forEach((mem, i) => {
      const g  = this._cardGfx[i];
      const col = i % COLS, row = Math.floor(i / COLS);
      const totalW = COLS * CARD_W + (COLS - 1) * GAP_X;
      const cx = (this.cameras.main.width - totalW) / 2 + col * (CARD_W + GAP_X);
      const cy = 110 + row * (CARD_H + GAP_Y);
      this._drawCard(g, cx, cy, mem, collected.includes(mem.id), i === this._sel);
    });
  }

  update() {
    if (!this._ready) return;
    const { up, down, left, right, esc, back } = this.keys;

    if (Phaser.Input.Keyboard.JustDown(esc) || Phaser.Input.Keyboard.JustDown(back)) {
      playRetroSound('back');
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this._from));
      return;
    }
    let moved = false;
    if (Phaser.Input.Keyboard.JustDown(left))  { this._sel = Math.max(0, this._sel - 1); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(right)) { this._sel = Math.min(MEMORIES.length - 1, this._sel + 1); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(up))    { this._sel = Math.max(0, this._sel - COLS); moved = true; }
    if (Phaser.Input.Keyboard.JustDown(down))  { this._sel = Math.min(MEMORIES.length - 1, this._sel + COLS); moved = true; }
    if (moved) { playRetroSound('move'); this._refreshSelection(); }
  }
}
