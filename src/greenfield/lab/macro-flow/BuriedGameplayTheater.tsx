import { ArrowDown, Ear, Landmark, Skull } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLenis } from 'lenis/react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import './buried-gameplay-theater.css';

type BuriedPassage = {
  id: string;
  index: string;
  system: string;
  title: string;
  detail: string;
  image: string;
  alt: string;
  icon: typeof Ear;
};

const PASSAGES: BuriedPassage[] = [
  {
    id: 'guards',
    index: 'I',
    system: 'Acoustic field',
    title: 'Gardienii aud pașii.',
    detail: 'Piatra transmite sunetul. Fiecare fugă scurtează distanța dintre meșteșugar și patrulă.',
    image: '/assets/projects/buried-hands/guards.webp',
    alt: 'Gardieni într-o sală slab luminată din The Buried Hands',
    icon: Ear,
  },
  {
    id: 'mercury',
    index: 'II',
    system: 'Toxic atmosphere',
    title: 'Mercurul schimbă traseul.',
    detail: 'Vaporii ocupă camera ca un inamic fără corp. Masca, timpul și ruta devin aceeași decizie.',
    image: '/assets/projects/buried-hands/mercury.webp',
    alt: 'Sala cu mercur și mecanisme din The Buried Hands',
    icon: Skull,
  },
  {
    id: 'royal-hall',
    index: 'III',
    system: 'Monumental logic',
    title: 'Regula devine arhitectură.',
    detail: 'Sala Regală mărește mecanica până la scară monumentală: spațiul însuși este puzzle-ul final.',
    image: '/assets/projects/buried-hands/royal-hall.webp',
    alt: 'Sala Regală din mausoleu, cu statui și mecanism central',
    icon: Landmark,
  },
];

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

export default function BuriedGameplayTheater() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<Array<HTMLElement | null>>([]);
  const rafRef = useRef(0);
  const lastActiveRef = useRef(0);
  const lenis = useLenis();
  const reducedMotion = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  const updateJourney = useCallback(() => {
    rafRef.current = 0;
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel);
    const position = progress * (PASSAGES.length - 1);
    const nextActive = clamp(Math.round(position), 0, PASSAGES.length - 1);

    section.style.setProperty('--bh-progress', progress.toFixed(4));
    section.style.setProperty('--bh-position', position.toFixed(4));

    frameRefs.current.forEach((frame, index) => {
      if (!frame) return;
      const delta = position - index;
      const distance = Math.abs(delta);
      const visibility = clamp(1 - distance * 0.94);
      const direction = delta < 0 ? 1 : -1;
      const horizontal = delta * -19;
      const depth = Math.min(distance, 1.4) * -210;
      const rotation = direction * Math.min(distance, 1) * 8;
      const scale = 1 - Math.min(distance, 1) * 0.07;

      frame.style.setProperty('--bh-delta', delta.toFixed(4));
      frame.style.setProperty('--bh-visibility', visibility.toFixed(4));
      frame.style.setProperty('--bh-shift', `${horizontal.toFixed(2)}%`);
      frame.style.setProperty('--bh-depth', `${depth.toFixed(2)}px`);
      frame.style.setProperty('--bh-rotation', `${rotation.toFixed(2)}deg`);
      frame.style.setProperty('--bh-scale', scale.toFixed(4));
      frame.style.zIndex = String(20 - Math.round(distance * 4));
    });

    if (nextActive !== lastActiveRef.current) {
      lastActiveRef.current = nextActive;
      setActiveIndex(nextActive);
    }
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(updateJourney);
  }, [updateJourney]);

  useEffect(() => {
    updateJourney();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate, updateJourney]);

  const moveLight = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--bh-light-x', `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`);
    event.currentTarget.style.setProperty('--bh-light-y', `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`);
  }, []);

  const selectPassage = useCallback((index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const target = sectionTop + (index / (PASSAGES.length - 1)) * travel;
    if (lenis) {
      lenis.scrollTo(target, { duration: reducedMotion ? 0 : 1.05, force: true });
    } else {
      window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion]);

  const activePassage = PASSAGES[activeIndex];

  return (
    <div id="bh-gameplay" ref={sectionRef} className="bh-theater">
      <div className="bh-theater__stage" onPointerMove={moveLight}>
        <div className="bh-theater__vault" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>
        <div className="bh-theater__dust" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${((index + 1) * 47) % 97}%`,
                top: `${((index + 1) * 31) % 101}%`,
                animationDelay: `${-((index + 1) * 0.63)}s`,
              }}
            />
          ))}
        </div>

        <div className="bh-theater__memories">
          {PASSAGES.map((passage, index) => (
            <figure
              key={passage.id}
              ref={(node) => { frameRefs.current[index] = node; }}
              className="bh-memory"
              data-active={activeIndex === index || undefined}
              aria-hidden={activeIndex !== index}
            >
              <div className="bh-memory__frame">
                <img src={passage.image} alt={passage.alt} width="1914" height="1000" loading="lazy" decoding="async" />
                <div className="bh-memory__shade" aria-hidden="true" />
              </div>
            </figure>
          ))}
        </div>

        <div className="bh-theater__light" aria-hidden="true" />

        <header className="bh-theater__head">
          <span>Field reconstruction / authentic gameplay</span>
          <strong>The Buried Hands</strong>
        </header>

        <aside className="bh-theater__readout" aria-live="polite">
          <span>{activePassage.index} / {activePassage.system}</span>
          <div>
            {(() => {
              const Icon = activePassage.icon;
              return <Icon aria-hidden="true" />;
            })()}
            <h3>{activePassage.title}</h3>
          </div>
          <p>{activePassage.detail}</p>
        </aside>

        <nav className="bh-theater__route" aria-label="The Buried Hands gameplay systems">
          {PASSAGES.map((passage, index) => (
            <button
              key={passage.id}
              type="button"
              data-active={activeIndex === index || undefined}
              onClick={() => selectPassage(index)}
              aria-pressed={activeIndex === index}
              aria-label={`${passage.index}. ${passage.title}`}
            >
              <span>{passage.index}</span>
              <i aria-hidden="true" />
              <strong>{passage.system}</strong>
            </button>
          ))}
        </nav>

        <div className="bh-theater__depth" aria-hidden="true">
          <span>−06.4 m</span>
          <i><b /></i>
          <span>−18.0 m</span>
        </div>

        <a className="bh-theater__exit" href="#mf-build-metrics">
          <span>Surface evidence</span>
          <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
