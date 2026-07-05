import type { MelodyName } from '../core/types';

/**
 * Bundled melody sequences for melody mode (REQUIREMENTS S-34). Each bounce
 * plays the next note; the sequence loops. Notes are semitone offsets from a
 * base note (see MELODY_BASE_FREQ in the synth). All tunes are public-domain or
 * plain scales/arpeggios — no copyrighted material.
 */
export interface Melody {
  name: MelodyName;
  label: string;
  notes: number[];
}

export const MELODIES: readonly Melody[] = [
  { name: 'twinkle', label: 'Twinkle Twinkle', notes: [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0] },
  { name: 'ode', label: 'Ode to Joy', notes: [4, 4, 5, 7, 7, 5, 4, 2, 0, 0, 2, 4, 4, 2, 2] },
  { name: 'frere', label: 'Frère Jacques', notes: [0, 2, 4, 0, 0, 2, 4, 0, 4, 5, 7, 4, 5, 7] },
  { name: 'scale', label: 'Major scale', notes: [0, 2, 4, 5, 7, 9, 11, 12] },
  { name: 'arp', label: 'Arpeggio', notes: [0, 4, 7, 12, 7, 4] },
];

export function melodyByName(name: MelodyName): Melody {
  return MELODIES.find((m) => m.name === name) ?? MELODIES[0]!;
}
