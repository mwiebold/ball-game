import './style.css';
import { GameLoop } from './core/loop';
import { World, STEP_SECONDS } from './core/sim';
import { DEFAULT_SETTINGS } from './core/settings';
import { Rng } from './core/rng';
import { Renderer } from './render/renderer';
import { Synth } from './audio/synth';
import { Panel } from './ui/panel';
import { PRESETS, presetByName } from './config/presets';
import { randomizeSettings } from './config/randomize';
import { buildShareUrl, settingsFromHash, settingsFromJson, settingsToJson } from './config/share';
import { UserPresetStore } from './config/userPresets';

/**
 * App entry point: wires the sim, renderer, and audio to the schema-driven
 * settings panel, presets (bundled + user), Randomize, share-by-URL, JSON
 * import/export, and the mobile drawer. The `settings` object is the single
 * source of truth — the World reads it, the Panel mutates it, and
 * preset/randomize/share/import flows replace or serialize it.
 */

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

  // Fit a box of the world's aspect ratio inside the available stage area.
  const ratio = world.width / world.height;
  const availH = stage.clientHeight;
  const availW = stage.clientWidth;
  let cssH = availH;
  let cssW = cssH * ratio;
  if (cssW > availW) {
    cssW = availW;
    cssH = cssW / ratio;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
}

/** localStorage if usable (some browsers throw on access in private mode). */
function safeLocalStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const probe = '__ballEscapeProbe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

// Initial settings: from a shared URL hash if present, else defaults.
const settings = settingsFromHash(window.location.hash) ?? { ...DEFAULT_SETTINGS };

const world = new World(settings);
const renderer = new Renderer();
const synth = new Synth();
const userPresets = new UserPresetStore(safeLocalStorage());

function rebuild(): void {
  world.reset();
  renderer.reset();
  synth.resetMelody();
  // The aspect ratio may have changed, so re-fit the canvas.
  resize();
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

/** Resolve "b:Name" | "u:Name" to its settings. */
function settingsForPresetValue(value: string): typeof settings | null {
  const [kind, ...rest] = value.split(':');
  const name = rest.join(':');
  if (kind === 'b') return presetByName(name)?.settings ?? null;
  if (kind === 'u') return userPresets.list().find((p) => p.name === name)?.settings ?? null;
  return null;
}

function refreshPresetList(): void {
  panel.refreshPresets(userPresets.list().map((p) => p.name));
}

function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const panel = new Panel(
  panelEl,
  settings,
  {
    onLiveChange: () => {
      // The sim reads live settings every step; nothing to rebuild.
    },
    onStructuralChange: rebuild,
    onPreset: (value) => {
      const next = settingsForPresetValue(value);
      if (next) loadSettings(next);
    },
    onRandomize: () => {
      const metaSeed = Math.floor(Math.random() * 1_000_000);
      loadSettings(randomizeSettings(new Rng(metaSeed)));
    },
    onShare: () => void share(),
    onRestart: rebuild,
    onSavePreset: () => {
      const name = window.prompt('Save preset as:');
      if (name === null) return;
      if (userPresets.save(name, { ...settings })) {
        refreshPresetList();
        panel.flashStatus(`Saved "${name.trim()}"`);
      } else {
        panel.flashStatus('Enter a preset name');
      }
    },
    onDeletePreset: (value) => {
      const [kind, ...rest] = value.split(':');
      if (kind !== 'u') {
        panel.flashStatus('Select one of your presets to delete');
        return;
      }
      const name = rest.join(':');
      userPresets.remove(name);
      refreshPresetList();
      panel.flashStatus(`Deleted "${name}"`);
    },
    onExport: () => {
      downloadJson('ball-escape-preset.json', settingsToJson(settings));
      panel.flashStatus('Exported settings JSON');
    },
    onImportText: (text) => {
      const imported = settingsFromJson(text);
      if (imported) {
        loadSettings(imported);
        panel.flashStatus('Imported settings');
      } else {
        panel.flashStatus('Invalid settings file');
      }
    },
    onClose: () => setPanelOpen(false),
  },
  PRESETS.map((p) => p.name),
  userPresets.list().map((p) => p.name),
);

// Mobile: the settings panel is a slide-in drawer with a backdrop.
const panelToggle = document.querySelector<HTMLButtonElement>('#panel-toggle');
const panelBackdrop = document.querySelector<HTMLElement>('#panel-backdrop');

function setPanelOpen(open: boolean): void {
  document.body.classList.toggle('panel-open', open);
  panelToggle?.setAttribute('aria-expanded', String(open));
  if (panelBackdrop) panelBackdrop.hidden = !open;
}

panelToggle?.addEventListener('click', () => {
  setPanelOpen(!document.body.classList.contains('panel-open'));
});
panelBackdrop?.addEventListener('click', () => setPanelOpen(false));
// Close the drawer with Escape.
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('panel-open')) setPanelOpen(false);
});

// Unlock audio on the first user gesture (browser autoplay policy, N-6).
function unlockAudio(): void {
  synth.unlock();
}
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

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
    const events = world.step();
    for (const event of events) {
      renderer.handleEvent(event, world);
      synth.handle(event, settings);
    }
  },
  render: (frameSeconds) => {
    renderer.draw(ctx, world, frameSeconds);
  },
});

loop.start();
