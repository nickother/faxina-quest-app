import { BASE_TASKS, PHASES, TITLES } from '../data/content';
import type { PhaseId, TaskDef } from '../data/types';
import { evaluateMissions } from './missions';
import { addDays, daysBetween, dayKey, parseYmd, pk, raidKey, weekKey } from './period';
import { emptyRaid, MAX_FREEZES, type AppState, type DayMark, type RaidState } from './state';

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
  missionDay: 10,
  missionWeek: 40,
  quick: 20,
} as const;

export const CONSOLIDATE_AT = 15;
/** O dia conta na sequência quando mais de 2 tarefas (de qualquer tipo) são marcadas. */
export const STREAK_MIN_TASKS = 3;
export const COMBO_WINDOW_MS = 4 * 60 * 1000;
export const COMBO_STEP = 2;
export const COMBO_MAX = 10;
export const QUICK_MS = 15 * 60 * 1000;
export const FREEZE_EVERY = 7;
export const MEDAL_MISSIONS = 20;

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
/* Cômodos e fases da raid                                             */
/* ------------------------------------------------------------------ */
export interface Phase {
  id: PhaseId;
  name: string;
  short: string;
  emoji: string;
  /** cômodo (conta para o mapa e o bônus de 100%) */
  room: boolean;
  custom: boolean;
}

/** Fases na ordem da raid. Cômodos criados entram antes do banheiro (molhado por último). */
export function phases(s: AppState): Phase[] {
  const out: Phase[] = [];
  for (const p of PHASES) {
    if (p.id === 'banheiro') {
      for (const c of s.rooms.custom) out.push({ id: c.id, name: c.name, short: c.name, emoji: c.emoji, room: true, custom: true });
    }
    if (s.rooms.hidden[p.id]) continue;
    const room = p.id !== 'prep' && p.id !== 'fechamento';
    const name = s.rooms.names[p.id]?.trim() || p.name;
    out.push({ id: p.id, name, short: s.rooms.names[p.id]?.trim() || p.short, emoji: p.emoji, room, custom: false });
  }
  return out;
}

export const roomPhases = (s: AppState) => phases(s).filter((p) => p.room);

/* ------------------------------------------------------------------ */
/* Tarefas efetivas (base + criadas + ajustes do usuário)              */
/* ------------------------------------------------------------------ */
export interface Task extends TaskDef {
  enabled: boolean;
  deleted: boolean;
  originalName: string;
}

/** Todas as tarefas, inclusive desligadas e excluídas (o editor usa). */
export function everyTask(s: AppState): Task[] {
  return [...BASE_TASKS, ...s.custom].map((t) => {
    const o = s.overrides[t.id] ?? {};
    return {
      ...t,
      originalName: t.name,
      name: o.name?.trim() ? o.name : t.name,
      tip: o.tip !== undefined ? o.tip || undefined : t.tip,
      when: o.when ?? t.when,
      days: o.days ?? t.days,
      phase: o.phase ?? t.phase,
      every: o.every ?? t.every,
      enabled: o.enabled ?? !t.defaultOff,
      deleted: !!o.deleted,
    };
  });
}

/** Tarefas que existem (não excluídas). */
export function allTasks(s: AppState): Task[] {
  return everyTask(s).filter((t) => !t.deleted);
}

/** A rotina acontece neste dia da semana? */
export function isScheduled(t: TaskDef, now: Date): boolean {
  return !t.days?.length || t.days.includes(now.getDay());
}

/** Rotinas diárias de hoje (ligadas, liberadas e agendadas para hoje). */
export function dailyToday(s: AppState, now: Date): Task[] {
  return activeTasks(s).filter((t) => t.kind === 'daily' && isScheduled(t, now));
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

/** Tarefas visíveis (ligadas, liberadas e com o cômodo existente). */
export function activeTasks(s: AppState): Task[] {
  const map = taskMap(s);
  const phaseIds = new Set(phases(s).map((p) => p.id));
  return [...map.values()].filter((t) => t.enabled && isUnlocked(s, t, map) && (t.kind !== 'raid' || phaseIds.has(t.phase!)));
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
/* Sequência, congelamento e férias                                    */
/* ------------------------------------------------------------------ */
export function dailyStreakStatus(s: AppState, now: Date) {
  // Qualquer tarefa marcada hoje conta: rotina (inclusive consolidada), lavanderia, raid ou radar.
  const done = tasksDoneOn(s, dayKey(now));
  const needed = STREAK_MIN_TASKS;
  return { done, total: needed, qualifies: done >= needed, needed };
}

const bridges = (m: DayMark | undefined) => m === 'freeze' || m === 'vacation';

/** Dias seguidos que contaram. Congelamento e férias seguram a sequência sem somar. */
export function computeStreak(dayLog: Record<string, DayMark>, now: Date): number {
  let d = now;
  const today = dayLog[dayKey(d)];
  if (today !== true && !bridges(today)) d = addDays(d, -1);
  let n = 0;
  for (let i = 0; i < 2000; i++) {
    const m = dayLog[dayKey(d)];
    if (m === true) n++;
    else if (!bridges(m)) break;
    d = addDays(d, -1);
  }
  return n;
}

/** Dia (AAAA-MM-DD) em que começou a sequência atual. */
export function streakStart(dayLog: Record<string, DayMark>, now: Date): string | null {
  let d = now;
  if (dayLog[dayKey(d)] !== true && !bridges(dayLog[dayKey(d)])) d = addDays(d, -1);
  let start: string | null = null;
  for (let i = 0; i < 2000; i++) {
    const m = dayLog[dayKey(d)];
    if (m === true) start = dayKey(d);
    else if (!bridges(m)) break;
    d = addDays(d, -1);
  }
  return start;
}

export function inVacation(s: AppState, day: string): boolean {
  const v = s.vacation;
  if (!v) return false;
  return day >= v.from && (!v.to || day <= v.to);
}

/**
 * Confere os dias que passaram desde a última abertura: dias de férias ficam
 * marcados, e um dia perdido gasta um congelamento (se houver e se havia sequência).
 */
export function reconcileDays(prev: AppState, now: Date): Result {
  const yesterday = dayKey(addDays(now, -1));
  if (prev.reconciledUntil && prev.reconciledUntil >= yesterday && !(prev.vacation?.to && prev.vacation.to < dayKey(now))) {
    return { state: prev, events: [] };
  }
  const s = clone(prev);
  const events: GameEvent[] = [];
  if (!s.reconciledUntil) {
    s.reconciledUntil = yesterday;
    return { state: s, events };
  }
  let d = addDays(parseYmd(s.reconciledUntil), 1);
  let used = 0;
  for (let i = 0; i < 400 && dayKey(d) <= yesterday; i++, d = addDays(d, 1)) {
    const k = dayKey(d);
    if (s.dayLog[k] === true) continue;
    if (inVacation(s, k)) {
      s.dayLog[k] = 'vacation';
      continue;
    }
    if (s.freezes > 0 && computeStreak(s.dayLog, addDays(d, -1)) > 0) {
      s.freezes -= 1;
      s.dayLog[k] = 'freeze';
      used++;
    }
  }
  s.reconciledUntil = yesterday;
  if (s.vacation?.to && s.vacation.to < dayKey(now)) s.vacation = null;
  if (used) events.push({ type: 'freezeUsed', days: used });
  return { state: s, events };
}

export function setVacation(prev: AppState, on: boolean, now: Date, to: string | null = null): AppState {
  const s = clone(prev);
  s.vacation = on ? { from: dayKey(now), to } : null;
  return s;
}

/** Atualiza o dia de hoje na sequência e o congelamento ganho a cada 7 dias. */
function updateToday(s: AppState, now: Date, events: GameEvent[]) {
  const today = dayKey(now);
  const q = dailyStreakStatus(s, now).qualifies;
  s.dayLog[today] = q;
  const streak = computeStreak(s.dayLog, now);
  if (q && streak > 0 && streak % FREEZE_EVERY === 0 && s.freezeEarnedOn !== today && s.freezes < MAX_FREEZES) {
    s.freezes += 1;
    s.freezeEarnedOn = today;
    events.push({ type: 'freezeEarned' });
  } else if (!q && s.freezeEarnedOn === today) {
    s.freezes = Math.max(0, s.freezes - 1);
    s.freezeEarnedOn = null;
  }
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
  for (const p of phases(s)) {
    if (phaseProgress(s, p.id, now).left > 0) return p.id;
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
  | { type: 'xp'; amount: number; label: string; combo?: number }
  | { type: 'tip'; taskId: string }
  | { type: 'consolidated'; taskId: string; unlocked: string[] }
  | { type: 'room'; room: PhaseId }
  | { type: 'raidComplete'; ms: number; record: boolean }
  | { type: 'laundryWeek' }
  | { type: 'levelUp'; level: number; title: string }
  | { type: 'achievement'; id: string }
  | { type: 'record'; label: string }
  | { type: 'mission'; text: string; xp: number }
  | { type: 'medal'; month: string }
  | { type: 'freezeEarned' }
  | { type: 'freezeUsed'; days: number }
  | { type: 'quickDone'; xp: number; ms: number };

export interface Result {
  state: AppState;
  events: GameEvent[];
}

export const clone = <T,>(v: T): T => structuredClone(v);

export function addXp(s: AppState, amount: number, now: Date) {
  s.xp = Math.max(0, s.xp + amount);
  const d = dayKey(now);
  s.xpByDay[d] = (s.xpByDay[d] ?? 0) + amount;
}

export function phaseName(s: AppState, id: PhaseId) {
  return phases(s).find((p) => p.id === id)?.short ?? id;
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
    addXp(s, -bucket[taskId].xp, now);
    delete bucket[taskId];
    s.counts[taskId] = Math.max(0, (s.counts[taskId] ?? 0) - 1);
    const c = s.consolidated[taskId];
    if (c && !c.manual && c.day === today && s.counts[taskId] < CONSOLIDATE_AT) {
      addXp(s, -(c.xp ?? XP.consolidation), now);
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
    let comboLevel = 0;
    if (t.kind === 'raid') {
      const r = (s.raids[raidKey(now)] ??= emptyRaid());
      if (r.lastCheckAt && nowMs - r.lastCheckAt < COMBO_WINDOW_MS) r.combo += 1;
      else r.combo = 0;
      r.lastCheckAt = nowMs;
      comboLevel = r.combo;
      const bonus = comboBonus(r.combo);
      gained += bonus;
      r.maxBonus = Math.max(r.maxBonus ?? 0, bonus);
      if (bonus > s.maxCombo) {
        if (s.maxCombo > 0) events.push({ type: 'record', label: `Maior combo: +${bonus} XP` });
        s.maxCombo = bonus;
      }
      if (!r.runningSince && r.finishedMs == null) r.runningSince = nowMs;
      r.roomStart ??= {};
      if (!r.roomStart[t.phase!]) r.roomStart[t.phase!] = nowMs;
    }
    bucket[taskId] = { at: nowMs, xp: gained };
    addXp(s, gained, now);
    events.push({ type: 'xp', amount: gained, label: t.name, combo: comboLevel });
    events.push({ type: 'tip', taskId });

    s.counts[taskId] = (s.counts[taskId] ?? 0) + 1;
    if (!isConsolidated(s, taskId) && s.counts[taskId] >= CONSOLIDATE_AT) {
      s.consolidated[taskId] = { day: today, xp: XP.consolidation };
      addXp(s, XP.consolidation, now);
      const unlocked = [...map.values()].filter((x) => x.parent === taskId && x.enabled).map((x) => x.id);
      events.push({ type: 'consolidated', taskId, unlocked });
    }

    if (t.kind === 'raid') applyRaidBonuses(s, t, now, events);
    if (t.kind === 'laundry') updateLaundryWeek(s, now, events);
  }

  finish(s, levelBefore, now, events);
  return { state: s, events };
}

function applyRaidBonuses(s: AppState, t: TaskDef, now: Date, events: GameEvent[]) {
  const r = (s.raids[raidKey(now)] ??= emptyRaid());
  const room = t.phase!;
  const isRoom = roomPhases(s).some((p) => p.id === room);
  if (isRoom && !r.rooms[room]) {
    const p = phaseProgress(s, room, now);
    if (p.total > 0 && p.left === 0) {
      r.rooms[room] = XP.room;
      addXp(s, XP.room, now);
      events.push({ type: 'room', room });
      const start = r.roomStart?.[room];
      const ms = start ? now.getTime() - start : 0;
      if (p.total > 1 && ms > 0) {
        const prevBest = s.records.roomMs[room];
        if (prevBest == null || ms < prevBest) {
          if (prevBest != null) events.push({ type: 'record', label: `Recorde: ${phaseName(s, room)} em ${fmtMin(ms)}` });
          s.records.roomMs[room] = ms;
        }
      }
    }
  }
  const h = houseProgress(s, now);
  if (!r.completeXp && h.total > 0 && h.done === h.total) {
    r.completeXp = XP.raidComplete;
    addXp(s, XP.raidComplete, now);
    const ms = raidElapsed(r, now.getTime());
    r.elapsedMs = ms;
    r.runningSince = null;
    r.finishedMs = ms;
    const record = ms > 0 && (s.bestRaidMs == null || ms < s.bestRaidMs);
    if (record) s.bestRaidMs = ms;
    events.push({ type: 'raidComplete', ms, record });
  }
}

function fmtMin(ms: number) {
  const m = Math.max(1, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` : `${m} min`;
}

function undoRaidBonuses(s: AppState, t: TaskDef, now: Date) {
  const r = s.raids[raidKey(now)];
  if (!r) return;
  const room = t.phase!;
  if (r.rooms[room]) {
    addXp(s, -r.rooms[room], now);
    delete r.rooms[room];
  }
  if (r.completeXp) {
    addXp(s, -r.completeXp, now);
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
    addXp(s, XP.laundryWeek, now);
    events.push({ type: 'laundryWeek' });
  } else if (!all && had) {
    addXp(s, -had, now);
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
    addXp(s, -p.xp, now);
    delete s.radarPrev[taskId];
    s.radarLog[today] = (s.radarLog[today] ?? []).filter((id) => id !== taskId);
  } else if (s.radarDone[taskId] !== today) {
    s.radarPrev[taskId] = { prev: s.radarDone[taskId] ?? null, day: today, xp: XP.radar };
    s.radarDone[taskId] = today;
    s.radarLog[today] = [...(s.radarLog[today] ?? []), taskId];
    addXp(s, XP.radar, now);
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
      if (!c.manual) addXp(s, -(c.xp ?? 0), now);
      delete s.consolidated[taskId];
      if ((s.counts[taskId] ?? 0) >= CONSOLIDATE_AT) s.counts[taskId] = CONSOLIDATE_AT - 1;
    }
  }
  updateToday(s, now, []);
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
/* Faxina relâmpago (15 min)                                           */
/* ------------------------------------------------------------------ */
/** Escolhe tarefas pendentes da raid que somam cerca de 15 minutos. */
export function pickQuickTasks(s: AppState, now: Date): string[] {
  const order = new Map(phases(s).map((p, i) => [p.id, i]));
  const pending = raidTasks(s)
    .filter((t) => !isDone(s, t, now))
    .sort((a, b) => (order.get(a.phase!) ?? 0) - (order.get(b.phase!) ?? 0));
  const out: string[] = [];
  let total = 0;
  for (const t of pending) {
    const m = t.min ?? 5;
    if (total + m > 18 && out.length) continue;
    out.push(t.id);
    total += m;
    if (total >= 13 || out.length >= 6) break;
  }
  return out;
}

export function startQuick(prev: AppState, now: Date): AppState {
  const ids = pickQuickTasks(prev, now);
  if (!ids.length) return prev;
  const s = clone(prev);
  s.quick[dayKey(now)] = { startedAt: now.getTime(), taskIds: ids, finishedAt: null, xp: 0 };
  return s;
}

export function cancelQuick(prev: AppState, now: Date): AppState {
  const q = prev.quick[dayKey(now)];
  if (!q || q.finishedAt) return prev;
  const s = clone(prev);
  delete s.quick[dayKey(now)];
  return s;
}

function evaluateQuick(s: AppState, now: Date, events: GameEvent[]) {
  const q = s.quick[dayKey(now)];
  if (!q) return;
  const map = taskMap(s);
  const all = q.taskIds.every((id) => {
    const t = map.get(id);
    return !t || isDone(s, t, now);
  });
  if (all && !q.finishedAt) {
    q.finishedAt = now.getTime();
    const ms = q.finishedAt - q.startedAt;
    q.xp = ms <= QUICK_MS + 60_000 ? XP.quick : 0;
    if (q.xp) addXp(s, q.xp, now);
    events.push({ type: 'quickDone', xp: q.xp, ms });
  } else if (!all && q.finishedAt) {
    if (q.xp) addXp(s, -q.xp, now);
    q.finishedAt = null;
    q.xp = 0;
  }
}

/* ------------------------------------------------------------------ */
/* Recordes                                                            */
/* ------------------------------------------------------------------ */
export function weekXp(s: AppState, wk: string): number {
  let sum = 0;
  const start = parseYmd(wk);
  for (let i = 0; i < 7; i++) sum += s.xpByDay[dayKey(addDays(start, i))] ?? 0;
  return Math.max(0, sum);
}

export function bestWeek(s: AppState, exclude?: string): { key: string; xp: number } | null {
  const weeks = new Map<string, number>();
  for (const [d, v] of Object.entries(s.xpByDay)) {
    const wk = weekKey(parseYmd(d));
    if (wk === exclude) continue;
    weeks.set(wk, (weeks.get(wk) ?? 0) + v);
  }
  let best: { key: string; xp: number } | null = null;
  for (const [key, xp] of weeks) if (!best || xp > best.xp) best = { key, xp };
  return best;
}

function evaluateRecords(s: AppState, now: Date, events: GameEvent[]) {
  const wk = weekKey(now);
  const cur = weekXp(s, wk);
  const prevBest = bestWeek(s, wk);
  if (prevBest && prevBest.xp > 0 && cur > prevBest.xp && s.records.weekNotified !== wk) {
    s.records.weekNotified = wk;
    events.push({ type: 'record', label: `Melhor semana até agora: ${cur} XP` });
  }
  const streak = computeStreak(s.dayLog, now);
  if (streak > s.records.longestStreak) {
    const start = streakStart(s.dayLog, now);
    if (s.records.longestStreak >= 3 && start && s.records.streakNotified !== start) {
      s.records.streakNotified = start;
      events.push({ type: 'record', label: `Maior sequência: ${streak} dias` });
    }
    s.records.longestStreak = streak;
  }
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
  { id: 'raid', icon: '⚔️', name: 'Raid completa', desc: 'Terminar todas as tarefas da raid.', test: (s) => Object.values(s.raids).some((r) => r.completeXp > 0) },
  { id: 'fast', icon: '⏱️', name: 'Raid relâmpago', desc: 'Raid completa em menos de 3 horas.', test: (s) => s.bestRaidMs != null && s.bestRaidMs < 3 * 3600000 },
  { id: 'combo', icon: '⚡', name: 'Combo máximo', desc: 'Chegar ao combo de +10 XP.', test: (s) => s.maxCombo >= COMBO_MAX },
  { id: 'laundry', icon: '🧺', name: 'Semana lavada', desc: 'Lavanderia de segunda a quinta completa.', test: (s) => Object.keys(s.laundryWeeks).length > 0 },
  { id: 'consolidated', icon: '🤖', name: 'Piloto automático', desc: 'Consolidar uma rotina (15 vezes).', test: (s) => Object.values(s.consolidated).some((c) => !c.manual) },
  { id: 'radar5', icon: '📡', name: 'Caçador de cantos', desc: 'Cuidar de 5 cantos do radar.', test: (s) => Object.keys(s.radarDone).length >= 5 },
  { id: 'quick', icon: '💨', name: 'Faxina relâmpago', desc: 'Completar uma faxina de 15 minutos no tempo.', test: (s) => Object.values(s.quick).some((q) => q.xp > 0) },
  { id: 'missions10', icon: '🎯', name: 'Missionário', desc: 'Completar 10 missões.', test: (s) => Object.values(s.missions).filter((x) => x > 0).length >= 10 },
  { id: 'medal', icon: '🏅', name: 'Medalha do mês', desc: `Completar ${MEDAL_MISSIONS} missões diárias num mês.`, test: (s) => Object.keys(s.medals).length > 0 },
  { id: 'freeze', icon: '🧊', name: 'Salvo pelo gelo', desc: 'Um congelamento segurou sua sequência.', test: (s) => Object.values(s.dayLog).includes('freeze') },
  { id: 'level5', icon: '🧙', name: 'Mago do Multiuso', desc: 'Chegar ao nível 5.', test: (s) => levelInfo(s.xp).level >= 5 },
  { id: 'level9', icon: '👑', name: 'Mestre da Casa', desc: 'Chegar ao nível 9.', test: (s) => levelInfo(s.xp).level >= 9 },
];

function finish(s: AppState, levelBefore: number, now: Date, events: GameEvent[]) {
  updateToday(s, now, events);
  evaluateQuick(s, now, events);
  evaluateMissions(s, now, events);
  evaluateRecords(s, now, events);
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
/* Utilidades                                                          */
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

/** Quantas tarefas (de qualquer tipo) foram marcadas num dia. */
export function tasksDoneOn(s: AppState, day: string): number {
  let n = 0;
  for (const bucket of Object.values(s.checks)) {
    for (const c of Object.values(bucket)) if (dayKey(new Date(c.at)) === day) n++;
  }
  return n + (s.radarLog[day]?.length ?? 0);
}
