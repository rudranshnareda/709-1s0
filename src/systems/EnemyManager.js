// Per-variant display sizes and body config
// Body setSize values are in source-space (doubled) to compensate for ~0.5 scale.
// offsetX/Y are in game pixels.
const VARIANTS = {
  goon1: {
    idle:   { key: 'goon1_idle',   dw: 40, dh: 64 },
    attack: { key: 'goon1_attack', dw: 69, dh: 64 },
    bodyW: 48, bodyH: 116, offsetX: 8, offsetY: 6,
  },
  goon2: {
    idle:   { key: 'goon2_idle',   dw: 40, dh: 64 },
    attack: { key: 'goon2_attack', dw: 74, dh: 64 },
    bodyW: 48, bodyH: 116, offsetX: 8, offsetY: 6,
  },
  dog: {
    // 115x82 → displayed at 67x48 (scale ≈ 0.585)
    // body ~40x30 game px → setSize(69, 51); feet-aligned offset
    idle:   { key: 'dog_idle',   dw: 67, dh: 48 },
    attack: { key: 'dog_attack', dw: 69, dh: 48 },
    bodyW: 69, bodyH: 51, offsetX: 14, offsetY: 18,
  },
};

export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = [];
  }

  spawnEnemy(x, y, type, config = {}) {
    const variant = type === 'goon'
      ? (Math.random() < 0.5 ? 'goon1' : 'goon2')
      : type;

    const v = VARIANTS[variant] ?? VARIANTS.goon1;
    const sprite = this.scene.physics.add.sprite(x, y, v.idle.key);
    sprite.setCollideWorldBounds(true);
    sprite.setDepth(8);
    sprite.setDisplaySize(v.idle.dw, v.idle.dh);
    sprite.body.setSize(v.bodyW, v.bodyH);
    sprite.body.setOffset(v.offsetX, v.offsetY);

    const enemy = {
      sprite,
      type,
      variant,
      v,
      health: config.health ?? 3,
      maxHealth: config.health ?? 3,
      speed: config.speed ?? 90,
      damage: config.damage ?? 1,
      direction: 1,
      isDead: false,
      isAttacking: false,
      patrolStart: config.patrolStart ?? x - 120,
      patrolEnd: config.patrolEnd ?? x + 120,
      aggroRange: config.aggroRange ?? 250,
      attackRange: config.attackRange ?? 45,
      attackCooldown: false,
    };

    this.enemies.push(enemy);
    return enemy;
  }

  addPlatformCollider(platforms) {
    this.enemies.forEach((enemy) => {
      this.scene.physics.add.collider(enemy.sprite, platforms);
    });
  }

  update(player) {
    this.enemies.forEach((enemy) => {
      if (enemy.isDead || !enemy.sprite.active) return;

      const dist = Phaser.Math.Distance.Between(
        enemy.sprite.x, enemy.sprite.y,
        player.sprite.x, player.sprite.y
      );

      if (dist < enemy.aggroRange) {
        const dir = player.sprite.x > enemy.sprite.x ? 1 : -1;
        enemy.sprite.setVelocityX(enemy.isAttacking ? 0 : enemy.speed * dir);
        enemy.sprite.setFlipX(dir > 0);
        enemy.direction = dir;

        if (dist < enemy.attackRange && !enemy.attackCooldown) {
          this._attackPlayer(enemy, player);
        }
      } else {
        if (enemy.sprite.x <= enemy.patrolStart) enemy.direction = 1;
        else if (enemy.sprite.x >= enemy.patrolEnd) enemy.direction = -1;
        enemy.sprite.setVelocityX(enemy.speed * enemy.direction);
        enemy.sprite.setFlipX(enemy.direction > 0);
      }

      if (
        player.hitbox.active &&
        Phaser.Geom.Intersects.RectangleToRectangle(
          player.hitbox.getBounds(),
          enemy.sprite.getBounds()
        )
      ) {
        this._damageEnemy(enemy, player.getAttackDamage());
      }
    });
  }

  _attackPlayer(enemy, player) {
    player.takeDamage(enemy.damage);
    enemy.attackCooldown = true;
    enemy.isAttacking = true;

    const atk = enemy.v.attack;
    if (this.scene.textures.exists(atk.key)) {
      enemy.sprite.setTexture(atk.key);
      enemy.sprite.setDisplaySize(atk.dw, atk.dh);
    }

    this.scene.time.delayedCall(300, () => {
      enemy.isAttacking = false;
      const idle = enemy.v.idle;
      if (this.scene.textures.exists(idle.key)) {
        enemy.sprite.setTexture(idle.key);
        enemy.sprite.setDisplaySize(idle.dw, idle.dh);
      }
    });
    this.scene.time.delayedCall(800, () => { enemy.attackCooldown = false; });
  }

  _damageEnemy(enemy, amount) {
    enemy.health -= amount;
    enemy.sprite.setTint(0xff8888);
    this.scene.time.delayedCall(120, () => enemy.sprite.clearTint());
    if (enemy.health <= 0) this._killEnemy(enemy);
  }

  _killEnemy(enemy) {
    enemy.isDead = true;
    this.scene.tweens.add({
      targets: enemy.sprite,
      alpha: 0,
      y: enemy.sprite.y - 20,
      duration: 400,
      onComplete: () => enemy.sprite.destroy(),
    });
    this.enemies = this.enemies.filter((e) => e !== enemy);
  }

  clear() {
    this.enemies.forEach((e) => { if (e.sprite.active) e.sprite.destroy(); });
    this.enemies = [];
  }
}
