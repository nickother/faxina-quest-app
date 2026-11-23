import { useCallback, useEffect, useMemo, useState } from 'react';
import { Overlays } from './components/Overlays';
import { Icon } from './components/ui';
import { computeStreak, levelInfo } from './logic/game';
import { useStore } from './store';
import { Today } from './tabs/Today';
import { MapTab } from './tabs/MapTab';
import { Raid } from './tabs/Raid';
import { Radar } from './tabs/Radar';
import { Guide, type GuidePage } from './tabs/Guide';
import type { EditorSection } from './tabs/Editor';

export type TabId = 'today' | 'map' | 'raid' | 'radar' | 'guide';

export interface Nav {
  tab: (t: TabId) => void;
  guide: (p: GuidePage) => void;
  editor: (s: EditorSection) => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today', label: 'Hoje', icon: 'today' },
  { id: 'map', label: 'Mapa', icon: 'map' },
  { id: 'raid', label: 'Sexta', icon: 'raid' },
  { id: 'radar', label: 'Radar', icon: 'radar' },
  { id: 'guide', label: 'Guia', icon: 'guide' },
];

function readTab(): TabId {
  try {
    const v = localStorage.getItem('fq-tab') as TabId | null;
    if (v && TABS.some((t) => t.id === v)) return v;
  } catch {
    /* sem storage */
  }
  return new Date().getDay() === 5 ? 'raid' : 'today';
}

function isStandalone() {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches
  );
}

export default function App() {
  const { state, now } = useStore();
  const [tab, setTab] = useState<TabId>(readTab);
  const [guidePage, setGuidePage] = useState<GuidePage>('menu');
  const [editorSection, setEditorSection] = useState<EditorSection>('daily');
  const standalone = useMemo(isStandalone, []);

  const go = useCallback((t: TabId) => {
    setTab(t);
    if (t === 'guide') setGuidePage('menu');
    try {
      localStorage.setItem('fq-tab', t);
    } catch {
      /* ok */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const nav: Nav = useMemo(
    () => ({
      tab: go,
      guide: (p) => {
        setTab('guide');
        setGuidePage(p);
        window.scrollTo({ top: 0 });
      },
      editor: (s) => {
        setEditorSection(s);
        setTab('guide');
        setGuidePage('editor');
        window.scrollTo({ top: 0 });
      },
    }),
    [go],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('standalone', standalone);
  }, [standalone]);

  const lvl = levelInfo(state.xp);
  const streak = computeStreak(state.dayLog, now);

  return (
    <div className="app">
      <header className="topbar">
        <div className="lvl-badge" aria-label={`Nível ${lvl.level}`}>{lvl.level}</div>
        <div className="topbar-mid">
          <p className="lvl-title" data-testid="title">{lvl.title}</p>
          <div className="xp-line">
            <div className="xp-bar"><span style={{ width: `${lvl.pct * 100}%` }} /></div>
            <span className="xp-num" data-testid="xp">{lvl.into}/{lvl.need} XP</span>
          </div>
        </div>
        <div className={`streak ${streak > 0 ? 'on' : ''}`} aria-label={`Sequência de ${streak} dias`}>
          <Icon name="flame" size={18} />
          <strong>{streak}</strong>
          <small>{streak === 1 ? 'dia' : 'dias'}</small>
        </div>
      </header>

      <main className="content" key={tab + guidePage}>
        {tab === 'today' && <Today nav={nav} standalone={standalone} />}
        {tab === 'map' && <MapTab nav={nav} />}
        {tab === 'raid' && <Raid nav={nav} />}
        {tab === 'radar' && <Radar nav={nav} />}
        {tab === 'guide' && <Guide page={guidePage} editorSection={editorSection} go={(p) => { setGuidePage(p); window.scrollTo({ top: 0 }); }} standalone={standalone} />}
      </main>

      <nav className="tabbar" aria-label="Abas">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)} data-tab={t.id}>
            <span className="tab-icon"><Icon name={t.icon} size={22} /></span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <Overlays />
    </div>
  );
}
