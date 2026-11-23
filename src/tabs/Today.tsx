import { useEffect, useRef, useState } from 'react';
import { WEEKDAYS } from '../data/content';
import { Mascot, mascotStage, type Mood } from '../components/Mascot';
import { TaskList } from '../components/TaskRow';
import { Collapsible, Icon, Ring, Sheet, formatDuration } from '../components/ui';
import {
  QUICK_MS, dailyStreakStatus, dailyToday, isConsolidated, isDone, levelInfo, pickQuickTasks, radarSorted,
  startQuick, cancelQuick, taskMap, todayLaundry, toggleRadar, inVacation,
} from '../logic/game';
import { currentMissions, type MissionView } from '../logic/missions';
import { dayKey, raidDate } from '../logic/period';
import { play } from '../lib/sound';
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
  const [quickOpen, setQuickOpen] = useState(false);
  const daily = dailyToday(state, now);
  const live = daily.filter((t) => !isConsolidated(state, t.id));
  const auto = daily.filter((t) => isConsolidated(state, t.id));
  const morning = live.filter((t) => t.when === 'manha');
  const night = live.filter((t) => t.when !== 'manha');
  const laundry = todayLaundry(state, now);
  const dow = now.getDay();
  const today = dayKey(now);
  const isRaidDay = raidDate(now, state.settings.raidDay) === today;

  const ringItems = [...live, ...laundry];
  const ringDone = ringItems.filter((t) => isDone(state, t, now)).length;
  const pct = ringItems.length ? ringDone / ringItems.length : 0;
  const streak = dailyStreakStatus(state, now);
  const missing = Math.max(0, streak.needed - streak.done);
  const autoDone = auto.filter((t) => isDone(state, t, now)).length;
  const onVacation = inVacation(state, today);

  const top = radarSorted(state, now)[0];
  const corner = top && top.status !== 'ok' ? top : null;
  const showInstall = !standalone && !state.ui.installDismissed;
  const { daily: missions } = currentMissions(state, now);
  const quick = state.quick[today];
  const quickAvailable = pickQuickTasks(state, now).length > 0;

  // mascote
  const lvl = levelInfo(state.xp).level;
  const stage = mascotStage(lvl);
  const nextTask = [...morning, ...night, ...laundry].find((t) => !isDone(state, t, now));
  const h = now.getHours();
  let mood: Mood = 'happy';
  let speech: string;
  if (onVacation) {
    mood = 'calm';
    speech = 'Boas férias! Eu seguro a sequência até vocês voltarem. 🏖️';
  } else if (ringItems.length && pct === 1) {
    mood = 'proud';
    speech = 'Tudo feito hoje! Que orgulho de vocês. ✨';
  } else if (ringDone === 0 && h >= 22) {
    mood = 'sleepy';
    speech = 'Zzz… ainda dá tempo de uma tarefinha antes de dormir?';
  } else if (nextTask) {
    speech = ringDone === 0 ? `${greeting(h)}! Que tal começar por: ${nextTask.name.toLowerCase()}?` : `Faltam ${ringItems.length - ringDone}. Próxima: ${nextTask.name.toLowerCase()}.`;
  } else speech = 'Dia tranquilo por aqui. Que tal um canto do radar?';

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">{WEEKDAYS[dow]}, {now.getDate()} de {MONTHS[now.getMonth()]}</p>
        <h1>{greeting(h)}!</h1>
      </header>

      <section className="card buddy" aria-label="Mascote">
        <button className="buddy-art" onClick={() => { play('tap'); nav.guide('settings'); }} aria-label={`${state.settings.mascotName || 'Esponjito'}, ${stage.name}. Ajustar mascote`}>
          <Mascot level={lvl} color={state.settings.mascotColor} mood={mood} size={84} />
        </button>
        <div className="buddy-text">
          <p className="bubble">{speech}</p>
          <p className="muted sm">
            <strong>{state.settings.mascotName || 'Esponjito'}</strong> · {stage.name}
            {stage.next ? ` · evolui no nível ${stage.next.minLevel}` : ' · forma final'}
          </p>
        </div>
      </section>

      {onVacation && (
        <div className="card note vacation">
          <p><strong>🏖️ Modo férias ligado.</strong> A sequência fica guardada{state.vacation?.to ? ` até ${state.vacation.to.split('-').reverse().slice(0, 2).join('/')}` : ''}. As tarefas continuam aqui se quiserem marcar.</p>
          <button className="btn ghost sm" onClick={() => update((s) => ({ ...s, vacation: null }))}>Voltei das férias</button>
        </div>
      )}

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
          {streak.total > 0 && !onVacation && (
            <p className={`hero-sub ${streak.qualifies ? 'ok' : ''}`}>
              <Icon name="flame" size={16} />
              {streak.qualifies ? 'Sequência de hoje garantida!' : `Faltam ${missing} para o dia contar na sequência`}
            </p>
          )}
          <p className="hero-freeze" title="Congelamentos de sequência">
            {'🧊'.repeat(state.freezes) || '—'} <span>{state.freezes === 1 ? '1 congelamento' : `${state.freezes} congelamentos`}</span>
          </p>
        </div>
      </section>

      <MissionsCard missions={missions} onMore={() => nav.guide('history')} />

      {(quickAvailable || quick) && (
        <button className={`card quick-cta ${quick && !quick.finishedAt ? 'running' : ''}`} onClick={() => setQuickOpen(true)}>
          <span className="quick-bolt"><Icon name="bolt" size={22} /></span>
          <span className="quick-text">
            <strong>{quick?.finishedAt ? 'Relâmpago de hoje feito ✓' : quick ? 'Relâmpago em andamento' : 'Faxina relâmpago'}</strong>
            <small>{quick && !quick.finishedAt ? 'Toque para continuar' : '15 minutos com tarefas da raid que faltam'}</small>
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <section className="section">
        <h2 className="block-title"><span>☀️</span> Manhã <Count tasks={morning} /></h2>
        <TaskList tasks={morning} empty="Nenhuma rotina da manhã hoje." />
      </section>

      <section className="section">
        <h2 className="block-title"><span>🌙</span> Noite <Count tasks={night} /></h2>
        <TaskList tasks={night} empty="Nenhuma rotina da noite hoje." />
      </section>

      <section className="section">
        <h2 className="block-title"><span>🧺</span> Lavanderia de hoje</h2>
        {laundry.length > 0 ? (
          <TaskList tasks={laundry} />
        ) : isRaidDay ? (
          <div className="card note">
            <p><strong>Hoje é dia da roupa de cama.</strong> Ela vai para a máquina no começo da raid e é estendida no fechamento.</p>
            <button className="btn primary sm" onClick={() => nav.tab('raid')}>Ir para a raid</button>
          </div>
        ) : (
          <div className="card note"><p>Sem carga hoje. Delicadas e panos de limpeza vão quando juntar.</p></div>
        )}
      </section>

      {auto.length > 0 && (
        <Collapsible title="🤖 Piloto automático" subtitle={`${autoDone} de ${auto.length} hoje · valem 2 XP e não contam para a sequência`}>
          <TaskList tasks={auto} compact />
        </Collapsible>
      )}

      {corner && (
        <section className="section">
          <h2 className="block-title"><span>📡</span> Canto esquecido</h2>
          <div className="card corner">
            <div>
              <strong>{corner.task.name}</strong>
              <p className="muted">{corner.last === null ? 'Nunca feito' : `Há ${corner.since} dias`} · a cada {corner.every} dias</p>
            </div>
            <button className="btn primary sm" onClick={() => act((s, n) => toggleRadar(s, corner.task.id, n))}>Feito</button>
          </div>
        </section>
      )}

      <button className="link-row" onClick={() => nav.editor('daily')}>
        <Icon name="pencil" size={18} /> Editar rotinas
      </button>

      <QuickSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );

  function Count({ tasks: ts }: { tasks: typeof morning }) {
    if (!ts.length) return null;
    const d = ts.filter((t) => isDone(state, t, now)).length;
    return <span className={`count ${d === ts.length ? 'ok' : ''}`}>{d}/{ts.length}</span>;
  }
}

function MissionsCard({ missions, onMore }: { missions: MissionView[]; onMore: () => void }) {
  const done = missions.filter((m) => m.done).length;
  return (
    <section className="card missions" aria-label="Missões do dia">
      <div className="missions-head">
        <h2>🎯 Missões do dia</h2>
        <span className={`count ${done === missions.length ? 'ok' : ''}`}>{done}/{missions.length}</span>
      </div>
      <ul>
        {missions.map((m) => (
          <li key={m.key} className={m.done ? 'done' : ''}>
            <span className="m-icon">{m.done ? '✅' : m.def.icon}</span>
            <span className="m-text">
              <span>{m.text}</span>
              <span className="m-bar"><span style={{ width: `${(m.progress / m.target) * 100}%` }} /></span>
            </span>
            <span className="m-xp">{m.done ? '✓' : `+${m.xp}`}</span>
          </li>
        ))}
      </ul>
      <button className="missions-more" onClick={onMore}>Missões da semana e medalhas <Icon name="chevron" size={16} /></button>
    </section>
  );
}

/** Faxina relâmpago: 15 minutos com tarefas pendentes da raid. */
function QuickSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, now, update } = useStore();
  const q = state.quick[dayKey(now)];
  const [tick, setTick] = useState(Date.now());
  const alarmed = useRef(false);
  const running = !!q && !q.finishedAt;

  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => setTick(Date.now()), 500);
    return () => clearInterval(id);
  }, [open, running]);

  const left = q ? Math.max(0, QUICK_MS - ((q.finishedAt ?? tick) - q.startedAt)) : QUICK_MS;
  useEffect(() => {
    if (running && left === 0 && !alarmed.current) {
      alarmed.current = true;
      play('alarm');
    }
  }, [running, left]);

  const map = taskMap(state);
  const preview = q ? q.taskIds : pickQuickTasks(state, now);
  const tasks = preview.map((id) => map.get(id)).filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <Sheet open={open} onClose={onClose} title="⚡ Faxina relâmpago">
      <div className="quick-timer">
        <Ring pct={left / QUICK_MS} size={120} stroke={11} color={left === 0 ? 'var(--coral)' : 'var(--yellow)'}>
          <strong className="ring-num">{formatDuration(left)}</strong>
          <small>{q?.finishedAt ? 'feito!' : left === 0 ? 'tempo!' : 'restantes'}</small>
        </Ring>
        <p className="muted sm">
          {q
            ? q.finishedAt
              ? q.xp ? `Feito no tempo! +${q.xp} XP` : 'Feito! Passou do tempo, mas conta para a raid.'
              : 'As tarefas marcadas aqui também pintam o mapa da raid.'
            : 'Termine estas tarefas em até 15 minutos para ganhar +20 XP. Elas também contam para a raid.'}
        </p>
      </div>
      {q ? <TaskList tasks={tasks} /> : (
        <ul className="quick-preview">
          {tasks.map((t) => <li key={t.id}>• {t.name} <span className="muted">~{t.min ?? 5} min</span></li>)}
        </ul>
      )}
      <div className="stack quick-actions">
        {!q && (
          <button className="btn primary block" onClick={() => { alarmed.current = false; update((s, n) => startQuick(s, n)); }}>
            <Icon name="play" size={18} /> Começar 15 minutos
          </button>
        )}
        {running && <button className="btn ghost block" onClick={() => update((s, n) => cancelQuick(s, n))}>Cancelar relâmpago</button>}
      </div>
    </Sheet>
  );
}
