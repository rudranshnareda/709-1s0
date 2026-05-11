const KEY = '709_1s0_settings';

const DEFAULTS = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  muted: false,
  fullscreen: false,
  touchOpacity: 0.6,
};

export default class SettingsManager {
  static _cache = null;

  static get() {
    if (this._cache) return { ...this._cache };
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
      this._cache = s;
      return { ...s };
    } catch {
      this._cache = { ...DEFAULTS };
      return { ...DEFAULTS };
    }
  }

  static set(key, value) {
    const s = this.get();
    s[key] = value;
    this._cache = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
    return s;
  }

  static applyAudio(soundManager) {
    if (!soundManager) return;
    const s = this.get();
    soundManager.volume = s.muted ? 0 : s.musicVolume;
    soundManager.mute = s.muted;
  }
}
