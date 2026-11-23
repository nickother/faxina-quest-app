import { useEffect, useState } from 'react';
import { PHASES } from '../data/content';
import { TaskList } from '../components/TaskRow';
import { Bar, Icon, formatDuration, formatMinutes, progressColor } from '../components/ui';
import {
  COMBO_WINDOW_MS, comboBonus, currentPhase, estimateMinutes, getRaid, houseProgress, phaseProgress,
  pinSecretMissions, radarInfo, raidElapsed, resetTimer, secretMissions, taskMap, toggleRadar, toggleTimer,
} from '../logic/game';
import { dayKey, parseYmd, raidKey } from '../logic/period';
import { useStore } from '../store';
import type { Nav } from '../App';

export function Raid({ nav }: { nav: Nav }) {
  const { state, now, update, act } = useStore();
  const raid = getRaid(state, now);
  const [tick, setTick] = useState(Date.now());
  const running = !!raid.runningSince;

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), running || raid.lastCheckAt ? 500 : 5000);
    return () => clearInterval(id);
  }, [running, raid.lastCheckAt]);

  // fixa as missões secretas da semana
  useEffect(() => {
    update((s, n) => pinSecretMissions(s, n));
  }, [update]);

  const elapsed = raidElapsed(raid, tick);
  const house = houseProgress(state, now);
  const current = currentPhase(state, now);
  const comboLeft = raid.lastCheckAt ? Math.max(0, COMBO_WINDOW_MS - (tick - raid.lastCheckAt)) : 0;
  const comboActive = comboLeft > 0;
  const nextBonus = comboBonus(raid.combo + 1);
  const map = taskMap(state);
  const secrets = secretMissions(state, now).map((id) => map.get(id)).filter(Boolean);
  const rk = raidKey(now);
  const isFriday = now.getDay() === 5;
  const finished = raid.finishedMs != null;

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{isFriday ? 'Hoje é dia!' : `Sexta, ${parseYmd(rk).getDate()}/${parseYmd(rk).getMonth() + 1}`}</p>
        <h1>Raid de sexta</h1>
        <p className="lead">Produto agindo no banheiro primeiro, secos de cima para baixo, molhados por último.</p>
      </header>

      <section className="card timer-card">
        <div className="timer-row">
          <div>
            <p className={`timer ${running ? 'running' : ''}`} data-testid="timer">{formatDuration(elapsed)}</p>
            <p className="muted sm">
              {finished ? 'Raid concluída 🎉' : `Tempo estimado: ${formatMinutes(estimateMinutes(state))}`}
              {state.bestRaidMs != null && <> · Recorde: <strong>{formatDuration(state.bestRaidMs)}</strong></>}
            </p>
          </div>
          <div className="row gap">
            {elapsed > 0 && !running && (
              <button className="icon-btn" aria-label="Zerar cronômetro" onClick={() => update((s, n) => resetTimer(s, n))}>
                <Icon name="reset" />
              </button>
            )}
            <button className={`btn ${running ? 'ghost' : 'primary'} round`} disabled={finished} onClick={() => update((s, n) => toggleTimer(s, n))}>
              <Icon name={running ? 'pause' : 'play'} size={18} />
              {running ? 'Pausar' : elapsed ? 'Continuar' : 'Começar'}
            </button>
          </div>
        </div>
        <div className={`combo ${comboActive ? 'on' : ''}`}>
          <Icon name="bolt" size={18} />
          {comboActive ? (
            <>
              <span>
                Combo {raid.combo > 0 ? `x${raid.combo + 1}` : ''}: próxima vale <strong>+{10 + nextBonus} XP</strong>
              </span>
              <span className="combo-time">{Math.ceil(comboLeft / 1000)}s</span>
              <div className="combo-bar" style={{ width: `${(comboLeft / COMBO_WINDOW_MS) * 100}%` }} />
            </>
          ) : (
            <span>Marque tarefas com menos de 4 min entre si: +2 XP por nível de combo (até +10).</span>
          )}
        </div>
        <div className="house-mini">
          <Bar pct={house.pct} label="Progresso da raid" />
          <span>{house.done}/{house.total}</span>
        </div>
      </section>

      <ol className="phases">
        {PHASES.map((ph, i) => {
          const p = phaseProgress(state, ph.id, now);
          const here = ph.id === current;
          const complete = p.total > 0 && p.left === 0;
          return (
            <li key={ph.id} className={`phase ${here ? 'here' : ''} ${complete ? 'complete' : ''}`} data-phase={ph.id}>
              <PhaseCard
                index={i + 1}
                title={`${ph.emoji} ${ph.name}`}
                here={here}
                complete={complete}
                pct={p.pct}
                done={p.done}
                total={p.total}
                defaultOpen={here}
              >
                <TaskList tasks={p.tasks} empty="Nenhuma tarefa ligada nesta fase." />
              </PhaseCard>
            </li>
          );
        })}
      </ol>

      <section className="section">
        <h2 className="block-title"><span>🕵️</span> Missões secretas</h2>
        <p className="muted sm pad">Os dois cantos mais atrasados do radar. Valem +25 XP cada.</p>
        {secrets.length === 0 ? (
          <p className="empty">Nenhum canto atrasado. Radar em dia! 📡</p>
        ) : (
          <ul className="tasks">
            {secrets.map((t) => {
              const info = radarInfo(state, t!, now);
              const done = state.radarDone[t!.id] === dayKey(now) || (info.last != null && info.last >= rk);
              return (
                <li key={t!.id} className={`task secret ${done ? 'done' : ''}`}>
                  <button className="task-btn" role="checkbox" aria-checked={done} onClick={() => act((s, n) => toggleRadar(s, t!.id, n))}>
                    <span className="task-check" aria-hidden="true"><Icon name="check" size={18} stroke={3} /></span>
                    <span className="task-text">
                      <span className="task-name">{t!.name}</span>
                      <span className="task-tip">{t!.tip}</span>
                    </span>
                    <span className={`xp-chip ${done ? 'got' : ''}`}>+25</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button className="link-row" onClick={() => nav.editor('raid')}>
        <Icon name="pencil" size={18} /> Editar tarefas da sexta
      </button>
    </div>
  );
}

function PhaseCard(props: {
  index: number; title: string; here: boolean; complete: boolean; pct: number; done: number; total: number; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(props.defaultOpen);
  useEffect(() => {
    if (props.here) setOpen(true);
  }, [props.here]);
  return (
    <div className="phase-card" style={{ ['--c' as string]: progressColor(props.pct) }}>
      <button className="phase-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="phase-num">{props.complete ? <Icon name="check" size={16} stroke={3} /> : props.index}</span>
        <span className="phase-title">
          <strong>{props.title}</strong>
          {props.here && <span className="pill pill-here">você está aqui</span>}
        </span>
        <span className="phase-count">{props.done}/{props.total}</span>
        <span className="chev"><Icon name="down" size={20} /></span>
      </button>
      <div className="phase-bar"><span style={{ width: `${props.pct * 100}%` }} /></div>
      {open && <div className="phase-body">{props.children}</div>}
    </div>
  );
}
