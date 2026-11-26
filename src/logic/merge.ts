import type { AppState, Check, DayMark, RaidState } from './state';

/*
 * Mescla dois estados quando os dois celulares gravaram ao mesmo tempo.
 * Progresso (tarefas marcadas, contadores, radar, sequência, recordes) é somado/unido,
 * para ninguém perder o que marcou. Configurações (nomes, tarefas, ajustes) seguem
 * o celular local, que é quem acabou de mexer.
 */

type Rec<T> = Record<string, T>;

function mergeRec<T>(a: Rec<T> = {}, b: Rec<T> = {}, pick: (x: T, y: T) => T): Rec<T> {
  const out: Rec<T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

const max = (x: number, y: number) => Math.max(x ?? 0, y ?? 0);
const minNullable = (x: number | null, y: number | null) => (x == null ? y : y == null ? x : Math.min(x, y));
const maxStr = (x: string, y: string) => (x >= y ? x : y);
const earlierCheck = (x: Check, y: Check) => (x.at <= y.at ? x : y);

function mergeDay(x: DayMark, y: DayMark): DayMark {
  if (x === true || y === true) return true;
  if (x === 'vacation' || y === 'vacation') return 'vacation';
  if (x === 'freeze' || y === 'freeze') return 'freeze';
  return false;
}

function mergeRaid(l: RaidState, r: RaidState): RaidState {
  return {
    ...l,
    elapsedMs: max(l.elapsedMs, r.elapsedMs),
    rooms: mergeRec(r.rooms, l.rooms, max),
    roomStart: mergeRec(r.roomStart, l.roomStart, Math.min),
    completeXp: max(l.completeXp, r.completeXp),
    finishedMs: minNullable(l.finishedMs, r.finishedMs),
    maxBonus: max(l.maxBonus, r.maxBonus),
    secret: l.secret ?? r.secret,
  };
}

function unionById<T extends { id: string }>(remote: T[] = [], local: T[] = []): T[] {
  const map = new Map<string, T>();
  for (const x of remote) map.set(x.id, x);
  for (const x of local) map.set(x.id, x);
  return [...map.values()];
}

export function mergeStates(remote: AppState, local: AppState): AppState {
  const xpByDay = mergeRec(remote.xpByDay, local.xpByDay, max);
  const sumDays = Object.values(xpByDay).reduce((a, b) => a + b, 0);
  return {
    ...remote,
    ...local,
    xp: Math.max(local.xp, remote.xp, sumDays),
    xpByDay,
    checks: mergeRec(remote.checks, local.checks, (r, l) => mergeRec(r, l, earlierCheck)),
    counts: mergeRec(remote.counts, local.counts, max),
    consolidated: { ...remote.consolidated, ...local.consolidated },
    radarDone: mergeRec(remote.radarDone, local.radarDone, maxStr),
    radarPrev: { ...remote.radarPrev, ...local.radarPrev },
    radarLog: mergeRec(remote.radarLog, local.radarLog, (r, l) => [...new Set([...r, ...l])]),
    overrides: mergeRec(remote.overrides, local.overrides, (r, l) => ({ ...r, ...l })),
    custom: unionById(remote.custom, local.custom),
    dayLog: mergeRec(remote.dayLog, local.dayLog, mergeDay),
    reconciledUntil: remote.reconciledUntil && local.reconciledUntil ? maxStr(remote.reconciledUntil, local.reconciledUntil) : local.reconciledUntil ?? remote.reconciledUntil,
    raids: mergeRec(remote.raids, local.raids, (r, l) => mergeRaid(l, r)),
    bestRaidMs: minNullable(local.bestRaidMs, remote.bestRaidMs),
    laundryWeeks: mergeRec(remote.laundryWeeks, local.laundryWeeks, max),
    achievements: mergeRec(remote.achievements, local.achievements, (r, l) => (r <= l ? r : l)),
    maxCombo: max(local.maxCombo, remote.maxCombo),
    missions: mergeRec(remote.missions, local.missions, max),
    missionPicks: { ...local.missionPicks, ...remote.missionPicks },
    medals: { ...remote.medals, ...local.medals },
    records: {
      ...local.records,
      roomMs: mergeRec(remote.records.roomMs, local.records.roomMs, Math.min),
      longestStreak: max(local.records.longestStreak, remote.records.longestStreak),
    },
    quick: { ...remote.quick, ...local.quick },
    rooms: {
      custom: unionById(remote.rooms.custom, local.rooms.custom),
      names: { ...remote.rooms.names, ...local.rooms.names },
      hidden: { ...remote.rooms.hidden, ...local.rooms.hidden },
    },
    products: unionById(remote.products, local.products),
  };
}
