import './style.css';
import { GameLoop } from './core/loop';
import { World, STEP_SECONDS } from './core/sim';
import { DEFAULT_SETTINGS } from './core/settings';
import { Rng } from './core/rng';
import { Renderer } from './render/renderer';
import { Panel } from './ui/panel';
import { PRESETS, presetByName } from './config/presets';
import { randomizeSettings } from './config/randomize';
import { buildShareUrl, settingsFromHash } from './config/share';

/**
 * Phase 2 entry point: wires the sim + renderer to the schema-driven settings
 * panel, presets, seeded Randomize, and share-by-URL. The `settings` object is
 * the single source of truth — the World reads it, the Panel mutates it, and
 * preset/randomize/share flows replace or serialize it.
 */

const ASPECT = 9 / 16;

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const panelEl = document.querySelector<HTMLElement>('#panel');
if (!canvas) throw new Error('#game canvas not found');
if (!panelEl) throw new Error('#panel not found');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context unavailable');

function resize(): void {
  if (!canvas || !ctx) return;
  const stage = canvas.parentElement;
  if (!stage) return;

  const availH = stage.clientHeight;
  const availW = stage.clientWidth;
  let cssH = availH;
  let cssW = cssH * ASPECT;
  if (cssW > availW) {
    cssW = availW;
    cssH = cssW / ASPECT;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

// Initial settings: from a shared URL hash if present, else defaults.
const settings = settingsFromHash(window.location.hash) ?? { ...DEFAULT_SETTINGS };

const world = new World(settings);
const renderer = new Renderer();

function rebuild(): void {
  world.reset();
  renderer.reset();
}

function loadSettings(next: typeof settings): void {
  Object.assign(settings, next);
  rebuild();
  panel.refresh();
}

async function share(): Promise<void> {
  const base = window.location.href.split('#')[0] ?? window.location.href;
  const url = buildShareUrl(settings, base);
  window.history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url);
    panel.flashStatus('Link copied to clipboard');
  } catch {
    panel.flashStatus('Link is in the address bar');
  }
}

const panel = new Panel(
  panelEl,
  settings,
  {
    onLiveChange: () => {
      // The sim reads live settings every step; nothing to rebuild.
    },
    onStructuralChange: rebuild,
    onPreset: (name) => {
      const preset = presetByName(name);
      if (preset) loadSettings(preset.settings);
    },
    onRandomize: () => {
      const metaSeed = Math.floor(Math.random() * 1_000_000);
      loadSettings(randomizeSettings(new Rng(metaSeed)));
    },
    onShare: () => void share(),
    onRestart: rebuild,
  },
  PRESETS.map((p) => p.name),
);

// Restart a finished run by clicking the canvas or pressing R.
canvas.addEventListener('pointerdown', () => {
  if (!world.isPlaying) rebuild();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') rebuild();
});

resize();
window.addEventListener('resize', resize);

const loop = new GameLoop({
  stepSeconds: STEP_SECONDS,
  step: () => {
    world.step();
  },
  render: () => {
    renderer.draw(ctx, world);
  },
});

loop.start();
