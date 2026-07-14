import Phaser from 'phaser';
import './style.css';
import GameScene from './scenes/GameScene';

const config = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: 'app',

  backgroundColor: '#10172a',

  pixelArt: true,

  physics: {
    default: 'arcade',

    arcade: {
      gravity: {
        x: 0,
        y: 0,
      },

      debug: false,
    },
  },

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  scene: [GameScene],
};

new Phaser.Game(config);