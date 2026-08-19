import { useEffect, useRef } from 'react';

type ThresholdIntroProps = {
  reducedMotion: boolean;
  onComplete: () => void;
};

const TRANSYLVANIAN = 'TRANSYLVANIAN'.split('');
const BEARS = 'BEARS'.split('');

const VOUSSOIRS = [
  { d: 'M78 118 L92 78 L108 82 L96 124 Z', delay: 0 },
  { d: 'M96 124 L108 82 L128 96 L114 136 Z', delay: 50 },
  { d: 'M114 136 L128 96 L142 122 L124 154 Z', delay: 100 },
  { d: 'M86 72 L100 48 L114 72 L100 92 Z', delay: 150 },
  { d: 'M72 82 L86 72 L78 118 L64 108 Z', delay: 40 },
  { d: 'M58 96 L72 82 L64 108 L52 122 Z', delay: 90 },
  { d: 'M46 122 L58 96 L52 136 L42 154 Z', delay: 140 },
] as const;

export function ThresholdIntro({ reducedMotion, onComplete }: ThresholdIntroProps) {
  const completedRef = useRef(false);

  useEffect(() => {
    if (completedRef.current) return undefined;
    if (reducedMotion) {
      completedRef.current = true;
      onComplete();
      return undefined;
    }

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onComplete();
    };

    const timeout = window.setTimeout(finish, 3600);
    const onSkip = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onSkip);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('keydown', onSkip);
    };
  }, [onComplete, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div className="mf-threshold-intro" role="presentation">
      <div className="mf-threshold-intro__grain" aria-hidden="true" />
      <svg className="mf-threshold-intro__lock" viewBox="0 0 200 220" aria-hidden="true">
        {VOUSSOIRS.map((stone, index) => (
          <path
            key={stone.d}
            className={`mf-threshold-intro__voussoir mf-threshold-intro__voussoir--${index}`}
            d={stone.d}
            style={{ animationDelay: `${180 + stone.delay}ms` }}
          />
        ))}
        <path
          className="mf-threshold-intro__arch"
          d="M36 176 C36 92 64 40 100 40 C136 40 164 92 164 176"
        />
        <path
          className="mf-threshold-intro__bear"
          d="M100 58 L122 62 L132 50 L152 52 L166 68 L168 88 L154 98 L162 120 L158 148 L140 172 L112 186 L100 188 L88 186 L60 172 L42 148 L38 120 L46 98 L32 88 L34 68 L48 52 L68 50 L78 62 Z M100 82 L124 88 L138 106 L142 128 L134 152 L114 168 L100 172 L86 168 L66 152 L58 128 L62 106 L76 88 Z"
        />
        <path className="mf-threshold-intro__pivot" d="M90 126 L100 114 L110 126 L100 138 Z" />
      </svg>
      <p className="mf-threshold-intro__kicker">
        {'Șapte sisteme. O singură cetate.'.split('').map((char, index) => (
          <i key={`${char}-${index}`} style={{ animationDelay: `${720 + index * 18}ms` }}>
            {char === ' ' ? '\u00a0' : char}
          </i>
        ))}
      </p>
      <h1 className="mf-threshold-intro__title">
        <span className="mf-threshold-intro__word" aria-label="Transylvanian">
          {TRANSYLVANIAN.map((char, index) => (
            <i key={`t-${char}-${index}`} style={{ animationDelay: `${900 + index * 42}ms` }}>{char}</i>
          ))}
        </span>
        <span className="mf-threshold-intro__word mf-threshold-intro__word--bear" aria-label="Bears">
          {BEARS.map((char, index) => (
            <i key={`b-${char}-${index}`} style={{ animationDelay: `${1480 + index * 70}ms` }}>{char}</i>
          ))}
        </span>
      </h1>
    </div>
  );
}
