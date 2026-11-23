import { useEffect, useMemo, useRef, useState } from 'react';
import { ACHIEVEMENTS, XP, levelInfo, phaseName, taskMap, type GameEvent } from '../logic/game';
import { play } from '../lib/sound';
import { useStore } from '../store';
import { Mascot } from './Mascot';
import { ShareButton } from './ShareButton';
import { Icon, formatDuration } from './ui';

interface TipView {
  id: number;
  taskId: string | null;
  xp: number;
  extras: string[];
}

type ModalView =
  | { kind: 'consolidated'; taskId: string; unlocked: string[] }
  | { kind: 'raid'; ms: number; record: boolean }
  | { kind: 'level'; level: number; title: string }
  | { kind: 'medal'; month: string }
  | { kind: 'quick'; xp: number; ms: number }
  | { kind: 'freezeUsed'; days: number };

interface Float {
  id: number;
  x: number;
  y: number;
  text: string;
}

const TIP_MS = 7000;
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** posição do último toque, para o "+XP" subir de onde o dedo tocou */
const lastTap = { x: 0, y: 0, t: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => Object.assign(lastTap, { x: e.clientX, y: e.clientY, t: Date.now() }), { capture: true, passive: true });
}

export function Overlays() {
  const { state, events, clearEvents } = useStore();
  const [tip, setTip] = useState<TipView | null>(null);
  const [modals, setModals] = useState<ModalView[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const seq = useRef(0);
  const map = useMemo(() => taskMap(state), [state]);

  useEffect(() => {
    if (!events.length) return;
    let tipTask: string | null = null;
    let xp = 0;
    let combo = 0;
    const extras: string[] = [];
    const newModals: ModalView[] = [];
    let sound: Parameters<typeof play>[0] | null = null;
    let big = false;
    for (const e of events as GameEvent[]) {
      switch (e.type) {
        case 'tip':
          tipTask = e.taskId;
          break;
        case 'xp':
          xp += e.amount;
          combo = Math.max(combo, e.combo ?? 0);
          sound ??= combo > 0 ? 'combo' : 'check';
          break;
        case 'room':
          extras.push(`🏠 ${phaseName(state, e.room)} 100%! +${XP.room} XP`);
          sound = 'room';
          big = true;
          break;
        case 'laundryWeek':
          extras.push(`🧺 Semana de lavanderia completa! +${XP.laundryWeek} XP`);
          sound = 'room';
          break;
        case 'achievement': {
          const a = ACHIEVEMENTS.find((x) => x.id === e.id);
          if (a) extras.push(`${a.icon} Conquista: ${a.name}`);
          break;
        }
        case 'record':
          extras.push(`🏆 Novo recorde! ${e.label}`);
          sound = 'record';
          big = true;
          break;
        case 'mission':
          extras.push(`🎯 Missão cumprida: ${e.text} +${e.xp} XP`);
          if (sound !== 'record' && sound !== 'room') sound = 'mission';
          break;
        case 'freezeEarned':
          extras.push('🧊 Você ganhou um congelamento de sequência!');
          break;
        case 'consolidated':
          newModals.push({ kind: 'consolidated', taskId: e.taskId, unlocked: e.unlocked });
          break;
        case 'raidComplete':
          newModals.push({ kind: 'raid', ms: e.ms, record: e.record });
          break;
        case 'levelUp':
          newModals.push({ kind: 'level', level: e.level, title: e.title });
          break;
        case 'medal':
          newModals.push({ kind: 'medal', month: e.month });
          break;
        case 'quickDone':
          newModals.push({ kind: 'quick', xp: e.xp, ms: e.ms });
          break;
        case 'freezeUsed':
          newModals.push({ kind: 'freezeUsed', days: e.days });
          break;
      }
    }
    clearEvents();
    const celebratory = newModals.some((m) => m.kind !== 'freezeUsed');
    if (celebratory) sound = 'fanfare';
    if (sound) play(sound, combo);
    if (xp > 0 && Date.now() - lastTap.t < 2000) {
      const id = ++seq.current;
      setFloats((f) => [...f, { id, x: lastTap.x, y: lastTap.y, text: combo > 0 ? `+${xp} combo x${combo + 1}` : `+${xp} XP` }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
      pulseBadge();
    }
    if (tipTask || extras.length) setTip({ id: ++seq.current, taskId: tipTask, xp, extras });
    if (newModals.length) setModals((m) => [...m, ...newModals]);
    if (celebratory || big) setConfetti((c) => c + 1);
  }, [events, clearEvents, state]);

  useEffect(() => {
    if (!tip) return;
    const id = setTimeout(() => setTip(null), TIP_MS + tip.extras.length * 1000);
    return () => clearTimeout(id);
  }, [tip]);

  const tipTask = tip?.taskId ? map.get(tip.taskId) : null;
  const modal = modals[0];
  const lvl = levelInfo(state.xp).level;
  const color = state.settings.mascotColor;
  const close = () => setModals((m) => m.slice(1));

  return (
    <>
      {floats.map((f) => (
        <span key={f.id} className="xp-float" style={{ left: f.x, top: f.y }} aria-hidden="true">{f.text}</span>
      ))}

      {tip && (
        <div className="tip-card" key={tip.id} role="status" aria-live="polite">
          <div className="tip-head">
            {tip.xp > 0 && <span className="tip-xp">+{tip.xp} XP</span>}
            <span className="tip-label">{tipTask ? 'Dica do mestre' : 'Boa!'}</span>
            <button className="icon-btn sm" onClick={() => setTip(null)} aria-label="Fechar dica"><Icon name="close" size={18} /></button>
          </div>
          {tipTask && <p className="tip-text">{tipTask.master ?? tipTask.tip ?? 'Mandou bem! Cada tarefa feita é uma a menos no dia da faxina.'}</p>}
          {tip.extras.map((x) => (
            <p className="tip-extra" key={x}>{x}</p>
          ))}
          <div className="tip-timer" style={{ animationDuration: `${TIP_MS + tip.extras.length * 1000}ms` }} />
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
                  <div className="modal-mascot"><Mascot level={lvl} color={color} mood="proud" size={110} /></div>
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
                  <ShareButton data={{ kicker: 'Piloto automático', title: t?.name ?? 'Nova rotina', big: '15×', subtitle: 'Virou hábito no Faxina Quest.' }} />
                </>
              );
            })()}
            {modal.kind === 'raid' && (
              <>
                <div className="modal-mascot"><Mascot level={lvl} color={color} mood="proud" size={110} /></div>
                <h2>Raid completa!</h2>
                <p className="modal-lead">A casa inteira está verde. Tempo: <strong>{formatDuration(modal.ms)}</strong>.</p>
                {modal.record && <div className="modal-box unlock"><strong>⏱️ Novo recorde pessoal!</strong></div>}
                <p className="modal-xp">+{XP.raidComplete} XP</p>
                <ShareButton data={{ kicker: modal.record ? 'Novo recorde' : 'Raid completa', title: 'Casa 100% limpa', big: formatDuration(modal.ms), subtitle: 'Faxina completa, do quarto ao banheiro.', accent: '#1aa36f' }} />
              </>
            )}
            {modal.kind === 'level' && (
              <>
                <div className="modal-mascot"><Mascot level={modal.level} color={color} mood="proud" size={120} /></div>
                <h2>Nível {modal.level}</h2>
                <p className="modal-lead">Agora você é <strong>{modal.title}</strong>.</p>
                <ShareButton data={{ kicker: `Nível ${modal.level}`, title: modal.title, big: `Nv. ${modal.level}`, subtitle: 'Subi de nível no Faxina Quest!' }} />
              </>
            )}
            {modal.kind === 'medal' && (
              <>
                <div className="modal-emoji">🏅</div>
                <h2>Medalha de {MONTHS[Number(modal.month.slice(5)) - 1]}!</h2>
                <p className="modal-lead">Vocês completaram 20 missões diárias este mês.</p>
                <ShareButton data={{ kicker: 'Medalha do mês', title: `Medalha de ${MONTHS[Number(modal.month.slice(5)) - 1]}`, big: '🏅', subtitle: '20 missões diárias cumpridas.' }} />
              </>
            )}
            {modal.kind === 'quick' && (
              <>
                <div className="modal-emoji">💨</div>
                <h2>{modal.xp ? 'Relâmpago no tempo!' : 'Relâmpago completo'}</h2>
                <p className="modal-lead">Feito em <strong>{formatDuration(modal.ms)}</strong>. {modal.xp ? 'Dentro dos 15 minutos.' : 'Passou dos 15 minutos, mas está feito!'}</p>
                {modal.xp > 0 && <p className="modal-xp">+{modal.xp} XP</p>}
              </>
            )}
            {modal.kind === 'freezeUsed' && (
              <>
                <div className="modal-emoji">🧊</div>
                <h2>Sequência salva!</h2>
                <p className="modal-lead">
                  {modal.days === 1 ? 'Um dia ficou sem rotinas, e um congelamento' : `${modal.days} dias ficaram sem rotinas, e ${modal.days} congelamentos`} {modal.days === 1 ? 'segurou' : 'seguraram'} a sua sequência.
                </p>
                <p className="muted sm">Você ganha um congelamento novo a cada 7 dias seguidos (guarda até 2).</p>
              </>
            )}
            <button className="btn primary block" onClick={close} autoFocus>
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function pulseBadge() {
  const el = document.querySelector('.lvl-badge');
  if (!el) return;
  el.classList.remove('pulse');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('pulse');
}

const COLORS = ['#ff5a5f', '#ffc43d', '#1aa36f', '#3d7eff', '#a466ff'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 360,
        size: 6 + Math.random() * 6,
        round: i % 4 === 0,
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
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
