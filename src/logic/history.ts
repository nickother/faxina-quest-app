import { bestWeek, computeStreak, tasksDoneOn, weekXp } from './game';
import { addDays, dayKey, parseYmd, weekKey } from './period';
import type { AppState, DayMark } from './state';

export interface WeekBar {
  key: string;
  label: string;
  xp: number;
  current: boolean;
}

/** XP das últimas n semanas, da mais antiga para a atual. */
export function weeklyXp(s: AppState, now: Date, n = 8): WeekBar[] {
  const cur = weekKey(now);
  const out: WeekBar[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = weekKey(addDays(parseYmd(cur), -7 * i));
    const d = parseYmd(key);
    out.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, xp: weekXp(s, key), current: key === cur });
  }
  return out;
}

export interface RaidRow {
  key: string;
  label: string;
  ms: number;
  complete: boolean;
  rooms: number;
}

/** Raids com tempo registrado, da mais recente para a mais antiga. */
export function raidHistory(s: AppState): RaidRow[] {
  return Object.entries(s.raids)
    .filter(([, r]) => r.elapsedMs > 0 || r.finishedMs != null)
    .map(([key, r]) => {
      const d = parseYmd(key);
      return {
        key,
        label: `Semana de ${d.getDate()}/${d.getMonth() + 1}`,
        ms: r.finishedMs ?? r.elapsedMs,
        complete: r.finishedMs != null,
        rooms: Object.keys(r.rooms).length,
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export interface CalDay {
  key: string;
  day: number;
  inMonth: boolean;
  future: boolean;
  mark: DayMark | undefined;
  tasks: number;
  raid: boolean;
}

/** Grade do mês (semanas de segunda a domingo). */
export function monthGrid(s: AppState, year: number, month: number, now: Date): CalDay[] {
  const first = new Date(year, month, 1, 12);
  const start = parseYmd(weekKey(first));
  const today = dayKey(now);
  const out: CalDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i >= 35 && d.getMonth() !== month) break;
    const key = dayKey(d);
    out.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      future: key > today,
      mark: s.dayLog[key],
      tasks: tasksDoneOn(s, key),
      raid: Object.values(s.checks[`r:${weekKey(d)}`] ?? {}).some((c) => dayKey(new Date(c.at)) === key),
    });
  }
  return out;
}

export function summary(s: AppState, now: Date) {
  const totalTasks = Object.values(s.checks).reduce((a, b) => a + Object.keys(b).length, 0) + Object.values(s.radarLog).reduce((a, b) => a + b.length, 0);
  const daysCounted = Object.values(s.dayLog).filter((m) => m === true).length;
  const bw = bestWeek(s);
  return {
    totalTasks,
    daysCounted,
    streak: computeStreak(s.dayLog, now),
    longest: Math.max(s.records.longestStreak, computeStreak(s.dayLog, now)),
    bestWeek: bw,
    raidsDone: Object.values(s.raids).filter((r) => r.finishedMs != null).length,
  };
}
