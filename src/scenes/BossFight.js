import Phaser from 'phaser';
import PlayerController from '../systems/PlayerController.js';
import BossManager from '../systems/BossManager.js';

export default class BossFight extends Phaser.Scene {
  constructor() {
    super({ key: 'BossFight' });
  }

  preload() {
    this.load.image('bg_boss', 'assets/backgrounds/level_7_nahargarh_fort.png');
    this.load.image('tile_ground', 'assets/tiles/tile_ground.png');
    this.load.image('tile_platform', 'assets/tiles/tile_platform.png');
    this.load.image('her_idle', 'assets/characters/her/idle.png');
    this.load.image('shadow_me_idle', 'assets/characters/shadow_me/idle.png');
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.image(0, 0, 'bg_boss').setOrigin(0, 0).setDisplaySize(1280, 720);

    // Ominous intro
    const intro = this.add
      .text(640, 200, 'Shadow Me', {
        fontSize: '48px',
        fill: '#ff4444',
        fontFamily: 'Courier New',
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: intro, alpha: 1, duration: 1000, hold: 1500, yoyo: true });

    // Arena — symmetric for a fair fight
    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(640, 700, 'tile_ground').setScale(20, 1).refreshBody();
    this.platforms.create(200, 520, 'tile_platform').setScale(4, 1).refreshBody();
    this.platforms.create(1080, 520, 'tile_platform').setScale(4, 1).refreshBody();
    this.platforms.create(640, 380, 'tile_platform').setScale(5, 1).refreshBody();

    this.player = new PlayerController(this, 160, 580);

    this.boss = new BossManager(this, 'shadow_me');
    this.time.delayedCall(2500, () => {
      this.boss.spawn(1100, 580);
      this.physics.add.collider(this.boss.sprite, this.platforms);
      this.physics.add.collider(this.player.sprite, this.boss.sprite, () => {
        this.player.takeDamage(this.boss.contactDamage);
      });
    });

    this.physics.add.collider(this.player.sprite, this.platforms);

    this.cameras.main.setBounds(0, 0, 1280, 720);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);

    this.events.on('bossDefeated', this.onBossDefeated, this);
  }

  update() {
    this.player.update();
    if (this.boss) this.boss.update(this.player);
  }

  onBossDefeated() {
    this.cameras.main.shake(600, 0.02);

    this.time.delayedCall(800, () => {
      const ending = this.add
        .text(640, 320, 'You won.\n\n709 - 1s0', {
          fontSize: '36px',
          fill: '#e8d5b7',
          fontFamily: 'Courier New',
          align: 'center',
          lineSpacing: 16,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);

      this.tweens.add({ targets: ending, alpha: 1, duration: 1200 });

      // TODO: roll credits, return to menu after delay
      this.time.delayedCall(6000, () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
      });
    });
  }
}
