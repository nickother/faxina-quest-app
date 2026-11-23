import { useRef, useState } from 'react';
import { CHANNELS, LAUNDRY_GUIDE, LESSONS, SAFETY, WEEKDAYS } from '../data/content';
import { Bar, Icon, Switch } from '../components/ui';
import { ACHIEVEMENTS, CONSOLIDATE_AT, activeTasks, setAlwaysDo } from '../logic/game';
import { dayKey } from '../logic/period';
import { normalizeState } from '../logic/state';
import { useStore } from '../store';
import { Editor, type EditorSection } from './Editor';
import { History } from './History';
import { Products, Rooms, Settings } from './Settings';
import { ShareButton } from '../components/ShareButton';

export type GuidePage =
  | 'menu' | 'history' | 'achievements' | 'editor' | 'rooms' | 'products' | 'routines'
  | 'settings' | 'install' | 'backup' | 'laundry' | 'videos' | 'safety';

interface MenuItem { id: GuidePage; icon: string; title: string; desc: string }

const MENU: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Seu progresso',
    items: [
      { id: 'history', icon: 'chart', title: 'Histórico e recordes', desc: 'Calendário, gráficos, missões e medalhas' },
      { id: 'achievements', icon: 'trophy', title: 'Conquistas', desc: 'Medalhas da casa' },
    ],
  },
  {
    title: 'Sua casa',
    items: [
      { id: 'editor', icon: 'pencil', title: 'Editar tarefas', desc: 'Criar, editar, pausar e excluir' },
      { id: 'rooms', icon: 'home', title: 'Cômodos', desc: 'Renomear, esconder e criar cômodos' },
      { id: 'products', icon: 'cart', title: 'Produtos e compras', desc: 'O que está acabando' },
      { id: 'routines', icon: 'list', title: 'Rotinas', desc: 'Progresso e "Já faço sempre"' },
    ],
  },
  {
    title: 'Configurar',
    items: [
      { id: 'settings', icon: 'gear', title: 'Ajustes', desc: 'Mascote, dia da faxina, sons e férias' },
      { id: 'install', icon: 'phone', title: 'Instalar no iPhone', desc: 'Adicionar à Tela de Início' },
      { id: 'backup', icon: 'save', title: 'Backup', desc: 'Exportar e importar seus dados' },
    ],
  },
  {
    title: 'Aprender',
    items: [
      { id: 'laundry', icon: 'shirt', title: 'Lavanderia', desc: 'O que lavar em cada dia' },
      { id: 'videos', icon: 'video', title: 'Vídeos', desc: 'Canais e aulas no YouTube' },
      { id: 'safety', icon: 'shield', title: 'Segurança', desc: 'Produtos que não se misturam' },
    ],
  },
];

const ALL_ITEMS = MENU.flatMap((g) => g.items);

export function Guide({ page, editorSection, go, standalone }: { page: GuidePage; editorSection: EditorSection; go: (p: GuidePage) => void; standalone: boolean }) {
  const { state } = useStore();
  if (page === 'menu') {
    const unlocked = Object.keys(state.achievements).length;
    const toBuy = state.products.filter((p) => p.status !== 'ok').length;
    const desc = (m: MenuItem) => {
      if (m.id === 'achievements') return `${unlocked} de ${ACHIEVEMENTS.length} desbloqueadas`;
      if (m.id === 'products' && toBuy) return `${toBuy} ${toBuy === 1 ? 'item' : 'itens'} para comprar`;
      return m.desc;
    };
    return (
      <div className="page">
        <header className="page-head">
          <p className="eyebrow">Manual do herói</p>
          <h1>Guia</h1>
        </header>
        {MENU.map((g) => (
          <section key={g.title} className="section">
            <h2 className="menu-group">{g.title}</h2>
            <ul className="menu card">
              {g.items.map((m) => (
                <li key={m.id}>
                  <button className="menu-row" onClick={() => go(m.id)}>
                    <span className={`menu-icon mi-${m.id}`}><Icon name={m.icon} size={20} /></span>
                    <span className="menu-text">
                      <strong>{m.title}</strong>
                      <small>{desc(m)}</small>
                    </span>
                    {m.id === 'products' && toBuy > 0 && <span className="badge">{toBuy}</span>}
                    <Icon name="chevron" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="muted sm center">Faxina Quest · seus dados ficam só neste aparelho.</p>
      </div>
    );
  }
  const meta = ALL_ITEMS.find((m) => m.id === page)!;
  return (
    <div className="page">
      <header className="page-head with-back">
        <button className="back" onClick={() => go('menu')}><Icon name="back" size={20} /> Guia</button>
        <h1>{meta.title}</h1>
      </header>
      {page === 'history' && <History />}
      {page === 'editor' && <Editor section={editorSection} />}
      {page === 'rooms' && <Rooms />}
      {page === 'products' && <Products />}
      {page === 'settings' && <Settings />}
      {page === 'routines' && <Routines />}
      {page === 'install' && <Install standalone={standalone} />}
      {page === 'laundry' && <Laundry />}
      {page === 'videos' && <Videos />}
      {page === 'safety' && <Safety />}
      {page === 'backup' && <Backup />}
      {page === 'achievements' && <Achievements />}
    </div>
  );
}

function Routines() {
  const { state, update } = useStore();
  const all = activeTasks(state).filter((t) => t.kind === 'daily' || t.kind === 'laundry' || t.kind === 'raid');
  const groups = [
    { title: 'Rotinas diárias', items: all.filter((t) => t.kind === 'daily') },
    { title: 'Lavanderia', items: all.filter((t) => t.kind === 'laundry') },
    { title: 'Dia da faxina (raid)', items: all.filter((t) => t.kind === 'raid') },
  ];
  const consolidatedN = all.filter((t) => state.consolidated[t.id]).length;
  return (
    <>
      <div className="card note">
        <p>Toda rotina vira <strong>piloto automático</strong> depois de {CONSOLIDATE_AT} vezes: confete, +50 XP e libera a rotina de nível 2. Se vocês já fazem algo sempre, ligue <strong>"Já faço sempre"</strong>.</p>
        <p className="muted sm">{consolidatedN} de {all.length} no piloto automático.</p>
      </div>
      {groups.map((g) => (
        <section className="section" key={g.title}>
          <h3 className="sub-title">{g.title}</h3>
          <ul className="edit-list">
            {g.items.map((t) => {
              const c = state.consolidated[t.id];
              const n = Math.min(state.counts[t.id] ?? 0, CONSOLIDATE_AT);
              return (
                <li key={t.id} className="edit-row">
                  <div className="edit-text">
                    <strong>{t.name}</strong>
                    {c ? (
                      <small className="ok">🤖 Piloto automático{c.manual ? ' · já faço sempre' : ''}</small>
                    ) : (
                      <div className="routine-progress"><Bar pct={n / CONSOLIDATE_AT} /><small>{n}/{CONSOLIDATE_AT}</small></div>
                    )}
                  </div>
                  <label className="always">
                    <small>Já faço sempre</small>
                    <Switch on={!!c} label={`Já faço sempre: ${t.name}`} onChange={(v) => update((s, now) => setAlwaysDo(s, t.id, v, now))} />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

function Install({ standalone }: { standalone: boolean }) {
  return (
    <>
      {standalone ? (
        <div className="card note ok"><p>✅ O Faxina Quest já está instalado e abrindo em tela cheia.</p></div>
      ) : (
        <div className="card note"><p>Instalado, o app abre em tela cheia, funciona sem internet e o iOS não apaga seus dados.</p></div>
      )}
      <ol className="steps card">
        <li><span className="step-n">1</span><p>Abra este endereço no <strong>Safari</strong> (no Chrome do iPhone também funciona pelo menu de compartilhar).</p></li>
        <li><span className="step-n">2</span><p>Toque no botão <strong>Compartilhar</strong> <span className="kbd"><Icon name="share" size={16} /></span> na barra de baixo.</p></li>
        <li><span className="step-n">3</span><p>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</p></li>
        <li><span className="step-n">4</span><p>Confirme o nome <strong>Faxina Quest</strong> e toque em <strong>Adicionar</strong>.</p></li>
        <li><span className="step-n">5</span><p>Abra pelo ícone na Tela de Início. Faça o mesmo no iPhone da sua esposa (cada aparelho tem o próprio placar).</p></li>
      </ol>
    </>
  );
}

function Laundry() {
  const { state } = useStore();
  const today = new Date().getDay();
  const raidDay = state.settings.raidDay;
  const map: Record<string, number> = { Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, 'Dia da faxina': raidDay };
  return (
    <>
      <ul className="laundry card">
        {LAUNDRY_GUIDE.map((l) => (
          <li key={l.day} className={map[l.day] === today ? 'today' : ''}>
            <span className="l-day">{l.day === 'Dia da faxina' ? WEEKDAYS[raidDay] : l.day}{map[l.day] === today && <em>hoje</em>}</span>
            <span className="l-what"><strong>{l.what}</strong><small>{l.note}</small></span>
          </li>
        ))}
      </ul>
      <div className="card note">
        <p><strong>Regras de ouro:</strong> leia a etiqueta, esvazie os bolsos, feche zíperes, sabão na dose do rótulo e roupa para fora da máquina assim que terminar.</p>
      </div>
    </>
  );
}

function Videos() {
  return (
    <>
      <section className="section">
        <h3 className="sub-title">Canais</h3>
        <ul className="links card">
          {CHANNELS.map((c) => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                <span className="link-text"><strong>{c.name}</strong><small>{c.about}</small></span>
                <Icon name="external" size={18} />
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="section">
        <h3 className="sub-title">Aulas por tarefa</h3>
        <ul className="links card">
          {LESSONS.map((c) => (
            <li key={c.name}>
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                <span className="link-text"><strong>{c.name}</strong></span>
                <Icon name="external" size={18} />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Safety() {
  return (
    <ul className="safety">
      {SAFETY.map((s, i) => (
        <li key={s.title} className={`card ${i === 0 ? 'danger' : ''}`}>
          <span className="safety-icon">{s.icon}</span>
          <div><strong>{s.title}</strong><p>{s.text}</p></div>
        </li>
      ))}
    </ul>
  );
}

function Backup() {
  const { state, update } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faxina-quest-${dayKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMsg({ ok: true, text: 'Backup gerado. No iPhone, escolha "Salvar em Arquivos".' });
  };

  const importJson = async (f: File) => {
    try {
      const data = normalizeState(JSON.parse(await f.text()));
      update(() => data);
      setMsg({ ok: true, text: 'Backup importado com sucesso.' });
    } catch (e) {
      setMsg({ ok: false, text: `Não foi possível importar: ${(e as Error).message}` });
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  return (
    <>
      <div className="card note">
        <p>Seus dados ficam guardados só neste aparelho. Faça um backup de vez em quando e antes de trocar de celular.</p>
      </div>
      <div className="stack">
        <button className="btn primary block" onClick={exportJson}><Icon name="save" size={18} /> Exportar backup (JSON)</button>
        <button className="btn ghost block" onClick={() => file.current?.click()}><Icon name="share" size={18} /> Importar backup</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        {msg && <p className={msg.ok ? 'success' : 'error'} role="status">{msg.text}</p>}
        <p className="muted sm">Importar substitui todo o progresso atual deste aparelho.</p>
      </div>
    </>
  );
}

function Achievements() {
  const { state } = useStore();
  return (
    <ul className="achievements">
      {ACHIEVEMENTS.map((a) => {
        const got = state.achievements[a.id];
        return (
          <li key={a.id} className={`ach ${got ? 'got' : ''}`}>
            <span className="ach-icon">{got ? a.icon : '🔒'}</span>
            <strong>{a.name}</strong>
            <small>{a.desc}</small>
            {got && <small className="ach-date">{got.split('-').reverse().join('/')}</small>}
            {got && <ShareButton className="ach-share" label="Compartilhar" data={{ kicker: 'Conquista desbloqueada', title: a.name, big: a.icon, subtitle: a.desc }} />}
          </li>
        );
      })}
    </ul>
  );
}
