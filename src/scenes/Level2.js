import Phaser from 'phaser';
import PlayerController from '../systems/PlayerController.js';
import EnemyManager     from '../systems/EnemyManager.js';
import BossManager      from '../systems/BossManager.js';
import { FONT, createPauseButton } from '../utils/RetroUI.js';
import { GAME_WIDTH, GAME_HEIGHT, L2_HEARTS_REQUIRED } from '../utils/constants.js';
import { createTouchControls } from '../utils/TouchControls.js';

const MAP_W = 3200; // 100 tiles × 32 px
const MAP_H = 704;  //  22 tiles × 32 px

export default class Level2 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level2' });
  }

  preload() {
    this.load.image('bg2', 'assets/backgrounds/bg2.png');

    this.load.tilemapTiledJSON('level2', 'assets/tilemaps/level2.tmj');
    this.load.image('level2_ts', 'assets/tiles/level2_ts.png');

    // Player
    this.load.image('her_idle',   'assets/characters/her/idle.png');
    this.load.image('her_walk',   'assets/characters/her/walk.png');
    this.load.image('her_attack', 'assets/characters/her/attack.png');
    this.load.image('her_jump',   'assets/characters/her/jump.png');
    this.load.image('her_death',  'assets/characters/her/death.png');

    // Enemies (dogs only in Level 2)
    this.load.image('dog_idle',   'assets/characters/dog/dog_idle.png');
    this.load.image('dog_attack', 'assets/characters/dog/dog_attack.png');

    // Boss
    this.load.image('shadow_monster_idle',   'assets/characters/shadow_monster/shadow_monster_idle.png');
    this.load.image('shadow_monster_attack', 'assets/characters/shadow_monster/shadow_monster_attack.png');

    // Me (NPC)
    this.load.image('me_idle', 'assets/characters/me/me_idle.png');
    this.load.image('me_walk', 'assets/characters/me/me_walk.png');

    // Collectibles / UI
    this.load.image('ghc', 'assets/ui/ghc.png');
    for (let i = 0; i <= 5; i++) this.load.image(`h${i}`, `assets/ui/h${i}.png`);

    this.load.on('loaderror', (file) => console.warn('Asset missing:', file.key));
  }

  create(data) {
    this._heartsCollected  = data?.heartsPreFilled ? L2_HEARTS_REQUIRED : 0;
    this._bossSpawned      = false;
    this._completing       = false;
    this._bossContactCooldown = false;
    this._bossHitCooldown     = false;

    this.cameras.main.fadeIn(400, 0, 0, 0);

    // ── Background ────────────────────────────────────────────────────────────
    this.add.image(0, 0, 'bg2')
      .setOrigin(0, 0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(0);

    // ── Tilemap ───────────────────────────────────────────────────────────────
    const map = this.make.tilemap({ key: 'level2' });
    // Tileset name inside the TMJ is "l2_ts", image is level2_ts.png
    const ts = map.addTilesetImage('l2_ts', 'level2_ts');
    const tilesets = ts ? [ts] : [];

    // Both layers are collidable
    this.groundLayer1 = map.createLayer('Tile Layer 1', tilesets, 0, 0);
    if (this.groundLayer1) {
      this.groundLayer1.setCollisionByExclusion([-1]);
      this.groundLayer1.setDepth(2);
    }

    this.groundLayer2 = map.createLayer('Tile Layer 2', tilesets, 0, 0);
    if (this.groundLayer2) {
      this.groundLayer2.setCollisionByExclusion([-1]);
      this.groundLayer2.setDepth(3);
    }

    // ── Player spawn ──────────────────────────────────────────────────────────
    // Layer has a typo in the TMJ: "player_spwan"
    const spawnObj = map.getObjectLayer('player_spwan')?.objects[0];
    const spawnX = data?.respawnX ?? (spawnObj ? Math.round(spawnObj.x) : 60);
    const spawnY = data?.respawnY ?? (spawnObj ? Math.round(spawnObj.y) : 580);
    this.player = new PlayerController(this, spawnX, spawnY);
    createTouchControls(this, this.player);

    // ── Enemies (dogs only) ───────────────────────────────────────────────────
    this.enemyManager = new EnemyManager(this);
    map.getObjectLayer('enemy_spawn')?.objects?.forEach(o => {
      const ex = Math.round(o.x);
      const ey = Math.round(o.y);
      this.enemyManager.spawnEnemy(ex, ey, 'dog', {
        patrolStart: ex - 100,
        patrolEnd:   ex + 100,
      });
    });

    // ── Hearts ────────────────────────────────────────────────────────────────
    this.heartGroup = this.physics.add.staticGroup();
    if (!data?.heartsPreFilled) {
      map.getObjectLayer('hearts')?.objects?.forEach(o => {
        const h = this.heartGroup.create(Math.round(o.x), Math.round(o.y), 'ghc');
        h.setDepth(5).setDisplaySize(24, 24).refreshBody();
        this.tweens.add({
          targets: h, y: h.y - 8,
          duration: 700 + Math.random() * 300,
          ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        });
      });
    }

    // ── Me NPC (in prison, visible from the start) ────────────────────────────
    const prisonObj = map.getObjectLayer('prison')?.objects[0];
    if (prisonObj) {
      const px = Math.round(prisonObj.x);
      const py = Math.round(prisonObj.y + prisonObj.height / 2);
      this._meSprite = this.add.image(px + 20, py, 'me_idle')
        .setDepth(7).setDisplaySize(40, 64);
      // store patrol bounds (inset 20px from prison walls)
      this._prisonLeft  = px + 20;
      this._prisonRight = Math.round(prisonObj.x + prisonObj.width) - 20;
    }

    // ── Store boss spawn position for later ───────────────────────────────────
    const smObj = map.getObjectLayer('sm_spawn')?.objects[0];
    this._bossSpawnX = smObj ? Math.round(smObj.x) : 2686;
    this._bossSpawnY = smObj ? Math.round(smObj.y) : 348;

    // ── tl2drop trigger — drops Tile Layer 2 + spawns boss ────────────────────
    const tl2Obj = map.getObjectLayer('tl2')?.objects?.find(o => o.name === 'tl2 drop');
    this._bossCheckpointX = spawnX;
    this._bossCheckpointY = spawnY;
    if (tl2Obj) {
      // Store trigger position as the respawn point once boss is active
      this._bossCheckpointX = Math.round(tl2Obj.x);
      this._bossCheckpointY = Math.round(tl2Obj.y);

      const tz = this.add.zone(
        Math.round(tl2Obj.x + tl2Obj.width  / 2),
        Math.round(tl2Obj.y + tl2Obj.height / 2),
        Math.round(tl2Obj.width),
        Math.round(tl2Obj.height),
      );
      this.physics.world.enable(tz);
      tz.body.setAllowGravity(false);
      this.physics.add.overlap(this.player.sprite, tz, () => {
        if (!this._bossSpawned) this._triggerBossArena();
      });
    }

    // ── Death zones (fell layer) ──────────────────────────────────────────────
    map.getObjectLayer('fell')?.objects?.forEach(o => {
      const dz = this.add.zone(
        Math.round(o.x + o.width  / 2),
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
    if (this.groundLayer1) {
      this.physics.add.collider(this.player.sprite, this.groundLayer1);
      this.enemyManager.addPlatformCollider(this.groundLayer1);
    }
    if (this.groundLayer2) {
      this.physics.add.collider(this.player.sprite, this.groundLayer2);
      this.enemyManager.addPlatformCollider(this.groundLayer2);
    }

    // ── Collect hearts ────────────────────────────────────────────────────────
    this.physics.add.overlap(this.player.sprite, this.heartGroup, (_p, heart) => {
      heart.disableBody(true, false);
      this._heartsCollected++;
      this._updateHUD();
      this.tweens.add({
        targets: heart, scaleX: 0, scaleY: 0, alpha: 0, duration: 200,
        onComplete: () => heart.destroy(),
      });
    });

    // ── HUD ───────────────────────────────────────────────────────────────────
    this._buildHUD();

    this.events.on('healthChanged', (hp) => {
      const clamped = Math.max(0, Math.min(5, hp));
      this._healthImg?.setTexture(`h${clamped}`);
    });

    // ── World / camera ────────────────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    // ── Pause / death / boss defeated ─────────────────────────────────────────
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    createPauseButton(this);

    this.events.on('playerDied', () => {
      const cpX = this._bossSpawned ? this._bossCheckpointX : spawnX;
      const cpY = this._bossSpawned ? this._bossCheckpointY : spawnY;
      this.scene.pause();
      this.scene.launch('DeathScene', {
        parentScene: 'Level2',
        checkpointX: cpX,
        checkpointY: cpY,
        extra: { heartsPreFilled: this._bossSpawned },
      });
    });

    this.events.on('bossDefeated', () => this._levelComplete());
  }

  // ── Boss arena trigger ────────────────────────────────────────────────────

  _triggerBossArena() {
    this._bossSpawned = true;

    // Fade out Tile Layer 2, then clear all tile collision so existing
    // physics colliders don't crash (destroying the layer while colliders
    // still reference it freezes the physics world).
    this.tweens.add({
      targets: this.groundLayer2, alpha: 0, duration: 400,
      onComplete: () => {
        if (this.groundLayer2) {
          this.groundLayer2.setVisible(false);
          this.groundLayer2.forEachTile(tile => tile?.resetCollision());
        }
      },
    });

    this.cameras.main.shake(500, 0.012);

    // Full heal before the boss fight
    this.player.heal(5);

    // Spawn shadow monster boss
    this.boss = new BossManager(this, 'shadow_monster');
    const bossSprite = this.boss.spawn(this._bossSpawnX, this._bossSpawnY);

    if (this.groundLayer1) {
      this.physics.add.collider(bossSprite, this.groundLayer1);
    }

    // Contact damage from boss touching player
    this.physics.add.overlap(this.player.sprite, bossSprite, () => {
      if (!this.player.isDead && !this._bossContactCooldown) {
        this._bossContactCooldown = true;
        this.player.takeDamage(this.boss.contactDamage);
        this.time.delayedCall(600, () => { this._bossContactCooldown = false; });
      }
    });

    // Me starts pacing inside the prison cell
    if (this._meSprite && this._prisonLeft !== undefined) {
      this._meSprite.setTexture('me_walk').setX(this._prisonLeft);
      this.tweens.add({
        targets: this._meSprite,
        x: this._prisonRight,
        duration: 1200,
        ease: 'Linear',
        yoyo: true,
        repeat: -1,
        onStart:  () => this._meSprite?.setFlipX(false),
        onYoyo:   () => this._meSprite?.setFlipX(true),
        onRepeat: () => this._meSprite?.setFlipX(false),
      });
    }
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    const pad = 16;

    this._healthImg = this.add.image(pad, pad, `h${this.player.health}`)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(20).setDisplaySize(140, 26);

    this.add.image(pad, pad + 46, 'ghc')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(20).setDisplaySize(20, 20);

    this._heartText = this.add.text(pad + 26, pad + 49, `0 / ${L2_HEARTS_REQUIRED}`, {
      fontFamily: FONT, fontSize: '14px', fill: '#FFD700',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(20);

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 32,
      'Collect all 7 hearts and find him!', {
        fontFamily: FONT, fontSize: '11px', fill: '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(3000, () =>
      this.tweens.add({ targets: hint, alpha: 0, duration: 600 }));
  }

  _updateHUD() {
    this._heartText?.setText(`${this._heartsCollected} / ${L2_HEARTS_REQUIRED}`);
    if (this._heartText) {
      this._heartText.setStyle({ fill: '#ff6699' });
      this.time.delayedCall(300, () => this._heartText?.setStyle({ fill: '#FFD700' }));
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
      this.scene.launch('PauseScene', { parentScene: 'Level2' });
      return;
    }

    this.player.update();
    this.enemyManager.update(this.player);

    if (this.boss && !this.boss.isDefeated) {
      this.boss.update(this.player);

      // Player's attack hitbox hitting the boss — one damage per swing
      if (
        this.player.hitbox.active &&
        !this._bossHitCooldown &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          this.player.hitbox.getBounds(),
          this.boss.sprite.getBounds()
        )
      ) {
        this._bossHitCooldown = true;
        this.boss.takeDamage(this.player.getAttackDamage());
        this.time.delayedCall(300, () => { this._bossHitCooldown = false; });
      }
    }
  }

  // ── Level complete ────────────────────────────────────────────────────────

  _levelComplete() {
    if (this._completing) return;
    this._completing = true;

    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'HE IS FREE!', {
      fontFamily: FONT, fontSize: '28px', fill: '#FFD700',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);

    this.tweens.add({
      targets: banner, alpha: 1, duration: 400, hold: 1500, yoyo: true,
      onComplete: () => {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('EndingScene');
        });
      },
    });
  }
}
