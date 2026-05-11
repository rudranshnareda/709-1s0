import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../utils/gameConfig.js';

export default function Game() {
  const containerRef  = useRef(null);
  const gameRef       = useRef(null);

  useEffect(() => {
    if (gameRef.current) return;
    gameRef.current = new Phaser.Game({ ...gameConfig, parent: containerRef.current });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}
