import { Icon } from '../components/ui';
import { radarSorted, toggleRadar, type RadarStatus } from '../logic/game';
import { dayKey } from '../logic/period';
import { useStore } from '../store';
import type { Nav } from '../App';

const GROUPS: { status: RadarStatus; title: string; short: string; emoji: string }[] = [
  { status: 'late', title: 'Atrasados ou nunca feitos', short: 'Atrasados', emoji: '🔴' },
  { status: 'soon', title: 'Vencendo em breve', short: 'Vencendo', emoji: '🟡' },
  { status: 'ok', title: 'Em dia', short: 'Em dia', emoji: '🟢' },
];

function when(since: number | null, dueIn: number) {
  if (since === null) return 'Nunca feito';
  const ago = since === 0 ? 'Feito hoje' : since === 1 ? 'Feito ontem' : `Feito há ${since} dias`;
  if (dueIn < 0) return `${ago} · atrasado ${-dueIn} ${-dueIn === 1 ? 'dia' : 'dias'}`;
  if (dueIn === 0) return `${ago} · vence hoje`;
  return `${ago} · vence em ${dueIn} ${dueIn === 1 ? 'dia' : 'dias'}`;
}

export function Radar({ nav }: { nav: Nav }) {
  const { state, now, act } = useStore();
  const list = radarSorted(state, now);
  const today = dayKey(now);

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Cantos esquecidos</p>
        <h1>Radar</h1>
        <p className="lead">Limpezas de 15 a 180 dias. Os dois mais atrasados viram missões secretas da sexta.</p>
      </header>

      <div className="radar-summary">
        {GROUPS.map((g) => (
          <div key={g.status} className={`stat ${g.status}`}>
            <strong>{list.filter((x) => x.status === g.status).length}</strong>
            <span>{g.short}</span>
          </div>
        ))}
      </div>

      {GROUPS.map((g) => {
        const items = list.filter((x) => x.status === g.status);
        if (!items.length) return null;
        return (
          <section className="section" key={g.status}>
            <h2 className="block-title"><span>{g.emoji}</span> {g.title} <span className="count">{items.length}</span></h2>
            <ul className="radar-list">
              {items.map((x) => {
                const doneToday = state.radarDone[x.task.id] === today;
                return (
                  <li key={x.task.id} className={`radar-item ${g.status} ${doneToday ? 'done' : ''}`}>
                    <div className="radar-text">
                      <strong>{x.task.name}</strong>
                      {x.task.tip && <span className="task-tip">{x.task.tip}</span>}
                      <span className="radar-meta">
                        <span className="freq">a cada {x.every} dias</span>
                        {when(x.since, x.dueIn)}
                      </span>
                    </div>
                    <button
                      className={`btn sm ${doneToday ? 'ghost' : g.status === 'ok' ? 'soft' : 'primary'}`}
                      onClick={() => act((s, n) => toggleRadar(s, x.task.id, n))}
                      aria-label={doneToday ? `Desfazer ${x.task.name}` : `Marcar ${x.task.name} como feito`}
                    >
                      {doneToday ? 'Desfazer' : 'Feito'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <button className="link-row" onClick={() => nav.editor('radar')}>
        <Icon name="pencil" size={18} /> Editar o radar
      </button>
    </div>
  );
}
