import { useState } from 'react';
import { MASCOT_STAGES, ROOM_TEMPLATES, WEEKDAYS } from '../data/content';
import { Mascot, mascotStage } from '../components/Mascot';
import { ConfirmButton, Icon, Switch } from '../components/ui';
import { FREEZE_EVERY, levelInfo, phaseProgress, phases, setVacation } from '../logic/game';
import { addProduct, addRoom, cycleProduct, deleteProduct, deleteRoom, renameRoom, setProduct, setRoomHidden, shoppingText } from '../logic/rooms';
import { dayKey } from '../logic/period';
import { MASCOT_COLORS, MAX_FREEZES, type ProductStatus } from '../logic/state';
import { PHASES } from '../data/content';
import { play } from '../lib/sound';
import { shareText } from '../lib/share';
import { useStore } from '../store';

/* ------------------------------------------------------------------ */
/* Ajustes                                                             */
/* ------------------------------------------------------------------ */
export function Settings() {
  const { state, now, update } = useStore();
  const st = state.settings;
  const lvl = levelInfo(state.xp).level;
  const stage = mascotStage(lvl);
  const [until, setUntil] = useState('');
  const set = (patch: Partial<typeof st>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <div className="stack-lg">
      <section className="card settings-card">
        <h3>Mascote</h3>
        <div className="mascot-edit">
          <Mascot level={lvl} color={st.mascotColor} mood="happy" size={110} />
          <div className="stack">
            <label className="field">
              <span>Nome</span>
              <input value={st.mascotName} maxLength={20} onChange={(e) => set({ mascotName: e.target.value })} placeholder="Esponjito" />
            </label>
            <div className="swatches" role="radiogroup" aria-label="Cor do mascote">
              {MASCOT_COLORS.map((c) => (
                <button key={c} role="radio" aria-checked={st.mascotColor === c} aria-label={`Cor ${c}`} className={`swatch ${st.mascotColor === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ mascotColor: c })} />
              ))}
            </div>
          </div>
        </div>
        <ol className="stages">
          {MASCOT_STAGES.map((m, i) => (
            <li key={m.name} className={i <= stage.index ? 'got' : ''}>
              <Mascot level={m.minLevel} color={i <= stage.index ? st.mascotColor : '#e4ded2'} size={46} mood={i <= stage.index ? 'happy' : 'calm'} />
              <span><strong>{m.name}</strong><small>nível {m.minLevel}</small></span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card settings-card">
        <h3>Dia da faxina</h3>
        <p className="muted sm">A raid da semana pode ser feita em qualquer dia; este é o dia em que o app abre direto nela e lembra da roupa de cama.</p>
        <select value={st.raidDay} onChange={(e) => set({ raidDay: Number(e.target.value) })} aria-label="Dia da faxina">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{WEEKDAYS[d]}</option>)}
        </select>
      </section>

      <section className="card settings-card">
        <div className="row between">
          <div>
            <h3>Sons</h3>
            <p className="muted sm">Comemorações, combo e alarme da faxina relâmpago.</p>
          </div>
          <Switch on={st.sound} label="Sons" onChange={(v) => { set({ sound: v }); if (v) setTimeout(() => play('mission'), 50); }} />
        </div>
        <p className="muted sm">No iPhone, o som segue o volume do aparelho. Se não ouvir nada, confira o volume e o modo silencioso.</p>
      </section>

      <section className="card settings-card">
        <h3>🧊 Congelamentos de sequência</h3>
        <p className="freeze-big">{'🧊'.repeat(state.freezes) || 'Nenhum'} <span className="muted sm">{state.freezes}/{MAX_FREEZES}</span></p>
        <p className="muted sm">Se um dia passar sem as rotinas, um congelamento segura a sequência automaticamente. Você ganha um a cada {FREEZE_EVERY} dias seguidos e guarda até {MAX_FREEZES}.</p>
      </section>

      <section className="card settings-card">
        <div className="row between">
          <div>
            <h3>🏖️ Modo férias</h3>
            <p className="muted sm">Viagem ou semana pesada: a sequência fica guardada e não gasta congelamento.</p>
          </div>
          <Switch on={!!state.vacation} label="Modo férias" onChange={(v) => update((s, n) => setVacation(s, v, n, v && until ? until : null))} />
        </div>
        {!state.vacation && (
          <label className="field">
            <span>Até quando <small>opcional</small></span>
            <input type="date" value={until} min={dayKey(now)} onChange={(e) => setUntil(e.target.value)} />
          </label>
        )}
        {state.vacation && <p className="success">Ligado desde {state.vacation.from.split('-').reverse().join('/')}{state.vacation.to ? ` até ${state.vacation.to.split('-').reverse().join('/')}` : ' (até você desligar)'}.</p>}
      </section>

      <section className="card settings-card">
        <h3>Apresentação</h3>
        <p className="muted sm">Mostra de novo o passo a passo do começo.</p>
        <button className="btn ghost block" onClick={() => set({ onboarded: false })}>Rever a apresentação</button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cômodos                                                             */
/* ------------------------------------------------------------------ */
const EMOJIS = ['🏠', '🧼', '🪴', '🚽', '🛌', '👗', '🚪', '🧸', '🐾', '🏋️', '🎮', '📚'];

export function Rooms() {
  const { state, now, update } = useStore();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏠');
  const visible = new Set(phases(state).map((p) => p.id));
  const used = new Set(state.rooms.custom.map((r) => r.name));

  return (
    <div className="stack-lg">
      <div className="card note">
        <p>Os 5 cômodos da planta podem ser renomeados ou marcados como "não usado". Cômodos novos aparecem como anexos no mapa e entram na raid antes do banheiro.</p>
      </div>

      <section className="section">
        <h3 className="sub-title">Cômodos da planta</h3>
        <ul className="edit-list">
          {PHASES.filter((p) => p.id !== 'prep' && p.id !== 'fechamento').map((p) => (
            <RoomRow
              key={p.id}
              id={p.id}
              emoji={p.emoji}
              name={state.rooms.names[p.id] || p.name}
              sub={`${phaseProgress(state, p.id, now).total} tarefas`}
              right={<Switch on={visible.has(p.id)} label={`Usar ${p.name}`} onChange={(v) => update((s) => setRoomHidden(s, p.id, !v))} />}
              off={!visible.has(p.id)}
            />
          ))}
        </ul>
      </section>

      {state.rooms.custom.length > 0 && (
        <section className="section">
          <h3 className="sub-title">Cômodos criados</h3>
          <ul className="edit-list">
            {state.rooms.custom.map((r) => (
              <RoomRow
                key={r.id}
                id={r.id}
                emoji={r.emoji}
                name={r.name}
                sub={`${phaseProgress(state, r.id, now).total} tarefas`}
                right={<ConfirmButton className="btn danger sm" confirmText="Confirmar" onConfirm={() => update((s) => deleteRoom(s, r.id))}>Excluir</ConfirmButton>}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="card new-form">
        <h3>Novo cômodo</h3>
        <div className="chip-row">
          {ROOM_TEMPLATES.filter((t) => !used.has(t.name)).map((t) => (
            <button key={t.name} className="chip" onClick={() => update((s) => addRoom(s, t.name, t.emoji))}>
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
        <p className="muted sm">Os modelos já vêm com tarefas sugeridas. Ou crie um do zero:</p>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); update((s) => addRoom(s, name, emoji)); setName(''); }}>
          <div className="emoji-row" role="radiogroup" aria-label="Ícone do cômodo">
            {EMOJIS.map((e) => (
              <button type="button" key={e} role="radio" aria-checked={emoji === e} className={`emoji-btn ${emoji === e ? 'on' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
            ))}
          </div>
          <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Nome do cômodo" aria-label="Nome do cômodo" />
          <button className="btn primary block" type="submit" disabled={!name.trim()}><Icon name="plus" size={18} /> Adicionar cômodo</button>
        </form>
      </section>
    </div>
  );
}

function RoomRow({ id, emoji, name, sub, right, off }: { id: string; emoji: string; name: string; sub: string; right: React.ReactNode; off?: boolean }) {
  const { update } = useStore();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(name);
  return (
    <li className={`edit-row ${off ? 'off' : ''}`}>
      {editing ? (
        <form className="rename" onSubmit={(e) => { e.preventDefault(); update((s) => renameRoom(s, id, v)); setEditing(false); }}>
          <input value={v} maxLength={30} onChange={(e) => setV(e.target.value)} aria-label="Nome do cômodo" autoFocus />
          <button className="btn primary sm" type="submit">Salvar</button>
          <button className="btn ghost sm" type="button" onClick={() => { setV(name); setEditing(false); }}>Cancelar</button>
        </form>
      ) : (
        <>
          <span className="room-emoji">{emoji}</span>
          <div className="edit-text">
            <strong>{name}</strong>
            <small>{off ? 'não usado' : sub}</small>
          </div>
          <button className="icon-btn" aria-label={`Renomear ${name}`} onClick={() => setEditing(true)}><Icon name="pencil" size={18} /></button>
          {right}
        </>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Produtos e compras                                                  */
/* ------------------------------------------------------------------ */
const STATUS: Record<ProductStatus, { label: string; cls: string }> = {
  ok: { label: 'Tem', cls: 'ok' },
  low: { label: 'Acabando', cls: 'low' },
  out: { label: 'Acabou', cls: 'out' },
};

export function Products() {
  const { state, update } = useStore();
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const toBuy = state.products.filter((p) => p.status !== 'ok');

  return (
    <div className="stack-lg">
      <section className="card shop">
        <div className="missions-head">
          <h2>🛒 Lista de compras</h2>
          <span className="count">{toBuy.length}</span>
        </div>
        {toBuy.length === 0 ? (
          <p className="muted sm">Nada faltando. Toque num produto abaixo quando ele estiver acabando.</p>
        ) : (
          <ul className="shop-list">
            {toBuy.map((p) => (
              <li key={p.id}>
                <span className={`dot ${STATUS[p.status].cls}`} />
                <span className="grow">{p.name}<small className="muted"> · {STATUS[p.status].label.toLowerCase()}</small></span>
                <button className="btn soft sm" onClick={() => update((s) => setProduct(s, p.id, 'ok'))}>Comprei</button>
              </li>
            ))}
          </ul>
        )}
        {toBuy.length > 0 && (
          <button className="btn primary block" onClick={async () => setMsg((await shareText(shoppingText(state))) ? '' : 'Não foi possível compartilhar.')}>
            <Icon name="share" size={18} /> Enviar a lista (WhatsApp, Notas…)
          </button>
        )}
        {msg && <p className="error">{msg}</p>}
      </section>

      <section className="section">
        <h3 className="sub-title">Produtos de casa</h3>
        <p className="muted sm pad">Toque para mudar: tem → acabando → acabou.</p>
        <ul className="product-grid">
          {state.products.map((p) => (
            <li key={p.id} className={`product ${STATUS[p.status].cls}`}>
              <button className="product-btn" onClick={() => { play('tap'); update((s) => cycleProduct(s, p.id)); }} aria-label={`${p.name}: ${STATUS[p.status].label}`}>
                <strong>{p.name}</strong>
                <span className="p-status">{STATUS[p.status].label}</span>
              </button>
              {p.custom && (
                <ConfirmButton className="p-del" confirmText="Excluir?" onConfirm={() => update((s) => deleteProduct(s, p.id))}>
                  <Icon name="close" size={14} />
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form className="card new-form" onSubmit={(e) => { e.preventDefault(); update((s) => addProduct(s, name, 'ok')); setName(''); }}>
        <h3>Novo produto</h3>
        <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lustra-móveis" aria-label="Nome do produto" />
        <button className="btn primary block" type="submit" disabled={!name.trim()}><Icon name="plus" size={18} /> Adicionar produto</button>
      </form>
    </div>
  );
}
