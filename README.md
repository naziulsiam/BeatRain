# BeatRain

A fast, mobile-friendly rhythm game played with four keyboard keys or touch lanes. Hit falling notes in time, build combos, and aim for a new high score.

## Features

- Easy, normal, and hard difficulty modes
- Keyboard controls with `D`, `F`, `J`, and `K`
- Touch controls for mobile devices
- Score, combo, lives, and accuracy ranking
- Pause, mute, restart, and high-score support
- Generated background audio with no game framework

## Run locally

```bash
git clone https://github.com/naziulsiam/BeatRain.git
cd BeatRain
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Project files

- `index.html` — screens, controls, and canvas
- `style.css` — game presentation and responsive layout
- `game.js` — timing, input, scoring, audio, and game state

## How to play

Choose a difficulty, then press the matching key—or tap its lane—when a falling note reaches the hit line. Missing notes costs lives, while accurate hits increase your score and combo.
