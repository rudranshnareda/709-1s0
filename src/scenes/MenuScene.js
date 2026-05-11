import Phaser from 'phaser';
import { addScanlines, FONT } from '../utils/RetroUI.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this._ready = false;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this._buildBackground(W, H);

    // Subtitle
    this.add.text(W / 2, H * 0.18, 'A  J A I P U R  T A L E', {
      fontFamily: FONT, fontSize: '11px', fill: '#9999DD',
    }).setOrigin(0.5).setDepth(10);

    // Title
    const title = this.add.text(W / 2, H * 0.32, '709 - 1s0', {
      fontFamily: FONT, fontSize: '52px', fill: '#FFFFFF',
      stroke: '#FFD700', strokeThickness: 2,
      shadow: { offsetX: 4, offsetY: 4, color: '#7a5900', blur: 10, stroke: true, fill: true },
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: title, y: title.y - 10, duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    // Press to continue — blinks
    const prompt = this.add.text(W / 2, H * 0.68, 'PRESS ANY KEY TO CONTINUE', {
      fontFamily: FONT, fontSize: '13px', fill: '#FFD700',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: prompt, alpha: 0, duration: 600, ease: 'Linear', yoyo: true, repeat: -1 });

    // DEV: skip buttons
    const skipL2 = this.add.text(W - 12, H - 12, '[skip to L2]', {
      fontFamily: FONT, fontSize: '10px', fill: '#555577',
    }).setOrigin(1, 1).setDepth(20).setInteractive({ useHandCursor: true });
    skipL2.on('pointerover', () => skipL2.setStyle({ fill: '#aaaaff' }));
    skipL2.on('pointerout',  () => skipL2.setStyle({ fill: '#555577' }));
    skipL2.on('pointerdown', () => this.scene.start('Level2'));

    const skipEnd = this.add.text(W - 12, H - 28, '[skip to ending]', {
      fontFamily: FONT, fontSize: '10px', fill: '#555577',
    }).setOrigin(1, 1).setDepth(20).setInteractive({ useHandCursor: true });
    skipEnd.on('pointerover', () => skipEnd.setStyle({ fill: '#aaaaff' }));
    skipEnd.on('pointerout',  () => skipEnd.setStyle({ fill: '#555577' }));
    skipEnd.on('pointerdown', () => this.scene.start('EndingScene'));

    addScanlines(this);
    this.cameras.main.fadeIn(900, 0, 0, 0);
    this.time.delayedCall(1000, () => { this._ready = true; });

    // Any key or click
    this.input.keyboard.on('keydown', () => this._start());
    this.input.on('pointerdown', () => this._start());
  }

  _start() {
    if (!this._ready) return;
    this._ready = false;
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('IntroCutsceneScene'));
  }

  _buildBackground(W, H) {
    const sky = this.add.graphics().setDepth(-2);
    for (let i = 0; i < H; i++) {
      const t = i / H;
      const r = Math.round(Phaser.Math.Linear(2, 8, t));
      const g = Math.round(Phaser.Math.Linear(2, 4, t));
      const b = Math.round(Phaser.Math.Linear(24, 46, t));
      sky.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      sky.fillRect(0, i, W, 1);
    }

    const stars = this.add.graphics().setDepth(-1);
    for (let i = 0; i < 90; i++) {
      const sx = Phaser.Math.Between(0, W);
      const sy = Phaser.Math.Between(0, Math.round(H * 0.75));
      const sr = Phaser.Math.FloatBetween(0.5, 1.8);
      stars.fillStyle(0xFFFFFF, Phaser.Math.FloatBetween(0.3, 1.0));
      stars.fillCircle(sx, sy, sr);
    }

    const sil = this.add.graphics().setDepth(0);
    sil.fillStyle(0x06061c, 1);
    sil.fillRect(0, Math.round(H * 0.72), W, Math.round(H * 0.28));
    for (let bx = 0; bx < W; bx += 44)
      sil.fillRect(bx, Math.round(H * 0.67), 28, Math.round(H * 0.06));
    sil.fillRect(Math.round(W * 0.48), Math.round(H * 0.5), 80, Math.round(H * 0.22));
    sil.fillRect(Math.round(W * 0.47), Math.round(H * 0.48), 96, 18);
    sil.fillRect(Math.round(W * 0.24), Math.round(H * 0.6), 50, Math.round(H * 0.12));
    sil.fillRect(Math.round(W * 0.71), Math.round(H * 0.6), 50, Math.round(H * 0.12));

    const mx = Math.round(W * 0.82), my = Math.round(H * 0.12);
    const moon = this.add.graphics().setDepth(1);
    moon.fillStyle(0xFFF8DC, 0.92);
    moon.fillCircle(mx, my, 18);
    moon.fillStyle(0x04041a, 1);
    moon.fillCircle(mx + 7, my - 3, 14);
  }
}
