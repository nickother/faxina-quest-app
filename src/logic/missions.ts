import {
  COMBO_MAX, MEDAL_MISSIONS, XP, activeTasks, addXp, dailyToday, getRaid, houseProgress, isConsolidated, isDone,
  raidTasks, tasksDoneOn, todayLaundry, type GameEvent,
} from './game';
import { addDays, dayKey, monthKey, parseYmd, pk, weekKey } from './period';
import type { AppState } from './state';

export interface MissionDef {
  id: string;
  scope: 'day' | 'week';
  icon: string;
  text: (target: number) => string;
  /** meta; 0 = não se aplica agora */
  target: (s: AppState, now: Date) => number;
  progress: (s: AppState, now: Date) => number;
}

const live = (s: AppState, when: 'manha' | 'noite', n: Date) =>
  dailyToday(s, n).filter((t) => !isConsolidated(s, t.id) && (t.when ?? 'noite') === when);

const weekDays = (now: Date) => {
  const start = parseYmd(weekKey(now));
  return Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
};

export const DAILY_MISSIONS: MissionDef[] = [
  {
    id: 'morning', scope: 'day', icon: '☀️', text: () => 'Todas as rotinas da manhã',
    target: (s, n) => live(s, 'manha', n).length,
    progress: (s, n) => live(s, 'manha', n).filter((t) => isDone(s, t, n)).length,
  },
  {
    id: 'night', scope: 'day', icon: '🌙', text: () => 'Todas as rotinas da noite',
    target: (s, n) => live(s, 'noite', n).length,
    progress: (s, n) => live(s, 'noite', n).filter((t) => isDone(s, t, n)).length,
  },
  {
    id: 'five', scope: 'day', icon: '✅', text: (t) => `Marque ${t} tarefas hoje`,
    target: () => 5,
    progress: (s, n) => tasksDoneOn(s, dayKey(n)),
  },
  {
    id: 'radar', scope: 'day', icon: '📡', text: () => 'Cuide de 1 canto do radar',
    target: () => 1,
    progress: (s, n) => s.radarLog[dayKey(n)]?.length ?? 0,
  },
  {
    id: 'laundry', scope: 'day', icon: '🧺', text: () => 'Coloque a lavanderia do dia',
    target: (s, n) => todayLaundry(s, n).length,
    progress: (s, n) => todayLaundry(s, n).filter((t) => isDone(s, t, n)).length,
  },
  {
    id: 'auto', scope: 'day', icon: '🤖', text: (t) => `Marque ${t} rotinas do piloto automático`,
    target: (s, n) => (dailyToday(s, n).filter((t) => isConsolidated(s, t.id)).length >= 3 ? 3 : 0),
    progress: (s, n) => dailyToday(s, n).filter((t) => isConsolidated(s, t.id) && isDone(s, t, n)).length,
  },
  {
    id: 'quick', scope: 'day', icon: '💨', text: () => 'Faça uma faxina relâmpago',
    target: (s, n) => (raidTasks(s).some((t) => !isDone(s, t, n)) ? 1 : 0),
    progress: (s, n) => (s.quick[dayKey(n)]?.finishedAt ? 1 : 0),
  },
  {
    id: 'streak', scope: 'day', icon: '🔥', text: () => 'Garanta o dia na sequência',
    target: () => 1,
    progress: (s, n) => (s.dayLog[dayKey(n)] === true ? 1 : 0),
  },
];

export const WEEKLY_MISSIONS: MissionDef[] = [
  {
    id: 'raid', scope: 'week', icon: '⚔️', text: () => 'Complete a raid da semana',
    target: (s, n) => houseProgress(s, n).total,
    progress: (s, n) => houseProgress(s, n).done,
  },
  {
    id: 'streak5', scope: 'week', icon: '🔥', text: (t) => `${t} dias contando na sequência`,
    target: () => 5,
    progress: (s, n) => weekDays(n).filter((d) => s.dayLog[d] === true).length,
  },
  {
    id: 'radar3', scope: 'week', icon: '📡', text: (t) => `${t} cantos do radar na semana`,
    target: () => 3,
    progress: (s, n) => weekDays(n).reduce((a, d) => a + (s.radarLog[d]?.length ?? 0), 0),
  },
  {
    id: 'laundry', scope: 'week', icon: '🧺', text: () => 'Lavanderia da semana completa',
    target: (s) => activeTasks(s).filter((t) => t.kind === 'laundry').length,
    progress: (s, n) => activeTasks(s).filter((t) => t.kind === 'laundry' && s.checks[pk.week(n)]?.[t.id]).length,
  },
  {
    id: 'combo', scope: 'week', icon: '⚡', text: () => `Chegue ao combo de +${COMBO_MAX} XP na raid`,
    target: () => COMBO_MAX,
    progress: (s, n) => getRaid(s, n).maxBonus ?? 0,
  },
  {
    id: 'rooms3', scope: 'week', icon: '🏠', text: (t) => `Deixe ${t} cômodos 100%`,
    target: () => 3,
    progress: (s, n) => Object.keys(getRaid(s, n).rooms).length,
  },
  {
    id: 'quick2', scope: 'week', icon: '💨', text: (t) => `${t} faxinas relâmpago na semana`,
    target: () => 2,
    progress: (s, n) => weekDays(n).filter((d) => s.quick[d]?.finishedAt).length,
  },
];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface MissionView {
  key: string;
  def: MissionDef;
  text: string;
  target: number;
  progress: number;
  done: boolean;
  xp: number;
}

function pick(defs: MissionDef[], s: AppState, now: Date, seed: string): string[] {
  return defs
    .filter((d) => d.target(s, now) > 0)
    .sort((a, b) => hash(seed + a.id) - hash(seed + b.id))
    .slice(0, 3)
    .map((d) => d.id);
}

/** Sorteia (uma vez por dia e por semana) e guarda as missões, para não mudarem no meio do período. */
export function pinMissions(s: AppState, now: Date): AppState {
  const dk = `d:${dayKey(now)}`;
  const wk = `w:${weekKey(now)}`;
  if (s.missionPicks?.[dk] && s.missionPicks?.[wk]) return s;
  const picks = { ...(s.missionPicks ?? {}) };
  picks[dk] ??= pick(DAILY_MISSIONS, s, now, dayKey(now));
  picks[wk] ??= pick(WEEKLY_MISSIONS, s, now, weekKey(now));
  return { ...s, missionPicks: picks };
}

/** As 3 missões do dia e as 3 da semana. */
export function currentMissions(s: AppState, now: Date): { daily: MissionView[]; weekly: MissionView[] } {
  const day = dayKey(now);
  const wk = weekKey(now);
  const build = (defs: MissionDef[], seed: string, prefix: string, xp: number) => {
    const ids = s.missionPicks?.[`${prefix}:${seed}`] ?? pick(defs, s, now, seed);
    return ids
      .map((id) => defs.find((d) => d.id === id))
      .filter((d): d is MissionDef => !!d)
      .map((def) => ({ def, target: def.target(s, now) }))
      .filter((x) => x.target > 0)
      .map(({ def, target }) => {
        const progress = Math.min(def.progress(s, now), target);
        return { key: `${prefix}:${seed}:${def.id}`, def, text: def.text(target), target, progress, done: progress >= target, xp };
      });
  };
  return {
    daily: build(DAILY_MISSIONS, day, 'd', XP.missionDay),
    weekly: build(WEEKLY_MISSIONS, wk, 'w', XP.missionWeek),
  };
}

/** Dá ou devolve o XP das missões atuais e entrega a medalha do mês. */
export function evaluateMissions(s: AppState, now: Date, events: GameEvent[]) {
  const pinned = pinMissions(s, now);
  s.missionPicks = pinned.missionPicks;
  const { daily, weekly } = currentMissions(s, now);
  for (const m of [...daily, ...weekly]) {
    const had = s.missions[m.key] ?? 0;
    if (m.done && !had) {
      s.missions[m.key] = m.xp;
      addXp(s, m.xp, now);
      events.push({ type: 'mission', text: m.text, xp: m.xp });
    } else if (!m.done && had) {
      addXp(s, -had, now);
      delete s.missions[m.key];
    }
  }
  const month = monthKey(now);
  if (!s.medals[month] && monthMissionCount(s, month) >= MEDAL_MISSIONS) {
    s.medals[month] = dayKey(now);
    events.push({ type: 'medal', month });
  }
}

export function monthMissionCount(s: AppState, month: string) {
  return Object.entries(s.missions).filter(([k, v]) => k.startsWith(`d:${month}`) && v > 0).length;
}
