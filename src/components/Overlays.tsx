import { useEffect, useMemo, useRef, useState } from 'react';
import { PHASES } from '../data/content';
import { ACHIEVEMENTS, XP, taskMap, type GameEvent } from '../logic/game';
import { useStore } from '../store';
import { Icon, formatDuration } from './ui';

interface TipView {
  id: number;
  taskId: string;
  xp: number;
  extras: string[];
}

type ModalView =
  | { kind: 'consolidated'; taskId: string; unlocked: string[] }
  | { kind: 'raid'; ms: number; record: boolean }
  | { kind: 'level'; level: number; title: string };

const TIP_MS = 7000;

export function Overlays() {
  const { state, events, clearEvents } = useStore();
  const [tip, setTip] = useState<TipView | null>(null);
  const [modals, setModals] = useState<ModalView[]>([]);
  const [confetti, setConfetti] = useState(0);
  const seq = useRef(0);
  const map = useMemo(() => taskMap(state), [state]);

  useEffect(() => {
    if (!events.length) return;
    let tipTask: string | null = null;
    let xp = 0;
    const extras: string[] = [];
    const newModals: ModalView[] = [];
    for (const e of events as GameEvent[]) {
      if (e.type === 'tip') tipTask = e.taskId;
      else if (e.type === 'xp') xp += e.amount;
      else if (e.type === 'room') extras.push(`🏠 ${PHASES.find((p) => p.id === e.room)?.short} 100%! +${XP.room} XP`);
      else if (e.type === 'laundryWeek') extras.push(`🧺 Semana de lavanderia completa! +${XP.laundryWeek} XP`);
      else if (e.type === 'achievement') {
        const a = ACHIEVEMENTS.find((x) => x.id === e.id);
        if (a) extras.push(`${a.icon} Conquista: ${a.name}`);
      } else if (e.type === 'consolidated') newModals.push({ kind: 'consolidated', taskId: e.taskId, unlocked: e.unlocked });
      else if (e.type === 'raidComplete') newModals.push({ kind: 'raid', ms: e.ms, record: e.record });
      else if (e.type === 'levelUp') newModals.push({ kind: 'level', level: e.level, title: e.title });
    }
    clearEvents();
    if (tipTask) setTip({ id: ++seq.current, taskId: tipTask, xp, extras });
    if (newModals.length) {
      setModals((m) => [...m, ...newModals]);
      setConfetti((c) => c + 1);
    } else if (extras.some((x) => x.startsWith('🏠'))) setConfetti((c) => c + 1);
  }, [events, clearEvents]);

  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(() => setTip(null), TIP_MS);
    return () => clearTimeout(id);
  }, [tip]);

  const tipTask = tip ? map.get(tip.taskId) : null;
  const modal = modals[0];

  return (
    <>
      {tip && tipTask && (
        <div className="tip-card" key={tip.id} role="status" aria-live="polite">
          <div className="tip-head">
            <span className="tip-xp">+{tip.xp} XP</span>
            <span className="tip-label">Dica do mestre</span>
            <button className="icon-btn sm" onClick={() => setTip(null)} aria-label="Fechar dica"><Icon name="close" size={18} /></button>
          </div>
          <p className="tip-text">{tipTask.master ?? tipTask.tip ?? 'Mandou bem! Cada tarefa feita é uma a menos na sexta.'}</p>
          {tip.extras.map((x) => (
            <p className="tip-extra" key={x}>{x}</p>
          ))}
          <div className="tip-timer" style={{ animationDuration: `${TIP_MS}ms` }} />
        </div>
      )}

      {confetti > 0 && <Confetti key={confetti} />}

      {modal && (
        <div className="modal-wrap" role="dialog" aria-modal="true">
          <div className="modal">
            {modal.kind === 'consolidated' && (() => {
              const t = map.get(modal.taskId);
              return (
                <>
                  <div className="modal-emoji">🤖</div>
                  <h2>Piloto automático!</h2>
                  <p className="modal-lead">Você fez <strong>{t?.name}</strong> 15 vezes. Virou hábito.</p>
                  <div className="modal-box">
                    <strong>Como manter</strong>
                    <p>{t?.keep ?? 'Continue fazendo no mesmo horário e no mesmo gatilho. Agora ela vale 2 XP e não conta para a sequência, mas segue no Piloto automático para você marcar.'}</p>
                  </div>
                  {modal.unlocked.length > 0 && (
                    <div className="modal-box unlock">
                      <strong>🔓 Nova rotina de nível 2</strong>
                      {modal.unlocked.map((id) => <p key={id}>{map.get(id)?.name}</p>)}
                    </div>
                  )}
                  <p className="modal-xp">+{XP.consolidation} XP</p>
                </>
              );
            })()}
            {modal.kind === 'raid' && (
              <>
                <div className="modal-emoji">🏆</div>
                <h2>Raid completa!</h2>
                <p className="modal-lead">A casa inteira está verde. Tempo: <strong>{formatDuration(modal.ms)}</strong>.</p>
                {modal.record && <div className="modal-box unlock"><strong>⏱️ Novo recorde pessoal!</strong></div>}
                <p className="modal-xp">+{XP.raidComplete} XP</p>
              </>
            )}
            {modal.kind === 'level' && (
              <>
                <div className="modal-emoji">⭐</div>
                <h2>Nível {modal.level}</h2>
                <p className="modal-lead">Agora você é <strong>{modal.title}</strong>.</p>
              </>
            )}
            <button className="btn primary block" onClick={() => setModals((m) => m.slice(1))} autoFocus>
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const COLORS = ['#ff5a5f', '#ffc43d', '#1aa36f', '#3d7eff', '#a466ff'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    [],
  );
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGone(true), 3200);
    return () => clearTimeout(id);
  }, []);
  if (gone) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 0.45,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
