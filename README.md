# KAPIBARA BLAST

A Bomberman-style arcade browser game where you play as a capybara superhero fighting robots on a grid-based arena.

Built as a single HTML file with vanilla JavaScript and Canvas 2D — zero external dependencies. All graphics are rendered programmatically and all audio is generated procedurally via Web Audio API.

## Play

Open `index.html` in a browser.

## Controls

| Action  | Key              |
|---------|------------------|
| Move    | WASD / Arrow keys |
| Bomb    | Space            |
| Pause   | ESC / P          |
| Restart | R                |
| Mute    | M                |

Touch controls are available on mobile.

## Features

- 15x13 grid arena with destructible crates and indestructible walls
- 4 robot types with different AI, speed, and HP (Basic, Chaser, Speeder, Tank)
- Bomb system with cross-shaped explosions and configurable blast radius
- Power-ups: range, speed, extra life, additional bombs
- Multi-level progression with increasing difficulty
- Combo scoring system and time bonuses
- Particle effects, screen shake, and procedural audio
- Start screen, pause menu, and level summary screens
- High score tracking via localStorage
- Dark pixel-art aesthetic rendered entirely in code

## Tech

- **Single file** — everything lives in `index.html`
- **No dependencies** — no CDN, no npm runtime deps, no asset files
- **60 FPS** target with delta-time physics and particle pooling
- **Browser support** — Chrome, Firefox, Safari, Edge

## Development

```bash
npm install        # install dev dependencies (Playwright)
npx playwright test # run tests
```
