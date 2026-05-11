import React, { useState, useEffect, useRef } from 'react';

// Add tracks here as you build your playlist:
// { title: 'Song Name', src: '/assets/audio/filename.mp3' }
const PLAYLIST = [];

export default function MusicPlayer({ currentLevel }) {
  const audioRef = useRef(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const toggle = () => {
    if (!audioRef.current || PLAYLIST.length === 0) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const next = () => setTrackIndex((i) => (i + 1) % Math.max(PLAYLIST.length, 1));
  const prev = () => setTrackIndex((i) => (i - 1 + Math.max(PLAYLIST.length, 1)) % Math.max(PLAYLIST.length, 1));

  if (PLAYLIST.length === 0) return null;

  const track = PLAYLIST[trackIndex];

  return (
    <div className="music-player">
      <audio
        ref={audioRef}
        src={track?.src}
        onEnded={next}
      />
      <button onClick={prev} title="Previous">&#9664;&#9664;</button>
      <button onClick={toggle} title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <button onClick={next} title="Next">&#9654;&#9654;</button>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track?.title ?? '—'}
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.02"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        title="Volume"
        style={{ width: 70 }}
      />
    </div>
  );
}
