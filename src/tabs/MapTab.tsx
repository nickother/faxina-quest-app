import { useState } from 'react';
import { PHASES } from '../data/content';
import type { PhaseId, RoomId } from '../data/types';
import { TaskList } from '../components/TaskRow';
import { Bar, Icon, Sheet, progressColor } from '../components/ui';
import { houseProgress, phaseProgress } from '../logic/game';
import { useStore } from '../store';
import type { Nav } from '../App';

interface RoomGeo {
  id: RoomId;
  label: string;
  x: number; y: number; w: number; h: number;
  lx: number; ly: number;
  furniture: React.ReactNode;
}

/* Planta baixa (viewBox 340 x 400). Paredes externas de 10 a 330 x 10 a 390. */
const ROOMS: RoomGeo[] = [
  {
    id: 'quarto', label: 'Quarto', x: 10, y: 10, w: 180, h: 150, lx: 85, ly: 112,
    furniture: (
      <>
        <rect x="42" y="26" width="86" height="96" rx="5" />
        <rect x="50" y="32" width="32" height="15" rx="4" />
        <rect x="88" y="32" width="32" height="15" rx="4" />
        <path d="M42 64h86" />
        <rect x="18" y="26" width="18" height="18" rx="2" />
        <rect x="134" y="26" width="18" height="18" rx="2" />
        <rect x="162" y="22" width="22" height="92" rx="2" />
        <path d="M173 22v92" />
      </>
    ),
  },
  {
    id: 'banheiro', label: 'Banheiro', x: 190, y: 10, w: 140, h: 100, lx: 240, ly: 76,
    furniture: (
      <>
        <rect x="280" y="16" width="44" height="48" rx="2" />
        <path d="M280 16l44 48" />
        <circle cx="302" cy="40" r="3" />
        <rect x="200" y="16" width="20" height="8" rx="2" />
        <ellipse cx="210" cy="36" rx="9" ry="12" />
        <rect x="236" y="16" width="30" height="18" rx="3" />
        <ellipse cx="251" cy="25" rx="9" ry="5" />
      </>
    ),
  },
  {
    id: 'escritorio', label: 'Escritório', x: 190, y: 110, w: 140, h: 120, lx: 264, ly: 198,
    furniture: (
      <>
        <rect x="198" y="118" width="74" height="22" rx="2" />
        <rect x="222" y="122" width="26" height="4" rx="1" />
        <circle cx="235" cy="154" r="9" />
        <rect x="306" y="182" width="18" height="40" rx="2" />
        <path d="M306 195h18M306 208h18" />
      </>
    ),
  },
  {
    id: 'sala', label: 'Sala', x: 10, y: 160, w: 180, h: 230, lx: 90, ly: 300,
    furniture: (
      <>
        <rect x="18" y="170" width="84" height="12" rx="2" />
        <rect x="40" y="176" width="40" height="3" rx="1" />
        <circle cx="140" cy="236" r="20" />
        <circle cx="140" cy="206" r="6" />
        <circle cx="140" cy="266" r="6" />
        <circle cx="110" cy="236" r="6" />
        <circle cx="170" cy="236" r="6" />
        <rect x="62" y="324" width="56" height="20" rx="4" />
        <rect x="30" y="352" width="120" height="30" rx="6" />
        <path d="M30 372h120M30 352v30M150 352v30" />
      </>
    ),
  },
  {
    id: 'cozinha', label: 'Cozinha', x: 190, y: 230, w: 140, h: 160, lx: 245, ly: 300,
    furniture: (
      <>
        <rect x="298" y="238" width="26" height="146" rx="2" />
        <rect x="302" y="246" width="18" height="28" rx="3" />
        <rect x="300" y="290" width="22" height="26" rx="2" />
        <circle cx="306" cy="297" r="3" /><circle cx="316" cy="297" r="3" />
        <circle cx="306" cy="309" r="3" /><circle cx="316" cy="309" r="3" />
        <rect x="198" y="350" width="32" height="34" rx="3" />
        <path d="M198 362h32" />
      </>
    ),
  },
];

/** Paredes (com vãos das portas) */
const WALLS = [
  // externas
  'M10 10H330', 'M330 10V140', 'M330 172V390', 'M10 390H330', 'M10 10V390',
  // quarto | sala (porta em 120–150)
  'M10 160H120', 'M150 160H190',
  // eixo x=190 (porta sala/hall 180–215, abertura da cozinha 280–340)
  'M190 10V180', 'M190 215V280', 'M190 340V390',
  // banheiro | hall (porta 290–318)
  'M190 110H290', 'M318 110H330',
  // hall | cozinha
  'M190 230H330',
];

const DOORS = [
  'M120 160V130A30 30 0 0 1 150 160', // quarto
  'M318 110V82A28 28 0 0 0 290 110', // banheiro
  'M190 180H225A35 35 0 0 1 190 215', // sala -> hall
  'M330 140H298A32 32 0 0 0 330 172', // porta de entrada
];

const WINDOWS = ['M40 10H110', 'M10 220V300', 'M60 390H150', 'M230 390H300', 'M330 40V90'];

export function MapTab({ nav }: { nav: Nav }) {
  const { state, now } = useStore();
  const [open, setOpen] = useState<PhaseId | null>(null);
  const house = houseProgress(state, now);
  const openPhase = open ? PHASES.find((p) => p.id === open)! : null;
  const openProg = open ? phaseProgress(state, open, now) : null;

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">Raid desta semana</p>
        <h1>Mapa da casa</h1>
        <p className="lead">Cada tarefa pinta o cômodo. Toque num cômodo para ver o que falta.</p>
      </header>

      <section className="card plan-card">
        <div className="house-top">
          <p className="house-pct" data-testid="house-pct">{Math.round(house.pct * 100)}%</p>
          <div className="house-side">
            <p className="muted sm"><strong>Casa inteira</strong> · {house.done} de {house.total} tarefas</p>
            <Bar pct={house.pct} label="Progresso da casa" />
          </div>
        </div>
        <svg className="plan" viewBox="0 0 340 400" role="group" aria-label="Planta baixa do apartamento">
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="var(--hatch)" strokeWidth="3" />
            </pattern>
          </defs>
          {ROOMS.map((r) => {
            const p = phaseProgress(state, r.id, now);
            const color = progressColor(p.pct);
            return (
              <g
                key={r.id}
                className="room"
                data-room={r.id}
                data-pct={Math.round(p.pct * 100)}
                role="button"
                tabIndex={0}
                aria-label={`${r.label}: ${Math.round(p.pct * 100)}%, faltam ${p.left}`}
                onClick={() => setOpen(r.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen(r.id)}
              >
                <rect className="room-floor" x={r.x} y={r.y} width={r.w} height={r.h} />
                <rect
                  className="room-fill"
                  x={r.x} y={r.y} width={r.w} height={r.h}
                  fill={color}
                  style={{ transform: `scaleY(${p.pct})` }}
                />
                {p.pct === 0 && <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#hatch)" />}
                <g className="furniture">{r.furniture}</g>
                <g className="room-label" transform={`translate(${r.lx} ${r.ly})`}>
                  <rect x="-44" y="-26" width="88" height="52" rx="12" />
                  <text className="rl-name" y="-9">{r.label}</text>
                  <text className="rl-pct" y="11" style={{ fill: p.pct === 1 ? 'var(--green-ink)' : undefined }}>{Math.round(p.pct * 100)}%</text>
                  <text className="rl-left" y="22">{p.left ? `faltam ${p.left}` : 'pronto ✓'}</text>
                </g>
              </g>
            );
          })}
          <g className="windows">{WINDOWS.map((d) => <path key={d} d={d} />)}</g>
          <g className="walls">{WALLS.map((d) => <path key={d} d={d} />)}</g>
          <g className="doors">{DOORS.map((d) => <path key={d} d={d} />)}</g>
          <text className="entry" x="304" y="133">entrada</text>
        </svg>
        <div className="legend">
          <span>0%</span>
          <div className="legend-bar" />
          <span>100%</span>
        </div>
        <div className="chips">
          {(['prep', 'fechamento'] as const).map((id) => {
            const p = phaseProgress(state, id, now);
            const ph = PHASES.find((x) => x.id === id)!;
            return (
              <button key={id} className="chip" onClick={() => setOpen(id)} data-phase={id} style={{ ['--c' as string]: progressColor(p.pct) }}>
                <span className="chip-dot" />
                {ph.emoji} {ph.name} <strong>{Math.round(p.pct * 100)}%</strong>
              </button>
            );
          })}
        </div>
      </section>

      <button className="link-row" onClick={() => nav.tab('raid')}>
        <Icon name="raid" size={18} /> Abrir a raid com cronômetro e combo
      </button>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={openPhase ? `${openPhase.emoji} ${openPhase.name}` : ''}>
        {openProg && (
          <>
            <div className="sheet-progress">
              <Bar pct={openProg.pct} />
              <span>{openProg.done}/{openProg.total}</span>
            </div>
            <TaskList tasks={openProg.tasks} empty="Nenhuma tarefa ligada neste cômodo." />
          </>
        )}
      </Sheet>
    </div>
  );
}
