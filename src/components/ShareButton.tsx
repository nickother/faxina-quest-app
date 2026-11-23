import { useRef, useState } from 'react';
import { levelInfo } from '../logic/game';
import { shareCard, type CardData } from '../lib/share';
import { useStore } from '../store';
import { Mascot, type Mood } from './Mascot';
import { Icon } from './ui';

/** Botão que gera o cartão com o mascote e abre o Compartilhar. */
export function ShareButton({ data, label = 'Compartilhar', className = 'btn ghost block', mood = 'proud' }: { data: Omit<CardData, 'mascotSvg'>; label?: string; className?: string; mood?: Mood }) {
  const { state } = useStore();
  const holder = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const lvl = levelInfo(state.xp).level;

  const go = async () => {
    setBusy(true);
    setMsg('');
    try {
      const svg = holder.current?.querySelector('svg')?.outerHTML;
      const r = await shareCard({ ...data, mascotSvg: svg });
      if (r === 'downloaded') setMsg('Imagem salva.');
    } catch {
      setMsg('Não foi possível gerar a imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={go} disabled={busy}>
        <Icon name="share" size={18} /> {busy ? 'Gerando…' : label}
      </button>
      {msg && <p className="muted sm center">{msg}</p>}
      <div ref={holder} hidden aria-hidden="true">
        <Mascot level={lvl} color={state.settings.mascotColor} mood={mood} size={300} />
      </div>
    </>
  );
}
