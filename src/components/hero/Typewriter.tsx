import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

type Props = {
  text: string;
  /** Per-character delay in ms. Default 38ms for a confident, readable cadence. */
  cps?: number;
  /** Delay before typing starts, in ms. */
  startDelay?: number;
  className?: string;
};

/**
 * Typewriter that retypes whenever `text` changes (e.g. on RO ↔ EN toggle).
 * Honors reduced-motion by rendering the full string immediately.
 * Caret blinks while typing and after completion to keep the line alive.
 */
export function Typewriter({ text, cps = 38, startDelay = 700, className }: Props) {
  const reduce = useReducedMotion();
  const [out, setOut] = useState(reduce ? text : '');

  useEffect(() => {
    if (reduce) {
      setOut(text);
      return;
    }
    setOut('');
    let i = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startId = window.setTimeout(() => {
      intervalId = setInterval(() => {
        i += 1;
        setOut(text.slice(0, i));
        if (i >= text.length && intervalId) clearInterval(intervalId);
      }, cps);
    }, startDelay);
    return () => {
      window.clearTimeout(startId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, cps, startDelay, reduce]);

  const done = out.length === text.length;

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
      {!reduce && (
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[0.95em] align-[-0.12em] ml-1 bg-bear-gold/85"
          style={{
            animation: done
              ? 'tbCaretBlink 1.1s steps(2, start) infinite'
              : 'tbCaretBlink 0.55s steps(2, start) infinite',
          }}
        />
      )}
    </span>
  );
}
