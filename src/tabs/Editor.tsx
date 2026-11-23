import { useEffect, useRef, useState } from 'react';
import { PHASES, WEEKDAYS } from '../data/content';
import type { Kind, PhaseId, TaskDef, When } from '../data/types';
import { ConfirmButton, Icon, Switch } from '../components/ui';
import { allTasks, newTaskId, type Task } from '../logic/game';
import { useStore } from '../store';

export type EditorSection = 'new' | 'daily' | 'laundry' | 'raid' | 'radar';

const SECTIONS: { id: EditorSection; label: string }[] = [
  { id: 'daily', label: 'Rotinas' },
  { id: 'laundry', label: 'Lavanderia' },
  { id: 'raid', label: 'Sexta' },
  { id: 'radar', label: 'Radar' },
];

export function Editor({ section }: { section: EditorSection }) {
  const { state, update } = useStore();
  const [tab, setTab] = useState<EditorSection>(section === 'new' ? 'daily' : section);
  const [showForm, setShowForm] = useState(section === 'new');
  const tasks = allTasks(state).filter((t) => t.kind === tab);
  const originals = tasks.filter((t) => !t.custom);
  const created = tasks.filter((t) => t.custom);
  const anyOff = allTasks(state).some((t) => !t.custom && !t.enabled);

  useEffect(() => setTab(section === 'new' ? 'daily' : section), [section]);

  return (
    <div className="editor">
      {showForm ? (
        <NewTaskForm defaultKind={tab === 'laundry' ? 'daily' : tab as Kind} onDone={(k) => { setShowForm(false); if (k) setTab(k as EditorSection); }} />
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

      {created.length > 0 && (
        <section className="section">
          <h3 className="sub-title">Criadas por vocês</h3>
          <ul className="edit-list">
            {created.map((t) => (
              <EditRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <h3 className="sub-title">Tarefas originais</h3>
        <p className="muted sm pad">Desligada, a tarefa some das listas e do mapa, mas o histórico fica guardado.</p>
        <ul className="edit-list">
          {originals.map((t) => (
            <EditRow key={t.id} task={t} />
          ))}
        </ul>
      </section>

      {anyOff && (
        <ConfirmButton
          className="btn ghost block"
          onConfirm={() =>
            update((s) => {
              const overrides = { ...s.overrides };
              for (const t of allTasks(s)) if (!t.custom) overrides[t.id] = { ...overrides[t.id], enabled: true };
              return { ...s, overrides };
            })
          }
        >
          Religar todas as tarefas originais
        </ConfirmButton>
      )}
    </div>
  );
}

function subtitle(t: Task) {
  if (t.kind === 'daily') return `${t.when === 'manha' ? 'Manhã' : 'Noite'}${t.parent ? ' · nível 2' : ''}`;
  if (t.kind === 'laundry') return WEEKDAYS[t.weekday ?? 1];
  if (t.kind === 'raid') return PHASES.find((p) => p.id === t.phase)?.name ?? '';
  return `a cada ${t.every} dias`;
}

function EditRow({ task }: { task: Task }) {
  const { update } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  const save = () => {
    const v = name.trim().slice(0, 90);
    if (!v) return;
    update((s) => {
      if (task.custom) return { ...s, custom: s.custom.map((c) => (c.id === task.id ? { ...c, name: v } : c)) };
      return { ...s, overrides: { ...s.overrides, [task.id]: { ...s.overrides[task.id], name: v === task.originalName ? undefined : v } } };
    });
    setEditing(false);
  };

  return (
    <li className={`edit-row ${task.enabled ? '' : 'off'}`}>
      {editing ? (
        <form className="rename" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input ref={input} value={name} maxLength={90} onChange={(e) => setName(e.target.value)} aria-label="Novo nome" />
          <button className="btn primary sm" type="submit">Salvar</button>
          <button className="btn ghost sm" type="button" onClick={() => { setName(task.name); setEditing(false); }}>Cancelar</button>
        </form>
      ) : (
        <>
          <div className="edit-text">
            <strong>{task.name}</strong>
            <small>{subtitle(task)}{task.name !== task.originalName && !task.custom ? ' · renomeada' : ''}</small>
          </div>
          <button className="icon-btn" aria-label={`Renomear ${task.name}`} onClick={() => setEditing(true)}><Icon name="pencil" size={18} /></button>
          {task.custom ? (
            <ConfirmButton className="btn danger sm" confirmText="Confirmar" onConfirm={() => update((s) => ({ ...s, custom: s.custom.filter((c) => c.id !== task.id) }))}>
              Excluir
            </ConfirmButton>
          ) : (
            <Switch
              on={task.enabled}
              label={`${task.enabled ? 'Desligar' : 'Ligar'} ${task.name}`}
              onChange={(v) => update((s) => ({ ...s, overrides: { ...s.overrides, [task.id]: { ...s.overrides[task.id], enabled: v } } }))}
            />
          )}
        </>
      )}
    </li>
  );
}

function NewTaskForm({ defaultKind, onDone }: { defaultKind: Kind; onDone: (k?: Kind) => void }) {
  const { update } = useStore();
  const [name, setName] = useState('');
  const [tip, setTip] = useState('');
  const [kind, setKind] = useState<Kind>(defaultKind === 'laundry' ? 'daily' : defaultKind);
  const [when, setWhen] = useState<When>('manha');
  const [phase, setPhase] = useState<PhaseId>('quarto');
  const [every, setEvery] = useState(30);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError('Dê um nome para a tarefa.');
    if (kind === 'radar' && (!Number.isInteger(every) || every < 2 || every > 365)) return setError('Escolha entre 2 e 365 dias.');
    const t: TaskDef = { id: newTaskId(), kind, name: n.slice(0, 90), tip: tip.trim().slice(0, 200) || undefined, custom: true };
    if (kind === 'daily') t.when = when;
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
        <span>Tipo</span>
        <div className="segmented">
          {([['daily', 'Rotina diária'], ['raid', 'Raid de sexta'], ['radar', 'Radar']] as const).map(([k, l]) => (
            <button type="button" key={k} className={kind === k ? 'on' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
      </div>
      {kind === 'daily' && (
        <div className="field">
          <span>Quando</span>
          <div className="segmented">
            {([['manha', '☀️ Manhã'], ['noite', '🌙 Noite']] as const).map(([k, l]) => (
              <button type="button" key={k} className={when === k ? 'on' : ''} aria-pressed={when === k} onClick={() => setWhen(k)}>{l}</button>
            ))}
          </div>
        </div>
      )}
      {kind === 'raid' && (
        <label className="field">
          <span>Cômodo</span>
          <select value={phase} onChange={(e) => setPhase(e.target.value as PhaseId)}>
            {PHASES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}
      {kind === 'radar' && (
        <label className="field">
          <span>A cada quantos dias</span>
          <input type="number" inputMode="numeric" min={2} max={365} value={Number.isNaN(every) ? '' : every} onChange={(e) => setEvery(parseInt(e.target.value, 10))} />
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn primary block" type="submit">Adicionar tarefa</button>
    </form>
  );
}
