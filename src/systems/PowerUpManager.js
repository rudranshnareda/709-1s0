// Manages active Monster Energy power-up effects on the player.
export default class PowerUpManager {
  constructor(scene) {
    this.scene = scene;
    this.activePowerUps = new Map();
  }

  // Call this when a monster collectible is picked up.
  apply(monsterType, player) {
    const boosts = {
      mango_loco:         { speedMult: 1.5,  duration: 10000 },
      strawberry_dreams:  { jumpBoost: true,  duration: 8000  },
      bad_apple:          { damageMult: 2,    duration: 12000 },
      mariposa:           { healAmount: 2,    duration: 0     }, // instant
      pacific_punch:      { shield: true,     duration: 5000  },
      white_monster:      { speedMult: 1.8, damageMult: 1.4, duration: 8000 },
      original:           { speedMult: 1.3, damageMult: 1.3, jumpBoost: true, duration: 15000 },
    };

    const boost = boosts[monsterType];
    if (!boost) return;

    // Instant effects
    if (boost.healAmount) {
      player.heal(boost.healAmount);
      return;
    }

    // Timed effects — clear previous of same type
    if (this.activePowerUps.has(monsterType)) {
      clearTimeout(this.activePowerUps.get(monsterType).timer);
    }

    this.activePowerUps.set(monsterType, { ...boost });
    this._applyToPlayer(player);

    if (boost.duration > 0) {
      const timer = this.scene.time.delayedCall(boost.duration, () => {
        this.activePowerUps.delete(monsterType);
        this._applyToPlayer(player);
      });
      this.activePowerUps.get(monsterType).timerHandle = timer;
    }
  }

  _applyToPlayer(player) {
    let speedMult = 1;
    let damageMult = 1;

    this.activePowerUps.forEach((boost) => {
      if (boost.speedMult)  speedMult  *= boost.speedMult;
      if (boost.damageMult) damageMult *= boost.damageMult;
    });

    player.speedMultiplier  = speedMult;
    player.damageMultiplier = damageMult;
  }

  hasShield() {
    return this.activePowerUps.has('pacific_punch');
  }

  clear() {
    this.activePowerUps.forEach((boost) => {
      if (boost.timerHandle) boost.timerHandle.remove();
    });
    this.activePowerUps.clear();
  }
}
