import type { Settings } from '../core/types';
import { GROUPS, SCHEMA, type Control } from '../config/schema';

export interface PanelCallbacks {
  /** A live setting changed — no rebuild needed. */
  onLiveChange: () => void;
  /** A structural setting changed — rebuild the world from the seed. */
  onStructuralChange: () => void;
  /** A bundled ("b:name") or user ("u:name") preset was selected. */
  onPreset: (value: string) => void;
  onRandomize: () => void;
  onShare: () => void;
  onRestart: () => void;
  onSavePreset: () => void;
  onDeletePreset: (value: string) => void;
  onExport: () => void;
  onImportText: (text: string) => void;
}

/**
 * The settings panel, generated entirely from SCHEMA. It mutates the shared
 * `settings` object in place (the same object the World reads) and notifies the
 * host whether the change was live or structural. Preset/Randomize/Share/import
 * flows are owned by the host, which mutates `settings` then calls `refresh()`.
 *
 * Controls are built with associated <label for> elements and the panel exposes
 * proper labels/roles for keyboard and screen-reader use.
 */
export class Panel {
  private readonly inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();
  private readonly readouts = new Map<string, HTMLElement>();
  private presetSelect!: HTMLSelectElement;
  private fileInput!: HTMLInputElement;

  constructor(
    root: HTMLElement,
    private readonly settings: Settings,
    private readonly cb: PanelCallbacks,
    private readonly bundledNames: readonly string[],
    userNames: readonly string[],
  ) {
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Game settings');
    root.innerHTML = '';
    root.appendChild(this.buildHeader());
    for (const group of GROUPS) {
      root.appendChild(this.buildGroup(group));
    }
    this.refreshPresets(userNames);
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

  /** Rebuild the preset dropdown from bundled + user preset names. */
  refreshPresets(userNames: readonly string[]): void {
    this.presetSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a preset…';
    placeholder.disabled = true;
    placeholder.selected = true;
    this.presetSelect.appendChild(placeholder);

    const bundled = document.createElement('optgroup');
    bundled.label = 'Presets';
    for (const name of this.bundledNames) {
      bundled.appendChild(this.presetOption(`b:${name}`, name));
    }
    this.presetSelect.appendChild(bundled);

    if (userNames.length > 0) {
      const mine = document.createElement('optgroup');
      mine.label = 'My presets';
      for (const name of userNames) {
        mine.appendChild(this.presetOption(`u:${name}`, name));
      }
      this.presetSelect.appendChild(mine);
    }
  }

  /** Flash a transient status message (e.g. "Link copied"). */
  flashStatus(message: string): void {
    const el = document.getElementById('panel-status');
    if (!el) return;
    el.textContent = message;
    el.classList.add('visible');
    window.setTimeout(() => el.classList.remove('visible'), 1800);
  }

  private presetOption(value: string, label: string): HTMLOptionElement {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('h1');
    title.textContent = 'Ball Escape Studio';
    header.appendChild(title);

    // Preset dropdown + delete.
    const presetRow = document.createElement('div');
    presetRow.className = 'preset-row';
    const presetLabel = document.createElement('label');
    presetLabel.htmlFor = 'preset-select';
    presetLabel.textContent = 'Preset';
    presetRow.appendChild(presetLabel);

    const selectWrap = document.createElement('div');
    selectWrap.className = 'preset-select-wrap';
    this.presetSelect = document.createElement('select');
    this.presetSelect.id = 'preset-select';
    this.presetSelect.addEventListener('change', () => {
      if (this.presetSelect.value) this.cb.onPreset(this.presetSelect.value);
    });
    selectWrap.appendChild(this.presetSelect);
    selectWrap.appendChild(
      this.button('🗑', 'Delete selected user preset', () =>
        this.cb.onDeletePreset(this.presetSelect.value),
      ),
    );
    presetRow.appendChild(selectWrap);
    header.appendChild(presetRow);

    // Action buttons, two rows.
    const actions1 = document.createElement('div');
    actions1.className = 'panel-actions';
    actions1.appendChild(
      this.button('🎲 Randomize', 'Randomize settings', () => this.cb.onRandomize()),
    );
    actions1.appendChild(this.button('🔗 Share', 'Copy a shareable link', () => this.cb.onShare()));
    actions1.appendChild(this.button('↻ Replay', 'Restart the run', () => this.cb.onRestart()));
    header.appendChild(actions1);

    const actions2 = document.createElement('div');
    actions2.className = 'panel-actions';
    actions2.appendChild(
      this.button('💾 Save', 'Save current settings as a preset', () => this.cb.onSavePreset()),
    );
    actions2.appendChild(
      this.button('⬇ Export', 'Download settings as JSON', () => this.cb.onExport()),
    );
    actions2.appendChild(
      this.button('⬆ Import', 'Import settings from a JSON file', () => this.fileInput.click()),
    );
    header.appendChild(actions2);

    // Hidden file input for Import.
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = 'application/json,.json';
    this.fileInput.style.display = 'none';
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;
      void file.text().then((text) => this.cb.onImportText(text));
      this.fileInput.value = '';
    });
    header.appendChild(this.fileInput);

    const status = document.createElement('div');
    status.id = 'panel-status';
    status.className = 'panel-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
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
    const id = `ctrl-${control.key}`;
    const wrap = document.createElement('div');
    wrap.className = 'control';

    const input = this.buildInput(control, id);

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = control.label;
    labelRow.appendChild(label);

    if (control.kind === 'range' || control.kind === 'int') {
      const readout = document.createElement('span');
      readout.className = 'control-value';
      this.readouts.set(control.key, readout);
      labelRow.appendChild(readout);
    }

    if (control.kind === 'toggle') {
      // Label and checkbox share one row.
      wrap.classList.add('control-toggle');
      wrap.appendChild(labelRow);
      wrap.appendChild(input);
    } else {
      wrap.appendChild(labelRow);
      wrap.appendChild(input);
    }
    return wrap;
  }

  private buildInput(control: Control, id: string): HTMLInputElement | HTMLSelectElement {
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
      input = inp;
    } else {
      const inp = document.createElement('input');
      inp.type = 'range';
      inp.min = String(control.min);
      inp.max = String(control.max);
      inp.step = String(control.step);
      input = inp;
    }
    input.id = id;

    const eventName = control.kind === 'toggle' || control.kind === 'select' ? 'change' : 'input';
    input.addEventListener(eventName, () => this.applyChange(control, input));
    this.inputs.set(control.key, input);
    return input;
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

  private button(text: string, ariaLabel: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.setAttribute('aria-label', ariaLabel);
    b.title = ariaLabel;
    b.addEventListener('click', onClick);
    return b;
  }
}
