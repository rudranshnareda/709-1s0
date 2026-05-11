import SaveManager from './SaveManager.js';
import { playRetroSound, FONT } from '../utils/RetroUI.js';

export default class CheckpointManager {
  constructor(scene, levelNum) {
    this.scene = scene;
    this.levelNum = levelNum;
    this.checkpoints = [];
    this.activeId = null;
  }

  // Creates a visual checkpoint pole at (x, y) with the given id
  create(x, y, id) {
    const scene = this.scene;

    // Pole
    const pole = scene.add.graphics().setDepth(4);
    pole.fillStyle(0x888888, 1);
    pole.fillRect(x - 3, y - 64, 6, 64);

    // Flag (gray until activated)
    const flag = scene.add.graphics().setDepth(5);
    this._drawFlag(flag, x, y, false);

    // Hitbox zone (40×80, centered above base)
    const zone = scene.add.zone(x, y - 40, 40, 80);
    scene.physics.world.enable(zone);
    zone.body.setAllowGravity(false);

    const cp = { id, x, y, active: false, pole, flag, zone };
    this.checkpoints.push(cp);
    return cp;
  }

  _drawFlag(gfx, x, y, active) {
    gfx.clear();
    gfx.fillStyle(active ? 0xFFD700 : 0x555555, 1);
    gfx.fillTriangle(x + 3, y - 64, x + 3, y - 44, x + 26, y - 54);
    // Orb on top
    const c = active ? 0xFFD700 : 0x888888;
    gfx.fillStyle(c, active ? 0.35 : 0.2);
    gfx.fillCircle(x, y - 70, 12);
    gfx.fillStyle(c, 1);
    gfx.fillCircle(x, y - 70, 7);
    gfx.fillStyle(0xFFFFFF, active ? 0.9 : 0.3);
    gfx.fillCircle(x - 2, y - 72, 3);
  }

  setupPlayerOverlap(playerSprite) {
    this.checkpoints.forEach((cp) => {
      this.scene.physics.add.overlap(playerSprite, cp.zone, () => {
        if (!cp.active) this._activate(cp);
      });
    });
  }

  _activate(cp) {
    cp.active = true;
    this.activeId = cp.id;

    this._drawFlag(cp.flag, cp.x, cp.y, true);

    // Pulse orb
    this.scene.tweens.add({
      targets: cp.flag, alpha: 0.55, duration: 700, yoyo: true, repeat: -1,
    });

    // "CHECKPOINT!" toast
    const toast = this.scene.add.text(cp.x, cp.y - 90, 'CHECKPOINT!', {
      fontFamily: FONT, fontSize: '9px', fill: '#FFD700',
    }).setOrigin(0.5).setDepth(30);
    this.scene.tweens.add({
      targets: toast, y: toast.y - 28, alpha: 0, duration: 1300,
      onComplete: () => toast.destroy(),
    });

    playRetroSound('save');
    SaveManager.setCheckpoint(this.levelNum, cp.id, cp.x, cp.y);
  }

  // Returns {x, y} of active or saved checkpoint, or null
  getSpawnPoint() {
    if (this.activeId) {
      const cp = this.checkpoints.find((c) => c.id === this.activeId);
      if (cp) return { x: cp.x, y: cp.y };
    }
    const s = SaveManager.load();
    if (s?.checkpoint?.levelNum === this.levelNum) {
      return { x: s.checkpoint.x, y: s.checkpoint.y };
    }
    return null;
  }
}
