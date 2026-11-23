import { describe, expect, it } from 'vitest';
import {
  CONSOLIDATE_AT, XP, activeTasks, comboBonus, computeStreak, houseProgress, isUnlocked, levelInfo,
  phaseProgress, radarInfo, setAlwaysDo, taskMap, toggleRadar, toggleTask,
} from './game';
import { dayKey, pk, raidKey, weekKey } from './period';
import { initialState, type AppState } from './state';

const at = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m - 1, d, h, min);
// 2026-11-23 é segunda-feira
const MON = at(2026, 11, 23);
const FRI = at(2026, 11, 27, 19);

describe('chaves de período', () => {
  it('dia, semana (segunda) e raid (sexta)', () => {
    expect(dayKey(MON)).toBe('2026-11-23');
    expect(weekKey(at(2026, 11, 26))).toBe('2026-11-23');
    expect(weekKey(at(2026, 11, 29))).toBe('2026-11-23'); // domingo pertence à semana anterior
    expect(weekKey(at(2026, 11, 30))).toBe('2026-11-30');
    expect(raidKey(MON)).toBe('2026-11-27');
    expect(raidKey(at(2026, 11, 28))).toBe('2026-11-27'); // sábado ainda é a raid de sexta
    expect(raidKey(at(2027, 1, 1))).toBe('2027-01-01'); // virada de ano
    expect(pk.raid(FRI)).toBe('r:2026-11-27');
  });
});

describe('nível', () => {
  it('nível n exige 100 + 40n XP', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, need: 140, title: 'Novato do Rodo' });
    expect(levelInfo(139).level).toBe(1);
    expect(levelInfo(140)).toMatchObject({ level: 2, into: 0, need: 180, title: 'Aprendiz da Vassoura' });
    expect(levelInfo(140 + 180).level).toBe(3);
    expect(levelInfo(1e7).title).toBe('Mestre da Casa');
  });
});

describe('XP', () => {
  it('rotina diária +5 e desmarcar devolve', () => {
    let s = initialState();
    s = toggleTask(s, 'm-cama', MON).state;
    expect(s.xp).toBe(XP.daily);
    s = toggleTask(s, 'm-cama', MON).state;
    expect(s.xp).toBe(0);
    expect(s.counts['m-cama']).toBe(0);
  });

  it('rotina consolidada vale +2, lavanderia +15, radar +25', () => {
    let s = initialState();
    s = toggleTask(s, 'm-toalhas', MON).state; // pré-consolidada
    expect(s.xp).toBe(XP.consolidatedTask);
    s = toggleTask(s, 'lav-seg', MON).state;
    expect(s.xp).toBe(2 + XP.laundry);
    s = toggleRadar(s, 'r-esponja', MON).state;
    expect(s.xp).toBe(2 + 15 + XP.radar);
  });

  it('semana de lavanderia completa +30', () => {
    let s = initialState();
    for (const [id, d] of [['lav-seg', 23], ['lav-ter', 24], ['lav-qua', 25], ['lav-qui', 26]] as const) {
      s = toggleTask(s, id, at(2026, 11, d)).state;
    }
    expect(s.xp).toBe(4 * XP.laundry + XP.laundryWeek);
    s = toggleTask(s, 'lav-qui', at(2026, 11, 26)).state;
    expect(s.xp).toBe(3 * XP.laundry);
  });
});

describe('combo da raid', () => {
  it('soma +2 por nível de combo até +10 e zera após 4 minutos', () => {
    expect(comboBonus(0)).toBe(0);
    expect(comboBonus(3)).toBe(6);
    expect(comboBonus(9)).toBe(10);
    let s = initialState();
    const ids = ['p-cama', 'p-forrar', 'p-produto'];
    ids.forEach((id, i) => (s = toggleTask(s, id, at(2026, 11, 27, 19, i * 2)).state));
    expect(s.xp).toBe(10 + 12 + 14);
    s = toggleTask(s, 'p-kits', at(2026, 11, 27, 19, 30)).state;
    expect(s.xp).toBe(36 + 10);
  });

  it('cronômetro inicia sozinho na primeira tarefa', () => {
    const s = toggleTask(initialState(), 'p-cama', FRI).state;
    expect(s.raids['2026-11-27'].runningSince).toBe(FRI.getTime());
  });

  it('cômodo 100% dá +30 e pinta o mapa; desmarcar desfaz', () => {
    let s = initialState();
    const quarto = phaseProgress(s, 'quarto', FRI).tasks.map((t) => t.id);
    quarto.forEach((id, i) => (s = toggleTask(s, id, at(2026, 11, 27, 19, i * 10)).state));
    expect(phaseProgress(s, 'quarto', FRI).pct).toBe(1);
    expect(s.xp).toBe(quarto.length * XP.raid + XP.room);
    s = toggleTask(s, quarto[0], at(2026, 11, 27, 22)).state;
    expect(phaseProgress(s, 'quarto', FRI).pct).toBeLessThan(1);
    expect(s.xp).toBe((quarto.length - 1) * XP.raid);
  });

  it('raid completa +100 e registra recorde', () => {
    let s = initialState();
    const all = activeTasks(s).filter((t) => t.kind === 'raid');
    all.forEach((t, i) => (s = toggleTask(s, t.id, new Date(FRI.getTime() + i * 5 * 60000)).state));
    expect(houseProgress(s, FRI).pct).toBe(1);
    expect(s.raids['2026-11-27'].completeXp).toBe(XP.raidComplete);
    expect(s.bestRaidMs).toBe((all.length - 1) * 5 * 60000);
  });
});

describe('sequência', () => {
  it('conta o dia com 70% das rotinas ativas não consolidadas', () => {
    let s = initialState();
    const counting = activeTasks(s).filter((t) => t.kind === 'daily' && !s.consolidated[t.id]);
    const need = Math.ceil(counting.length * 0.7);
    counting.slice(0, need - 1).forEach((t) => (s = toggleTask(s, t.id, MON).state));
    expect(s.dayLog['2026-11-23']).toBe(false);
    s = toggleTask(s, counting[need - 1].id, MON).state;
    expect(s.dayLog['2026-11-23']).toBe(true);
  });

  it('streak conta dias seguidos até hoje ou ontem', () => {
    const log = { '2026-11-20': true, '2026-11-21': true, '2026-11-22': true };
    expect(computeStreak(log, MON)).toBe(3); // hoje ainda não contou
    expect(computeStreak({ ...log, '2026-11-23': true }, MON)).toBe(4);
    expect(computeStreak({ '2026-11-21': true }, MON)).toBe(0);
  });
});

describe('consolidação e desbloqueio', () => {
  function doTimes(s: AppState, id: string, n: number) {
    for (let i = 0; i < n; i++) s = toggleTask(s, id, at(2026, 10, 1 + i)).state;
    return s;
  }

  it('15 execuções consolidam, dão +50 e desbloqueiam o nível 2', () => {
    let s = initialState();
    expect(isUnlocked(s, taskMap(s).get('m-cama2')!)).toBe(false);
    s = doTimes(s, 'm-cama', CONSOLIDATE_AT - 1);
    expect(s.consolidated['m-cama']).toBeUndefined();
    const r = toggleTask(s, 'm-cama', at(2026, 11, 20));
    expect(r.events.find((e) => e.type === 'consolidated')).toMatchObject({ unlocked: ['m-cama2'] });
    expect(r.state.xp - s.xp).toBe(XP.daily + XP.consolidation);
    expect(isUnlocked(r.state, taskMap(r.state).get('m-cama2')!)).toBe(true);
    // desmarcar no mesmo dia desfaz
    const u = toggleTask(r.state, 'm-cama', at(2026, 11, 20, 11)).state;
    expect(u.consolidated['m-cama']).toBeUndefined();
    expect(u.xp).toBe(s.xp);
  });

  it('toalhas pré-consolidadas liberam a troca de toalhas', () => {
    const s = initialState();
    expect(s.consolidated['m-toalhas']).toBeTruthy();
    expect(activeTasks(s).some((t) => t.id === 'm-toalhas2')).toBe(true);
  });

  it('desligar a rotina mãe libera o nível 2', () => {
    let s = initialState();
    s.overrides['m-cafe'] = { enabled: false };
    expect(activeTasks(s).some((t) => t.id === 'm-cafe2')).toBe(true);
  });

  it('"Já faço sempre" consolida sem XP', () => {
    let s = setAlwaysDo(initialState(), 'n-lixo', true, MON);
    expect(s.consolidated['n-lixo']?.manual).toBe(true);
    expect(s.xp).toBe(0);
    s = setAlwaysDo(s, 'n-lixo', false, MON);
    expect(s.consolidated['n-lixo']).toBeUndefined();
  });

  it('abrir as janelas vem desligada', () => {
    expect(activeTasks(initialState()).some((t) => t.id === 'm-janelas')).toBe(false);
  });
});

describe('radar', () => {
  it('status por frequência e desfazer no mesmo dia', () => {
    let s = initialState();
    const t = taskMap(s).get('r-esponja')!; // 15 dias
    expect(radarInfo(s, t, MON).status).toBe('late');
    s = toggleRadar(s, 'r-esponja', at(2026, 11, 1)).state;
    expect(radarInfo(s, t, at(2026, 11, 5)).status).toBe('ok');
    expect(radarInfo(s, t, at(2026, 11, 14)).status).toBe('soon');
    expect(radarInfo(s, t, at(2026, 11, 20)).status).toBe('late');
    const done = toggleRadar(s, 'r-esponja', MON).state;
    expect(done.radarDone['r-esponja']).toBe('2026-11-23');
    const undone = toggleRadar(done, 'r-esponja', MON).state;
    expect(undone.radarDone['r-esponja']).toBe('2026-11-01');
    expect(undone.xp).toBe(s.xp);
  });

  it('tem 26 cantos', () => {
    expect(activeTasks(initialState()).filter((t) => t.kind === 'radar')).toHaveLength(26);
  });
});
