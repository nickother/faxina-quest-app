import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { mergeStates } from './logic/merge';
import { normalizeState, type AppState } from './logic/state';

/*
 * Sincronização da casa (casal) pelo Supabase.
 * - Login por código enviado por e-mail (funciona dentro do app instalado no iPhone).
 * - Uma "casa" guarda o estado do jogo; cada gravação confere a versão (controle otimista).
 * - Em caso de conflito, lê de novo, mescla (mergeStates) e grava outra vez.
 * - O outro celular recebe o aviso em tempo real e atualiza.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Chave publishable (sb_publishable_...). A antiga chave anon ainda é aceita.
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
export const syncConfigured = !!(URL && KEY);

export const supabase: SupabaseClient | null = syncConfigured
  ? createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'faxina-auth' } })
  : null;

export interface Link {
  householdId: string;
  code: string;
  version: number;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncInfo {
  configured: boolean;
  session: Session | null;
  link: Link | null;
  status: SyncStatus;
  lastSyncAt: number | null;
  error: string | null;
  members: number;
}

interface Host {
  get: () => AppState | null;
  /** aplica um estado vindo da nuvem (sem gerar nova gravação) */
  apply: (s: AppState) => void;
}

const LINK_KEY = 'faxina-sync-link';
const readLink = (): Link | null => {
  try {
    return JSON.parse(localStorage.getItem(LINK_KEY) || 'null');
  } catch {
    return null;
  }
};
const writeLink = (l: Link | null) => {
  try {
    if (l) localStorage.setItem(LINK_KEY, JSON.stringify(l));
    else localStorage.removeItem(LINK_KEY);
  } catch {
    /* sem armazenamento */
  }
};

const msg = (e: unknown) => {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/fetch|network|Failed to/i.test(m)) return 'Sem conexão. Tento de novo quando a internet voltar.';
  return m;
};

class SyncEngine {
  info: SyncInfo = { configured: syncConfigured, session: null, link: readLink(), status: 'off', lastSyncAt: null, error: null, members: 0 };
  private host: Host | null = null;
  private listeners = new Set<() => void>();
  private timer: number | undefined;
  private pending = false;
  private busy = false;
  private channel: RealtimeChannel | null = null;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getInfo = () => this.info;
  private set(patch: Partial<SyncInfo>) {
    this.info = { ...this.info, ...patch };
    this.listeners.forEach((f) => f());
  }

  async init(host: Host) {
    this.host = host;
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    this.set({ session: data.session });
    supabase.auth.onAuthStateChange((_e, session) => {
      this.set({ session });
      if (session && this.info.link) this.connect();
      if (!session) this.disconnect();
    });
    if (data.session && this.info.link) this.connect();
    window.addEventListener('online', () => this.info.link && this.pull());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.info.link && this.info.session) this.pull();
    });
  }

  /* ---------- login ---------- */
  async signIn(email: string, password: string) {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(/invalid login/i.test(error.message) ? 'E-mail ou senha incorretos. Se é o primeiro acesso, toque em "Criar conta".' : /not confirmed/i.test(error.message) ? 'Falta desligar "Confirm email" no Supabase (veja o guia).' : error.message);
  }
  async signUp(email: string, password: string) {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw new Error(/already registered/i.test(error.message) ? 'Este e-mail já tem conta. Toque em "Entrar".' : /password/i.test(error.message) ? 'A senha precisa ter pelo menos 6 caracteres.' : error.message);
    if (!data.session) throw new Error('Conta criada, mas o Supabase pediu confirmação por e-mail. Desligue "Confirm email" em Authentication → Sign In / Providers → Email e toque em "Entrar".');
  }
  async signOut() {
    this.disconnect();
    await supabase?.auth.signOut();
  }

  /* ---------- casa ---------- */
  async createHouse() {
    if (!supabase) return;
    const s = this.host?.get();
    const { data, error } = await supabase.rpc('create_household', { initial_state: s });
    if (error) throw new Error(error.message);
    this.setLink({ householdId: data.id, code: data.code, version: data.version });
    this.connect();
  }
  async joinHouse(code: string) {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('join_household', { invite: code });
    if (error) throw new Error(/não encontrado/.test(error.message) ? 'Código não encontrado. Confira as letras.' : error.message);
    const local = this.host?.get();
    // Junta o progresso deste celular com o da casa
    let merged: AppState | null = null;
    try {
      merged = data.state ? (local ? mergeStates(normalizeState(data.state), local) : normalizeState(data.state)) : local ?? null;
    } catch {
      merged = local ?? null;
    }
    this.setLink({ householdId: data.id, code: data.code, version: data.version });
    if (merged) {
      this.host?.apply(merged);
      this.pending = true;
    }
    this.connect();
  }
  async leaveHouse() {
    const l = this.info.link;
    this.disconnect();
    this.setLink(null);
    if (supabase && l && this.info.session) await supabase.from('household_members').delete().eq('household_id', l.householdId).eq('user_id', this.info.session.user.id);
    this.set({ status: 'off', members: 0, error: null });
  }
  private setLink(l: Link | null) {
    writeLink(l);
    this.set({ link: l });
  }

  /* ---------- gravação e leitura ---------- */
  /** chamado a cada mudança local */
  queue() {
    if (!this.info.link || !this.info.session) return;
    this.pending = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.push(), 1200);
  }

  async push(retry = true): Promise<void> {
    const l = this.info.link;
    const s = this.host?.get();
    if (!supabase || !l || !s || !this.info.session) return;
    if (this.busy) {
      this.queue();
      return;
    }
    this.busy = true;
    this.pending = false;
    this.set({ status: 'syncing' });
    try {
      const { data, error } = await supabase.rpc('save_household', { h: l.householdId, expected_version: l.version, new_state: s });
      if (error) throw error;
      if (data === -1) {
        // Alguém gravou antes: lê, mescla e tenta de novo
        const row = await this.fetchRow();
        if (row) {
          const merged = mergeStates(normalizeState(row.state), this.host!.get()!);
          this.setLink({ ...l, version: row.version });
          this.host?.apply(merged);
          this.busy = false;
          if (retry) return this.push(false);
          this.queue();
          return;
        }
      } else {
        this.setLink({ ...l, version: data as number });
      }
      this.set({ status: 'idle', lastSyncAt: Date.now(), error: null });
    } catch (e) {
      this.pending = true;
      this.set({ status: navigator.onLine ? 'error' : 'offline', error: msg(e) });
    } finally {
      this.busy = false;
    }
  }

  private async fetchRow() {
    const l = this.info.link;
    if (!supabase || !l) return null;
    const { data, error } = await supabase.from('households').select('id, code, state, version').eq('id', l.householdId).maybeSingle();
    if (error) throw error;
    if (!data) {
      // a casa não existe mais ou o acesso foi removido
      this.setLink(null);
      this.set({ status: 'off', error: 'Você não faz mais parte desta casa.' });
      return null;
    }
    return data as { id: string; code: string; state: unknown; version: number };
  }

  async pull() {
    const l = this.info.link;
    if (!supabase || !l || !this.info.session || this.busy) return;
    try {
      const row = await this.fetchRow();
      if (!row) return;
      if (row.version > l.version && row.state) {
        const remote = normalizeState(row.state);
        const local = this.host?.get();
        const next = this.pending && local ? mergeStates(remote, local) : remote;
        this.setLink({ ...l, version: row.version });
        this.host?.apply(next);
        if (this.pending) this.queue();
      } else if (this.pending) {
        this.queue();
      }
      const { count } = await supabase.from('household_members').select('user_id', { count: 'exact', head: true }).eq('household_id', l.householdId);
      this.set({ status: 'idle', lastSyncAt: Date.now(), error: null, members: count ?? this.info.members });
    } catch (e) {
      this.set({ status: navigator.onLine ? 'error' : 'offline', error: msg(e) });
    }
  }

  private connect() {
    const l = this.info.link;
    if (!supabase || !l || !this.info.session) return;
    this.disconnect();
    this.channel = supabase
      .channel(`casa-${l.householdId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${l.householdId}` }, () => this.pull())
      .subscribe();
    this.pull().then(() => {
      if (this.pending) this.push();
    });
  }
  private disconnect() {
    if (this.channel && supabase) supabase.removeChannel(this.channel);
    this.channel = null;
  }
}

export const sync = new SyncEngine();
