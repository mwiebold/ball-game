# Ball Escape Studio

A browser-based creator for "satisfying bouncing ball" simulation games — the genre seen in the reference video: a glowing ball bounces under gravity inside a stack of concentric, rotating ring arcs. Each ring has a gap; when the ball slips through, the ring shatters into particles. Bounces play musical notes. The ball must escape every ring before a countdown expires.

Instead of one hard-coded game, this app is a **studio**: a live simulation canvas plus a settings panel of toggles, sliders, and presets that let you design endless variations of the game — and export them as videos or share them as links.

## Project status

📋 **Planning phase.** No code yet — documentation is being reviewed first.

| Document | Purpose |
|---|---|
| [docs/GAME_ANALYSIS.md](docs/GAME_ANALYSIS.md) | Frame-by-frame breakdown of the reference video's mechanics |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Functional and non-functional requirements, full settings catalog |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | Architecture, tech choices, phased milestones |

## The pitch in one screen

```
┌───────────────────────────────┬──────────────────────┐
│                               │  ⚙ SETTINGS          │
│      (9:16 canvas)            │  Rings: 12      ──○──│
│                               │  Gap size: 30°  ──○──│
│      rotating rainbow         │  Rotation: 0.5  ──○──│
│      ring arcs with gaps      │  Gravity: 1.0   ──○──│
│                               │  Balls: 1       ──○──│
│          ● ← glowing ball     │  ☑ Ring shatter FX   │
│            with trail         │  ☑ Musical bounces   │
│                               │  ☑ Countdown timer   │
│                               │  Palette: Rainbow ▾  │
│   "Escape in under 1 min!"    │  [▶ Run] [🎲 Random] │
│                               │  [⏺ Record] [🔗 Share]│
└───────────────────────────────┴──────────────────────┘
```

## Planned tech (see build plan for rationale)

- **Vite + TypeScript**, no framework for the sim; small reactive settings panel
- **Canvas 2D** rendering with glow/trail effects (60 fps target)
- **Custom physics** (circle-vs-arc collision — exact math beats a general-purpose engine here)
- **Web Audio API** for synthesized musical bounce notes
- **MediaRecorder** for one-click WebM video export
- Config serialized to the **URL hash** for sharing; presets in localStorage
