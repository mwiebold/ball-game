import './style.css';
import { GameLoop } from './core/loop';
import { World, STEP_SECONDS } from './core/sim';
import { DEFAULT_SETTINGS } from './core/settings';
import { Renderer } from './render/renderer';

/**
 * Phase 1 entry point: wires the deterministic sim to the fixed-timestep loop
 * and the canvas renderer. Settings are hard-coded to DEFAULT_SETTINGS for now;
 * Phase 2 adds the live settings panel.
 */

const ASPECT = 9 / 16; // width / height — portrait, matches the reference video

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas not found');
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

resize();
window.addEventListener('resize', resize);

const world = new World(DEFAULT_SETTINGS);
const renderer = new Renderer();

function restart(): void {
  world.reset();
  renderer.reset();
}

// Restart when a finished run is clicked or R is pressed.
canvas.addEventListener('pointerdown', () => {
  if (!world.isPlaying) restart();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') restart();
});

const loop = new GameLoop({
  stepSeconds: STEP_SECONDS,
  step: () => {
    // Events are consumed here in later phases (audio, particles). Draining
    // them each step keeps the sim's event buffer from mattering to render.
    world.step();
  },
  render: () => {
    renderer.draw(ctx, world);
  },
});

loop.start();
