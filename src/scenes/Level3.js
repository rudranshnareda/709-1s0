import Phaser from 'phaser';
import PlayerController    from '../systems/PlayerController.js';
import EnemyManager        from '../systems/EnemyManager.js';
import CollectibleManager  from '../systems/CollectibleManager.js';
import CheckpointManager   from '../systems/CheckpointManager.js';
import SaveManager         from '../systems/SaveManager.js';
import { FONT, createPauseButton } from '../utils/RetroUI.js';

export default class Level3 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level3' });
    this.LEVEL_NUMBER = 3;
    this.LEVEL_NAME   = 'WTP Mall';
  }

  preload() {
    this.load.image('bg_level3',       'assets/backgrounds/level_3_wtp_mall.png');
    this.load.image('tile_ground',     'assets/tiles/tile_ground.png');
    this.load.image('tile_platform',   'assets/tiles/tile_platform.png');
    this.load.image('tile_breakable',  'assets/tiles/tile_breakable.png');
    this.load.image('her_idle',        'assets/characters/her/idle.png');
    this.load.image('manager_idle',    'assets/characters/manager/idle.png');
    this.load.image('goon_idle',       'assets/characters/goon/idle.png');
    this.load.image('monster_bad_apple', 'assets/collectibles/monsters/monster_bad_apple.png');
    this.load.image('flower_rose',     'assets/collectibles/flowers/flower_rose.png');
    this.load.image('gem_memory',      'assets/collectibles/gem_memory.png');
  }

  create(data) {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add.image(0, 0, 'bg_level3').setOrigin(0, 0).setDisplaySize(1280, 720);

    const card = this.add.text(640, 58, this.LEVEL_NAME, {
      fontFamily: FONT, fontSize: '16px', fill: '#FFD700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(2400, () => this.tweens.add({ targets: card, alpha: 0, duration: 600 }));

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(640, 700, 'tile_ground').setScale(20, 1).refreshBody();
    this.platforms.create(640, 520, 'tile_platform').setScale(12, 1).refreshBody();
    this.platforms.create(640, 340, 'tile_platform').setScale(12, 1).refreshBody();
    this.platforms.create(300, 430, 'tile_breakable').setScale(2, 1).refreshBody();
    this.platforms.create(980, 430, 'tile_breakable').setScale(2, 1).refreshBody();

    const spawnX = data?.respawnX ?? 100;
    const spawnY = data?.respawnY ?? 580;
    this.player = new PlayerController(this, spawnX, spawnY);

    this.checkpoints = new CheckpointManager(this, this.LEVEL_NUMBER);
    this.checkpoints.create(640, 520, 'level3_mid');
    this.checkpoints.setupPlayerOverlap(this.player.sprite);

    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnEnemy(400, 490, 'manager', { patrolStart: 200, patrolEnd: 700, health: 5 });
    this.enemyManager.spawnEnemy(850, 490, 'goon',    { patrolStart: 700, patrolEnd: 1050 });
    this.enemyManager.spawnEnemy(600, 310, 'goon',    { patrolStart: 400, patrolEnd: 900 });

    this.collectibles = new CollectibleManager(this);
    this.collectibles.spawnMonster(300, 490, 'bad_apple');
    this.collectibles.spawnFlower(700, 310, 'rose');
    this.collectibles.spawnMemoryGem(980, 400, 'memory_03');
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
      this.scene.launch('DeathScene', { parentScene: this.scene.key, checkpointX: cp?.x ?? 100, checkpointY: cp?.y ?? 580 });
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
    const t = this.add.text(640, 320, 'LEVEL COMPLETE!', {
      fontFamily: FONT, fontSize: '22px', fill: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 400, hold: 1000, yoyo: true,
      onComplete: () => { this.cameras.main.fadeOut(500, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MapScene')); },
    });
  }
}
