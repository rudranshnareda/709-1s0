import Phaser from 'phaser';
import PlayerController from '../systems/PlayerController.js';
import EnemyManager     from '../systems/EnemyManager.js';
import { FONT, createPauseButton } from '../utils/RetroUI.js';
import { GAME_WIDTH, GAME_HEIGHT, L1_KEYS_REQUIRED } from '../utils/constants.js';
import { createTouchControls } from '../utils/TouchControls.js';

const MAP_W = 3840; // 120 tiles × 32 px
const MAP_H = 704;  // 22 tiles × 32 px

export default class Level1 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1' });
  }

  preload() {
    // Background
    this.load.image('bg1', 'assets/backgrounds/bg1.png');

    // Tilemap + tilesets
    this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.tmj');
    this.load.image('l1_tileset',   'assets/tiles/level1_ts.png');
    this.load.image('l1_buildings', 'assets/tiles/level1_ts.png');

    // Player
    this.load.image('her_idle',   'assets/characters/her/idle.png');
    this.load.image('her_walk',   'assets/characters/her/walk.png');
    this.load.image('her_attack', 'assets/characters/her/attack.png');
    this.load.image('her_jump',   'assets/characters/her/jump.png');
    this.load.image('her_death',  'assets/characters/her/death.png');

    // Enemies
    this.load.image('goon1_idle',   'assets/characters/goon/goon1_idle.png');
    this.load.image('goon1_attack', 'assets/characters/goon/goon1_attack.png');
    this.load.image('goon2_idle',   'assets/characters/goon/goon2_idle.png');
    this.load.image('goon2_attack', 'assets/characters/goon/goon2_attack.png');
    this.load.image('dog_idle',     'assets/characters/dog/dog_idle.png');
    this.load.image('dog_attack',   'assets/characters/dog/dog_attack.png');

    // Collectibles
    this.load.image('key',            'assets/collectibles/key.png');
    this.load.image('monster_energy', 'assets/collectibles/monsters/monster_energy.png');

    // UI
    this.load.image('ui_key', 'assets/ui/key.png');
    for (let i = 0; i <= 5; i++) this.load.image(`h${i}`, `assets/ui/h${i}.png`);

    this.load.on('loaderror', (file) => console.warn('Asset missing:', file.key));
  }

  create(data) {
    this._keysCollected = 0;
    this._completing    = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ── Background (fixed, fills screen) ─────────────────────────────────────
    this.add.image(0, 0, 'bg1')
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(0);

    // ── Tilemap ───────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'level1' });
    const ts1 = map.addTilesetImage('l1_tileset',   'l1_tileset');
    const ts2 = map.addTilesetImage('building tileset', 'l1_buildings');
    const tilesets = [ts1, ts2].filter(Boolean);

    // Visual layers — rendered, no collision
    map.createLayer('Tile Layer 1', tilesets, 0, 0)?.setDepth(2);
    map.createLayer('Tile Layer 2', tilesets, 0, 0)?.setDepth(3);
    map.createLayer('Tile Layer 3', tilesets, 0, 0)?.setDepth(4);

    // Collision layer — invisible, only used for physics
    this.groundLayer = map.createLayer('collide', tilesets, 0, 0);
    if (this.groundLayer) {
      this.groundLayer.setCollisionByExclusion([-1]);
      this.groundLayer.setVisible(false);
      this.groundLayer.setDepth(1);
    }

    // ── Player spawn ──────────────────────────────────────────────────────────
    const spawnObj = map.getObjectLayer('player_spawn')?.objects[0];
    const spawnX   = data?.respawnX ?? (spawnObj ? Math.round(spawnObj.x) : 100);
    const spawnY   = data?.respawnY ?? (spawnObj ? Math.round(spawnObj.y) : 620);
    this.player = new PlayerController(this, spawnX, spawnY);
    createTouchControls(this, this.player);

    // ── Enemies ───────────────────────────────────────────────────────────────
    this.enemyManager = new EnemyManager(this);
    map.getObjectLayer('enemyspawns')?.objects?.forEach(o => {
      const type      = o.type === 'dog' ? 'dog' : 'goon';
      const halfRange = type === 'dog' ? 100 : 140;
      const ex = Math.round(o.x);
      const ey = Math.round(o.y);
      this.enemyManager.spawnEnemy(ex, ey, type, {
        patrolStart: ex - halfRange,
        patrolEnd:   ex + halfRange,
      });
    });

    // ── Keys ──────────────────────────────────────────────────────────────────
    this.keyGroup = this.physics.add.staticGroup();
    map.getObjectLayer('key')?.objects?.forEach(o => {
      const k = this.keyGroup.create(Math.round(o.x), Math.round(o.y), 'key');
      k.setDepth(5).setDisplaySize(28, 28).refreshBody();
      this.tweens.add({
        targets: k, y: k.y - 8,
        duration: 650 + Math.random() * 300,
        ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      });
    });

    // ── Monster Energy (health restore) ───────────────────────────────────────
    this.energyGroup = this.physics.add.staticGroup();
    map.getObjectLayer('monster_energy')?.objects?.forEach(o => {
      const e = this.energyGroup.create(Math.round(o.x), Math.round(o.y), 'monster_energy');
      e.setDepth(5).setDisplaySize(24, 46).refreshBody();
      this.tweens.add({
        targets: e, y: e.y - 6,
        duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
      });
    });

    // ── Level end trigger ─────────────────────────────────────────────────────
    const endObj = map.getObjectLayer('trigger')?.objects?.find(o => o.name === 'end');
    if (endObj) {
      const ez = this.add.zone(Math.round(endObj.x), Math.round(endObj.y), 64, MAP_H);
      this.physics.world.enable(ez);
      ez.body.setAllowGravity(false);
      this.physics.add.overlap(this.player.sprite, ez, () => {
        if (this._keysCollected >= L1_KEYS_REQUIRED) this._levelComplete();
      });
    }

    // ── Death zones ───────────────────────────────────────────────────────────
    map.getObjectLayer('trigger')?.objects
      ?.filter(o => o.name?.startsWith('death'))
      ?.forEach(o => {
        const dz = this.add.zone(
          Math.round(o.x + o.width / 2),
          Math.round(o.y + o.height / 2),
          Math.round(o.width),
          Math.round(o.height),
        );
        this.physics.world.enable(dz);
        dz.body.setAllowGravity(false);
        this.physics.add.overlap(this.player.sprite, dz, () => {
          if (!this.player.isDead) this.player.killInstant();
        });
      });

    // ── Physics colliders ─────────────────────────────────────────────────────
    if (this.groundLayer) {
      this.physics.add.collider(this.player.sprite, this.groundLayer);
      this.enemyManager.addPlatformCollider(this.groundLayer);
    }

    // ── Overlaps: collect key ─────────────────────────────────────────────────
    this.physics.add.overlap(this.player.sprite, this.keyGroup, (_p, key) => {
      key.disableBody(true, false); // stop further overlaps immediately
      this._keysCollected++;
      this._updateHUD();
      this.tweens.add({
        targets: key, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
        onComplete: () => key.destroy(),
      });
    });

    // ── Overlaps: collect monster energy ──────────────────────────────────────
    this.physics.add.overlap(this.player.sprite, this.energyGroup, (_p, can) => {
      can.disableBody(true, false); // stop further overlaps immediately
      this.player.heal(1);
      this.tweens.add({
        targets: can, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
        onComplete: () => can.destroy(),
      });
    });

    // ── HUD ───────────────────────────────────────────────────────────────────
    this._buildHUD();

    // Update health bar whenever player health changes
    this.events.on('healthChanged', (hp) => {
      const clamped = Math.max(0, Math.min(5, hp));
      this._healthImg?.setTexture(`h${clamped}`);
    });

    // ── World / camera ────────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // ── Pause / death ─────────────────────────────────────────────────────────
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    createPauseButton(this);

    this.events.on('playerDied', () => {
      this.scene.pause();
      this.scene.launch('DeathScene', {
        parentScene: 'Level1',
        checkpointX: spawnX,
        checkpointY: spawnY,
      });
    });
  }

  _buildHUD() {
    const pad = 16;

    // Health bar image (h0–h5)
    this._healthImg = this.add.image(pad, pad, `h${this.player.health}`)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setDisplaySize(140, 26);

    // Key icon
    this.add.image(pad, pad + 46, 'ui_key')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(20)
      .setDisplaySize(24, 24);

    // Key counter text
    this._keyText = this.add.text(pad + 30, pad + 49, `0 / ${L1_KEYS_REQUIRED}`, {
      fontFamily: FONT, fontSize: '14px', fill: '#FFD700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(20);

    // "collect all keys" reminder — fades after 3s
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 32,
      'Collect all 5 keys to open the gate!', {
        fontFamily: FONT, fontSize: '11px', fill: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(3000, () =>
      this.tweens.add({ targets: hint, alpha: 0, duration: 600 }));
  }

  _updateHUD() {
    this._keyText?.setText(`${this._keysCollected} / ${L1_KEYS_REQUIRED}`);

    // Flash key counter yellow→white when a key is collected
    if (this._keyText) {
      this._keyText.setStyle({ fill: '#00ff88' });
      this.time.delayedCall(300, () => this._keyText?.setStyle({ fill: '#FFD700' }));
    }
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
      this.scene.launch('PauseScene', { parentScene: 'Level1' });
      return;
    }
    this.player.update();
    this.enemyManager.update(this.player);
  }

  _levelComplete() {
    if (this._completing) return;
    this._completing = true;

    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'LEVEL COMPLETE!', {
      fontFamily: FONT, fontSize: '28px', fill: '#FFD700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);

    this.tweens.add({
      targets: banner, alpha: 1, duration: 400, hold: 1500, yoyo: true,
      onComplete: () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Level2');
        });
      },
    });
  }
}
