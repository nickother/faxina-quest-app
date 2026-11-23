import { useState } from 'react';
import { ShareButton } from '../components/ShareButton';
import { Icon, formatDuration } from '../components/ui';
import { levelInfo, phases } from '../logic/game';
import { currentMissions, monthMissionCount } from '../logic/missions';
import { monthGrid, raidHistory, summary, weeklyXp } from '../logic/history';
import { monthKey } from '../logic/period';
import { MEDAL_MISSIONS } from '../logic/game';
import { useStore } from '../store';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function History() {
  const { state, now } = useStore();
  const sum = summary(state, now);
  const lvl = levelInfo(state.xp);
  const { weekly } = currentMissions(state, now);
  const month = monthKey(now);
  const monthCount = monthMissionCount(state, month);

  return (
    <div className="stack-lg">
      <div className="stat-grid">
        <Stat value={`${sum.streak}`} label="dias de sequência" />
        <Stat value={`${sum.longest}`} label="maior sequência" />
        <Stat value={`${sum.totalTasks}`} label="tarefas feitas" />
        <Stat value={`${sum.raidsDone}`} label="raids completas" />
      </div>

      <Calendar />

      <section className="card chart-card">
        <h3>XP por semana</h3>
        <WeekChart />
        {sum.bestWeek && sum.bestWeek.xp > 0 && <p className="muted sm">Melhor semana: <strong>{sum.bestWeek.xp} XP</strong></p>}
      </section>

      <section className="card chart-card">
        <h3>Tempo das raids</h3>
        <RaidChart />
      </section>

      <Records />

      <section className="card missions">
        <div className="missions-head">
          <h2>🗓️ Missões da semana</h2>
          <span className="count">{weekly.filter((m) => m.done).length}/{weekly.length}</span>
        </div>
        <ul>
          {weekly.map((m) => (
            <li key={m.key} className={m.done ? 'done' : ''}>
              <span className="m-icon">{m.done ? '✅' : m.def.icon}</span>
              <span className="m-text">
                <span>{m.text} <small className="muted">{m.progress}/{m.target}</small></span>
                <span className="m-bar"><span style={{ width: `${(m.progress / m.target) * 100}%` }} /></span>
              </span>
              <span className="m-xp">{m.done ? '✓' : `+${m.xp}`}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card medals">
        <h3>🏅 Medalhas do mês</h3>
        <p className="muted sm">Complete {MEDAL_MISSIONS} missões diárias num mês para ganhar a medalha.</p>
        <div className="medal-progress">
          <div className="bar"><div className="bar-fill" style={{ width: `${Math.min(1, monthCount / MEDAL_MISSIONS) * 100}%`, background: 'var(--yellow)' }} /></div>
          <span>{Math.min(monthCount, MEDAL_MISSIONS)}/{MEDAL_MISSIONS}</span>
        </div>
        {Object.keys(state.medals).length > 0 && (
          <ul className="medal-list">
            {Object.keys(state.medals).sort().reverse().map((m) => (
              <li key={m}><span>🏅</span>{MONTHS[Number(m.slice(5)) - 1]} {m.slice(0, 4)}</li>
            ))}
          </ul>
        )}
      </section>

      <ShareButton
        label="Compartilhar meu resumo"
        className="btn primary block"
        data={{
          kicker: `Nível ${lvl.level} · ${lvl.title}`,
          title: 'Meu placar da faxina',
          big: `${sum.streak} ${sum.streak === 1 ? 'dia' : 'dias'}`,
          subtitle: 'de sequência no Faxina Quest',
          stats: [
            { label: 'tarefas', value: String(sum.totalTasks) },
            { label: 'raids', value: String(sum.raidsDone) },
            { label: 'XP', value: String(state.xp) },
          ],
        }}
      />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Calendar() {
  const { state, now } = useStore();
  const [offset, setOffset] = useState(0);
  const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1, 12);
  const days = monthGrid(state, ref.getFullYear(), ref.getMonth(), now);
  const [sel, setSel] = useState<string | null>(null);
  const selDay = days.find((d) => d.key === sel);

  return (
    <section className="card calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={() => setOffset(offset - 1)} aria-label="Mês anterior"><Icon name="back" size={20} /></button>
        <h3>{MONTHS[ref.getMonth()]} {ref.getFullYear()}</h3>
        <button className="icon-btn" onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label="Próximo mês"><Icon name="chevron" size={20} /></button>
      </div>
      <div className="cal-grid" role="grid">
        {WD.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
        {days.map((d) => {
          const cls = d.mark === true ? 'ok' : d.mark === 'freeze' ? 'freeze' : d.mark === 'vacation' ? 'vacation' : d.tasks > 0 ? 'some' : '';
          return (
            <button
              key={d.key}
              className={`cal-day ${cls} ${d.inMonth ? '' : 'out'} ${d.future ? 'future' : ''} ${sel === d.key ? 'sel' : ''}`}
              disabled={d.future}
              onClick={() => setSel(sel === d.key ? null : d.key)}
              aria-label={`${d.day}: ${d.tasks} tarefas`}
            >
              {d.mark === 'freeze' ? '🧊' : d.mark === 'vacation' ? '🏖️' : d.day}
              {d.raid && <i className="cal-raid" />}
            </button>
          );
        })}
      </div>
      <p className="cal-info" aria-live="polite">
        {selDay
          ? `${selDay.key.split('-').reverse().join('/')}: ${selDay.tasks} ${selDay.tasks === 1 ? 'tarefa' : 'tarefas'}${selDay.mark === true ? ', contou na sequência' : selDay.mark === 'freeze' ? ', salvo por congelamento' : selDay.mark === 'vacation' ? ', férias' : ''}${selDay.raid ? ', dia de raid' : ''}.`
          : 'Toque num dia para ver o resumo.'}
      </p>
      <div className="cal-legend">
        <span><i className="lg ok" /> sequência</span>
        <span><i className="lg some" /> fez algo</span>
        <span>🧊 congelado</span>
        <span>🏖️ férias</span>
        <span><i className="lg raid" /> raid</span>
      </div>
    </section>
  );
}

/** Barras verticais de uma série; toque numa barra mostra o valor. */
function BarChart({ bars, format, empty }: { bars: { key: string; label: string; value: number; highlight?: boolean }[]; format: (v: number) => string; empty: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 0);
  if (max <= 0) return <p className="empty">{empty}</p>;
  const W = 320;
  const H = 150;
  const top = 22;
  const base = H - 22;
  const slot = W / bars.length;
  const bw = Math.min(26, slot * 0.55);
  const selected = bars.find((b) => b.key === sel) ?? bars.find((b) => b.highlight);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={bars.map((b) => `${b.label}: ${format(b.value)}`).join(', ')}>
      <line x1="0" x2={W} y1={base} y2={base} className="chart-axis" />
      {bars.map((b, i) => {
        const h = Math.max(b.value > 0 ? 4 : 0, ((base - top) * b.value) / max);
        const x = i * slot + (slot - bw) / 2;
        const isSel = selected?.key === b.key;
        return (
          <g key={b.key} onClick={() => setSel(b.key === sel ? null : b.key)} className="chart-col">
            <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
            {h > 0 && <path d={`M${x} ${base}V${base - h + 4}q0 -4 4 -4h${bw - 8}q4 0 4 4V${base}z`} className={`chart-bar ${isSel ? 'sel' : ''} ${b.highlight ? 'hl' : ''}`} />}
            <text x={i * slot + slot / 2} y={H - 6} className="chart-x">{b.label}</text>
            {isSel && <text x={i * slot + slot / 2} y={Math.max(12, base - h - 6)} className="chart-val">{format(b.value)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function WeekChart() {
  const { state, now } = useStore();
  const weeks = weeklyXp(state, now, 8);
  return <BarChart bars={weeks.map((w) => ({ key: w.key, label: w.label, value: w.xp, highlight: w.current }))} format={(v) => `${v} XP`} empty="Ainda sem XP. Marque a primeira tarefa!" />;
}

function RaidChart() {
  const { state } = useStore();
  const rows = raidHistory(state).slice(0, 8).reverse();
  return (
    <>
      <BarChart
        bars={rows.map((r) => ({ key: r.key, label: r.label.replace('Semana de ', ''), value: r.ms, highlight: state.bestRaidMs === r.ms && r.complete }))}
        format={(v) => formatDuration(v)}
        empty="Nenhuma raid cronometrada ainda."
      />
      {rows.length > 0 && (
        <table className="raid-table">
          <thead>
            <tr><th>Semana</th><th>Tempo</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.key}>
                <td>{r.label.replace('Semana de ', '')}</td>
                <td>{formatDuration(r.ms)}</td>
                <td>{r.complete ? (state.bestRaidMs === r.ms ? '🏆 recorde' : '✓ completa') : `${r.rooms} cômodos`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Records() {
  const { state, now } = useStore();
  const sum = summary(state, now);
  const ph = phases(state).filter((p) => p.room);
  const items: { icon: string; label: string; value: string }[] = [
    { icon: '⏱️', label: 'Raid mais rápida', value: state.bestRaidMs != null ? formatDuration(state.bestRaidMs) : '—' },
    { icon: '⚡', label: 'Maior combo', value: state.maxCombo ? `+${state.maxCombo} XP` : '—' },
    { icon: '📈', label: 'Melhor semana', value: sum.bestWeek && sum.bestWeek.xp > 0 ? `${sum.bestWeek.xp} XP` : '—' },
    { icon: '🔥', label: 'Maior sequência', value: `${sum.longest} dias` },
    ...ph.map((p) => ({ icon: p.emoji, label: p.short, value: state.records.roomMs[p.id] ? formatDuration(state.records.roomMs[p.id]) : '—' })),
  ];
  return (
    <section className="card records">
      <h3>🏆 Recordes</h3>
      <ul>
        {items.map((r) => (
          <li key={r.label}><span>{r.icon}</span><span className="r-label">{r.label}</span><strong>{r.value}</strong></li>
        ))}
      </ul>
      <p className="muted sm">O tempo de cada cômodo vai da primeira à última tarefa dele na raid.</p>
    </section>
  );
}
