import { useState } from 'react';
import { sync } from '../sync';
import { useSync } from '../useSync';
import { ConfirmButton } from './ui';
import { shareText } from '../lib/share';

/* Ajustes → Casa compartilhada: login por código e convite para o casal. */
export function SyncCard() {
  const info = useSync();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!info.configured) {
    return (
      <section className="card settings-card" id="casa">
        <h3>Casa compartilhada</h3>
        <p className="muted sm">A sincronização ainda não foi configurada nesta versão do app. Depois de ligar o Supabase (veja o README), os dois celulares passam a marcar no mesmo placar.</p>
      </section>
    );
  }

  const statusText = {
    off: 'Desligada',
    idle: info.lastSyncAt ? `Sincronizado às ${new Date(info.lastSyncAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Conectado',
    syncing: 'Sincronizando…',
    offline: 'Sem internet: as marcações ficam guardadas e sobem depois',
    error: 'Erro ao sincronizar',
  }[info.status];

  return (
    <section className="card settings-card stack" id="casa">
      <h3>Casa compartilhada</h3>

      {!info.session && step === 'email' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(async () => { await sync.sendCode(email); setStep('code'); }); }}>
          <p className="muted sm">Entre com seu e-mail para os dois celulares marcarem no mesmo placar. Você recebe um código de acesso, sem senha.</p>
          <label className="field">
            <span>E-mail</span>
            <input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </label>
          <button className="btn primary block" disabled={busy || !email.includes('@')}>Enviar código</button>
        </form>
      )}

      {!info.session && step === 'code' && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); run(() => sync.verifyCode(email, code)); }}>
          <p className="muted sm">Mandamos um código para <strong>{email}</strong>. Confira também o spam.</p>
          <label className="field">
            <span>Código</span>
            <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </label>
          <button className="btn primary block" disabled={busy || code.length < 6}>Entrar</button>
          <button type="button" className="btn ghost block" onClick={() => { setStep('email'); setCode(''); }}>Trocar e-mail</button>
        </form>
      )}

      {info.session && !info.link && (
        <div className="stack">
          <p className="muted sm">Conectado como <strong>{info.session.user.email}</strong>.</p>
          <p className="muted sm">Quem começa cria a casa e manda o código para o outro. O progresso deste celular vai junto.</p>
          <button className="btn primary block" disabled={busy} onClick={() => run(() => sync.createHouse())}>Criar a nossa casa</button>
          <form className="stack" onSubmit={(e) => { e.preventDefault(); run(() => sync.joinHouse(invite)); }}>
            <label className="field">
              <span>Já tem um código de convite?</span>
              <input value={invite} maxLength={6} autoCapitalize="characters" onChange={(e) => setInvite(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC234" />
            </label>
            <button className="btn soft block" disabled={busy || invite.length !== 6}>Entrar na casa</button>
          </form>
          <button type="button" className="btn ghost block" onClick={() => sync.signOut()}>Sair da conta</button>
        </div>
      )}

      {info.session && info.link && (
        <div className="stack">
          <p className="sm"><strong>{statusText}</strong></p>
          <p className="muted sm">
            {info.members >= 2 ? 'Vocês dois estão na casa. Tudo que um marcar aparece no celular do outro.' : 'Só você está na casa. Mande o código para o outro celular entrar:'}
          </p>
          <p className="invite-code" aria-label="Código de convite">{info.link.code}</p>
          {info.members < 2 && (
            <button className="btn soft block" onClick={() => shareText(`Entra na nossa casa no Faxina Quest: Ajustes → Casa compartilhada → código ${info.link!.code}`)}>Enviar convite</button>
          )}
          <button className="btn ghost block" disabled={info.status === 'syncing'} onClick={() => sync.pull().then(() => sync.push())}>Sincronizar agora</button>
          <p className="muted sm">Conectado como {info.session.user.email}.</p>
          <ConfirmButton className="btn danger block" onConfirm={() => sync.leaveHouse()}>Sair da casa</ConfirmButton>
        </div>
      )}

      {(err || info.error) && <p className="sm" role="alert" style={{ color: '#c8282e' }}>{err ?? info.error}</p>}
    </section>
  );
}
