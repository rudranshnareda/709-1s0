import Phaser from 'phaser';
import { drawPanel, addScanlines, createBlinker, showConfirm, playRetroSound, FONT } from '../utils/RetroUI.js';

const ITEMS = ['Continue', 'Settings', 'Return to Title'];

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
    this._idx = 0;
    this._ready = false;
  }

  // data: { parentScene: 'Level1' | ... }
  create(data) {
    this._parent = data?.parentScene ?? 'MapScene';
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Dim overlay
    const overlay = this.add.graphics().setDepth(49).setScrollFactor(0);
    overlay.fillStyle(0x000000, 0.62);
    overlay.fillRect(0, 0, W, H);

    // Panel
    const panelW = 320;
    const panelH = 44 + ITEMS.length * 44 + 20;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    drawPanel(this, panelX, panelY, panelW, panelH, 50);

    // Header
    this.add.text(W / 2, panelY + 16, 'PAUSED', {
      fontFamily: FONT, fontSize: '16px', fill: '#FFD700',
    }).setOrigin(0.5, 0).setDepth(52).setScrollFactor(0);

    // Separator line
    const sep = this.add.graphics().setDepth(52).setScrollFactor(0);
    sep.lineStyle(1, 0xFFD700, 0.35);
    sep.lineBetween(panelX + 10, panelY + 38, panelX + panelW - 10, panelY + 38);

    // Menu items
    this._labels = ITEMS.map((label, i) => {
      const t = this.add.text(W / 2 + 12, panelY + 44 + i * 44, label, {
        fontFamily: FONT, fontSize: '13px', fill: '#FFFFFF',
      }).setOrigin(0.5, 0).setDepth(52).setScrollFactor(0);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { if (this._idx !== i) { this._idx = i; playRetroSound('move'); this._refresh(); } });
      t.on('pointerdown', () => { this._idx = i; this._select(); });
      return t;
    });

    this._panelX = panelX; this._panelY = panelY;
    this._cursor = createBlinker(this, panelX + 18, panelY + 44 + 7, 53);
    this._refresh();

    addScanlines(this);

    this.keys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      z:     Phaser.Input.Keyboard.KeyCodes.Z,
      esc:   Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.time.delayedCall(200, () => { this._ready = true; });
  }

  _refresh() {
    this._labels.forEach((t, i) => t.setStyle({ fill: i === this._idx ? '#FFD700' : '#FFFFFF' }));
    const ty = this._panelY + 44 + this._idx * 44 + 7;
    this.tweens.add({ targets: this._cursor, y: ty, duration: 70, ease: 'Power2' });
  }

  _select() {
    if (!this._ready) return;
    playRetroSound('select');

    switch (ITEMS[this._idx]) {
      case 'Continue':
        this._resume();
        break;

      case 'Settings':
        // Launch settings on top of pause — pause stays visible beneath
        this.scene.launch('SettingsScene', { from: 'PauseScene', parentScene: this._parent });
        break;

      case 'Return to Title':
        showConfirm(this,
          'Return to title?\nUnsaved progress will be lost.',
          () => { this._stopAndGo('MenuScene'); },
          () => {}
        );
        break;
    }
  }

  _resume() {
    this.scene.resume(this._parent);
    this.scene.stop();
  }

  _stopAndGo(key) {
    this.scene.stop(this._parent);
    this.scene.stop();
    this.scene.start(key);
  }

  update() {
    if (!this._ready) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) { playRetroSound('back'); this._resume(); return; }
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) { this._idx = (this._idx - 1 + ITEMS.length) % ITEMS.length; playRetroSound('move'); this._refresh(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.down)) { this._idx = (this._idx + 1) % ITEMS.length; playRetroSound('move'); this._refresh(); }
    if (Phaser.Input.Keyboard.JustDown(this.keys.enter) || Phaser.Input.Keyboard.JustDown(this.keys.z)) { this._select(); }
  }
}
