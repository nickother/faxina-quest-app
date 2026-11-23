import { BASE_TASKS, DEFAULT_PRODUCTS } from '../data/content';
import type { TaskDef } from '../data/types';
import { weekKey, parseYmd } from './period';

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
  /** primeira tarefa marcada em cada cômodo (para o recorde por cômodo) */
  roomStart: Record<string, number>;
  completeXp: number;
  finishedMs: number | null;
  /** maior bônus de combo nesta raid */
  maxBonus: number;
  secret?: string[];
}

export interface Override {
  enabled?: boolean;
  name?: string;
  /** excluída: some do app e do editor (pode ser restaurada) */
  deleted?: boolean;
  tip?: string;
  when?: 'manha' | 'noite';
  days?: number[];
  phase?: string;
  every?: number;
}

/** true = dia contou; 'freeze' = salvo por congelamento; 'vacation' = férias */
export type DayMark = boolean | 'freeze' | 'vacation';

export interface QuickSession {
  startedAt: number;
  taskIds: string[];
  finishedAt: number | null;
  xp: number;
}

export interface CustomRoom {
  id: string;
  name: string;
  emoji: string;
}

export type ProductStatus = 'ok' | 'low' | 'out';
export interface Product {
  id: string;
  name: string;
  status: ProductStatus;
  custom?: boolean;
}

export interface Settings {
  /** 0 = domingo ... 6 = sábado */
  raidDay: number;
  sound: boolean;
  mascotName: string;
  mascotColor: string;
  onboarded: boolean;
}

export interface Records {
  /** cômodo -> menor tempo (ms) entre a primeira e a última tarefa */
  roomMs: Record<string, number>;
  longestStreak: number;
  /** semana em que já avisamos "melhor semana" */
  weekNotified: string | null;
  /** início da sequência em que já avisamos "maior sequência" */
  streakNotified: string | null;
}

export interface AppState {
  version: 1;
  xp: number;
  /** XP ganho por dia (para o histórico) */
  xpByDay: Record<string, number>;
  /** periodKey (d:/w:/r:) -> taskId -> marcação */
  checks: Record<string, Record<string, Check>>;
  /** execuções por tarefa (consolidação) */
  counts: Record<string, number>;
  consolidated: Record<string, Consolidation>;
  /** radar: taskId -> data (AAAA-MM-DD) da última vez */
  radarDone: Record<string, string>;
  /** radar: valor anterior para desfazer no mesmo dia */
  radarPrev: Record<string, { prev: string | null; day: string; xp: number }>;
  /** radar: dia -> ids feitos naquele dia */
  radarLog: Record<string, string[]>;
  overrides: Record<string, Override>;
  custom: TaskDef[];
  /** dia -> sequência */
  dayLog: Record<string, DayMark>;
  freezes: number;
  /** dia em que ganhou o último congelamento (para desfazer no mesmo dia) */
  freezeEarnedOn: string | null;
  /** último dia já conferido para congelamento/férias */
  reconciledUntil: string | null;
  vacation: { from: string; to: string | null } | null;
  raids: Record<string, RaidState>;
  bestRaidMs: number | null;
  laundryWeeks: Record<string, number>;
  achievements: Record<string, string>;
  maxCombo: number;
  /** missão (d:AAAA-MM-DD:id ou w:AAAA-MM-DD:id) -> XP concedido */
  missions: Record<string, number>;
  /** missões sorteadas: d:AAAA-MM-DD ou w:AAAA-MM-DD -> ids (fixas durante o período) */
  missionPicks: Record<string, string[]>;
  /** medalhas mensais: AAAA-MM -> dia em que ganhou */
  medals: Record<string, string>;
  records: Records;
  quick: Record<string, QuickSession>;
  rooms: { custom: CustomRoom[]; names: Record<string, string>; hidden: Record<string, boolean> };
  products: Product[];
  settings: Settings;
  ui: { installDismissed?: boolean };
}

export const MASCOT_COLORS = ['#ffc43d', '#5ec8f2', '#ff8fa3', '#7ed6a5', '#b39cff'];
export const MAX_FREEZES = 2;

export function initialState(): AppState {
  const consolidated: Record<string, Consolidation> = {};
  for (const t of BASE_TASKS) if (t.preConsolidated) consolidated[t.id] = { day: '', manual: true };
  return {
    version: 1,
    xp: 0,
    xpByDay: {},
    checks: {},
    counts: {},
    consolidated,
    radarDone: {},
    radarPrev: {},
    radarLog: {},
    overrides: {},
    custom: [],
    dayLog: {},
    freezes: 1,
    freezeEarnedOn: null,
    reconciledUntil: null,
    vacation: null,
    raids: {},
    bestRaidMs: null,
    laundryWeeks: {},
    achievements: {},
    maxCombo: 0,
    missions: {},
    missionPicks: {},
    medals: {},
    records: { roomMs: {}, longestStreak: 0, weekNotified: null, streakNotified: null },
    quick: {},
    rooms: { custom: [], names: {}, hidden: {} },
    products: DEFAULT_PRODUCTS.map((name, i) => ({ id: `p${i}`, name, status: 'ok' as const })),
    settings: { raidDay: 5, sound: true, mascotName: 'Esponjito', mascotColor: MASCOT_COLORS[0], onboarded: false },
    ui: {},
  };
}

export function emptyRaid(): RaidState {
  return { elapsedMs: 0, runningSince: null, combo: 0, lastCheckAt: null, rooms: {}, roomStart: {}, completeXp: 0, finishedMs: null, maxBonus: 0 };
}

/** Garante que um JSON salvo ou importado tenha todos os campos (e migra versões antigas). */
export function normalizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') throw new Error('Arquivo inválido');
  const r = raw as Partial<AppState>;
  if (r.version !== 1) throw new Error('Versão de backup desconhecida');
  const base = initialState();
  const isOldUser = !r.settings && ((r.xp ?? 0) > 0 || Object.keys(r.counts ?? {}).length > 0);
  const s: AppState = {
    ...base,
    ...r,
    settings: { ...base.settings, ...(r.settings ?? {}), ...(isOldUser ? { onboarded: true } : {}) },
    records: { ...base.records, ...(r.records ?? {}) },
    rooms: { ...base.rooms, ...(r.rooms ?? {}) },
    ui: { ...base.ui, ...(r.ui ?? {}) },
  } as AppState;
  if (!Array.isArray(s.products)) s.products = base.products;
  if (typeof s.xp !== 'number' || !isFinite(s.xp)) s.xp = 0;
  if (!Array.isArray(s.custom)) s.custom = [];
  s.custom = s.custom
    .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string')
    .map((t) => ({ ...t, custom: true, name: String(t.name).slice(0, 90), tip: t.tip ? String(t.tip).slice(0, 200) : undefined }));

  // Migração: a raid era guardada pela data da sexta; agora é pela segunda da semana.
  const checks: AppState['checks'] = {};
  for (const [k, v] of Object.entries(s.checks ?? {})) {
    if (k.startsWith('r:')) {
      const nk = `r:${weekKey(parseYmd(k.slice(2)))}`;
      checks[nk] = { ...(checks[nk] ?? {}), ...v };
    } else checks[k] = v;
  }
  s.checks = checks;
  const raids: AppState['raids'] = {};
  for (const [k, v] of Object.entries(s.raids ?? {})) raids[weekKey(parseYmd(k))] = { ...emptyRaid(), ...v };
  s.raids = raids;
  return s;
}
