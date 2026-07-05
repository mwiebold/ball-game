import type { Settings } from '../core/types';
import { GROUPS, SCHEMA, type Control } from '../config/schema';

export interface PanelCallbacks {
  /** A live setting changed — no rebuild needed. */
  onLiveChange: () => void;
  /** A structural setting changed — rebuild the world from the seed. */
  onStructuralChange: () => void;
  onPreset: (name: string) => void;
  onRandomize: () => void;
  onShare: () => void;
  onRestart: () => void;
}

/**
 * The settings panel, generated entirely from SCHEMA. It mutates the shared
 * `settings` object in place (the same object the World reads) and notifies the
 * host whether the change was live or structural. Preset/Randomize/Share flows
 * are owned by the host, which mutates `settings` then calls `refresh()`.
 */
export class Panel {
  private readonly inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  private readonly readouts = new Map<string, HTMLElement>();

  constructor(
    root: HTMLElement,
    private readonly settings: Settings,
    private readonly cb: PanelCallbacks,
    presetNames: readonly string[],
  ) {
    root.innerHTML = '';
    root.appendChild(this.buildHeader(presetNames));
    for (const group of GROUPS) {
      root.appendChild(this.buildGroup(group));
    }
    this.refresh();
  }

  /** Re-read every control's value from `settings` (after preset/randomize/share). */
  refresh(): void {
    for (const control of SCHEMA) {
      const input = this.inputs.get(control.key);
      if (!input) continue;
      const value = this.settings[control.key];
      if (control.kind === 'toggle' && input instanceof HTMLInputElement) {
        input.checked = Boolean(value);
      } else {
        input.value = String(value);
      }
      this.updateReadout(control, value);
    }
  }

  /** Flash a transient status message (e.g. "Link copied"). */
  flashStatus(message: string): void {
    const el = document.getElementById('panel-status');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    window.setTimeout(() => el.classList.remove('visible'), 1600);
  }

  private buildHeader(presetNames: readonly string[]): HTMLElement {
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('h1');
    title.textContent = 'Ball Escape Studio';
    header.appendChild(title);

    // Preset dropdown.
    const presetRow = document.createElement('label');
    presetRow.className = 'preset-row';
    presetRow.textContent = 'Preset';
    const select = document.createElement('select');
    for (const name of presetNames) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => this.cb.onPreset(select.value));
    presetRow.appendChild(select);
    header.appendChild(presetRow);

    // Action buttons.
    const actions = document.createElement('div');
    actions.className = 'panel-actions';
    actions.appendChild(this.button('🎲 Randomize', () => this.cb.onRandomize()));
    actions.appendChild(this.button('🔗 Share', () => this.cb.onShare()));
    actions.appendChild(this.button('↻ Replay', () => this.cb.onRestart()));
    header.appendChild(actions);

    const status = document.createElement('div');
    status.id = 'panel-status';
    status.className = 'panel-status';
    header.appendChild(status);

    return header;
  }

  private buildGroup(group: string): HTMLElement {
    const section = document.createElement('section');
    section.className = 'panel-group';
    const h = document.createElement('h2');
    h.textContent = group;
    section.appendChild(h);

    for (const control of SCHEMA.filter((c) => c.group === group)) {
      section.appendChild(this.buildControl(control));
    }
    return section;
  }

  private buildControl(control: Control): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'control';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';
    const label = document.createElement('span');
    label.textContent = control.label;
    labelRow.appendChild(label);

    if (control.kind === 'range' || control.kind === 'int') {
      const readout = document.createElement('span');
      readout.className = 'control-value';
      this.readouts.set(control.key, readout);
      labelRow.appendChild(readout);
    }
    wrap.appendChild(labelRow);

    let input: HTMLInputElement | HTMLSelectElement;
    if (control.kind === 'select') {
      const sel = document.createElement('select');
      for (const opt of control.options) {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        sel.appendChild(o);
      }
      input = sel;
    } else if (control.kind === 'text') {
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = control.maxLength;
      input = inp;
    } else if (control.kind === 'toggle') {
      const inp = document.createElement('input');
      inp.type = 'checkbox';
      wrap.classList.add('control-toggle');
      input = inp;
    } else {
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = String(control.min);
      inp.max = String(control.max);
      inp.step = String(control.step);
      input = inp;
    }

    const eventName = control.kind === 'toggle' || control.kind === 'select' ? 'change' : 'input';
    input.addEventListener(eventName, () => this.applyChange(control, input));
    this.inputs.set(control.key, input);
    wrap.appendChild(input);
    return wrap;
  }

  private applyChange(control: Control, input: HTMLInputElement | HTMLSelectElement): void {
    let value: number | string | boolean = input.value;
    if (control.kind === 'range') value = parseFloat(input.value);
    else if (control.kind === 'int') value = Math.round(parseFloat(input.value));
    else if (control.kind === 'toggle')
      value = input instanceof HTMLInputElement ? input.checked : false;

    // The schema guarantees the key/kind pairing, so this write is sound.
    (this.settings as unknown as Record<string, unknown>)[control.key] = value;
    this.updateReadout(control, value);

    if (control.live) this.cb.onLiveChange();
    else this.cb.onStructuralChange();
  }

  private updateReadout(control: Control, value: unknown): void {
    const readout = this.readouts.get(control.key);
    if (!readout) return;
    if (control.kind === 'range') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      readout.textContent = control.step < 1 ? num.toFixed(2) : String(num);
    } else if (control.kind === 'int') {
      readout.textContent = String(value);
    }
  }

  private button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }
}
