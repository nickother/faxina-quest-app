import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadState, requestPersistence, saveState } from './db';
import { reconcileDays, type GameEvent } from './logic/game';
import { pinMissions } from './logic/missions';
import { setSoundEnabled, unlockAudio } from './lib/sound';
import { dayKey } from './logic/period';
import { type AppState } from './logic/state';

interface Ctx {
  state: AppState;
  now: Date;
  /** aplica uma transformação pura ao estado */
  update: (fn: (s: AppState, now: Date) => AppState) => void;
  /** aplica uma ação que gera eventos de jogo */
  act: (fn: (s: AppState, now: Date) => { state: AppState; events: GameEvent[] }) => void;
  events: GameEvent[];
  clearEvents: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<GameEvent[]>([]);
  const saveTimer = useRef<number | undefined>(undefined);
  const latest = useRef<AppState | null>(null);

  useEffect(() => {
    loadState().then((s) => {
      latest.current = s;
      setState(s);
    });
    requestPersistence();
  }, []);

  // Recalcula tudo quando o app volta ao primeiro plano em outro dia
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      setNow((prev) => {
        const n = new Date();
        return dayKey(n) !== dayKey(prev) ? n : prev;
      });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    const id = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      clearInterval(id);
    };
  }, []);

  const persist = useCallback((s: AppState) => {
    latest.current = s;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveState(s), 150);
  }, []);

  useEffect(() => {
    const flush = () => latest.current && saveState(latest.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const update = useCallback<Ctx['update']>(
    (fn) => {
      const prev = latest.current;
      if (!prev) return;
      const next = fn(prev, new Date());
      if (next === prev) return;
      persist(next);
      setState(next);
    },
    [persist],
  );

  const act = useCallback<Ctx['act']>(
    (fn) => {
      const prev = latest.current;
      if (!prev) return;
      const n = new Date();
      if (dayKey(n) !== dayKey(now)) setNow(n);
      const r = fn(prev, n);
      if (r.state !== prev) {
        persist(r.state);
        setState(r.state);
      }
      if (r.events.length) setEvents((e) => [...e, ...r.events]);
    },
    [persist, now],
  );

  const clearEvents = useCallback(() => setEvents([]), []);

  // Ao abrir e a cada novo dia: congelamentos, férias e sequência
  const ready = !!state;
  useEffect(() => {
    if (!ready) return;
    act((s, n) => {
      const r = reconcileDays(s, n);
      return { state: pinMissions(r.state, n), events: r.events };
    });
  }, [ready, now, act]);

  useEffect(() => {
    if (state) setSoundEnabled(state.settings.sound);
  }, [state]);

  // iOS: o áudio só toca depois do primeiro toque
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  if (!state) return <div className="boot" aria-busy="true" />;
  return <StoreCtx.Provider value={{ state, now, update, act, events, clearEvents }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore fora do provider');
  return c;
}
