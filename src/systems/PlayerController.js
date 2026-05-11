import Phaser from 'phaser';
import { PLAYER_SPEED, JUMP_FORCE, MAX_HEALTH, ATTACK_DAMAGE, ATTACK_COOLDOWN } from '../utils/constants.js';

export default class PlayerController {
  constructor(scene, x, y) {
    this.scene  = scene;
    this.health = MAX_HEALTH;
    this.isAttacking          = false;
    this.isDead               = false;
    this.facingRight          = true;
    this.attackCooldownActive = false;
    this.speedMultiplier      = 1;
    this.damageMultiplier     = 1;

    this.sprite = scene.physics.add.sprite(x, y, 'her_idle');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);
    // Sprites are trimmed edge-to-edge at 128px tall.
    // setScale(0.5) → 64px display height (2 tiles).
    // setSize values × 0.5 = actual game px: 44*0.5=22 wide, 116*0.5=58 tall.
    // offsetY=6 places body.bottom at sprite.y+32 (feet).
    this.sprite.setScale(0.5);
    this.sprite.body.setSize(44, 116);
    this.sprite.body.setOffset(8, 6);

    this.cursors   = scene.input.keyboard.createCursorKeys();
    this.attackKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.wasd      = scene.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.touch = { left: false, right: false, jump: false, attack: false };
    this._touchPrev = { left: false, right: false, jump: false, attack: false };

    this._createHitbox();
  }

  _touchJustDown(key) {
    return this.touch[key] && !this._touchPrev[key];
  }

  _createHitbox() {
    this.hitbox = this.scene.add.rectangle(0, 0, 60, 40);
    this.scene.physics.add.existing(this.hitbox);
    this.hitbox.body.setAllowGravity(false);
    this.hitbox.active = false;
    this.hitbox.setDepth(11);
  }

  update() {
    if (this.isDead) return;

    const onGround = this.sprite.body.blocked.down;
    const leftKey  = this.cursors.left.isDown  || this.wasd.left.isDown  || this.touch.left;
    const rightKey = this.cursors.right.isDown || this.wasd.right.isDown || this.touch.right;
    const jumpKey  = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                     Phaser.Input.Keyboard.JustDown(this.wasd.up)    ||
                     this._touchJustDown('jump');

    const speed = PLAYER_SPEED * this.speedMultiplier;

    let movingDir = 0;
    if (leftKey) {
      this.sprite.setVelocityX(-speed);
      this.facingRight = false;
      movingDir = -1;
    } else if (rightKey) {
      this.sprite.setVelocityX(speed);
      this.facingRight = true;
      movingDir = 1;
    } else {
      this.sprite.setVelocityX(0);
    }

    if (jumpKey && onGround) this.sprite.setVelocityY(-JUMP_FORCE);
    if (Phaser.Input.Keyboard.JustDown(this.attackKey) || this._touchJustDown('attack')) this._attack();

    this._updateTexture(movingDir, onGround);
    // Set flip AFTER texture change so setTexture can't reset it
    this.sprite.setFlipX(!this.facingRight);

    const offsetX = this.facingRight ? 50 : -50;
    this.hitbox.setPosition(this.sprite.x + offsetX, this.sprite.y);

    // Snapshot touch state for JustDown detection next frame
    this._touchPrev.left   = this.touch.left;
    this._touchPrev.right  = this.touch.right;
    this._touchPrev.jump   = this.touch.jump;
    this._touchPrev.attack = this.touch.attack;
  }

  _updateTexture(movingDir, onGround) {
    if (this.isDead) return;
    const airborne = !onGround && Math.abs(this.sprite.body.velocity.y) > 80;
    let key;
    if (airborne)              key = 'her_jump';
    else if (this.isAttacking) key = 'her_attack';
    else if (movingDir !== 0)  key = 'her_walk';
    else                       key = 'her_idle';

    if (this.scene.textures.exists(key) && this.sprite.texture.key !== key) {
      this.sprite.setTexture(key);
    }
  }

  _attack() {
    if (this.isAttacking || this.attackCooldownActive) return;
    this.isAttacking = true;
    this.hitbox.active = true;
    this.scene.time.delayedCall(200, () => {
      this.hitbox.active = false;
      this.isAttacking = false;
      this.attackCooldownActive = true;
      this.scene.time.delayedCall(ATTACK_COOLDOWN, () => {
        this.attackCooldownActive = false;
      });
    });
  }

  killInstant() {
    this.health = 0;
    this._die();
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    this.scene.cameras.main.shake(150, 0.008);
    this.scene.events.emit('healthChanged', this.health);
    if (this.health <= 0) this._die();
  }

  heal(amount) {
    this.health = Math.min(this.health + amount, MAX_HEALTH);
    this.scene.events.emit('healthChanged', this.health);
  }

  _die() {
    this.isDead = true;
    if (this.scene.textures.exists('her_death')) {
      this.sprite.setTexture('her_death');
    } else {
      this.sprite.setTint(0xff0000);
    }
    this.scene.time.delayedCall(800, () => {
      this.scene.events.emit('playerDied');
    });
  }

  getAttackDamage() {
    return ATTACK_DAMAGE * this.damageMultiplier;
  }
}
