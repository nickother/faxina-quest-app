import { CONSOLIDATE_AT, XP, isConsolidated, isDone, toggleTask, type Task } from '../logic/game';
import { useStore } from '../store';
import { play } from '../lib/sound';
import { Icon, daysLabel } from './ui';

export function xpFor(t: Task, consolidated: boolean) {
  if (consolidated) return XP.consolidatedTask;
  if (t.kind === 'laundry') return XP.laundry;
  if (t.kind === 'raid') return XP.raid;
  if (t.kind === 'radar') return XP.radar;
  return t.parent ? XP.daily2 : XP.daily;
}

export function TaskRow({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { state, now, act } = useStore();
  const done = isDone(state, task, now);
  const cons = isConsolidated(state, task.id);
  const count = state.counts[task.id] ?? 0;
  const xp = xpFor(task, cons);
  return (
    <li className={`task ${done ? 'done' : ''}`}>
      <button
        className="task-btn"
        role="checkbox"
        aria-checked={done}
        data-task={task.id}
        onClick={() => {
          if (done) play('undo');
          act((s, n) => toggleTask(s, task.id, n));
        }}
      >
        <span className="task-check" aria-hidden="true">
          <Icon name="check" size={18} stroke={3} />
        </span>
        <span className="task-text">
          <span className="task-name">
            {task.name}
            {task.parent && <span className="pill pill-lvl">Nível 2</span>}
            {task.kind === 'daily' && !!task.days?.length && <span className="pill pill-days">{daysLabel(task.days)}</span>}
            {task.custom && <span className="pill pill-custom">Sua</span>}
          </span>
          {!compact && task.tip && <span className="task-tip">{task.tip}</span>}
          {!cons && task.kind !== 'radar' && count > 0 && (
            <span className="task-meta">
              <span className="mini-bar" aria-hidden="true"><span style={{ width: `${(Math.min(count, CONSOLIDATE_AT) / CONSOLIDATE_AT) * 100}%` }} /></span>
              {Math.min(count, CONSOLIDATE_AT)}/{CONSOLIDATE_AT} para o piloto automático
            </span>
          )}
        </span>
        <span className={`xp-chip ${done ? 'got' : ''}`}>+{xp}</span>
      </button>
    </li>
  );
}

export function TaskList({ tasks, compact, empty }: { tasks: Task[]; compact?: boolean; empty?: string }) {
  if (!tasks.length) return <p className="empty">{empty ?? 'Nada por aqui.'}</p>;
  return (
    <ul className="tasks">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} compact={compact} />
      ))}
    </ul>
  );
}
