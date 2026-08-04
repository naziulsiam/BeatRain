# BeatRain

BeatRain is an immersive four-lane rhythm game with a perspective-driven neon track, original Web Audio soundscape, and responsive keyboard and touch controls.

## Highlights

- Perspective-rendered 3D track and depth-scaled tiles
- Frame-rate-independent movement for consistent timing across 60 Hz and 120 Hz devices
- Original ambient music and procedural hit, miss, milestone, and result sounds
- Touch-first controls with safe-area support, haptic feedback, and orientation handling
- Keyboard controls using `D`, `F`, `J`, and `K`
- Drift, Flow, and Rush difficulty modes
- Accuracy grades, combo scoring, lives, and per-difficulty personal bests
- Automatic pause when the browser loses focus or the page becomes hidden
- Reduced-motion support and accessible button labels
- No game framework or external audio files

## Play locally

```bash
git clone https://github.com/naziulsiam/BeatRain.git
cd BeatRain
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in a modern browser.

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Play lanes | `D` `F` `J` `K` | Tap the four bottom pads |
| Pause/resume | `P` or `Esc` | Pause button |
| Sound | Sound button | Sound button |

Tap or press when a tile reaches the illuminated line. Precise hits score more points, while longer combos increase the multiplier.

## Architecture

- `index.html` — semantic game screens, HUD, results, and accessible controls
- `style.css` — responsive glass interface, mobile safe areas, and visual feedback
- `game.js` — canvas renderer, timing engine, Web Audio soundscape, input, scoring, and persistence

## Browser notes

Audio begins only after the player presses **Enter the flow**, following browser autoplay rules. Haptic feedback is used when supported and ignored safely on unsupported devices.
