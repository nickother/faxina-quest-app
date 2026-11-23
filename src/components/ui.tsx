import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Ícones (traço, 24px)                                               */
/* ------------------------------------------------------------------ */
const paths: Record<string, ReactNode> = {
  today: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  map: <><path d="M3 4h18v16H3z" /><path d="M11 4v7H3M11 15v5M15 11h6M15 4v4" /></>,
  raid: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4M19 21l2-2" /></>,
  radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></>,
  guide: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  pencil: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="M7 5l12 7-12 7z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.3-5.6L4 8.7" /><path d="M4 4v4.7h4.7" /></>,
  flame: <path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-3.5-7-.4 2-1.5 3-2.5 3 .5-3-1-6.5-4-9 0 4-5 6.5-5 13 0 4.3 3.6 7 8 7z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  share: <><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v8h14v-8" /></>,
  home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  shirt: <path d="M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c0 2-1.8 3-4 3S8 5 8 3z" />,
  save: <><path d="M12 3v12M8 11l4 4 4-4" /><path d="M5 17v3h14v-3" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>,
  phone: <><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
};

export function Icon({ name, size = 22, stroke = 2 }: { name: keyof typeof paths | string; size?: number; stroke?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Anel de progresso                                                   */
/* ------------------------------------------------------------------ */
export function Ring({ pct, size = 96, stroke = 10, children, color }: { pct: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(p * 100)}% concluído`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          className="ring-bar"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color ?? progressColor(p)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cor do progresso: coral -> amarelo -> verde                         */
/* ------------------------------------------------------------------ */
const CORAL = [0xff, 0x5a, 0x5f];
const YELLOW = [0xff, 0xc4, 0x3d];
const GREEN = [0x1a, 0xa3, 0x6f];
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export function progressColor(p: number) {
  const c = p <= 0.5 ? mix(CORAL, YELLOW, p / 0.5) : mix(YELLOW, GREEN, (p - 0.5) / 0.5);
  return `rgb(${c.join(',')})`;
}

/* ------------------------------------------------------------------ */
/* Barra de progresso                                                  */
/* ------------------------------------------------------------------ */
export function Bar({ pct, color, label }: { pct: number; color?: string; label?: string }) {
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={label}>
      <div className="bar-fill" style={{ width: `${p * 100}%`, background: color ?? progressColor(p) }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interruptor estilo iOS                                              */
/* ------------------------------------------------------------------ */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="switch-knob" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Botão com confirmação em dois toques                                */
/* ------------------------------------------------------------------ */
export function ConfirmButton({ children, confirmText = 'Toque de novo para confirmar', onConfirm, className = '' }: { children: ReactNode; confirmText?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className} ${armed ? 'armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmText : children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Seção recolhível                                                    */
/* ------------------------------------------------------------------ */
export function Collapsible({ title, subtitle, defaultOpen = false, children, badge }: { title: ReactNode; subtitle?: ReactNode; defaultOpen?: boolean; children: ReactNode; badge?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`collapsible ${open ? 'open' : ''}`}>
      <button className="collapsible-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="collapsible-title">
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        {badge}
        <span className="chev"><Icon name="down" size={20} /></span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}

export function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
}
