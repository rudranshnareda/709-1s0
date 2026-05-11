import Phaser from 'phaser';
import { FONT } from '../utils/RetroUI.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants.js';

export default class IntroCutsceneScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroCutsceneScene' });
  }

  preload() {
    this.load.image('envelope', 'assets/cutscene/enevelope_closed.png');
    this.load.image('letter',   'assets/cutscene/letter.png');
  }

  create() {
    this._phase = 'envelope';

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04041a)
      .setOrigin(0, 0).setDepth(0);

    this._buildEnvelopePhase();
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── PHASE 1: Envelope ─────────────────────────────────────────────────────

  _buildEnvelopePhase() {
    this._envelopeGroup = this.add.group();

    const env = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'envelope')
      .setDepth(5).setScale(0)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: env, scale: 1, duration: 500, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: env, y: env.y - 12,
      duration: 1800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 600,
    });

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, '[ click to open ]', {
      fontFamily: FONT, fontSize: '11px', fill: '#aaaacc',
    }).setOrigin(0.5).setDepth(5).setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 1, duration: 400, delay: 800 });
    this.tweens.add({ targets: hint, alpha: 0.2, duration: 700, yoyo: true, repeat: -1, delay: 1200 });

    this._envelopeGroup.addMultiple([env, hint]);

    env.once('pointerdown', () => {
      if (this._phase !== 'envelope') return;
      this._phase = 'opening';
      this.tweens.add({
        targets: env, scaleX: 1.15, scaleY: 1.15, alpha: 0,
        duration: 350, ease: 'Power2',
        onComplete: () => {
          this._envelopeGroup.destroy(true);
          this._buildLetterPhase();
        },
      });
      this.tweens.add({ targets: hint, alpha: 0, duration: 200 });
    });
  }

  // ── PHASE 2: Letter ───────────────────────────────────────────────────────

  _buildLetterPhase() {
    this._phase = 'letter';
    this._letterItems = [];

    const letter = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'letter')
      .setDepth(5).setDisplaySize(560, 420).setAlpha(0);
    this._letterItems.push(letter);

    this.tweens.add({ targets: letter, alpha: 1, duration: 500 });

    const continuePrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 230,
      'CLICK TO CONTINUE', {
        fontFamily: FONT, fontSize: '12px', fill: '#FFD700',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(6).setAlpha(0);
    this._letterItems.push(continuePrompt);

    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: continuePrompt, alpha: 1, duration: 400 });
      this.tweens.add({
        targets: continuePrompt, alpha: 0.2,
        duration: 600, yoyo: true, repeat: -1,
      });
      this._phase = 'letter_ready';
    });

    this.input.on('pointerdown', () => this._onLetterClick());
    this.input.keyboard.on('keydown', () => this._onLetterClick());
  }

  _onLetterClick() {
    if (this._phase !== 'letter_ready') return;
    this._phase = 'transitioning';

    this.tweens.add({
      targets: this._letterItems, alpha: 0, duration: 400,
      onComplete: () => {
        this._letterItems.forEach(o => o.destroy());
        this.input.off('pointerdown');
        this.input.keyboard.off('keydown');
        this._buildThoughtPhase();
      },
    });
  }

  // ── PHASE 3: Inner thought ────────────────────────────────────────────────

  _buildThoughtPhase() {
    this._phase = 'thought';

    const text = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
      'I must protect him and\ndefeat the shadow monster.',
      {
        fontFamily: FONT,
        fontSize: '22px',
        fill: '#FFD700',
        stroke: '#000000',
        strokeThickness: 3,
        fontStyle: 'italic',
        align: 'center',
        lineSpacing: 10,
      }
    ).setOrigin(0.5).setDepth(5).setAlpha(0);

    const prompt = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120,
      '[ click to begin ]',
      { fontFamily: FONT, fontSize: '11px', fill: '#aaaacc' }
    ).setOrigin(0.5).setDepth(5).setAlpha(0);

    this.tweens.add({ targets: text, alpha: 1, duration: 700 });

    this.time.delayedCall(1000, () => {
      this.tweens.add({ targets: prompt, alpha: 1, duration: 400 });
      this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
      this._phase = 'thought_ready';
      this.input.once('pointerdown', () => this._proceed());
      this.input.keyboard.once('keydown', () => this._proceed());
    });
  }

  _proceed() {
    if (this._phase !== 'thought_ready') return;
    this._phase = 'done';
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Level1'));
  }
}
