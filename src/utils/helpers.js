export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomIntBetween(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Generates a solid-color placeholder texture at runtime — useful before real sprites are added.
export function createPlaceholderTexture(scene, key, width, height, color = 0xff00ff) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 1);
  gfx.fillRect(0, 0, width, height);
  gfx.generateTexture(key, width, height);
  gfx.destroy();
}
