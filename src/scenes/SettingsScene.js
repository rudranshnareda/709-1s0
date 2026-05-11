import Phaser from 'phaser';
import SettingsManager from '../systems/SettingsManager.js';
import { drawPanel, addScanlines, playRetroSound, FONT } from '../utils/RetroUI.js';

const BAR_W = 160;
const BAR_H = 12;

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
    this._idx = 0;
    this._ready = false;
  }

  // data: { from: 'MenuScene' | 'PauseScene', parentScene?: string }
  create(data) {
    this._from = data?.from ?? 'MenuScene';
    this._parentScene = data?.parentScene ?? null;
    this._s = SettingsManager.get();

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // If launched as overlay (from PauseScene), dim beneath
    if (this._from === 'PauseScene') {
      const dim = this.add.graphics().setDepth(49).setScrollFactor(0);
      dim.fillStyle(0x000000, 0.5);
      dim.fillRect(0, 0, W, H);
    }

    const panelW = 500, panelH = 380;
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    drawPanel(this, panelX, panelY, panelW, panelH, 50);

    this.add.text(W / 2, panelY + 18, 'S E T T I N G S', {
      fontFamily: FONT, fontSize: '16px', fill: '#FFD700',
    }).setOrigin(0.5, 0).setDepth(52).setScrollFactor(0);

    const sep = this.add.graphics().setDepth(52).setScrollFactor(0);
    sep.lineStyle(1, 0xFFD700, 0.3);
    sep.lineBetween(panelX + 12, panelY + 42, panelX + panelW - 12, panelY + 42);

    this._rows = [
      { key: 'musicVolume', label: 'MUSIC VOLUME', type: 'slider' },
      { key: 'sfxVolume',   label: 'SFX VOLUME',   type: 'slider' },
      { key: 'muted',       label: 'MUTE ALL',      type: 'toggle' },
      { key: 'fullscreen',  label: 'FULLSCREEN',    type: 'toggle' },
    ];

    this._rowY = panelY + 60;
    this._cx = panelX + 20;
    this._vx = panelX + panelW - 20;

    this._rowLabels = [];
    this._rowValues = [];
    this._barGfx = [];

    this._rows.forEach((row, i) => {
      const ry = this._rowY + i * 58;

      const lbl = this.add.text(this._cx + 24, ry + 8, row.label, {
        fontFamily: FONT, fontSize: '11px', fill: '#FFFFFF',
      }).setOrigin(0, 0.5).setDepth(52).setScrollFactor(0);
      this._rowLabels.push(lbl);

      const bg = this.add.graphics().setDepth(51).setScrollFactor(0);
      this._barGfx.push(bg);

      const val = this.add.text(this._vx, ry + 8, '', {
        fontFamily: FONT, fontSize: '11px', fill: '#FFD700',
      }).setOrigin(1, 0.5).setDepth(52).setScrollFactor(0);
      this._rowValues.push(val);

      // Touch interact
      const zone = this.add.zone(W / 2, ry + 8, panelW - 40, 46).setInteractive();
      zone.on('pointerdown', (ptr) => {
        if (this._idx !== i) { this._idx = i; playRetroSound('move'); this._refresh(); }
        if (row.type === 'slider') this._adjustFromPointer(ptr, panelX + 160, ry + 8 - BAR_H / 2);
        else this._toggle();
      });
    });

    // BACK row
    const backY = this._rowY + this._rows.length * 58 + 12;
    const backLbl = this.add.text(W / 2, backY, 'BACK', {
      fontFamily: FONT, fontSize: '13px', fill: '#FFFFFF',
    }).setOrigin(0.5, 0).setDepth(52).setScrollFactor(0).setInteractive({ useHandCursor: true });
    backLbl.on('pointerover', () => { this._idx = this._rows.length; playRetroSound('move'); this._refresh(); });
    backLbl.on('pointerdown', () => { this._idx = this._rows.length; this._back(); });
    this._rowLabels.push(backLbl);

    this._cursor = this.add.text(this._cx, this._rowY + 8, '▶', {
      fontFamily: FONT, fontSize: '12px', fill: '#FFD700',
    }).setOrigin(0, 0.5).setDepth(53).setScrollFactor(0);

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

    this._idx = 0;
    this._refresh();
    this.time.delayedCall(200, () => { this._ready = true; });
  }

  _adjustFromPointer(ptr, barX, barY) {
    const row = this._rows[this._idx];
    if (row?.type !== 'slider') return;
    const t = Phaser.Math.Clamp((ptr.x - barX) / BAR_W, 0, 1);
    SettingsManager.set(row.key, parseFloat(t.toFixed(2)));
    this._s = SettingsManager.get();
    this._refresh();
  }

  _toggle() {
    const row = this._rows[this._idx];
    if (!row || row.type !== 'toggle') return;
    SettingsManager.set(row.key, !this._s[row.key]);
    this._s = SettingsManager.get();
    if (row.key === 'fullscreen') {
      if (this._s.fullscreen) this.scale.startFullscreen();
      else this.scale.stopFullscreen();
    }
    playRetroSound('select');
    this._refresh();
  }

  _refresh() {
    const totalRows = this._rows.length + 1; // +BACK
    this._rows.forEach((row, i) => {
      const ry = this._rowY + i * 58;
      const sel = i === this._idx;
      this._rowLabels[i]?.setStyle({ fill: sel ? '#FFD700' : '#FFFFFF' });

      // Draw value / bar
      const bg = this._barGfx[i];
      bg.clear();
      if (row.type === 'slider') {
        const bx = this._cx + 170, by = ry + 8 - BAR_H / 2;
        // Track
        bg.fillStyle(0x222240, 1); bg.fillRect(bx, by, BAR_W, BAR_H);
        bg.lineStyle(1, sel ? 0xFFD700 : 0x444466, 1); bg.strokeRect(bx, by, BAR_W, BAR_H);
        // Fill
        const fill = Math.round(this._s[row.key] * BAR_W);
        bg.fillStyle(sel ? 0xFFD700 : 0x6666AA, 1); bg.fillRect(bx, by, fill, BAR_H);
        // Pip
        bg.fillStyle(0xFFFFFF, 1); bg.fillRect(bx + fill - 3, by - 3, 6, BAR_H + 6);
        this._rowValues[i].setText('');
      } else {
        const on = !!this._s[row.key];
        this._rowValues[i].setText(on ? '[ ON ]' : '[OFF]');
        this._rowValues[i].setStyle({ fill: on ? '#44FF88' : '#FF5555' });
      }
    });

    // BACK label
    const backIdx = this._rows.length;
    if (this._rowLabels[backIdx]) {
      this._rowLabels[backIdx].setStyle({ fill: this._idx === backIdx ? '#FFD700' : '#FFFFFF' });
    }

    // Cursor position
    const cy = this._idx < this._rows.length
      ? this._rowY + this._idx * 58 + 8
      : this._rowY + this._rows.length * 58 + 12 + 7;
    this.tweens.add({ targets: this._cursor, y: cy, duration: 70, ease: 'Power2' });
  }

  _adjust(dir) {
    const row = this._rows[this._idx];
    if (!row || row.type !== 'slider') return;
    const v = Phaser.Math.Clamp(this._s[row.key] + dir * 0.05, 0, 1);
    SettingsManager.set(row.key, parseFloat(v.toFixed(2)));
    this._s = SettingsManager.get();
    playRetroSound('move');
    this._refresh();
  }

  _back() {
    if (!this._ready) return;
    playRetroSound('back');
    if (this._from === 'PauseScene') {
      // Just stop this overlay — PauseScene is still running beneath
      this.scene.stop();
    } else {
      // Full scene transition back
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    }
  }

  update() {
    if (!this._ready) return;
    const { up, down, left, right, enter, z, esc } = this.keys;
    const totalRows = this._rows.length + 1;

    if (Phaser.Input.Keyboard.JustDown(esc)) { this._back(); return; }
    if (Phaser.Input.Keyboard.JustDown(up)) {
      this._idx = (this._idx - 1 + totalRows) % totalRows; playRetroSound('move'); this._refresh();
    }
    if (Phaser.Input.Keyboard.JustDown(down)) {
      this._idx = (this._idx + 1) % totalRows; playRetroSound('move'); this._refresh();
    }
    if (Phaser.Input.Keyboard.JustDown(left))  this._adjust(-1);
    if (Phaser.Input.Keyboard.JustDown(right)) this._adjust(1);
    if (Phaser.Input.Keyboard.JustDown(enter) || Phaser.Input.Keyboard.JustDown(z)) {
      if (this._idx === this._rows.length) this._back();
      else if (this._rows[this._idx]?.type === 'toggle') this._toggle();
    }
  }
}
