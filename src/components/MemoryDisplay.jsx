import React, { useState } from 'react';

const TYPE_ICON = {
  monster: '⚡',
  flower: '🌸',
  memory: '💎',
};

export default function MemoryDisplay({ memories }) {
  const [open, setOpen] = useState(false);

  if (memories.length === 0) return null;

  return (
    <div className="memory-display">
      <button className="memory-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▼' : '▶'} Memories ({memories.length})
      </button>

      {open && (
        <div className="memory-list">
          {memories.map((m, i) => (
            <div key={i} className="memory-item">
              <span className="memory-icon">{TYPE_ICON[m.type] ?? '·'}</span>
              <span className="memory-text">
                {m.memoryId ?? m.monsterType ?? m.flowerType ?? 'collected'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
