const KEY = '709_1s0_save';
const VER = 1;

const DEFAULTS = {
  version: VER,
  unlockedLevels: [1],
  completedLevels: [],
  memories: [],
  checkpoint: null,
  stats: { deaths: 0, totalTime: 0 },
};

export default class SaveManager {
  static hasSave() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      return !!(d && d.version === VER);
    } catch { return false; }
  }

  static save(partial = {}) {
    const current = this.load() ?? { ...DEFAULTS };
    const next = { ...current, ...partial, version: VER, timestamp: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(next)); return true; }
    catch { return false; }
  }

  static load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.version !== VER) return { ...DEFAULTS };
      return { ...DEFAULTS, ...d };
    } catch { return { ...DEFAULTS }; }
  }

  static fresh() {
    localStorage.removeItem(KEY);
    return this.save({ ...DEFAULTS });
  }

  static addMemory(id) {
    const s = this.load() ?? { ...DEFAULTS };
    if (!s.memories.includes(id)) { s.memories.push(id); this.save(s); }
  }

  // Marks level done, unlocks next, returns updated save
  static completeLevel(num) {
    const s = this.load() ?? { ...DEFAULTS };
    if (!s.completedLevels.includes(num)) s.completedLevels.push(num);
    const next = num + 1;
    if (next <= 7 && !s.unlockedLevels.includes(next)) s.unlockedLevels.push(next);
    this.save(s);
    return s;
  }

  static setCheckpoint(levelNum, id, x, y) {
    this.save({ checkpoint: { levelNum, id, x, y } });
  }

  static clearCheckpoint() {
    this.save({ checkpoint: null });
  }

  static incrementDeaths() {
    const s = this.load() ?? { ...DEFAULTS };
    s.stats = s.stats ?? { deaths: 0 };
    s.stats.deaths = (s.stats.deaths ?? 0) + 1;
    this.save(s);
  }

  static isUnlocked(num) {
    const s = this.load();
    return s ? s.unlockedLevels.includes(num) : num === 1;
  }

  static isCompleted(num) {
    const s = this.load();
    return s ? s.completedLevels.includes(num) : false;
  }
}
