import { describe, expect, it } from 'vitest';
import { activeTasks, toggleRadar, toggleTask } from './game';
import { mergeStates } from './merge';
import { initialState } from './state';

const MON = new Date(2026, 10, 23, 10, 0);

describe('mesclar estados do casal', () => {
  it('as tarefas marcadas nos dois celulares ficam marcadas', () => {
    const daily = activeTasks(initialState()).filter((t) => t.kind === 'daily');
    const base = initialState();
    const a = toggleTask(base, daily[0].id, MON).state;
    const b = toggleTask(base, daily[1].id, MON).state;
    const m = mergeStates(a, b);
    const marked = Object.values(m.checks).flatMap((x) => Object.keys(x));
    expect(marked).toContain(daily[0].id);
    expect(marked).toContain(daily[1].id);
    expect(m.xp).toBeGreaterThanOrEqual(Math.max(a.xp, b.xp));
  });

  it('o dia conta na sequência se contou em qualquer um', () => {
    const a = initialState();
    const b = initialState();
    a.dayLog['2026-11-23'] = true;
    b.dayLog['2026-11-23'] = false;
    expect(mergeStates(a, b).dayLog['2026-11-23']).toBe(true);
    expect(mergeStates(b, a).dayLog['2026-11-23']).toBe(true);
  });

  it('radar e tarefas criadas dos dois lados são preservados', () => {
    const radar = activeTasks(initialState()).filter((t) => t.kind === 'radar');
    let a = toggleRadar(initialState(), radar[0].id, MON).state;
    let b = toggleRadar(initialState(), radar[1].id, MON).state;
    a = { ...a, custom: [{ ...radar[0], id: 'u-a', name: 'Regar plantas', custom: true }] };
    b = { ...b, custom: [{ ...radar[0], id: 'u-b', name: 'Limpar persiana', custom: true }] };
    const m = mergeStates(a, b);
    expect(m.radarDone[radar[0].id]).toBe('2026-11-23');
    expect(m.radarDone[radar[1].id]).toBe('2026-11-23');
    expect(m.custom.map((t) => t.id).sort()).toEqual(['u-a', 'u-b']);
  });

  it('ajustes seguem o celular local', () => {
    const remote = initialState();
    const local = { ...initialState(), settings: { ...initialState().settings, mascotName: 'Bolinha' } };
    expect(mergeStates(remote, local).settings.mascotName).toBe('Bolinha');
  });
});
