/** Events emitted by the simulation each step, consumed by render/audio. */

export type SimEvent =
  | { type: 'bounce'; x: number; y: number; speed: number; ringIndex: number }
  | { type: 'ringBreak'; x: number; y: number; ringIndex: number }
  | { type: 'win'; timeSeconds: number }
  | { type: 'lose'; ringsRemaining: number };
