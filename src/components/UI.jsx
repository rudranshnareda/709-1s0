import React from 'react';

export default function UI({ gameStarted, onStart, currentLevel }) {
  if (gameStarted) return null;

  return (
    <div className="start-screen">
      <h1>709 &mdash; 1s0</h1>
      <p>a platformer about fighting your way back</p>

      <button className="start-button" onClick={onStart}>
        START
      </button>

      <div className="controls-hint">
        <p>Arrow Keys / WASD &nbsp;·&nbsp; Move</p>
        <p>Up / W &nbsp;·&nbsp; Jump</p>
        <p>Z &nbsp;·&nbsp; Attack</p>
      </div>
    </div>
  );
}
