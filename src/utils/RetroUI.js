// Shared SNES-style UI primitives for all Phaser scenes

// Creates a ⏸ pause button fixed to the top-right of the screen.
// Triggers the same PauseScene used by ESC, so keyboard and touch share one path.
export function createPauseButton(scene) {
  const W = scene.cameras.main.width;
  const SIZE = 44;
  const MARGIN = 12;
  const cx = W - MARGIN - SIZE / 2;
  const cy = MARGIN + SIZE / 2;

  // Background circle
  const bg = scene.add.graphics().setScrollFactor(0).setDepth(60);
  const drawBg = (alpha) => {
    bg.clear();
    bg.fillStyle(0x000000, alpha);
    bg.fillCircle(cx, cy, SIZE / 2);
    bg.lineStyle(2, 0xFFD700, 0.6);
    bg.strokeCircle(cx, cy, SIZE / 2);
  };
  drawBg(0.55);

  // ⏸ label
  const icon = scene.add
    .text(cx, cy, '⏸', { fontSize: '18px' })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(61)
    .setInteractive({ useHandCursor: true });

  icon.on('pointerover',  () => drawBg(0.85));
  icon.on('pointerout',   () => drawBg(0.55));
  icon.on('pointerdown',  () => {
    playRetroSound('select');
    scene.scene.pause();
    scene.scene.launch('PauseScene', { parentScene: scene.scene.key });
  });

  return { bg, icon };
}

export const C = {
  GOLD:       0xFFD700,
  GOLD_DIM:   0xB8960C,
  PANEL_BG:   0x04041a,
  WHITE:      0xFFFFFF,
  GRAY:       0x666677,
  RED:        0xFF4444,
  GREEN:      0x44FF88,
  BLUE:       0x4488FF,
};

export const FONT = '"Press Start 2P", monospace';

// Dark panel with gold border — returns the graphics object
export function drawPanel(scene, x, y, w, h, depth = 50) {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  // Drop shadow
  g.fillStyle(0x000000, 0.6);
  g.fillRect(x + 6, y + 6, w, h);
  // Background
  g.fillStyle(0x04041a, 0.96);
  g.fillRect(x, y, w, h);
  // Outer gold border
  g.lineStyle(3, 0xFFD700, 1.0);
  g.strokeRect(x, y, w, h);
  // Inner accent
  g.lineStyle(1, 0xFFE066, 0.35);
  g.strokeRect(x + 5, y + 5, w - 10, h - 10);
  return g;
}

// CRT scanline overlay (call once in scene create)
export function addScanlines(scene) {
  const { width: W, height: H } = scene.cameras.main;
  const g = scene.add.graphics().setDepth(998).setScrollFactor(0);
  g.fillStyle(0x000000, 0.06);
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  return g;
}

// Blinking ▶ cursor text object
export function createBlinker(scene, x, y, depth = 52) {
  const t = scene.add
    .text(x, y, '▶', { fontFamily: FONT, fontSize: '14px', fill: '#FFD700' })
    .setOrigin(0, 0.5).setDepth(depth).setScrollFactor(0);
  scene.tweens.add({ targets: t, alpha: 0, duration: 500, ease: 'Step', yoyo: true, repeat: -1 });
  return t;
}

// Reusable YES/NO confirmation popup — returns cleanup fn
export function showConfirm(scene, message, onYes, onNo, depth = 110) {
  const { width: W, height: H } = scene.cameras.main;
  const dW = 400, dH = 210;
  const dX = (W - dW) / 2, dY = (H - dH) / 2;

  const overlay = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  overlay.fillStyle(0x000000, 0.65);
  overlay.fillRect(0, 0, W, H);
  const panel = drawPanel(scene, dX, dY, dW, dH, depth + 1);

  const msg = scene.add.text(W / 2, dY + 44, message, {
    fontFamily: FONT, fontSize: '11px', fill: '#FFFFFF',
    align: 'center', lineSpacing: 10, wordWrap: { width: dW - 48 },
  }).setOrigin(0.5, 0).setDepth(depth + 2).setScrollFactor(0);

  let sel = 1; // default NO
  const yBtn = scene.add.text(W / 2 - 75, dY + dH - 50, 'YES', {
    fontFamily: FONT, fontSize: '14px', fill: '#FFFFFF',
  }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0).setInteractive();

  const nBtn = scene.add.text(W / 2 + 75, dY + dH - 50, 'NO', {
    fontFamily: FONT, fontSize: '14px', fill: '#FFD700',
  }).setOrigin(0.5).setDepth(depth + 2).setScrollFactor(0).setInteractive();

  const refresh = () => {
    yBtn.setStyle({ fill: sel === 0 ? '#FFD700' : '#FFFFFF' });
    nBtn.setStyle({ fill: sel === 1 ? '#FFD700' : '#FFFFFF' });
  };

  const cleanup = () => {
    overlay.destroy(); panel.destroy();
    msg.destroy(); yBtn.destroy(); nBtn.destroy();
    scene.input.keyboard.off('keydown', kh);
  };

  const kh = (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      sel = sel === 0 ? 1 : 0; playRetroSound('move'); refresh();
    } else if (e.code === 'Enter' || e.code === 'KeyZ') {
      cleanup(); sel === 0 ? onYes() : onNo();
    } else if (e.code === 'Escape') {
      cleanup(); onNo();
    }
  };

  yBtn.on('pointerover', () => { sel = 0; playRetroSound('move'); refresh(); });
  nBtn.on('pointerover', () => { sel = 1; playRetroSound('move'); refresh(); });
  yBtn.on('pointerdown', () => { cleanup(); onYes(); });
  nBtn.on('pointerdown', () => { cleanup(); onNo(); });

  scene.input.keyboard.on('keydown', kh);
  refresh();
  return cleanup;
}

// Flash message (e.g. "SAVED!") that fades after delay
export function flashMessage(scene, text, color = '#FFD700', duration = 1800) {
  const { width: W, height: H } = scene.cameras.main;
  const t = scene.add.text(W / 2, H / 2 - 40, text, {
    fontFamily: FONT, fontSize: '16px', fill: color,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
  scene.tweens.add({
    targets: t, alpha: 0, y: t.y - 30,
    duration, ease: 'Cubic.easeIn', onComplete: () => t.destroy(),
  });
}

// Tiny Web Audio beeps — no audio files needed
export function playRetroSound(type) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const t = ctx.currentTime;
    const vol = 0.06;

    if (type === 'move') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.start(t); osc.stop(t + 0.07);
    } else if (type === 'select') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.setValueAtTime(880, t + 0.06);
      gain.gain.setValueAtTime(vol + 0.02, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    } else if (type === 'back') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(261, t);
      osc.frequency.setValueAtTime(196, t + 0.07);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.start(t); osc.stop(t + 0.14);
    } else if (type === 'save') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523, t);
      osc.frequency.setValueAtTime(659, t + 0.07);
      osc.frequency.setValueAtTime(784, t + 0.14);
      osc.frequency.setValueAtTime(1047, t + 0.21);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.start(t); osc.stop(t + 0.38);
    } else if (type === 'unlock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(660, t + 0.1);
      osc.frequency.setValueAtTime(880, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.45);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t); osc.stop(t + 0.12);
    }
  } catch (_) {}
}
