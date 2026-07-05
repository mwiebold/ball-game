import './style.css';
import { GameLoop } from './core/loop';

/**
 * Phase 0 scaffold entry point.
 *
 * Sets up the 9:16 canvas, a device-pixel-ratio-aware backing store, and a
 * fixed-timestep game loop that currently just clears the screen and draws an
 * FPS readout. Phase 1 replaces the update/render callbacks with the real sim.
 */

const ASPECT = 9 / 16; // width / height — portrait, matches the reference video

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('#game canvas not found');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('2D canvas context unavailable');

/** Resize the canvas backing store to its displayed size × devicePixelRatio. */
function resize(): void {
  if (!canvas || !ctx) return;
  const stage = canvas.parentElement;
  if (!stage) return;

  // Fit a 9:16 box inside the available stage area.
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

// --- Temporary Phase-0 content: FPS meter over a cleared black screen. ---

let fps = 0;
let fpsAccum = 0;
let fpsFrames = 0;

const loop = new GameLoop({
  // Fixed simulation step (60 Hz). Phase 1 will advance the world here.
  step: () => {},
  // Render runs once per animation frame with an interpolation alpha.
  render: (dtSeconds) => {
    fpsAccum += dtSeconds;
    fpsFrames += 1;
    if (fpsAccum >= 0.5) {
      fps = fpsFrames / fpsAccum;
      fpsAccum = 0;
      fpsFrames = 0;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const scale = h / 1600; // reference design height for consistent text size
    ctx.fillStyle = '#3a3a4a';
    ctx.font = `${Math.round(28 * scale)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Ball Escape Studio — Phase 0 scaffold', w / 2, h / 2);

    ctx.fillStyle = '#2a2a34';
    ctx.textAlign = 'left';
    ctx.font = `${Math.round(20 * scale)}px monospace`;
    ctx.fillText(`${fps.toFixed(0)} fps`, 12 * scale, 28 * scale);
  },
});

loop.start();
