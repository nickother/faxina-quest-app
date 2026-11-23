import { ROOM_TEMPLATES } from '../data/content';
import type { TaskDef } from '../data/types';
import { clone, newTaskId } from './game';
import type { AppState, ProductStatus } from './state';

/* ------------------------------------------------------------------ */
/* Cômodos                                                             */
/* ------------------------------------------------------------------ */
export function addRoom(prev: AppState, name: string, emoji: string, withTemplateTasks = true): AppState {
  const n = name.trim().slice(0, 30);
  if (!n) return prev;
  const s = clone(prev);
  const id = `room-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  s.rooms.custom.push({ id, name: n, emoji: emoji || '🏠' });
  const tpl = ROOM_TEMPLATES.find((t) => t.name === n);
  if (tpl && withTemplateTasks) {
    for (const task of tpl.tasks) {
      const t: TaskDef = { id: newTaskId() + Math.random().toString(36).slice(2, 4), kind: 'raid', phase: id, name: task, min: 5, custom: true };
      s.custom.push(t);
    }
  }
  return s;
}

export function renameRoom(prev: AppState, id: string, name: string): AppState {
  const n = name.trim().slice(0, 30);
  const s = clone(prev);
  const c = s.rooms.custom.find((r) => r.id === id);
  if (c) {
    if (n) c.name = n;
  } else if (n) s.rooms.names[id] = n;
  else delete s.rooms.names[id];
  return s;
}

/** Cômodos originais podem ser escondidos (a planta mostra como "não usado"). */
export function setRoomHidden(prev: AppState, id: string, hidden: boolean): AppState {
  const s = clone(prev);
  if (hidden) s.rooms.hidden[id] = true;
  else delete s.rooms.hidden[id];
  return s;
}

/** Cômodos criados são excluídos junto com as tarefas criadas para eles. */
export function deleteRoom(prev: AppState, id: string): AppState {
  const s = clone(prev);
  s.rooms.custom = s.rooms.custom.filter((r) => r.id !== id);
  s.custom = s.custom.filter((t) => t.phase !== id);
  // tarefas originais que tinham sido movidas para este cômodo voltam ao cômodo de origem
  for (const [tid, o] of Object.entries(s.overrides)) if (o.phase === id) s.overrides[tid] = { ...o, phase: undefined };
  return s;
}

export function addTaskToRoom(prev: AppState, room: string, name: string): AppState {
  const n = name.trim().slice(0, 90);
  if (!n) return prev;
  const s = clone(prev);
  s.custom.push({ id: newTaskId(), kind: 'raid', phase: room, name: n, min: 5, custom: true });
  return s;
}

/* ------------------------------------------------------------------ */
/* Produtos e compras                                                  */
/* ------------------------------------------------------------------ */
const NEXT: Record<ProductStatus, ProductStatus> = { ok: 'low', low: 'out', out: 'ok' };

export function cycleProduct(prev: AppState, id: string): AppState {
  const s = clone(prev);
  const p = s.products.find((x) => x.id === id);
  if (p) p.status = NEXT[p.status];
  return s;
}

export function setProduct(prev: AppState, id: string, status: ProductStatus): AppState {
  const s = clone(prev);
  const p = s.products.find((x) => x.id === id);
  if (p) p.status = status;
  return s;
}

export function addProduct(prev: AppState, name: string, status: ProductStatus = 'out'): AppState {
  const n = name.trim().slice(0, 60);
  if (!n) return prev;
  const s = clone(prev);
  s.products.push({ id: `p-${Date.now().toString(36)}`, name: n, status, custom: true });
  return s;
}

export function deleteProduct(prev: AppState, id: string): AppState {
  const s = clone(prev);
  s.products = s.products.filter((p) => p.id !== id);
  return s;
}

export function shoppingText(s: AppState): string {
  const items = s.products.filter((p) => p.status !== 'ok');
  if (!items.length) return '';
  return ['🧽 Lista de compras – Faxina Quest', '', ...items.map((p) => `• ${p.name}${p.status === 'out' ? ' (acabou)' : ''}`)].join('\n');
}

/* ------------------------------------------------------------------ */
/* Tarefas: excluir, restaurar e editar                                */
/* ------------------------------------------------------------------ */
export interface TaskEdit {
  name?: string;
  tip?: string;
  when?: 'manha' | 'noite';
  days?: number[];
  phase?: string;
  every?: number;
}

/** Originais ficam marcadas como excluídas (dá para restaurar); criadas são apagadas. */
export function deleteTask(prev: AppState, id: string): AppState {
  const s = clone(prev);
  if (s.custom.some((t) => t.id === id)) s.custom = s.custom.filter((t) => t.id !== id);
  else s.overrides[id] = { ...s.overrides[id], deleted: true };
  return s;
}

export function restoreTask(prev: AppState, id: string): AppState {
  const s = clone(prev);
  const o = { ...s.overrides[id] };
  delete o.deleted;
  s.overrides[id] = o;
  return s;
}

export function editTask(prev: AppState, id: string, e: TaskEdit): AppState {
  const s = clone(prev);
  const clean: TaskEdit = { ...e };
  if (clean.name !== undefined) clean.name = clean.name.trim().slice(0, 90);
  if (clean.tip !== undefined) clean.tip = clean.tip.trim().slice(0, 200);
  if (clean.days) clean.days = [...new Set(clean.days)].sort();
  const c = s.custom.find((t) => t.id === id);
  if (c) {
    if (clean.name) c.name = clean.name;
    if (clean.tip !== undefined) c.tip = clean.tip || undefined;
    if (clean.when) c.when = clean.when;
    if (clean.days) c.days = clean.days.length ? clean.days : undefined;
    if (clean.phase) c.phase = clean.phase;
    if (clean.every) c.every = clean.every;
  } else {
    const o = { ...s.overrides[id] };
    if (clean.name !== undefined) o.name = clean.name || undefined;
    if (clean.tip !== undefined) o.tip = clean.tip;
    if (clean.when) o.when = clean.when;
    if (clean.days) o.days = clean.days;
    if (clean.phase) o.phase = clean.phase;
    if (clean.every) o.every = clean.every;
    s.overrides[id] = o;
  }
  return s;
}
