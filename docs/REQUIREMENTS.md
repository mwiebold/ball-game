# Requirements — Ball Escape Studio

A single-page browser app with two halves: a **simulation canvas** running the
game, and a **settings panel** that reconfigures it live. Every mechanic
observed in the reference video is a setting; the app can reproduce that video
and thousands of variants.

Requirement IDs: **F-x** functional, **S-x** settings, **N-x** non-functional.
Priorities: **P1** = MVP, **P2** = v1.0, **P3** = nice-to-have.

---

## 1. Core simulation (F)

| ID | P | Requirement |
|----|---|-------------|
| F-1 | P1 | Render a portrait (9:16 default) canvas with black background at 60 fps target, fixed-timestep physics decoupled from render. |
| F-2 | P1 | Simulate N balls under configurable gravity with elastic bounces off ring interiors; restitution and a minimum-speed floor keep the sim alive. |
| F-3 | P1 | Concentric ring arcs, each with a gap; exact circle-vs-arc collision so balls bounce off the arc body and pass cleanly through gaps. |
| F-4 | P1 | Per-ring rotation with configurable base speed, per-ring speed scaling, and direction pattern (all same / alternating / random). |
| F-5 | P1 | When a ball fully exits through the innermost surviving ring's gap, that ring is destroyed with a particle burst. |
| F-6 | P1 | Win state: all rings destroyed (ball "escapes"). Lose state: countdown reaches zero first. End-screen overlay with restart. |
| F-7 | P1 | Deterministic runs from a seed — same seed + same settings ⇒ identical simulation (needed for shareable configs and re-recording). |
| F-8 | P2 | Multiple balls simultaneously (each destroys rings independently); optional ball-vs-ball collision. |
| F-9 | P2 | Optional pickups floating in the arena (e.g. +ball, speed boost, time bonus) as seen as badges/stars in the reference. |
| F-10 | P3 | Alternative destruction rule modes: e.g. "ring shrinks instead of breaking", "gap widens per bounce", "outermost-first". |

## 2. Settings panel (S) — the "toggles"

All settings apply live (or on restart where physically necessary, clearly
indicated). Grouped as they'll appear in the UI.

### Arena & rings
| ID | P | Setting | Range / options |
|----|---|---------|-----------------|
| S-1 | P1 | Ring count | 1–50 |
| S-2 | P1 | Gap size | 5°–180°, plus per-ring jitter |
| S-3 | P1 | Rotation speed | −3…+3 rad/s base |
| S-4 | P1 | Rotation pattern | uniform / alternating / speed-scales-with-index / random |
| S-5 | P1 | Ring spacing & innermost radius | sliders |
| S-6 | P1 | Ring thickness | 1–12 px |
| S-7 | P2 | Initial gap alignment | aligned / spiral / random |
| S-8 | P3 | Canvas aspect | 9:16 / 1:1 / 16:9 |

### Ball & physics
| ID | P | Setting | Range / options |
|----|---|---------|-----------------|
| S-9 | P1 | Gravity strength | 0–3× |
| S-10 | P1 | Restitution (bounciness) | 0.8–1.2 |
| S-11 | P1 | Ball size | slider |
| S-12 | P1 | Ball count | 1–10 |
| S-13 | P1 | Initial speed & launch angle | slider + randomize |
| S-14 | P2 | Speed cap & speed floor | sliders |
| S-15 | P2 | Ball-vs-ball collisions | toggle |
| S-16 | P3 | Gravity direction / center-attract mode | dropdown |

### Visuals
| ID | P | Setting | Range / options |
|----|---|---------|-----------------|
| S-17 | P1 | Color palette | rainbow-by-angle (reference), rainbow-by-ring, mono, custom gradient presets |
| S-18 | P1 | Ball trail | toggle + length |
| S-19 | P1 | Ring shatter particles | toggle + intensity |
| S-20 | P1 | Glow intensity | slider (off → heavy bloom) |
| S-21 | P2 | Ball flare on impact | toggle |
| S-22 | P2 | Background | black / starfield / custom color |
| S-23 | P2 | Watermark/brand text | free text, on/off |
| S-24 | P3 | Screen shake on ring break | toggle |

### Game rules & HUD
| ID | P | Setting | Range / options |
|----|---|---------|-----------------|
| S-25 | P1 | Countdown duration | 10 s–5 min, or off (sandbox) |
| S-26 | P1 | Caption text | free text (e.g. "The ball has to escape in under 1 minute!") |
| S-27 | P1 | Timer display | hidden / mm:ss / progress bar |
| S-28 | P2 | Pickups | none / +ball / time bonus / speed boost, spawn rate |
| S-29 | P2 | Auto-restart on end | toggle (for ambient/loop displays) |

### Audio
| ID | P | Setting | Range / options |
|----|---|---------|-----------------|
| S-30 | P1 | Master mute + volume | toggle + slider |
| S-31 | P1 | Bounce sound mode | off / single tone / **melody mode** (each bounce plays next note) |
| S-32 | P1 | Built-in melodies | 3–5 bundled note sequences (public-domain tunes + scales/arpeggios) |
| S-33 | P2 | Synth voice | sine / square / pluck / marimba-ish |
| S-34 | P2 | Ring-break SFX | toggle |
| S-35 | P3 | Custom melody import (simple note-text or MIDI file) | file input |

### Presets & sharing
| ID | P | Setting | Behavior |
|----|---|---------|----------|
| S-36 | P1 | Preset dropdown | Bundled presets incl. **"Reference video"** reproducing the source clip's look |
| S-37 | P1 | Randomize button | Seeded random settings within tasteful bounds |
| S-38 | P1 | Share link | Full config + seed serialized into URL hash |
| S-39 | P2 | Save/load user presets | localStorage |
| S-40 | P2 | Import/export preset JSON | file download/upload |

## 3. Recording & export (F, continued)

| ID | P | Requirement |
|----|---|-------------|
| F-11 | P2 | One-click **Record**: capture canvas + audio via MediaRecorder to WebM; start/stop or "record one full run". |
| F-12 | P3 | Headless-style re-render: re-run a seeded sim while recording at fixed 60 fps for clean exports. |
| F-13 | P3 | PNG snapshot button. |

## 4. Non-functional (N)

| ID | Requirement |
|----|-------------|
| N-1 | Pure client-side static site — no backend; deployable to GitHub Pages. |
| N-2 | 60 fps on a mid-range laptop with 20 rings, 3 balls, particles on; graceful degradation (particle budget) below that. |
| N-3 | Works in current Chrome, Firefox, Safari, Edge; mobile Safari/Chrome usable (panel collapses to a drawer). |
| N-4 | Zero runtime dependencies for the sim core; total JS bundle < 150 kB gzipped. |
| N-5 | Physics is deterministic given (seed, settings, fixed timestep) — no reliance on frame rate. |
| N-6 | Audio starts only after a user gesture (browser autoplay policy). |
| N-7 | Settings panel is keyboard-accessible with labeled controls. |
| N-8 | Sim core is UI-agnostic and unit-testable (collision math, ring destruction, seeding). |

## 5. Explicitly out of scope (for now)

- Backend, accounts, or a community gallery of shared games.
- Copyrighted song playback (bundled melodies are public-domain/original).
- Native mobile apps; direct TikTok/YouTube upload integration.
- Genre variants beyond ring-escape (e.g. filling shapes, plinko) — the
  architecture leaves room, but v1 ships one game type done well.

## 6. Open questions for review

1. **Priority of video export (F-11)** — MVP or fast-follow? It's the genre's
   whole point (making clips), but it doubles Phase-2 scope.
2. The reference's **numbered badge ("3"/"2")** — treat as a pickup counter
   (current plan) or replicate exactly once we know what it is?
3. Should **melody mode** ship in MVP (currently yes, S-31) or start with
   simple tones?
4. Any preference on **framework** for the settings panel? Plan proposes
   vanilla TS + a tiny reactive store; Preact/Svelte are alternatives if you
   expect the UI to grow a lot.
