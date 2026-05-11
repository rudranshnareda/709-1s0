import React from 'react';
import Game from './components/Game.jsx';
import './index.css';

// All UI (title, map, pause, gallery, settings) is handled inside Phaser scenes.
// React is intentionally kept as a thin mounting shell.
export default function App() {
  return (
    <div className="app">
      <Game />
    </div>
  );
}
