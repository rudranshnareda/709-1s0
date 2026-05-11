export default class CollectibleManager {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
    this.collected = [];
  }

  spawnMonster(x, y, monsterType) {
    const sprite = this.group.create(x, y, `monster_${monsterType}`);
    sprite.setDepth(5);
    sprite.setData('type', 'monster');
    sprite.setData('monsterType', monsterType);
    this._addBob(sprite);
    return sprite;
  }

  spawnFlower(x, y, flowerType) {
    const sprite = this.group.create(x, y, `flower_${flowerType}`);
    sprite.setDepth(5);
    sprite.setData('type', 'flower');
    sprite.setData('flowerType', flowerType);
    this._addBob(sprite);
    return sprite;
  }

  spawnMemoryGem(x, y, memoryId) {
    const sprite = this.group.create(x, y, 'gem_memory');
    sprite.setDepth(5);
    sprite.setData('type', 'memory');
    sprite.setData('memoryId', memoryId);
    // Gems pulse
    this.scene.tweens.add({
      targets: sprite,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
    return sprite;
  }

  _addBob(sprite) {
    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y - 8,
      duration: 700 + Math.random() * 300,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  setupOverlap(playerSprite, onCollect) {
    this.scene.physics.add.overlap(playerSprite, this.group, (player, item) => {
      const data = {
        type: item.getData('type'),
        monsterType: item.getData('monsterType'),
        flowerType: item.getData('flowerType'),
        memoryId: item.getData('memoryId'),
      };
      this.collected.push(data);

      // Collect pop effect
      this.scene.tweens.add({
        targets: item,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 200,
        onComplete: () => item.destroy(),
      });

      if (onCollect) onCollect(data);
    });
  }

  getCollectedCount() {
    return this.collected.length;
  }
}
