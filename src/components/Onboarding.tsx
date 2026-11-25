import { useState } from 'react';
import { PHASES, ROOM_TEMPLATES, WEEKDAYS } from '../data/content';
import { allTasks, levelInfo, phases, setAlwaysDo } from '../logic/game';
import { addRoom, setRoomHidden } from '../logic/rooms';
import { MASCOT_COLORS } from '../logic/state';
import { play } from '../lib/sound';
import { useStore } from '../store';
import { Mascot } from './Mascot';
import { Icon, Switch } from './ui';

const STEPS = 5;

/** Primeira abertura: mascote, dia da faxina, rotinas que já fazem, cômodos e um resumo. */
export function Onboarding({ standalone }: { standalone: boolean }) {
  const { state, update } = useStore();
  const [step, setStep] = useState(0);
  const st = state.settings;
  const lvl = levelInfo(state.xp).level;
  const set = (patch: Partial<typeof st>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const next = () => {
    play('tap');
    if (step < STEPS - 1) setStep(step + 1);
    else set({ onboarded: true });
  };

  const routines = allTasks(state).filter((t) => t.kind === 'daily' && !t.parent && t.enabled);
  const visible = new Set(phases(state).map((p) => p.id));
  const usedTemplates = new Set(state.rooms.custom.map((r) => r.name));

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Apresentação">
      <div className="ob-top">
        <div className="ob-dots" aria-label={`Passo ${step + 1} de ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <button className="ob-skip" onClick={() => set({ onboarded: true })}>Pular</button>
      </div>

      <div className="ob-body" key={step}>
        {step === 0 && (
          <>
            <div className="ob-hero"><Mascot level={lvl} color={st.mascotColor} mood="happy" size={150} /></div>
            <h1>Oi! Bem-vindos ao Faxina Quest</h1>
            <p className="lead">Eu vou acompanhar vocês na rotina da casa e evoluir junto a cada nível. Como querem me chamar?</p>
            <label className="field">
              <span>Nome do mascote</span>
              <input value={st.mascotName} maxLength={20} onChange={(e) => set({ mascotName: e.target.value })} placeholder="Esponjito" />
            </label>
            <div className="swatches center" role="radiogroup" aria-label="Cor do mascote">
              {MASCOT_COLORS.map((c) => (
                <button key={c} role="radio" aria-checked={st.mascotColor === c} aria-label={`Cor ${c}`} className={`swatch ${st.mascotColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ mascotColor: c })} />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="ob-emoji">🧹</div>
            <h1>Qual é o dia da faxina completa?</h1>
            <p className="lead">Nesse dia o app abre direto na raid: a faxina da casa inteira, cômodo por cômodo, com cronômetro e combo.</p>
            <div className="day-choices">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} className={`day-choice ${st.raidDay === d ? 'on' : ''}`} aria-pressed={st.raidDay === d} onClick={() => set({ raidDay: d })}>
                  {WEEKDAYS[d]}
                </button>
              ))}
            </div>
            <p className="muted sm">Dá para mudar depois na aba da faxina ou em Guia → Ajustes.</p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="ob-emoji">🤖</div>
            <h1>O que vocês já fazem sempre?</h1>
            <p className="lead">Marque as rotinas que já são hábito. Elas vão direto para o piloto automático e liberam a versão de nível 2.</p>
            <ul className="edit-list ob-list">
              {routines.map((t) => (
                <li key={t.id} className="edit-row">
                  <div className="edit-text"><strong>{t.name}</strong><small>{t.when === 'manha' ? '☀️ Manhã' : '🌙 Noite'}</small></div>
                  <Switch on={!!state.consolidated[t.id]} label={`Já faço sempre: ${t.name}`} onChange={(v) => update((s, n) => setAlwaysDo(s, t.id, v, n))} />
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <div className="ob-emoji">🏠</div>
            <h1>Como é a casa de vocês?</h1>
            <p className="lead">Desligue o que não existe e adicione o que falta. Cada cômodo vira um pedaço do mapa.</p>
            <ul className="edit-list ob-list">
              {PHASES.filter((p) => p.id !== 'prep' && p.id !== 'fechamento').map((p) => (
                <li key={p.id} className="edit-row">
                  <span className="room-emoji">{p.emoji}</span>
                  <div className="edit-text"><strong>{p.name}</strong></div>
                  <Switch on={visible.has(p.id)} label={`Tenho ${p.name}`} onChange={(v) => update((s) => setRoomHidden(s, p.id, !v))} />
                </li>
              ))}
              {state.rooms.custom.map((r) => (
                <li key={r.id} className="edit-row">
                  <span className="room-emoji">{r.emoji}</span>
                  <div className="edit-text"><strong>{r.name}</strong><small>adicionado</small></div>
                  <Icon name="check" size={20} />
                </li>
              ))}
            </ul>
            <div className="chip-row">
              {ROOM_TEMPLATES.filter((t) => !usedTemplates.has(t.name)).map((t) => (
                <button key={t.name} className="chip" onClick={() => update((s) => addRoom(s, t.name, t.emoji))}><Icon name="plus" size={16} /> {t.emoji} {t.name}</button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="ob-hero"><Mascot level={lvl} color={st.mascotColor} mood="proud" size={130} /></div>
            <h1>Tudo pronto!</h1>
            <ul className="ob-tips">
              <li><span>☀️</span><p><strong>Hoje:</strong> rotinas da manhã e da noite, lavanderia e 3 missões por dia.</p></li>
              <li><span>🗺️</span><p><strong>Mapa:</strong> cada tarefa da faxina pinta o cômodo, do coral ao verde.</p></li>
              <li><span>⚡</span><p><strong>Relâmpago:</strong> sem tempo? 15 minutos já adiantam a raid.</p></li>
              <li><span>🧊</span><p><strong>Sequência:</strong> marque mais de 2 tarefas no dia (qualquer uma). Congelamentos e modo férias protegem vocês.</p></li>
              {!standalone && <li><span>📱</span><p><strong>Instale:</strong> Compartilhar → Adicionar à Tela de Início, para o iPhone não apagar seus dados.</p></li>}
            </ul>
          </>
        )}
      </div>

      <div className="ob-foot">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Voltar</button>}
        <button className="btn primary grow" onClick={next}>{step === STEPS - 1 ? 'Começar' : 'Continuar'}</button>
      </div>
    </div>
  );
}
