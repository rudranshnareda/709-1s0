const R         = 42;
const DEPTH     = 200;
const A_IDLE    = 0.18;
const A_PRESSED = 0.50;

export function createTouchControls(scene, player) {
  scene.input.addPointer(3);

  const W = scene.cameras.main.width;
  const H = scene.cameras.main.height;

  const pad    = 18;
  const btnY   = H - pad - R;
  const aboveY = btnY - R * 2 - 10;

  const buttons = [
    { key: 'left',   x: pad + R,        y: btnY,   label: '◀' },
    { key: 'right',  x: pad + R*3 + 10, y: btnY,   label: '▶' },
    { key: 'jump',   x: W - pad - R,    y: aboveY, label: '▲' },
    { key: 'attack', x: W - pad - R,    y: btnY,   label: 'Z'  },
  ];

  // Draw visuals — setScrollFactor(0) keeps them screen-fixed
  const circles = {};
  buttons.forEach(btn => {
    const c = scene.add.circle(btn.x, btn.y, R, 0xffffff, A_IDLE)
      .setScrollFactor(0).setDepth(DEPTH);
    circles[btn.key] = c;

    scene.add.text(btn.x, btn.y, btn.label, { fontSize: '22px', fill: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1).setAlpha(0.75);
  });

  // Hit test in screen space (ptr.x/y are already in game canvas coords,
  // matching setScrollFactor(0) positions — no camera offset needed)
  function hitTest(px, py) {
    for (const btn of buttons) {
      const dx = px - btn.x, dy = py - btn.y;
      if (dx * dx + dy * dy <= R * R) return btn.key;
    }
    return null;
  }

  // Track pointerId → button key so each finger releases its own button
  const held = {};

  scene.input.on('pointerdown', (ptr) => {
    const key = hitTest(ptr.x, ptr.y);
    if (!key) return;
    held[ptr.id] = key;
    player.touch[key] = true;
    circles[key].setAlpha(A_PRESSED);
  });

  function release(ptr) {
    const key = held[ptr.id];
    if (!key) return;
    player.touch[key] = false;
    circles[key].setAlpha(A_IDLE);
    delete held[ptr.id];
  }

  scene.input.on('pointerup',     release);
  scene.input.on('pointercancel', release);

  // Release everything if the game loses focus mid-touch
  scene.input.on('gameout', () => {
    Object.values(held).forEach(key => {
      player.touch[key] = false;
      circles[key].setAlpha(A_IDLE);
    });
    Object.keys(held).forEach(k => delete held[k]);
  });
}
