# Build Plan — Ball Escape Studio

## 1. Tech stack & rationale

| Choice | Decision | Why |
|---|---|---|
| Build tool | **Vite + TypeScript** | Instant dev server, typed sim core, trivial static deploy (GitHub Pages). |
| Rendering | **Canvas 2D** | The scene is strokes, circles, and additive glow — Canvas 2D handles it at 60 fps. WebGL adds complexity we don't need; can revisit if particle counts demand it. |
| Physics | **Custom (~200 lines)** | The only collision shape is circle-vs-arc-of-circle, which has an exact analytic solution. A general engine (Matter.js/Rapier) is worse here: approximated arcs from segments cause tunneling and non-determinism. Custom code gives F-7 determinism for free. |
| UI panel | **Vanilla TS + tiny reactive store** | ~40 controls generated from a settings schema; no framework needed. The schema also drives URL serialization and preset JSON, so controls/sharing/presets stay in sync automatically. |
| Audio | **Web Audio API** | Synthesized tones (no audio assets); leaves room for post-MVP melody sequencing. |
| Tests | **Vitest** | Unit tests for collision math, seeded RNG, ring-destruction ordering, config serialization. |
| CI/deploy | **GitHub Actions → GitHub Pages** | Build + test on push; auto-deploy `main`. |

## 2. Architecture

```
src/
├─ core/                # UI-agnostic, deterministic, unit-tested
│  ├─ rng.ts            # seeded PRNG (mulberry32)
│  ├─ physics.ts        # ball integration, circle-vs-arc collision & reflection
│  ├─ rings.ts          # ring state, rotation, gap math, destruction order
│  ├─ sim.ts            # fixed-timestep world: step(dt) → events[]
│  └─ events.ts         # BOUNCE, RING_BREAK, WIN, LOSE
├─ render/
│  ├─ renderer.ts       # draws world snapshot: rings, balls, HUD, captions
│  ├─ particles.ts      # ember bursts, trails (render-only, non-deterministic OK)
│  └─ palettes.ts       # rainbow-by-angle, by-ring, mono, custom gradients
├─ audio/
│  └─ synth.ts          # WebAudio tone voices; melody.ts joins post-MVP
├─ config/
│  ├─ schema.ts         # single source of truth: every setting w/ type, range, default, group
│  ├─ presets.ts        # bundled presets incl. "Reference video"
│  └─ share.ts          # config+seed ⇄ URL hash; JSON import/export
├─ ui/
│  └─ panel.ts          # renders controls from schema; live-updates sim
└─ main.ts              # game loop: accumulator → sim.step; interpolated render
```

**Key seams**
- `core/` never touches DOM/Canvas/Audio — it consumes settings + seed and
  emits an event stream. This is what makes runs deterministic (F-7) and
  testable (N-8).
- The **settings schema** generates the panel UI, validates presets, and
  defines URL serialization — one place to add a new toggle.
- Renderer/audio subscribe to sim events; cosmetic randomness (particle
  scatter) uses a separate non-seeded RNG so visuals never affect physics.

**Collision math (the one hard part):** each step, for the innermost live
ring, compute the ball's distance from center. If crossing the ring's inner
radius band, check the ball's angular position against the (rotated) gap
interval: inside gap → pass through (and mark ring broken once fully outside);
otherwise reflect velocity about the radial normal and apply restitution.
Continuous check on the radial coordinate prevents tunneling at high speed.

## 3. Phases

### Phase 0 — Scaffold (small) ✅ done
Vite + TS + Vitest + ESLint/Prettier, CI workflow, blank canvas render loop.
**Done when:** `npm run dev` shows a 60 fps clear-screen loop; CI green.

### Phase 1 — Playable core sim (MVP heart) ✅ done
Seeded RNG; ball + gravity + fixed timestep; ring stack with gaps & rotation;
circle-vs-arc collision; innermost-ring destruction; win/lose + countdown;
basic flat-color rendering; unit tests for collision & destruction order.
**Done when:** the reference game is recognizably playable with hard-coded
settings; same seed replays identically; tests pass.

### Phase 2 — Settings panel & schema (the "creator" part) ✅ done
Settings schema (all P1 settings from REQUIREMENTS §2); auto-generated panel;
live-apply vs restart-required handling; Randomize (seeded); preset dropdown
with "Reference video"; URL-hash share links.
**Done when:** every P1 setting works from the UI and a shared URL reproduces
the exact run.

### Phase 3 — Look & sound (make it satisfying) ✅ done
Rainbow-by-angle palette (+ by-ring/mono/fire/ice); additive glow, ball trail,
impact flare; ember particle bursts with budget-based degradation (N-2); Web
Audio synth with simple bounce tones (S-31, incl. rising-per-ring) and
ring-break SFX behind a user-gesture gate; caption + timer HUD styling.
**Done when:** side-by-side with the source video, a "Reference video" preset
run is a convincing visual match; audio behind user-gesture gate.

### Phase 4 — Share & polish (v1.0) ✅ done
User presets in localStorage; preset JSON import/export; mobile drawer layout
& a11y pass (associated labels, focus-visible, ARIA); GitHub Pages deploy
workflow.
**Done when:** a shared URL reproduces the exact run on another machine; app
usable on a phone; deployed URL live.
*Note:* the deploy workflow is in place; going live needs the repo's one-time
Pages setting (Settings → Pages → Source: GitHub Actions) and a push to the
default branch.

### Phase 5 — Stretch (P2/P3 backlog, post-review)
Melody mode with bundled sequences (S-34) and custom melody import; multiple
balls + ball-ball collisions (F-8); alternative destruction modes;
aspect-ratio options; screen shake.

## 4. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Tunneling at high ball speed through thin rings | Radial-coordinate continuous collision check (solve crossing time analytically), not per-frame overlap tests. |
| Sim stalls (ball trapped bouncing forever below a gap) | Speed floor + restitution ≥ 1 option; Randomize bounds tuned so generated configs stay lively. |
| Glow effects tank fps (shadowBlur is slow) | Pre-rendered radial-gradient sprites + `lighter` composite instead of shadowBlur; particle budget. |
| Settings sprawl makes the panel unusable | Schema-driven grouping/collapsing; presets as the primary entry point, sliders as refinement. |

## 5. Suggested review checkpoints

1. ~~This plan + requirements~~ — **reviewed 2026-07-05**; decisions recorded in REQUIREMENTS §5.
2. **End of Phase 1** — feel of the core sim (gravity/bounce tuning is taste).
3. **End of Phase 3** — visual/audio match vs the reference clip.
4. **End of Phase 4** — v1.0 acceptance & deploy.
