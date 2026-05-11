import Phaser from 'phaser';
import PlayerController    from '../systems/PlayerController.js';
import EnemyManager        from '../systems/EnemyManager.js';
import CollectibleManager  from '../systems/CollectibleManager.js';
import CheckpointManager   from '../systems/CheckpointManager.js';
import SaveManager         from '../systems/SaveManager.js';
import { FONT, createPauseButton } from '../utils/RetroUI.js';

export default class Level6 extends Phaser.Scene {
  constructor() {
    super({ key: 'Level6' });
    this.LEVEL_NUMBER = 6;
    this.LEVEL_NAME   = 'Pink City';
  }

  preload() {
    this.load.image('bg_level6',           'assets/backgrounds/level_6_pink_city.png');
    this.load.image('tile_ground',         'assets/tiles/tile_ground.png');
    this.load.image('tile_platform',       'assets/tiles/tile_platform.png');
    this.load.image('tile_wall',           'assets/tiles/tile_wall.png');
    this.load.image('tile_spike',          'assets/tiles/tile_spike.png');
    this.load.image('her_idle',            'assets/characters/her/idle.png');
    this.load.image('mafia_boss_idle',     'assets/characters/mafia_boss/idle.png');
    this.load.image('goon_idle',           'assets/characters/goon/idle.png');
    this.load.image('monster_white_monster', 'assets/collectibles/monsters/monster_white_monster.png');
    this.load.image('flower_rose',         'assets/collectibles/flowers/flower_rose.png');
    this.load.image('gem_memory',          'assets/collectibles/gem_memory.png');
  }

  create(data) {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add.image(0, 0, 'bg_level6').setOrigin(0, 0).setDisplaySize(1280, 720);

    const card = this.add.text(640, 58, this.LEVEL_NAME, {
      fontFamily: FONT, fontSize: '16px', fill: '#FFD700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(20);
    this.time.delayedCall(2400, () => this.tweens.add({ targets: card, alpha: 0, duration: 600 }));

    this.platforms = this.physics.add.staticGroup();
    this.platforms.create(640,  700, 'tile_ground').setScale(20, 1).refreshBody();
    this.platforms.create(200,  580, 'tile_platform').setScale(4, 1).refreshBody();
    this.platforms.create(550,  480, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(850,  400, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(1150, 480, 'tile_platform').setScale(3, 1).refreshBody();
    this.platforms.create(700,  320, 'tile_platform').setScale(4, 1).refreshBody();

    const spawnX = data?.respawnX ?? 80;
    const spawnY = data?.respawnY ?? 640;
    this.player = new PlayerController(this, spawnX, spawnY);

    this.checkpoints = new CheckpointManager(this, this.LEVEL_NUMBER);
    this.checkpoints.create(850, 700, 'level6_mid');
    this.checkpoints.setupPlayerOverlap(this.player.sprite);

    this.enemyManager = new EnemyManager(this);
    this.enemyManager.spawnEnemy(550,  450, 'mafia_boss', { patrolStart: 400, patrolEnd: 800, health: 8, speed: 70 });
    this.enemyManager.spawnEnemy(200,  550, 'goon',       { patrolStart: 50,  patrolEnd: 400 });
    this.enemyManager.spawnEnemy(1150, 450, 'goon',       { patrolStart: 950, patrolEnd: 1300 });
    this.enemyManager.spawnEnemy(700,  290, 'goon',       { patrolStart: 500, patrolEnd: 1000 });

    this.collectibles = new CollectibleManager(this);
    this.collectibles.spawnMonster(210, 550, 'white_monster');
    this.collectibles.spawnFlower(855, 370, 'rose');
    this.collectibles.spawnMemoryGem(705, 290, 'memory_06');
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
    const t = this.add.text(640, 320, 'LEVEL COMPLETE!', {
      fontFamily: FONT, fontSize: '22px', fill: '#FFD700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 400, hold: 1000, yoyo: true,
      onComplete: () => { this.cameras.main.fadeOut(500, 0, 0, 0); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MapScene')); },
    });
  }
}
