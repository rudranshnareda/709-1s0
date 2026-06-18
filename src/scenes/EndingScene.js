import Phaser from 'phaser';
import { FONT } from '../utils/RetroUI.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants.js';

const CX = GAME_WIDTH  / 2;
const CY = GAME_HEIGHT / 2;

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EndingScene' });
  }

  preload() {
    this.load.image('her_idle',     'assets/characters/her/idle.png');
    this.load.image('her_walk',     'assets/characters/her/walk.png');
    this.load.image('me_idle',      'assets/characters/me/me_idle.png');
    this.load.image('me_walk',      'assets/characters/me/me_walk.png');
    this.load.image('reunion_kiss', 'assets/characters/me/reunion_kiss.png');
    this.load.image('goldh',        'assets/ui/goldh.png');
    this.load.image('end_photo',    'assets/cutscene/photo.png');
    this.load.image('end_message',  'assets/cutscene/message.jpeg');

    this.load.on('loaderror', (f) => console.warn('Ending asset missing:', f.key));
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x080210)
      .setOrigin(0, 0).setDepth(0);

    this.cameras.main.fadeIn(1000, 0, 0, 0);
    this._buildReunionPhase();
  }

  // ── PHASE 1 : Reunion walk ────────────────────────────────────────────────

  _buildReunionPhase() {
    const groundY = GAME_HEIGHT * 0.62;

    // Her — left side, walks right (no flip)
    this._her = this.add.image(120, groundY, 'her_walk')
      .setDepth(5).setScale(1.6).setAlpha(0);

    // Me — right side, walks left (sprite faces left by default, no flip needed)
    this._me = this.add.image(GAME_WIDTH - 120, groundY, 'me_walk')
      .setDepth(5).setScale(1.6).setAlpha(0);

    // Fade in both
    this.tweens.add({ targets: [this._her, this._me], alpha: 1, duration: 600 });

    // 2-frame walk cycle
    this._walkTimer = this.time.addEvent({
      delay: 160, loop: true,
      callback: () => {
        if (this._her?.active)
          this._her.setTexture(this._her.texture.key === 'her_walk' ? 'her_idle' : 'her_walk');
        if (this._me?.active)
          this._me.setTexture(this._me.texture.key === 'me_walk' ? 'me_idle' : 'me_walk');
      },
    });

    // Walk toward each other — meet just left/right of centre
    this.tweens.add({ targets: this._her, x: CX - 55, duration: 2400, ease: 'Linear' });
    this.tweens.add({
      targets: this._me, x: CX + 55, duration: 2400, ease: 'Linear',
      onComplete: () => this._showKiss(groundY),
    });
  }

  _showKiss(groundY) {
    this._walkTimer?.remove();
    this._walkTimer = null;

    this.tweens.add({
      targets: [this._her, this._me], alpha: 0, duration: 250,
      onComplete: () => {
        this._her?.destroy();
        this._me?.destroy();

        const kiss = this.add.image(CX, groundY, 'reunion_kiss')
          .setDepth(5).setScale(1.6).setAlpha(0);

        this.tweens.add({
          targets: kiss, alpha: 1, duration: 600,
          onComplete: () => {
            this.time.delayedCall(2600, () => {
              this.tweens.add({
                targets: kiss, alpha: 0, duration: 700,
                onComplete: () => { kiss.destroy(); this._buildHeartPhase(); },
              });
            });
          },
        });
      },
    });
  }

  // ── PHASE 2 : Golden heart ────────────────────────────────────────────────

  _buildHeartPhase() {
    this._phase = 'heart';

    const heart = this.add.image(CX, CY, 'goldh').setDepth(5).setAlpha(0);

    // Fit to screen preserving aspect ratio
    const fit = Math.min(GAME_WIDTH / heart.width, GAME_HEIGHT / heart.height);
    heart.setScale(fit);

    this.tweens.add({ targets: heart, alpha: 1, duration: 700 });
    this.tweens.add({
      targets: heart, scaleX: fit * 1.04, scaleY: fit * 1.04,
      duration: 800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 800,
    });

    const hint = this.add.text(CX, GAME_HEIGHT - 36, '[ click ]', {
      fontFamily: FONT, fontSize: '11px', fill: '#ffccdd',
    }).setOrigin(0.5).setDepth(6).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 900 });
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 600, yoyo: true, repeat: -1, delay: 1400 });

    this.input.once('pointerdown', () => {
      if (this._phase !== 'heart') return;
      this._phase = 'transitioning';
      this.tweens.add({
        targets: [heart, hint], alpha: 0, scaleX: 1.15, scaleY: 1.15, duration: 450,
        onComplete: () => { heart.destroy(); hint.destroy(); this._buildPhotoPhase(); },
      });
    });
  }

  // ── PHASE 3 : Photo + message ─────────────────────────────────────────────

  _buildPhotoPhase() {
    this._phase = 'photo';

    // Photo — top half
    const frame = this.add.rectangle(CX, 148, 364, 244, 0xffffff)
      .setDepth(4).setAlpha(0);
    const photo = this.add.image(CX, 148, 'end_photo')
      .setDepth(5).setDisplaySize(360, 240).setAlpha(0);

    // Handwritten letter — bottom half, scaled to fit width
    const letter = this.add.image(CX, 430, 'end_message')
      .setDepth(5).setAlpha(0);
    const letterScale = Math.min((GAME_WIDTH - 40) / letter.width, 260 / letter.height);
    letter.setScale(letterScale);

    const photoDlBtn  = this._makeDownloadBtn(CX + 192, 148, 'assets/cutscene/photo.png',    'photo.png');
    const letterDlBtn = this._makeDownloadBtn(CX + 192, 430, 'assets/cutscene/message.jpeg', 'letter.jpeg');
    photoDlBtn.setAlpha(0);
    letterDlBtn.setAlpha(0);

    const hint = this.add.text(CX, GAME_HEIGHT - 14, '[ click to continue ]', {
      fontFamily: FONT, fontSize: '9px', fill: '#888899',
    }).setOrigin(0.5).setDepth(6).setAlpha(0);

    this.tweens.add({ targets: [frame, photo], alpha: 1, duration: 700 });
    this.time.delayedCall(600, () => {
      this.tweens.add({ targets: [letter, photoDlBtn, letterDlBtn], alpha: 1, duration: 600 });
      this.time.delayedCall(500, () => {
        this.tweens.add({ targets: hint, alpha: 1, duration: 300 });
        this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
        this._phase = 'photo_ready';
      });
    });

    this.input.on('pointerdown', (ptr) => {
      if (this._phase !== 'photo_ready') return;
      // ignore clicks on download buttons
      if (photoDlBtn.getBounds().contains(ptr.x, ptr.y)) return;
      if (letterDlBtn.getBounds().contains(ptr.x, ptr.y)) return;
      this._phase = 'done';
      this.input.off('pointerdown');
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        [frame, photo, letter, photoDlBtn, letterDlBtn, hint].forEach(o => o.destroy());
        this._buildCreditsPhase();
      });
    });
  }

  _makeDownloadBtn(x, y, href, filename) {
    const bg = this.add.rectangle(x, y, 22, 22, 0x222244, 0.85)
      .setDepth(8).setInteractive({ useHandCursor: true });
    const icon = this.add.text(x, y, '⬇', {
      fontFamily: FONT, fontSize: '13px', fill: '#FFD700',
    }).setOrigin(0.5).setDepth(9);

    bg.on('pointerover',  () => bg.setFillStyle(0x4444aa, 0.95));
    bg.on('pointerout',   () => bg.setFillStyle(0x222244, 0.85));
    bg.on('pointerdown',  () => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      a.click();
    });

    // Return a container-like object with setAlpha and getBounds
    const self = {
      setAlpha: (v) => { bg.setAlpha(v); icon.setAlpha(v); return self; },
      getBounds: () => bg.getBounds(),
      destroy:   () => { bg.destroy(); icon.destroy(); },
    };
    return self;
  }

  // ── PHASE 4 : Credits ─────────────────────────────────────────────────────

  _buildCreditsPhase() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04041a)
      .setOrigin(0, 0).setDepth(10);
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    const entries = [
      { text: '709 - 1s0',                  size: '28px', color: '#FFFFFF', dy: -200 },
      { text: 'A  J A I P U R  T A L E',   size: '11px', color: '#9999DD', dy: -148 },
      { text: '————————————————————',       size: '10px', color: '#222244', dy: -100 },
      { text: 'Made with love by',          size: '10px', color: '#888899', dy:  -62 },
      { text: 'Shekhar',                    size: '22px', color: '#FFD700', dy:  -20 },
      { text: '————————————————————',       size: '10px', color: '#222244', dy:   30 },
      { text: 'Built with',                 size: '10px', color: '#888899', dy:   68 },
      { text: 'Claude Code',                size: '14px', color: '#cc99ff', dy:  100 },
      { text: '&  ChatGPT',                 size: '14px', color: '#77ccff', dy:  128 },
    ];

    entries.forEach((e, i) => {
      const t = this.add.text(CX, CY + e.dy, e.text, {
        fontFamily: FONT, fontSize: e.size, fill: e.color,
      }).setOrigin(0.5).setDepth(15).setAlpha(0);

      this.tweens.add({ targets: t, alpha: 1, duration: 500, delay: 600 + i * 220 });
    });

    // After all lines appear, wait then loop back to menu
    const totalDelay = 600 + entries.length * 220 + 3000;
    this.time.delayedCall(totalDelay, () => {
      this.cameras.main.fadeOut(1200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MenuScene'));
    });
  }
}
