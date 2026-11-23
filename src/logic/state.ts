import { BASE_TASKS } from '../data/content';
import type { TaskDef } from '../data/types';

export interface Check {
  at: number;
  xp: number;
}

export interface Consolidation {
  /** Dia (AAAA-MM-DD) em que consolidou; vazio para pré-consolidadas */
  day: string;
  /** Marcada manualmente com "Já faço sempre" (sem XP) */
  manual?: boolean;
  xp?: number;
}

export interface RaidState {
  elapsedMs: number;
  runningSince: number | null;
  combo: number;
  lastCheckAt: number | null;
  /** cômodos que já renderam o bônus de 100% (XP concedido) */
  rooms: Record<string, number>;
  completeXp: number;
  finishedMs: number | null;
  secret?: string[];
}

export interface Override {
  enabled?: boolean;
  name?: string;
}

export interface AppState {
  version: 1;
  xp: number;
  /** periodKey (d:/w:/r:) -> taskId -> marcação */
  checks: Record<string, Record<string, Check>>;
  /** execuções por tarefa (consolidação) */
  counts: Record<string, number>;
  consolidated: Record<string, Consolidation>;
  /** radar: taskId -> data (AAAA-MM-DD) da última vez */
  radarDone: Record<string, string>;
  /** radar: valor anterior para desfazer no mesmo dia */
  radarPrev: Record<string, { prev: string | null; day: string; xp: number }>;
  overrides: Record<string, Override>;
  custom: TaskDef[];
  /** dia -> sequência contou */
  dayLog: Record<string, boolean>;
  raids: Record<string, RaidState>;
  bestRaidMs: number | null;
  laundryWeeks: Record<string, number>;
  achievements: Record<string, string>;
  maxCombo: number;
  ui: { installDismissed?: boolean };
}

export function initialState(): AppState {
  const consolidated: Record<string, Consolidation> = {};
  for (const t of BASE_TASKS) if (t.preConsolidated) consolidated[t.id] = { day: '', manual: true };
  return {
    version: 1,
    xp: 0,
    checks: {},
    counts: {},
    consolidated,
    radarDone: {},
    radarPrev: {},
    overrides: {},
    custom: [],
    dayLog: {},
    raids: {},
    bestRaidMs: null,
    laundryWeeks: {},
    achievements: {},
    maxCombo: 0,
    ui: {},
  };
}

export function emptyRaid(): RaidState {
  return { elapsedMs: 0, runningSince: null, combo: 0, lastCheckAt: null, rooms: {}, completeXp: 0, finishedMs: null };
}

/** Garante que um JSON importado tenha todos os campos. */
export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido');
  const r = raw as Partial<AppState>;
  if (r.version !== 1) throw new Error('Versão de backup desconhecida');
  const base = initialState();
  const s: AppState = { ...base, ...r, ui: { ...base.ui, ...(r.ui ?? {}) } } as AppState;
  if (typeof s.xp !== 'number' || !isFinite(s.xp)) s.xp = 0;
  if (!Array.isArray(s.custom)) s.custom = [];
  s.custom = s.custom
    .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
    .map((t) => ({ ...t, custom: true, name: String(t.name).slice(0, 90), tip: t.tip ? String(t.tip).slice(0, 200) : undefined }));
  return s;
}
