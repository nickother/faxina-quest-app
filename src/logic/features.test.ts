import { describe, expect, it } from 'vitest';
import {
  QUICK_MS, XP, activeTasks, allTasks, computeStreak, dailyStreakStatus, dailyToday, houseProgress,
  phaseProgress, phases, pickQuickTasks, reconcileDays, setVacation, startQuick, toggleRadar, toggleTask,
} from './game';
import { currentMissions, pinMissions } from './missions';
import { addRoom, addTaskToRoom, deleteRoom, deleteTask, editTask, restoreTask, setRoomHidden } from './rooms';
import { initialState, normalizeState, type AppState } from './state';
import { weeklyXp } from './history';

const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min);
const MON = at(2026, 11, 23);

/** marca rotinas suficientes para o dia contar na sequência */
function qualify(s: AppState, d: Date) {
  const need = dailyStreakStatus(s, d);
  const todo = dailyToday(s, d).filter((t) => !s.consolidated[t.id]).slice(0, need.needed);
  for (const t of todo) s = toggleTask(s, t.id, d).state;
  return s;
}

describe('congelamento e férias', () => {
  it('um dia perdido gasta um congelamento e a sequência continua', () => {
    let s = initialState();
    s = reconcileDays(s, at(2026, 11, 20)).state; // primeira abertura
    s = qualify(s, at(2026, 11, 20));
    s = qualify(s, at(2026, 11, 21));
    // dia 22 perdido
    const r = reconcileDays(s, MON);
    expect(r.events).toContainEqual({ type: 'freezeUsed', days: 1 });
    expect(r.state.freezes).toBe(0);
    expect(r.state.dayLog['2026-11-22']).toBe('freeze');
    expect(computeStreak(r.state.dayLog, MON)).toBe(2);
    // sem congelamento, o próximo dia perdido zera
    const r2 = reconcileDays(r.state, at(2026, 11, 25));
    expect(computeStreak(r2.state.dayLog, at(2026, 11, 25))).toBe(0);
  });

  it('modo férias segura a sequência sem gastar congelamento', () => {
    let s = initialState();
    s = reconcileDays(s, at(2026, 11, 20)).state;
    s = qualify(s, at(2026, 11, 20));
    s = setVacation(s, true, at(2026, 11, 21), '2026-11-22');
    s = reconcileDays(s, MON).state;
    expect(s.dayLog['2026-11-21']).toBe('vacation');
    expect(s.freezes).toBe(1);
    expect(s.vacation).toBeNull(); // terminou
    expect(computeStreak(s.dayLog, MON)).toBe(1);
  });

  it('ganha um congelamento a cada 7 dias seguidos', () => {
    let s = initialState();
    s.freezes = 0;
    for (let d = 16; d <= 22; d++) s = qualify(s, at(2026, 11, d));
    expect(computeStreak(s.dayLog, at(2026, 11, 22))).toBe(7);
    expect(s.freezes).toBe(1);
  });
});

describe('missões', () => {
  it('sorteia 3 do dia e 3 da semana, de forma fixa', () => {
    const s = initialState();
    const a = currentMissions(s, MON);
    expect(a.daily).toHaveLength(3);
    expect(a.weekly).toHaveLength(3);
    expect(currentMissions(s, at(2026, 11, 23, 22)).daily.map((m) => m.key)).toEqual(a.daily.map((m) => m.key));
  });

  it('as missões sorteadas não mudam no meio do dia', () => {
    let s = pinMissions(initialState(), MON);
    const before = s.missionPicks['d:2026-11-23'];
    expect(before).toHaveLength(3);
    for (const t of activeTasks(s).filter((x) => x.kind === 'raid')) s = toggleTask(s, t.id, MON).state;
    expect(s.missionPicks['d:2026-11-23']).toEqual(before);
  });

  it('dá o XP ao completar e devolve ao desfazer', () => {
    let s = initialState();
    const m = currentMissions(s, MON).daily[0];
    let guard = 0;
    while (!currentMissions(s, MON).daily[0].done && guard++ < 60) {
      const t = activeTasks(s).find((x) => x.kind !== 'radar' && !s.checks[`d:2026-11-23`]?.[x.id] && !s.checks['w:2026-11-23']?.[x.id] && !s.checks['r:2026-11-23']?.[x.id]);
      const radar = activeTasks(s).find((x) => x.kind === 'radar' && s.radarDone[x.id] !== '2026-11-23');
      s = (m.def.id === 'radar' ? toggleRadar(s, radar!.id, MON) : toggleTask(s, t!.id, MON)).state;
    }
    expect(s.missions[m.key]).toBe(XP.missionDay);
  });
});

describe('faxina relâmpago', () => {
  it('escolhe tarefas de uns 15 minutos e dá bônus se terminar no tempo', () => {
    let s = startQuick(initialState(), MON);
    const q = s.quick['2026-11-23'];
    const map = new Map(activeTasks(s).map((t) => [t.id, t]));
    const mins = q.taskIds.reduce((a, id) => a + (map.get(id)?.min ?? 5), 0);
    expect(mins).toBeGreaterThanOrEqual(10);
    expect(mins).toBeLessThanOrEqual(18);
    q.taskIds.forEach((id, i) => (s = toggleTask(s, id, new Date(MON.getTime() + i * 60000)).state));
    expect(s.quick['2026-11-23'].finishedAt).not.toBeNull();
    expect(s.quick['2026-11-23'].xp).toBe(XP.quick);
    // passou do tempo: termina sem bônus
    let late = startQuick(initialState(), MON);
    late.quick['2026-11-23'].taskIds.forEach((id) => (late = toggleTask(late, id, new Date(MON.getTime() + QUICK_MS + 5 * 60000)).state));
    expect(late.quick['2026-11-23'].xp).toBe(0);
  });

  it('não sugere nada quando a raid está completa', () => {
    let s = initialState();
    for (const t of activeTasks(s).filter((x) => x.kind === 'raid')) s = toggleTask(s, t.id, MON).state;
    expect(houseProgress(s, MON).pct).toBe(1);
    expect(pickQuickTasks(s, MON)).toEqual([]);
  });
});

describe('recordes', () => {
  it('avisa quando bate o tempo de um cômodo', () => {
    let s = initialState();
    const ids = phaseProgress(s, 'quarto', MON).tasks.map((t) => t.id);
    ids.forEach((id, i) => (s = toggleTask(s, id, new Date(MON.getTime() + i * 10 * 60000)).state));
    const first = s.records.roomMs.quarto;
    expect(first).toBe((ids.length - 1) * 10 * 60000);
    // semana seguinte, mais rápido: avisa o recorde na hora
    const next = at(2026, 11, 30);
    const events = ids.flatMap((id, i) => {
      const r = toggleTask(s, id, new Date(next.getTime() + i * 60000));
      s = r.state;
      return r.events;
    });
    expect(s.records.roomMs.quarto).toBe((ids.length - 1) * 60000);
    expect(events.some((e) => e.type === 'record' && e.label.includes('Quarto'))).toBe(true);
  });
});

describe('cômodos editáveis', () => {
  it('cria cômodo com tarefas do modelo e ele entra na raid', () => {
    let s = addRoom(initialState(), 'Área de serviço', '🧼');
    const room = s.rooms.custom[0];
    const ids = phases(s).map((p) => p.id);
    expect(ids.indexOf(room.id)).toBe(ids.indexOf('banheiro') - 1);
    expect(phaseProgress(s, room.id, MON).total).toBe(3);
    s = addTaskToRoom(s, room.id, 'Limpar a máquina por fora');
    expect(phaseProgress(s, room.id, MON).total).toBe(4);
    s = deleteRoom(s, room.id);
    expect(s.custom).toHaveLength(0);
  });

  it('excluir um cômodo devolve as tarefas originais movidas para ele', () => {
    let s = addRoom(initialState(), 'Closet', '👗');
    const id = s.rooms.custom[0].id;
    s = editTask(s, 'q-guardar', { phase: id });
    expect(phaseProgress(s, 'quarto', MON).tasks.some((t) => t.id === 'q-guardar')).toBe(false);
    s = deleteRoom(s, id);
    expect(phaseProgress(s, 'quarto', MON).tasks.some((t) => t.id === 'q-guardar')).toBe(true);
  });

  it('esconder um cômodo tira as tarefas dele da raid', () => {
    const s = setRoomHidden(initialState(), 'escritorio', true);
    expect(phases(s).some((p) => p.id === 'escritorio')).toBe(false);
    expect(activeTasks(s).some((t) => t.phase === 'escritorio')).toBe(false);
  });
});

describe('editor de tarefas', () => {
  it('exclui e restaura tarefas originais', () => {
    let s = deleteTask(initialState(), 'm-cama');
    expect(allTasks(s).some((t) => t.id === 'm-cama')).toBe(false);
    s = restoreTask(s, 'm-cama');
    expect(allTasks(s).some((t) => t.id === 'm-cama')).toBe(true);
  });

  it('rotina em dias específicos só aparece nesses dias', () => {
    const s = editTask(initialState(), 'n-lixo', { days: [2, 4] });
    expect(dailyToday(s, MON).some((t) => t.id === 'n-lixo')).toBe(false); // segunda
    expect(dailyToday(s, at(2026, 11, 24)).some((t) => t.id === 'n-lixo')).toBe(true); // terça
  });

  it('muda o cômodo de uma tarefa da raid', () => {
    const s = editTask(initialState(), 'q-po', { phase: 'sala' });
    expect(phaseProgress(s, 'sala', MON).tasks.some((t) => t.id === 'q-po')).toBe(true);
  });
});

describe('histórico e migração', () => {
  it('soma XP por semana', () => {
    let s = initialState();
    s = toggleTask(s, 'm-cama', MON).state;
    const w = weeklyXp(s, MON, 4);
    expect(w).toHaveLength(4);
    expect(w[3].current).toBe(true);
    expect(w[3].xp).toBe(s.xp);
  });

  it('migra a raid antiga (chave da sexta) para a chave da semana', () => {
    const old = { version: 1, xp: 50, counts: { 'p-cama': 1 }, checks: { 'r:2026-11-27': { 'p-cama': { at: 1, xp: 10 } } }, raids: { '2026-11-27': { elapsedMs: 5, runningSince: null, combo: 0, lastCheckAt: null, rooms: {}, completeXp: 0, finishedMs: null } } };
    const s = normalizeState(old);
    expect(s.checks['r:2026-11-23']['p-cama']).toBeTruthy();
    expect(s.raids['2026-11-23'].elapsedMs).toBe(5);
    expect(s.settings.onboarded).toBe(true);
  });
});
