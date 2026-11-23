import Dexie, { type Table } from 'dexie';
import { initialState, normalizeState, type AppState } from './logic/state';

interface Row {
  id: string;
  data: AppState;
  savedAt: number;
}

class FaxinaDB extends Dexie {
  state!: Table<Row, string>;
  constructor() {
    super('faxina-quest');
    this.version(1).stores({ state: 'id' });
  }
}

export const db = new FaxinaDB();

export async function loadState(): Promise<AppState> {
  try {
    const row = await db.state.get('main');
    if (row) return normalizeState(row.data);
  } catch (e) {
    console.warn('Falha ao ler o IndexedDB', e);
  }
  return initialState();
}

export async function saveState(s: AppState) {
  await db.state.put({ id: 'main', data: s, savedAt: Date.now() });
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* sem suporte */
  }
}
