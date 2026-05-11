import Phaser from 'phaser';
import PlayerController    from '../systems/PlayerController.js';
import EnemyManager        from '../systems/EnemyManager.js';
import CollectibleManager  from '../systems/CollectibleManager.js';
import CheckpointManager   from '../systems/CheckpointManager.js';
import SaveManager         from '../systems/SaveManager.js';
import { FONT, createPauseButton } from '../utils/RetroUI.js';

export default class Level7 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level7' });
    this.LEVEL_NUMBER = 7;
    this.LEVEL_NAME   = 'Nahargarh Fort';
  }

  preload() {
    this.load.image('bg_level7',       'assets/backgrounds/level_7_nahargarh_fort.png');
    this.load.image('tile_ground',     'assets/tiles/tile_ground.png');
    this.load.image('tile_platform',   'assets/tiles/tile_platform.png');
    this.load.image('tile_wall',       'assets/tiles/tile_wall.png');
    this.load.image('tile_spike',      'assets/tiles/tile_spike.png');
    this.load.image('her_idle',        'assets/characters/her/idle.png');
    this.load.image('politician_idle', 'assets/characters/politician/idle.png');
    this.load.image('tiger_idle',      'assets/characters/tiger/idle.png');
    this.load.image('monster_original','assets/collectibles/monsters/monster_original.png');
    this.load.image('flower_sunflower','assets/collectibles/flowers/flower_sunflower.png');
    this.load.image('gem_memory',      'assets/collectibles/gem_memory.png');
  }

  create(data) {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add.image(0, 0, 'bg_level7').setOrigin(0, 0).setDisplaySize(1280, 720);

    const card = this.add.text(640, 58, this.LEVEL_NAME, {
      fontFamily: FONT, fontSize: '16px', fill: '#FFD700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(2400, () => this.tweens.add({ targets: card, alpha: 0, duration: 600 }));

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(640,  700, 'tile_ground').setScale(20, 1).refreshBody();
    this.platforms.create(150,  600, 'tile_platform').setScale(4, 1).refreshBody();
    this.platforms.create(420,  500, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(680,  400, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(940,  300, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(1150, 380, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(750,  220, 'tile_platform').setScale(5, 1).refreshBody();

    const spawnX = data?.respawnX ?? 80;
    const spawnY = data?.respawnY ?? 640;
    this.player = new PlayerController(this, spawnX, spawnY);

    this.checkpoints = new CheckpointManager(this, this.LEVEL_NUMBER);
    this.checkpoints.create(680, 700, 'level7_mid');
    this.checkpoints.setupPlayerOverlap(this.player.sprite);

    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnEnemy(420, 470, 'politician', { patrolStart: 280, patrolEnd: 660, health: 7, speed: 65 });
    this.enemyManager.spawnEnemy(680, 370, 'tiger',      { patrolStart: 530, patrolEnd: 820, health: 5, speed: 140, damage: 2 });
    this.enemyManager.spawnEnemy(940, 270, 'politician', { patrolStart: 790, patrolEnd: 1100, health: 7, speed: 65 });
    this.enemyManager.spawnEnemy(760, 190, 'tiger',      { patrolStart: 600, patrolEnd: 1000, health: 5, speed: 140, damage: 2 });

    this.collectibles = new CollectibleManager(this);
    this.collectibles.spawnMonster(160, 570, 'original');
    this.collectibles.spawnFlower(945, 270, 'sunflower');
    this.collectibles.spawnMemoryGem(755, 190, 'memory_07');
    this.collectibles.setupOverlap(this.player.sprite, (item) => {
      if (item.type === 'memory') SaveManager.addMemory(item.memoryId);
      this.game.events.emit('memoryCollected', item);
    });

    this.physics.add.collider(this.player.sprite, this.platforms);
    this.enemyManager.addPlatformCollider(this.platforms);
    this.cameras.main.setBounds(0, 0, 2560, 720);
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

    this.exitZone = this.add.zone(2520, 360, 40, 720);
    this.physics.world.enable(this.exitZone);
    this.exitZone.body.setAllowGravity(false);
    this.physics.add.overlap(this.player.sprite, this.exitZone, () => this._levelComplete());

    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    createPauseButton(this);
    this.events.on('playerDied', () => {
      SaveManager.incrementDeaths();
      const cp = this.checkpoints.getSpawnPoint();
      this.scene.pause();
      this.scene.launch('DeathScene', { parentScene: this.scene.key, checkpointX: cp?.x ?? 80, checkpointY: cp?.y ?? 640 });
    });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause(); this.scene.launch('PauseScene', { parentScene: this.scene.key }); return;
    }
    this.player.update();
    this.enemyManager.update(this.player);
  }

  _levelComplete() {
    if (this._completing) return;
    this._completing = true;
    SaveManager.completeLevel(this.LEVEL_NUMBER);
    SaveManager.clearCheckpoint();

    const msg = this.add.text(640, 320, 'You made it.\nNow face yourself.', {
      fontFamily: FONT, fontSize: '18px', fill: '#e8d5b7', align: 'center', lineSpacing: 12,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: msg, alpha: 1, duration: 800, hold: 2000, yoyo: true,
      onComplete: () => { this.cameras.main.fadeOut(500, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('BossFight')); },
    });
  }
}
