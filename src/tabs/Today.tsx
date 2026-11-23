import { WEEKDAYS } from '../data/content';
import { TaskList } from '../components/TaskRow';
import { Collapsible, Icon, Ring } from '../components/ui';
import {
  activeTasks, dailyStreakStatus, isConsolidated, isDone, radarSorted, todayLaundry, toggleRadar,
} from '../logic/game';
import { useStore } from '../store';
import type { Nav } from '../App';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function greeting(h: number) {
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Today({ nav, standalone }: { nav: Nav; standalone: boolean }) {
  const { state, now, act, update } = useStore();
  const tasks = activeTasks(state);
  const daily = tasks.filter((t) => t.kind === 'daily');
  const live = daily.filter((t) => !isConsolidated(state, t.id));
  const auto = daily.filter((t) => isConsolidated(state, t.id));
  const morning = live.filter((t) => t.when === 'manha');
  const night = live.filter((t) => t.when !== 'manha');
  const laundry = todayLaundry(state, now);
  const dow = now.getDay();

  const ringItems = [...live, ...laundry];
  const ringDone = ringItems.filter((t) => isDone(state, t, now)).length;
  const pct = ringItems.length ? ringDone / ringItems.length : 0;
  const streak = dailyStreakStatus(state, now);
  const missing = Math.max(0, streak.needed - streak.done);
  const autoDone = auto.filter((t) => isDone(state, t, now)).length;

  const top = radarSorted(state, now)[0];
  const corner = top && top.status !== 'ok' ? top : null;
  const showInstall = !standalone && !state.ui.installDismissed;

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{WEEKDAYS[dow]}, {now.getDate()} de {MONTHS[now.getMonth()]}</p>
        <h1>{greeting(now.getHours())}!</h1>
      </header>

      {showInstall && (
        <div className="card install-banner">
          <Icon name="phone" />
          <div>
            <strong>Instale na Tela de Início</strong>
            <p>Seus dados ficam mais seguros e o app abre em tela cheia.</p>
            <div className="row gap">
              <button className="btn primary sm" onClick={() => nav.guide('install')}>Ver como</button>
              <button className="btn ghost sm" onClick={() => update((s) => ({ ...s, ui: { ...s.ui, installDismissed: true } }))}>Agora não</button>
            </div>
          </div>
        </div>
      )}

      <section className="card hero">
        <Ring pct={pct} size={104} stroke={11}>
          <strong className="ring-num">{Math.round(pct * 100)}%</strong>
          <small>do dia</small>
        </Ring>
        <div className="hero-text">
          <p className="hero-big">{ringDone} de {ringItems.length} feitas</p>
          {streak.total > 0 && (
            <p className={`hero-sub ${streak.qualifies ? 'ok' : ''}`}>
              <Icon name="flame" size={16} />
              {streak.qualifies ? 'Sequência de hoje garantida!' : `Faltam ${missing} para o dia contar na sequência`}
            </p>
          )}
          {pct === 1 && <p className="hero-sub ok">Tudo feito. Pode descansar 🛋️</p>}
        </div>
      </section>

      <section className="section">
        <h2 className="block-title"><span>☀️</span> Manhã <Count tasks={morning} /></h2>
        <TaskList tasks={morning} empty="Todas as rotinas da manhã estão no piloto automático." />
      </section>

      <section className="section">
        <h2 className="block-title"><span>🌙</span> Noite <Count tasks={night} /></h2>
        <TaskList tasks={night} empty="Todas as rotinas da noite estão no piloto automático." />
      </section>

      <section className="section">
        <h2 className="block-title"><span>🧺</span> Lavanderia de hoje</h2>
        {laundry.length > 0 ? (
          <TaskList tasks={laundry} />
        ) : dow === 5 ? (
          <div className="card note">
            <p><strong>Sexta é dia da roupa de cama.</strong> Ela vai para a máquina no começo da raid e é estendida no fechamento.</p>
            <button className="btn primary sm" onClick={() => nav.tab('raid')}>Ir para a raid</button>
          </div>
        ) : (
          <div className="card note"><p>Sem carga hoje. Delicadas e panos de limpeza vão quando juntar.</p></div>
        )}
      </section>

      {auto.length > 0 && (
        <Collapsible
          title="🤖 Piloto automático"
          subtitle={`${autoDone} de ${auto.length} hoje · valem 2 XP e não contam para a sequência`}
        >
          <TaskList tasks={auto} compact />
        </Collapsible>
      )}

      {corner && (
        <section className="section">
          <h2 className="block-title"><span>📡</span> Canto esquecido</h2>
          <div className="card corner">
            <div>
              <strong>{corner.task.name}</strong>
              <p className="muted">
                {corner.last === null ? 'Nunca feito' : `Há ${corner.since} dias`} · a cada {corner.every} dias
              </p>
            </div>
            <button className="btn primary sm" onClick={() => act((s, n) => toggleRadar(s, corner.task.id, n))}>
              Feito
            </button>
          </div>
        </section>
      )}

      <button className="link-row" onClick={() => nav.editor('daily')}>
        <Icon name="pencil" size={18} /> Editar rotinas
      </button>
    </div>
  );

  function Count({ tasks: ts }: { tasks: typeof morning }) {
    if (!ts.length) return null;
    const d = ts.filter((t) => isDone(state, t, now)).length;
    return <span className={`count ${d === ts.length ? 'ok' : ''}`}>{d}/{ts.length}</span>;
  }
}

