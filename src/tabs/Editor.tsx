import { useEffect, useState } from 'react';
import { WEEKDAYS } from '../data/content';
import type { Kind, TaskDef, When } from '../data/types';
import { Collapsible, ConfirmButton, DayPicker, Icon, Sheet, Switch, daysLabel } from '../components/ui';
import { everyTask, newTaskId, phases, type Task } from '../logic/game';
import { deleteTask, editTask, restoreTask } from '../logic/rooms';
import type { AppState } from '../logic/state';
import { useStore } from '../store';

export type EditorSection = 'new' | 'daily' | 'laundry' | 'raid' | 'radar';

const SECTIONS: { id: Exclude<EditorSection, 'new'>; label: string }[] = [
  { id: 'daily', label: 'Rotinas' },
  { id: 'raid', label: 'Faxina' },
  { id: 'radar', label: 'Radar' },
  { id: 'laundry', label: 'Lavanderia' },
];

function subtitle(s: AppState, t: Task) {
  if (t.kind === 'daily') return `${t.when === 'manha' ? '☀️ Manhã' : '🌙 Noite'} · ${daysLabel(t.days)}${t.parent ? ' · nível 2' : ''}`;
  if (t.kind === 'laundry') return WEEKDAYS[t.weekday ?? 1];
  if (t.kind === 'raid') {
    const p = phases(s).find((x) => x.id === t.phase);
    return p ? `${p.emoji} ${p.name}` : 'cômodo não usado';
  }
  return `a cada ${t.every} dias`;
}

export function Editor({ section }: { section: EditorSection }) {
  const { state, update } = useStore();
  const [tab, setTab] = useState<Exclude<EditorSection, 'new'>>(section === 'new' ? 'daily' : section);
  const [showForm, setShowForm] = useState(section === 'new');
  const [editing, setEditing] = useState<Task | null>(null);
  const every = everyTask(state);
  const tasks = every.filter((t) => t.kind === tab && !t.deleted);
  const deleted = every.filter((t) => t.deleted);
  const anyOff = every.some((t) => !t.custom && !t.deleted && !t.enabled);

  useEffect(() => setTab(section === 'new' ? 'daily' : section), [section]);

  // na aba Faxina, agrupa por cômodo na ordem da raid
  const order = new Map(phases(state).map((p, i) => [p.id, i]));
  const sorted = tab === 'raid' ? [...tasks].sort((a, b) => (order.get(a.phase!) ?? 99) - (order.get(b.phase!) ?? 99)) : tasks;

  return (
    <div className="editor">
      {showForm ? (
        <NewTaskForm defaultKind={tab === 'laundry' ? 'daily' : tab} onDone={(k) => { setShowForm(false); if (k) setTab(k as typeof tab); }} />
      ) : (
        <button className="btn primary block" onClick={() => setShowForm(true)}>
          <Icon name="plus" size={18} /> Nova tarefa
        </button>
      )}

      <div className="segmented" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={tab === s.id} className={tab === s.id ? 'on' : ''} onClick={() => setTab(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <p className="muted sm pad">
        ✏️ edita nome, horário, dias ou cômodo · interruptor pausa a tarefa · <strong>Excluir</strong> tira do app (dá para restaurar abaixo).
      </p>

      <ul className="edit-list">
        {sorted.length === 0 && <li className="edit-row"><span className="muted">Nenhuma tarefa aqui.</span></li>}
        {sorted.map((t) => (
          <li key={t.id} className={`edit-row ${t.enabled ? '' : 'off'}`}>
            <div className="edit-text">
              <strong>{t.name}{t.custom && <span className="pill pill-custom">Sua</span>}</strong>
              <small>{subtitle(state, t)}{t.name !== t.originalName && !t.custom ? ' · renomeada' : ''}{!t.enabled ? ' · pausada' : ''}</small>
            </div>
            <button className="icon-btn" aria-label={`Editar ${t.name}`} onClick={() => setEditing(t)}><Icon name="pencil" size={18} /></button>
            <Switch
              on={t.enabled}
              label={`${t.enabled ? 'Pausar' : 'Ligar'} ${t.name}`}
              onChange={(v) => update((s) => ({ ...s, overrides: { ...s.overrides, [t.id]: { ...s.overrides[t.id], enabled: v } } }))}
            />
            <ConfirmButton className="icon-btn danger-icon" confirmText="Excluir?" onConfirm={() => update((s) => deleteTask(s, t.id))}>
              <Icon name="trash" size={18} />
            </ConfirmButton>
          </li>
        ))}
      </ul>

      {deleted.length > 0 && (
        <Collapsible title={`🗑️ Excluídas (${deleted.length})`} subtitle="Tarefas originais excluídas. O histórico continua guardado.">
          <ul className="edit-list flat">
            {deleted.map((t) => (
              <li key={t.id} className="edit-row">
                <div className="edit-text">
                  <strong>{t.name}</strong>
                  <small>{subtitle(state, t)}</small>
                </div>
                <button className="btn soft sm" onClick={() => update((s) => restoreTask(s, t.id))}>Restaurar</button>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {anyOff && (
        <ConfirmButton
          className="btn ghost block"
          onConfirm={() =>
            update((s) => {
              const overrides = { ...s.overrides };
              for (const t of everyTask(s)) if (!t.custom && !t.deleted) overrides[t.id] = { ...overrides[t.id], enabled: true };
              return { ...s, overrides };
            })
          }
        >
          Religar todas as tarefas originais pausadas
        </ConfirmButton>
      )}

      <EditTaskSheet task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Campos comuns: quando, dias, cômodo, frequência                     */
/* ------------------------------------------------------------------ */
function WhenField({ value, onChange }: { value: When; onChange: (v: When) => void }) {
  return (
    <div className="field">
      <span>Quando</span>
      <div className="segmented">
        {([['manha', '☀️ Manhã'], ['noite', '🌙 Noite']] as const).map(([k, l]) => (
          <button type="button" key={k} className={value === k ? 'on' : ''} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function DaysField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const all = value.length === 0;
  return (
    <div className="field">
      <span>Em quais dias</span>
      <div className="segmented">
        <button type="button" className={all ? 'on' : ''} aria-pressed={all} onClick={() => onChange([])}>Todos os dias</button>
        <button type="button" className={!all ? 'on' : ''} aria-pressed={!all} onClick={() => !value.length && onChange([new Date().getDay()])}>Dias específicos</button>
      </div>
      {!all && <DayPicker value={value} onChange={onChange} />}
      {!all && <small className="muted">Aparece em Hoje só em: {daysLabel(value)}.</small>}
    </div>
  );
}

function RoomField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { state } = useStore();
  return (
    <label className="field">
      <span>Cômodo da faxina</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {phases(state).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
      </select>
    </label>
  );
}

function EveryField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>A cada quantos dias</span>
      <input type="number" inputMode="numeric" min={2} max={365} value={Number.isNaN(value) ? '' : value} onChange={(e) => onChange(parseInt(e.target.value, 10))} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Editar tarefa existente                                             */
/* ------------------------------------------------------------------ */
function EditTaskSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { update } = useStore();
  const [name, setName] = useState('');
  const [tip, setTip] = useState('');
  const [when, setWhen] = useState<When>('manha');
  const [days, setDays] = useState<number[]>([]);
  const [phase, setPhase] = useState('quarto');
  const [every, setEvery] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!task) return;
    setName(task.name);
    setTip(task.tip ?? '');
    setWhen(task.when ?? 'manha');
    setDays(task.days ?? []);
    setPhase(task.phase ?? 'quarto');
    setEvery(task.every ?? 30);
    setError('');
  }, [task]);

  if (!task) return null;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Dê um nome para a tarefa.');
    if (task.kind === 'radar' && (!Number.isInteger(every) || every < 2 || every > 365)) return setError('Escolha entre 2 e 365 dias.');
    update((s) =>
      editTask(s, task.id, {
        name: name.trim() === task.originalName ? '' : name,
        tip,
        ...(task.kind === 'daily' ? { when, days } : {}),
        ...(task.kind === 'raid' ? { phase } : {}),
        ...(task.kind === 'radar' ? { every } : {}),
      }),
    );
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title="Editar tarefa">
      <form className="stack edit-form" onSubmit={save} noValidate>
        <label className="field">
          <span>Nome <small>{name.length}/90</small></span>
          <input value={name} maxLength={90} onChange={(e) => { setName(e.target.value); setError(''); }} />
        </label>
        <label className="field">
          <span>Dica <small>opcional</small></span>
          <input value={tip} maxLength={200} onChange={(e) => setTip(e.target.value)} placeholder="Um lembrete curto de como fazer" />
        </label>
        {task.kind === 'daily' && (
          <>
            <WhenField value={when} onChange={setWhen} />
            <DaysField value={days} onChange={setDays} />
          </>
        )}
        {task.kind === 'raid' && <RoomField value={phase} onChange={setPhase} />}
        {task.kind === 'radar' && <EveryField value={every} onChange={setEvery} />}
        {task.kind === 'laundry' && <p className="muted sm">A lavanderia acontece sempre na {WEEKDAYS[task.weekday ?? 1].toLowerCase()}.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" type="submit">Salvar</button>
        {!task.custom && task.name !== task.originalName && <p className="muted sm">Nome original: {task.originalName}</p>}
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Nova tarefa                                                         */
/* ------------------------------------------------------------------ */
function NewTaskForm({ defaultKind, onDone }: { defaultKind: Kind; onDone: (k?: Kind) => void }) {
  const { state, update } = useStore();
  const [name, setName] = useState('');
  const [tip, setTip] = useState('');
  const [kind, setKind] = useState<Kind>(defaultKind === 'laundry' ? 'daily' : defaultKind);
  const [when, setWhen] = useState<When>('manha');
  const [days, setDays] = useState<number[]>([]);
  const [phase, setPhase] = useState(phases(state).find((p) => p.room)?.id ?? 'quarto');
  const [every, setEvery] = useState(30);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError('Dê um nome para a tarefa.');
    if (kind === 'radar' && (!Number.isInteger(every) || every < 2 || every > 365)) return setError('Escolha entre 2 e 365 dias.');
    const t: TaskDef = { id: newTaskId(), kind, name: n.slice(0, 90), tip: tip.trim().slice(0, 200) || undefined, custom: true };
    if (kind === 'daily') {
      t.when = when;
      if (days.length) t.days = [...days].sort();
    }
    if (kind === 'raid') { t.phase = phase; t.min = 5; }
    if (kind === 'radar') t.every = every;
    update((s) => ({ ...s, custom: [...s.custom, t] }));
    onDone(kind);
  };

  return (
    <form className="card new-form" onSubmit={submit} noValidate>
      <div className="form-head">
        <h3>Nova tarefa</h3>
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => onDone()}><Icon name="close" /></button>
      </div>
      <label className="field">
        <span>Nome <small>{name.length}/90</small></span>
        <input value={name} maxLength={90} required onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Ex.: Regar as plantas" />
      </label>
      <label className="field">
        <span>Dica <small>opcional</small></span>
        <input value={tip} maxLength={200} onChange={(e) => setTip(e.target.value)} placeholder="Um lembrete curto de como fazer" />
      </label>
      <div className="field">
        <span>Onde ela entra</span>
        <div className="kind-cards">
          {([
            ['daily', '📅', 'Rotina', 'Na aba Hoje, todo dia ou em dias escolhidos'],
            ['raid', '🧹', 'Dia da faxina', 'Num cômodo da raid semanal'],
            ['radar', '📡', 'Radar', 'De tempos em tempos (ex.: a cada 30 dias)'],
          ] as const).map(([k, icon, title, desc]) => (
            <button type="button" key={k} className={`kind-card ${kind === k ? 'on' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
              <span className="kc-icon">{icon}</span>
              <strong>{title}</strong>
              <small>{desc}</small>
            </button>
          ))}
        </div>
      </div>
      {kind === 'daily' && (
        <>
          <WhenField value={when} onChange={setWhen} />
          <DaysField value={days} onChange={setDays} />
        </>
      )}
      {kind === 'raid' && <RoomField value={phase} onChange={setPhase} />}
      {kind === 'radar' && <EveryField value={every} onChange={setEvery} />}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary block" type="submit">Adicionar tarefa</button>
    </form>
  );
}
