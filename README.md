# 709 - 1s0

A personal platformer built with React + Phaser 3.

## Levels

| # | Location | Primary Enemies |
|---|----------|----------------|
| 1 | SMS Medical College | Goons, Dogs |
| 2 | Smriti Van | Goons, Dogs |
| 3 | WTP Mall | Manager, Goons |
| 4 | Jal Mahal | Police, Goons |
| 5 | Metro | Dean, Police |
| 6 | Pink City | Mafia Boss, Goons |
| 7 | Nahargarh Fort | Politician, Tiger |
| Boss | Shadow Me Fight | Shadow Me |

## Collectibles

- **Monster Energy cans** — power-ups with unique effects per flavor
- **Flowers** — sunflower, lavender, rose, tulip
- **Memory Gems** — unlock memories displayed in the sidebar

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Move |
| Up / W | Jump |
| Z | Attack |
| ESC | Pause |

## Setup

```bash
npm install
npm run dev
```

## Asset Folders

Drop sprites into `src/assets/characters/<name>/` — the expected filenames are:
`idle.png`, `walk_left_1.png`, `walk_left_2.png`, `walk_right_1.png`, `walk_right_2.png`,
`jump.png`, `attack.png`, `death.png`

Backgrounds go in `src/assets/backgrounds/`, music in `src/assets/audio/`.

## Tech Stack

- [React 18](https://reactjs.org/)
- [Phaser 3](https://phaser.io/)
- [Vite](https://vitejs.dev/)
