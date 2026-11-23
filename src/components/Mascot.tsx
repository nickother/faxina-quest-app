import { MASCOT_STAGES } from '../data/content';

export type Mood = 'happy' | 'proud' | 'sleepy' | 'calm';

export function mascotStage(level: number) {
  let idx = 0;
  MASCOT_STAGES.forEach((st, i) => {
    if (level >= st.minLevel) idx = i;
  });
  return { index: idx, ...MASCOT_STAGES[idx], next: MASCOT_STAGES[idx + 1] ?? null };
}

/** Esponjinha que ganha acessórios conforme o nível. */
export function Mascot({ level, color, mood = 'happy', size = 96, title }: { level: number; color: string; mood?: Mood; size?: number; title?: string }) {
  const stage = mascotStage(level).index;
  const eyes =
    mood === 'sleepy' ? (
      <>
        <path d="M38 52q5 4 10 0" />
        <path d="M62 52q5 4 10 0" />
      </>
    ) : (
      <>
        <ellipse cx="43" cy="51" rx="4.5" ry={mood === 'proud' ? 3 : 5.5} fill="#10213a" stroke="none" />
        <ellipse cx="67" cy="51" rx="4.5" ry={mood === 'proud' ? 3 : 5.5} fill="#10213a" stroke="none" />
        <circle cx="44.5" cy="49" r="1.5" fill="#fff" stroke="none" />
        <circle cx="68.5" cy="49" r="1.5" fill="#fff" stroke="none" />
      </>
    );
  const mouth =
    mood === 'sleepy' ? <ellipse cx="55" cy="66" rx="4" ry="3" fill="#10213a" stroke="none" /> : mood === 'calm' ? <path d="M48 65q7 4 14 0" /> : <path d="M45 63q10 10 20 0" fill="#ff8a8a" />;

  return (
    <svg className="mascot" width={size} height={size} viewBox="0 0 110 110" role="img" aria-label={title ?? 'Mascote'}>
      {/* sombra */}
      <ellipse cx="55" cy="101" rx="30" ry="5" fill="rgba(16,33,58,0.12)" />
      <g className="mascot-body">
        {/* rodo (nível 5+) */}
        {stage >= 2 && (
          <g stroke="#10213a" strokeWidth="2.5" strokeLinecap="round">
            <path d="M92 30v58" stroke="#a8743f" strokeWidth="4" />
            <rect x="80" y="24" width="24" height="7" rx="3" fill="#5ec8f2" />
          </g>
        )}
        {/* corpo de esponja */}
        <rect x="18" y="28" width="74" height="66" rx="20" fill={color} stroke="#10213a" strokeWidth="3" />
        <rect x="18" y="76" width="74" height="18" rx="9" fill="#1aa36f" opacity="0.85" stroke="#10213a" strokeWidth="3" />
        <g fill="rgba(255,255,255,0.45)">
          <circle cx="30" cy="40" r="3" />
          <circle cx="80" cy="38" r="2.5" />
          <circle cx="27" cy="62" r="2" />
          <circle cx="83" cy="60" r="3" />
        </g>
        {/* bochechas */}
        <circle cx="34" cy="62" r="5" fill="#ff8a8a" opacity="0.45" />
        <circle cx="76" cy="62" r="5" fill="#ff8a8a" opacity="0.45" />
        <g stroke="#10213a" strokeWidth="2.6" strokeLinecap="round" fill="none">
          {eyes}
          {mouth}
        </g>
        {/* bandana (nível 3+) */}
        {stage >= 1 && stage < 3 && (
          <g>
            <path d="M20 36q35-14 70 0v6q-35-12-70 0z" fill="#ff5a5f" stroke="#10213a" strokeWidth="2.5" />
            <path d="M88 38l10-4-4 10z" fill="#ff5a5f" stroke="#10213a" strokeWidth="2" />
          </g>
        )}
        {/* chapéu de mago (nível 7+) */}
        {stage === 3 && (
          <g>
            <path d="M30 32l25-30 25 30z" fill="#6b3fd1" stroke="#10213a" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="50" cy="20" r="2.5" fill="#ffc43d" />
            <circle cx="60" cy="27" r="2" fill="#ffc43d" />
            <rect x="24" y="29" width="62" height="7" rx="3.5" fill="#8b63e6" stroke="#10213a" strokeWidth="2.5" />
          </g>
        )}
        {/* coroa (nível 9+) */}
        {stage >= 4 && (
          <path d="M33 30l4-18 9 10 9-14 9 14 9-10 4 18z" fill="#ffc43d" stroke="#10213a" strokeWidth="2.5" strokeLinejoin="round" />
        )}
        {/* brilhos quando orgulhoso */}
        {mood === 'proud' && (
          <g fill="#ffc43d" stroke="#10213a" strokeWidth="1.5">
            <path d="M8 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            <path d="M100 66l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
          </g>
        )}
      </g>
    </svg>
  );
}
