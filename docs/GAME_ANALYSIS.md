# Reference Game Analysis

Source: uploaded video (47.6 s, 576×1024, 30 fps) — a TikTok-style clip from the
"ball simulator" genre (watermarked `ballsimulator.com`, account
`@music.bouncing.ba`). This document decomposes what happens on screen so the
requirements can name every mechanic precisely.

## Scene inventory

### Playfield
- **Portrait 9:16 canvas**, pure black background — built for vertical video.
- A **caption line** near the top: *"The ball has to escape in under 1 minute !…"*
  Static text, part of the composition.
- Center watermark text (we will make ours optional/custom).

### The rings
- **~15–20 concentric circular rings**, tightly nested, drawn as thin neon
  strokes with a slight glow.
- Colors sweep a **rainbow gradient around the circumference** (hue mapped to
  angle), so the whole stack reads as a spectrum wheel.
- Each ring is **not a full circle**: it has one **gap (missing arc)** of
  roughly 20–40°. Gap positions vary per ring.
- Rings **rotate** (gaps orbit the center). In the early frames the stack's
  gaps are roughly aligned into two big openings; later frames show gaps
  scattered — consistent with **per-ring rotation speeds** (possibly
  alternating direction or speed scaling by ring index).

### The ball
- Single **magenta/pink ball**, small relative to rings, with a **glowing
  comet trail** and a **spiky "burning" flare** when moving fast or on impact.
- Moves under **gravity**, bouncing elastically off ring interiors. Bounce
  energy appears constant-or-slightly-gaining (typical of the genre: restitution
  ≥ 1 or a speed floor keeps the sim lively).

### Ring destruction
- When the ball passes **through a ring's gap** from the inside, that ring is
  **destroyed**: it bursts into **orange/gold spark particles** that scatter
  and fade (visible as ember clouds in mid-video frames).
- Destruction proceeds from **innermost outward** — the ball can only reach
  ring *n+1* after clearing ring *n*. Frame at ~34 s shows only the outermost
  1–3 rings remaining.

### HUD / meta elements
- A small **numbered badge** (shows "3", later "2", then "3") drifting in the
  playfield, and a small **sun/star object** in some frames. Ambiguous in the
  source. **Decision (2026-07-05): not replicated** — our game is just the
  ball bouncing and escaping; no pickups or badges.
- The countdown itself is implied by the caption ("under 1 minute") and the
  video length (~48 s); some variants of the genre show an on-screen timer.

### Audio (genre-standard, inferred)
- Every wall bounce plays the **next note of a melody** ("Did you recognize
  the music?" caption). The bounce sequence performs a song one note per hit.
- Ring destruction has a percussive/explosion sound.

## End state
- Final frames: all rings gone, embers fading, ball off-screen — the **win**
  condition (escape before the timer). The genre's **lose** condition is the
  timer expiring with rings still standing.

## Mechanics summary (what the engine must simulate)

1. Gravity-driven ball(s) inside nested ring arcs.
2. Exact circle-vs-arc collision: bounce off ring body, pass through gap.
3. Per-ring rotation (speed/direction patterns).
4. Innermost-ring destruction on gap passage → particle burst.
5. Restitution/speed-floor tuning so the sim never stalls.
6. Bounce sounds and ring-break SFX (reference uses note-per-bounce melodies;
   our MVP uses simple tones, melody mode post-MVP).
7. Countdown timer, win/lose states, caption text.
8. Neon glow rendering: additive trails, ring glow, ember particles.
