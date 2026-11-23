import { BASE_TASKS, PHASES, ROOM_IDS, TITLES } from '../data/content';
import type { PhaseId, TaskDef } from '../data/types';
import { addDays, daysBetween, dayKey, pk, raidKey } from './period';
import { emptyRaid, type AppState, type RaidState } from './state';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */
export const XP = {
  daily: 5,
  daily2: 8,
  consolidatedTask: 2,
  laundry: 15,
  raid: 10,
  radar: 25,
  room: 30,
  raidComplete: 100,
  laundryWeek: 30,
  consolidation: 50,
} as const;

export const CONSOLIDATE_AT = 15;
export const STREAK_RATIO = 0.7;
export const COMBO_WINDOW_MS = 4 * 60 * 1000;
export const COMBO_STEP = 2;
export const COMBO_MAX = 10;

/* ------------------------------------------------------------------ */
/* Nível                                                               */
/* ------------------------------------------------------------------ */
export const levelCost = (n: number) => 100 + 40 * n;

export function levelInfo(xp: number) {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (rest >= levelCost(level)) {
    rest -= levelCost(level);
    level++;
  }
  const need = levelCost(level);
  return { level, into: rest, need, pct: rest / need, title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
}

/* ------------------------------------------------------------------ */
/* Tarefas efetivas (base + criadas + ajustes do usuário)              */
/* ------------------------------------------------------------------ */
export interface Task extends TaskDef {
  enabled: boolean;
  originalName: string;
}

export function allTasks(s: AppState): Task[] {
  return [...BASE_TASKS, ...s.custom].map((t) => {
    const o = s.overrides[t.id] ?? {};
    return {
      ...t,
      originalName: t.name,
      name: o.name?.trim() ? o.name : t.name,
      enabled: o.enabled ?? !t.defaultOff,
    };
  });
}

export function taskMap(s: AppState): Map<string, Task> {
  return new Map(allTasks(s).map((t) => [t.id, t]));
}

export const isConsolidated = (s: AppState, id: string) => !!s.consolidated[id];

/** Rotina de nível 2 liberada: mãe consolidada, desligada ou inexistente. */
export function isUnlocked(s: AppState, t: TaskDef, map = taskMap(s)): boolean {
  if (!t.parent) return true;
  const parent = map.get(t.parent);
  if (!parent || !parent.enabled) return true;
  return isConsolidated(s, t.parent);
}

/** Tarefas visíveis (ligadas e liberadas). */
export function activeTasks(s: AppState): Task[] {
  const map = taskMap(s);
  return [...map.values()].filter((t) => t.enabled && isUnlocked(s, t, map));
}

export function periodKeyFor(t: TaskDef, now: Date): string {
  if (t.kind === 'laundry') return pk.week(now);
  if (t.kind === 'raid') return pk.raid(now);
  return pk.day(now);
}

export function isDone(s: AppState, t: TaskDef, now: Date): boolean {
  if (t.kind === 'radar') return s.radarDone[t.id] === dayKey(now);
  return !!s.checks[periodKeyFor(t, now)]?.[t.id];
}

/* ------------------------------------------------------------------ */
/* Sequência                                                           */
/* ------------------------------------------------------------------ */
export function dailyStreakStatus(s: AppState, now: Date) {
  const daily = activeTasks(s).filter((t) => t.kind === 'daily');
  const counting = daily.filter((t) => !isConsolidated(s, t.id));
  const done = counting.filter((t) => isDone(s, t, now)).length;
  const total = counting.length;
  const qualifies = total === 0 ? daily.some((t) => isDone(s, t, now)) : done / total >= STREAK_RATIO;
  return { done, total, qualifies, needed: Math.ceil(total * STREAK_RATIO) };
}

export function computeStreak(dayLog: Record<string, boolean>, now: Date): number {
  let d = now;
  if (!dayLog[dayKey(d)]) d = addDays(d, -1);
  let n = 0;
  while (dayLog[dayKey(d)]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Raid                                                                */
/* ------------------------------------------------------------------ */
export function raidTasks(s: AppState): Task[] {
  return activeTasks(s).filter((t) => t.kind === 'raid');
}

export function phaseProgress(s: AppState, phase: PhaseId, now: Date) {
  const tasks = raidTasks(s).filter((t) => t.phase === phase);
  const done = tasks.filter((t) => isDone(s, t, now)).length;
  return { tasks, done, total: tasks.length, pct: tasks.length ? done / tasks.length : 0, left: tasks.length - done };
}

export function houseProgress(s: AppState, now: Date) {
  const tasks = raidTasks(s);
  const done = tasks.filter((t) => isDone(s, t, now)).length;
  return { done, total: tasks.length, pct: tasks.length ? done / tasks.length : 0 };
}

export function currentPhase(s: AppState, now: Date): PhaseId | null {
  for (const p of PHASES) {
    const pr = phaseProgress(s, p.id, now);
    if (pr.left > 0) return p.id;
  }
  return null;
}

export function getRaid(s: AppState, now: Date): RaidState {
  return s.raids[raidKey(now)] ?? emptyRaid();
}

export function raidElapsed(r: RaidState, nowMs: number): number {
  return r.elapsedMs + (r.runningSince ? nowMs - r.runningSince : 0);
}

export function comboBonus(level: number) {
  return Math.min(level * COMBO_STEP, COMBO_MAX);
}

/* ------------------------------------------------------------------ */
/* Radar                                                               */
/* ------------------------------------------------------------------ */
export type RadarStatus = 'late' | 'soon' | 'ok';

export function radarInfo(s: AppState, t: TaskDef, now: Date) {
  const every = t.every ?? 30;
  const last = s.radarDone[t.id] ?? null;
  const today = dayKey(now);
  // nunca feito: mais urgente que qualquer atrasado, e os de frequência menor primeiro
  if (!last) return { last, since: null as number | null, dueIn: -Infinity, score: 1e6 / every, status: 'late' as RadarStatus, every };
  const since = daysBetween(last, today);
  const dueIn = every - since;
  const soonWindow = Math.max(3, Math.round(every * 0.2));
  const status: RadarStatus = dueIn < 0 ? 'late' : dueIn <= soonWindow ? 'soon' : 'ok';
  return { last, since, dueIn, score: since / every, status, every };
}

export function radarSorted(s: AppState, now: Date) {
  return activeTasks(s)
    .filter((t) => t.kind === 'radar')
    .map((t) => ({ task: t, ...radarInfo(s, t, now) }))
    .sort((a, b) => b.score - a.score || a.task.name.localeCompare(b.task.name));
}

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */
export type GameEvent =
  | { type: 'xp'; amount: number; label: string }
  | { type: 'tip'; taskId: string }
  | { type: 'consolidated'; taskId: string; unlocked: string[] }
  | { type: 'room'; room: PhaseId }
  | { type: 'raidComplete'; ms: number; record: boolean }
  | { type: 'laundryWeek' }
  | { type: 'levelUp'; level: number; title: string }
  | { type: 'achievement'; id: string };

interface Result {
  state: AppState;
  events: GameEvent[];
}

const clone = <T,>(v: T): T => structuredClone(v);

function addXp(s: AppState, amount: number) {
  s.xp = Math.max(0, s.xp + amount);
}

/** Marca/desmarca uma tarefa (diária, lavanderia ou raid). */
export function toggleTask(prev: AppState, taskId: string, now: Date): Result {
  const s = clone(prev);
  const events: GameEvent[] = [];
  const map = taskMap(s);
  const t = map.get(taskId);
  if (!t) return { state: prev, events };
  if (t.kind === 'radar') return toggleRadar(prev, taskId, now);

  const key = periodKeyFor(t, now);
  const bucket = (s.checks[key] ??= {});
  const today = dayKey(now);
  const levelBefore = levelInfo(s.xp).level;
  const nowMs = now.getTime();

  if (bucket[taskId]) {
    /* ---------- desmarcar ---------- */
    addXp(s, -bucket[taskId].xp);
    delete bucket[taskId];
    s.counts[taskId] = Math.max(0, (s.counts[taskId] ?? 0) - 1);
    const c = s.consolidated[taskId];
    if (c && !c.manual && c.day === today && s.counts[taskId] < CONSOLIDATE_AT) {
      addXp(s, -(c.xp ?? XP.consolidation));
      delete s.consolidated[taskId];
    }
    if (t.kind === 'raid') undoRaidBonuses(s, t, now);
    if (t.kind === 'laundry') updateLaundryWeek(s, now, events);
  } else {
    /* ---------- marcar ---------- */
    let base: number;
    if (isConsolidated(s, taskId)) base = XP.consolidatedTask;
    else if (t.kind === 'laundry') base = XP.laundry;
    else if (t.kind === 'raid') base = XP.raid;
    else base = t.parent ? XP.daily2 : XP.daily;

    let gained = base;
    if (t.kind === 'raid') {
      const rk = raidKey(now);
      const r = (s.raids[rk] ??= emptyRaid());
      if (r.lastCheckAt && nowMs - r.lastCheckAt < COMBO_WINDOW_MS) r.combo += 1;
      else r.combo = 0;
      r.lastCheckAt = nowMs;
      const bonus = comboBonus(r.combo);
      gained += bonus;
      s.maxCombo = Math.max(s.maxCombo, bonus);
      if (!r.runningSince && r.finishedMs == null) r.runningSince = nowMs;
    }
    bucket[taskId] = { at: nowMs, xp: gained };
    addXp(s, gained);
    events.push({ type: 'xp', amount: gained, label: t.name });
    events.push({ type: 'tip', taskId });

    s.counts[taskId] = (s.counts[taskId] ?? 0) + 1;
    if (!isConsolidated(s, taskId) && s.counts[taskId] >= CONSOLIDATE_AT) {
      s.consolidated[taskId] = { day: today, xp: XP.consolidation };
      addXp(s, XP.consolidation);
      const unlocked = [...map.values()].filter((x) => x.parent === taskId && x.enabled).map((x) => x.id);
      events.push({ type: 'consolidated', taskId, unlocked });
    }

    if (t.kind === 'raid') applyRaidBonuses(s, t, now, events);
    if (t.kind === 'laundry') updateLaundryWeek(s, now, events);
  }

  if (t.kind === 'daily') s.dayLog[today] = dailyStreakStatus(s, now).qualifies;

  finish(s, levelBefore, now, events);
  return { state: s, events };
}

function applyRaidBonuses(s: AppState, t: TaskDef, now: Date, events: GameEvent[]) {
  const r = (s.raids[raidKey(now)] ??= emptyRaid());
  const room = t.phase!;
  if ((ROOM_IDS as readonly string[]).includes(room) && !r.rooms[room]) {
    const p = phaseProgress(s, room, now);
    if (p.total > 0 && p.left === 0) {
      r.rooms[room] = XP.room;
      addXp(s, XP.room);
      events.push({ type: 'room', room });
    }
  }
  const h = houseProgress(s, now);
  if (!r.completeXp && h.total > 0 && h.done === h.total) {
    r.completeXp = XP.raidComplete;
    addXp(s, XP.raidComplete);
    const ms = raidElapsed(r, now.getTime());
    r.elapsedMs = ms;
    r.runningSince = null;
    r.finishedMs = ms;
    const record = ms > 0 && (s.bestRaidMs == null || ms < s.bestRaidMs);
    if (record) s.bestRaidMs = ms;
    events.push({ type: 'raidComplete', ms, record });
  }
}

function undoRaidBonuses(s: AppState, t: TaskDef, now: Date) {
  const r = s.raids[raidKey(now)];
  if (!r) return;
  const room = t.phase!;
  if (r.rooms[room]) {
    addXp(s, -r.rooms[room]);
    delete r.rooms[room];
  }
  if (r.completeXp) {
    addXp(s, -r.completeXp);
    r.completeXp = 0;
    r.finishedMs = null;
  }
}

function updateLaundryWeek(s: AppState, now: Date, events: GameEvent[]) {
  const wk = pk.week(now);
  const laundry = activeTasks(s).filter((t) => t.kind === 'laundry');
  const all = laundry.length > 0 && laundry.every((t) => s.checks[wk]?.[t.id]);
  const had = s.laundryWeeks[wk] ?? 0;
  if (all && !had) {
    s.laundryWeeks[wk] = XP.laundryWeek;
    addXp(s, XP.laundryWeek);
    events.push({ type: 'laundryWeek' });
  } else if (!all && had) {
    addXp(s, -had);
    delete s.laundryWeeks[wk];
  }
}

/** Radar: "Feito" registra a data de hoje. Tocar de novo no mesmo dia desfaz. */
export function toggleRadar(prev: AppState, taskId: string, now: Date): Result {
  const s = clone(prev);
  const events: GameEvent[] = [];
  const today = dayKey(now);
  const levelBefore = levelInfo(s.xp).level;
  const p = s.radarPrev[taskId];
  if (s.radarDone[taskId] === today && p && p.day === today) {
    if (p.prev) s.radarDone[taskId] = p.prev;
    else delete s.radarDone[taskId];
    addXp(s, -p.xp);
    delete s.radarPrev[taskId];
  } else if (s.radarDone[taskId] !== today) {
    s.radarPrev[taskId] = { prev: s.radarDone[taskId] ?? null, day: today, xp: XP.radar };
    s.radarDone[taskId] = today;
    addXp(s, XP.radar);
    const t = taskMap(s).get(taskId);
    events.push({ type: 'xp', amount: XP.radar, label: t?.name ?? '' });
    events.push({ type: 'tip', taskId });
  }
  finish(s, levelBefore, now, events);
  return { state: s, events };
}

/** "Já faço sempre": consolida manualmente (sem XP) ou desfaz. */
export function setAlwaysDo(prev: AppState, taskId: string, on: boolean, now: Date): AppState {
  const s = clone(prev);
  if (on) {
    if (!s.consolidated[taskId]) s.consolidated[taskId] = { day: dayKey(now), manual: true };
  } else {
    const c = s.consolidated[taskId];
    if (c) {
      if (!c.manual) addXp(s, -(c.xp ?? 0));
      delete s.consolidated[taskId];
      if ((s.counts[taskId] ?? 0) >= CONSOLIDATE_AT) s.counts[taskId] = CONSOLIDATE_AT - 1;
    }
  }
  s.dayLog[dayKey(now)] = dailyStreakStatus(s, now).qualifies;
  return s;
}

/* ------------------------------------------------------------------ */
/* Cronômetro                                                          */
/* ------------------------------------------------------------------ */
export function toggleTimer(prev: AppState, now: Date): AppState {
  const s = clone(prev);
  const r = (s.raids[raidKey(now)] ??= emptyRaid());
  const ms = now.getTime();
  if (r.runningSince) {
    r.elapsedMs += ms - r.runningSince;
    r.runningSince = null;
  } else if (r.finishedMs == null) {
    r.runningSince = ms;
  }
  return s;
}

export function resetTimer(prev: AppState, now: Date): AppState {
  const s = clone(prev);
  const r = (s.raids[raidKey(now)] ??= emptyRaid());
  r.elapsedMs = 0;
  r.runningSince = null;
  r.finishedMs = null;
  return s;
}

/* ------------------------------------------------------------------ */
/* Conquistas                                                          */
/* ------------------------------------------------------------------ */
export const ACHIEVEMENTS: { id: string; icon: string; name: string; desc: string; test: (s: AppState, now: Date) => boolean }[] = [
  { id: 'first', icon: '🌱', name: 'Primeiro passo', desc: 'Concluir a primeira tarefa.', test: (s) => Object.values(s.counts).some((n) => n > 0) || Object.keys(s.radarDone).length > 0 },
  { id: 'streak3', icon: '🔥', name: 'Embalou', desc: 'Sequência de 3 dias.', test: (s, n) => computeStreak(s.dayLog, n) >= 3 },
  { id: 'streak7', icon: '🔥', name: 'Semana perfeita', desc: 'Sequência de 7 dias.', test: (s, n) => computeStreak(s.dayLog, n) >= 7 },
  { id: 'streak30', icon: '🏆', name: 'Hábito de verdade', desc: 'Sequência de 30 dias.', test: (s, n) => computeStreak(s.dayLog, n) >= 30 },
  { id: 'room', icon: '🏠', name: 'Cômodo brilhando', desc: 'Deixar um cômodo 100% na raid.', test: (s) => Object.values(s.raids).some((r) => Object.keys(r.rooms).length > 0) },
  { id: 'raid', icon: '⚔️', name: 'Raid completa', desc: 'Terminar todas as tarefas de uma sexta.', test: (s) => Object.values(s.raids).some((r) => r.completeXp > 0) },
  { id: 'fast', icon: '⏱️', name: 'Raid relâmpago', desc: 'Raid completa em menos de 3 horas.', test: (s) => s.bestRaidMs != null && s.bestRaidMs < 3 * 3600000 },
  { id: 'combo', icon: '⚡', name: 'Combo máximo', desc: 'Chegar ao combo de +10 XP.', test: (s) => s.maxCombo >= COMBO_MAX },
  { id: 'laundry', icon: '🧺', name: 'Semana lavada', desc: 'Lavanderia de segunda a quinta completa.', test: (s) => Object.keys(s.laundryWeeks).length > 0 },
  { id: 'consolidated', icon: '🤖', name: 'Piloto automático', desc: 'Consolidar uma rotina (15 vezes).', test: (s) => Object.values(s.consolidated).some((c) => !c.manual) },
  { id: 'radar5', icon: '📡', name: 'Caçador de cantos', desc: 'Cuidar de 5 cantos do radar.', test: (s) => Object.keys(s.radarDone).length >= 5 },
  { id: 'level5', icon: '🧙', name: 'Mago do Multiuso', desc: 'Chegar ao nível 5.', test: (s) => levelInfo(s.xp).level >= 5 },
];

function finish(s: AppState, levelBefore: number, now: Date, events: GameEvent[]) {
  const li = levelInfo(s.xp);
  if (li.level > levelBefore) events.push({ type: 'levelUp', level: li.level, title: li.title });
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.test(s, now)) {
      s.achievements[a.id] = dayKey(now);
      events.push({ type: 'achievement', id: a.id });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Missões secretas: os 2 cantos mais atrasados do radar               */
/* ------------------------------------------------------------------ */
export function secretMissions(s: AppState, now: Date): string[] {
  const r = s.raids[raidKey(now)];
  if (r?.secret?.length) return r.secret;
  return radarSorted(s, now)
    .filter((x) => x.status === 'late')
    .slice(0, 2)
    .map((x) => x.task.id);
}

export function pinSecretMissions(prev: AppState, now: Date): AppState {
  const r = prev.raids[raidKey(now)];
  if (r?.secret?.length) return prev;
  const ids = secretMissions(prev, now);
  if (!ids.length) return prev;
  const s = clone(prev);
  (s.raids[raidKey(now)] ??= emptyRaid()).secret = ids;
  return s;
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
export function newTaskId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function todayLaundry(s: AppState, now: Date): Task[] {
  const dow = now.getDay();
  return activeTasks(s).filter((t) => t.kind === 'laundry' && t.weekday === dow);
}

export function estimateMinutes(s: AppState) {
  return raidTasks(s).reduce((a, t) => a + (t.min ?? 5), 0);
}
