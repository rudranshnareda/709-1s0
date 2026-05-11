import Phaser from 'phaser';
import { FONT } from '../utils/RetroUI.js';

export default class DeathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeathScene' });
    this._ready = false;
  }

  // data: { parentScene, checkpointX, checkpointY, extra }
  create(data) {
    this._parent = data?.parentScene ?? 'Level1';
    this._cpX    = data?.checkpointX ?? 100;
    this._cpY    = data?.checkpointY ?? 580;
    this._extra  = data?.extra ?? {};

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Red-tinted dim overlay
    const overlay = this.add.graphics().setDepth(49).setScrollFactor(0);
    overlay.fillStyle(0x220000, 0.72);
    overlay.fillRect(0, 0, W, H);

    // "YOU DIED" title
    this.add.text(W / 2, H / 2 - 70, 'YOU DIED', {
      fontFamily: FONT,
      fontSize: '36px',
      fill: '#FF4444',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#880000', blur: 8, fill: true },
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0);

    // RETRY button
    const btn = this.add.text(W / 2, H / 2 + 20, 'RETRY', {
      fontFamily: FONT,
      fontSize: '18px',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(52).setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    // Blink the retry text
    this.tweens.add({ targets: btn, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
    btn.on('pointerout',  () => btn.setStyle({ fill: '#FFD700' }));
    btn.on('pointerdown', () => this._retry());

    this.input.keyboard.once('keydown', () => this._retry());

    this.time.delayedCall(400, () => { this._ready = true; });
  }

  _retry() {
    if (!this._ready) return;
    this._ready = false;
    // scene.start() shuts down any existing instance of the parent scene
    // before restarting it — calling stop() first causes a state conflict
    // when the parent is paused, which hangs the scene manager.
    this.scene.start(this._parent, { respawnX: this._cpX, respawnY: this._cpY, ...this._extra });
    this.scene.stop();
  }
}
