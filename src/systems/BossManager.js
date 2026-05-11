import { FONT } from '../utils/RetroUI.js';

export default class BossManager {
  constructor(scene, bossType) {
    this.scene        = scene;
    this.bossType     = bossType;
    this.maxHealth    = 3;
    this.health       = this.maxHealth;
    this.phase        = 1;
    this.isDefeated   = false;
    this.sprite       = null;
    this.contactDamage = 2;
    this.attackTimer  = null;
    this._lunging     = false;
    this._player      = null;
  }

  spawn(x, y) {
    this.sprite = this.scene.physics.add.sprite(x, y, `${this.bossType}_idle`);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    this.sprite.setDisplaySize(80, 100);

    this._createHealthBar();

    // Brief dramatic entrance pause before starting attacks
    this.scene.time.delayedCall(800, () => this._startPhase(1));

    return this.sprite;
  }

  _createHealthBar() {
    const W = this.scene.cameras.main.width;

    this.barBg = this.scene.add
      .rectangle(W / 2, 38, 404, 22, 0x330000)
      .setScrollFactor(0).setDepth(50).setAlpha(0);

    this.barFill = this.scene.add
      .rectangle(W / 2 - 200, 38, 400, 18, 0xcc0033)
      .setScrollFactor(0).setDepth(51).setOrigin(0, 0.5).setAlpha(0);

    this.barLabel = this.scene.add
      .text(W / 2, 18, 'SHADOW MONSTER', {
        fontFamily: FONT, fontSize: '11px', fill: '#ff6688',
      })
      .setScrollFactor(0).setDepth(51).setOrigin(0.5).setAlpha(0);

    this.scene.tweens.add({
      targets: [this.barBg, this.barFill, this.barLabel],
      alpha: 1, duration: 500,
    });
  }

  _updateHealthBar() {
    if (!this.barFill) return;
    const pct = Math.max(0, this.health / this.maxHealth);
    this.barFill.setScale(pct, 1);
  }

  _startPhase(phase) {
    this.phase = phase;
    if (this.attackTimer) this.attackTimer.remove();

    if (phase === 2) {
      // Flash the health bar red on phase transition
      this.scene.tweens.add({
        targets: this.barFill, fillColor: 0xff0000,
        duration: 200, yoyo: true, repeat: 3,
      });
    }

    const interval = phase === 1 ? 2200 : 1200;
    this.attackTimer = this.scene.time.addEvent({
      delay: interval,
      callback: this._performAttack,
      callbackScope: this,
      loop: true,
    });
  }

  _performAttack() {
    if (this.isDefeated || !this.sprite || !this._player || this._lunging) return;
    this._lunging = true;

    const dir = this._player.sprite.x < this.sprite.x ? -1 : 1;
    this.sprite.setTexture(`${this.bossType}_attack`);

    if (this.phase === 1) {
      // Phase 1: fast horizontal lunge
      this.sprite.setVelocityX(dir * 420);
      this.scene.time.delayedCall(350, () => {
        if (!this.sprite) return;
        this.sprite.setVelocityX(0);
        this.sprite.setTexture(`${this.bossType}_idle`);
        this._lunging = false;
      });
    } else {
      // Phase 2: leap + slam (jump toward player)
      this.sprite.setVelocityX(dir * 500);
      this.sprite.setVelocityY(-520);
      this.scene.time.delayedCall(550, () => {
        if (!this.sprite) return;
        this.sprite.setVelocityX(0);
        this.sprite.setTexture(`${this.bossType}_idle`);
        this._lunging = false;
      });
    }
  }

  update(player) {
    if (this.isDefeated || !this.sprite) return;
    this._player = player;

    if (!this._lunging) {
      const dir   = player.sprite.x < this.sprite.x ? -1 : 1;
      const speed = this.phase === 1 ? 80 : 140;
      this.sprite.setVelocityX(speed * dir);
      // Shadow monster sprite faces left by default → flip when moving right
      this.sprite.setFlipX(dir > 0);
    } else {
      const dir = player.sprite.x < this.sprite.x ? -1 : 1;
      this.sprite.setFlipX(dir > 0);
    }
  }

  takeDamage(amount) {
    if (this.isDefeated) return;
    this.health -= amount;
    this._updateHealthBar();

    this.sprite.setTint(0xff4444);
    this.scene.time.delayedCall(120, () => this.sprite?.clearTint());

    if (this.phase === 1 && this.health <= this.maxHealth * 0.5) {
      this._startPhase(2);
      this.scene.cameras.main.shake(400, 0.015);
    }

    if (this.health <= 0) this._defeat();
  }

  _defeat() {
    this.isDefeated = true;
    if (this.attackTimer) this.attackTimer.remove();
    this.sprite.setVelocityX(0);

    this.scene.cameras.main.shake(600, 0.02);

    this.scene.tweens.add({
      targets: [this.sprite, this.barBg, this.barFill, this.barLabel],
      alpha: 0, duration: 900,
      onComplete: () => {
        this.sprite?.destroy();
        this.scene.events.emit('bossDefeated');
      },
    });
  }
}
