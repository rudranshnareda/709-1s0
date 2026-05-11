import Phaser from 'phaser';
import MenuScene          from '../scenes/MenuScene.js';
import IntroCutsceneScene from '../scenes/IntroCutsceneScene.js';
import Level1             from '../scenes/Level1.js';
import Level2             from '../scenes/Level2.js';
import EndingScene        from '../scenes/EndingScene.js';
import PauseScene   from '../scenes/PauseScene.js';
import DeathScene   from '../scenes/DeathScene.js';
import SettingsScene from '../scenes/SettingsScene.js';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from './constants.js';

export const gameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#04041a',
  scale: {
    mode: Phaser.Scale.FIT,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: GRAVITY },
      debug: false,
    },
  },
  scene: [
    MenuScene,
    IntroCutsceneScene,
    Level1,
    Level2,
    EndingScene,
    PauseScene,
    DeathScene,
    SettingsScene,
  ],
};
