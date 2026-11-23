/**
 * Sons sintetizados com Web Audio (sem arquivos). No iPhone o áudio só toca
 * depois de um toque do usuário, por isso destravamos no primeiro toque.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  // um "silêncio" curto destrava o áudio no iOS
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.18) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const NOTE = (semi: number) => 523.25 * Math.pow(2, semi / 12); // a partir do Dó5

export type SoundName = 'check' | 'combo' | 'undo' | 'room' | 'fanfare' | 'record' | 'mission' | 'alarm' | 'tap';

export function play(name: SoundName, level = 0) {
  if (!enabled) return;
  switch (name) {
    case 'tap':
      tone(NOTE(12), 0, 0.05, 'triangle', 0.06);
      break;
    case 'check':
      tone(NOTE(7), 0, 0.09, 'triangle', 0.14);
      tone(NOTE(12), 0.06, 0.16, 'triangle', 0.14);
      break;
    case 'combo': {
      const base = Math.min(level, 6) * 2;
      tone(NOTE(7 + base), 0, 0.08, 'square', 0.06);
      tone(NOTE(12 + base), 0.06, 0.18, 'triangle', 0.14);
      break;
    }
    case 'undo':
      tone(NOTE(4), 0, 0.08, 'triangle', 0.08);
      tone(NOTE(0), 0.05, 0.12, 'triangle', 0.08);
      break;
    case 'mission':
      [0, 4, 7].forEach((s, i) => tone(NOTE(s + 7), i * 0.07, 0.18, 'triangle', 0.13));
      break;
    case 'room':
      [0, 4, 7, 12].forEach((s, i) => tone(NOTE(s), i * 0.08, 0.22, 'triangle', 0.14));
      break;
    case 'record':
      [12, 16, 19, 24].forEach((s, i) => tone(NOTE(s), i * 0.06, 0.25, 'sine', 0.12));
      break;
    case 'fanfare':
      [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(NOTE(s), i * 0.11, i === 6 ? 0.6 : 0.16, 'triangle', 0.15));
      break;
    case 'alarm':
      [0, 0.3, 0.6].forEach((t) => tone(NOTE(12), t, 0.2, 'square', 0.08));
      break;
  }
}
