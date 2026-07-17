import { ArrowDown, Cog, Ear, Landmark, Wind } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import './buried-gameplay-theater.css';

type EvidencePassage = {
  id: 'mechanism' | 'guards' | 'mercury' | 'royal-hall';
  index: string;
  system: string;
  title: string;
  detail: string;
  image: string;
  mobileImage: string;
  alt: string;
  icon: typeof Cog;
};

const PASSAGES: EvidencePassage[] = [
  {
    id: 'mechanism',
    index: 'I',
    system: 'Craft knowledge',
    title: 'Mecanismul indică următoarea rută.',
    detail: 'Captura cere luarea vazei și măștii, apoi urmarea tunelului spre Sala Mercurului.',
    image: '/assets/projects/buried-hands/mechanism.webp',
    mobileImage: '/assets/projects/buried-hands/mobile/mechanism.webp',
    alt: 'Mecanismul cu scripeți, lanțuri și vasul de mercur din The Buried Hands',
    icon: Cog,
  },
  {
    id: 'guards',
    index: 'II',
    system: 'Acoustic field',
    title: 'Gardienii aud pașii.',
    detail: 'Pagina proiectului formulează regula direct: gardienii aud pașii.',
    image: '/assets/projects/buried-hands/guards.webp',
    mobileImage: '/assets/projects/buried-hands/mobile/guards.webp',
    alt: 'Gardieni patrulând o sală slab luminată din The Buried Hands',
    icon: Ear,
  },
  {
    id: 'mercury',
    index: 'III',
    system: 'Toxic atmosphere',
    title: 'Vaporii limitează expunerea.',
    detail: 'HUD-ul urmărește vaporii, iar obiectivul cere umplerea vazei cu mercur și întoarcerea la mecanism.',
    image: '/assets/projects/buried-hands/mercury.webp',
    mobileImage: '/assets/projects/buried-hands/mobile/mercury.webp',
    alt: 'Sala cu mercur, pasarele și unelte din The Buried Hands',
    icon: Wind,
  },
  {
    id: 'royal-hall',
    index: 'IV',
    system: 'Monumental logic',
    title: 'Ieșirea devine urgentă.',
    detail: 'Obiectivul din Sala Regală cere găsirea ieșirii înainte ca vaporii de mercur să devină prea denși.',
    image: '/assets/projects/buried-hands/royal-hall.webp',
    mobileImage: '/assets/projects/buried-hands/mobile/royal-hall.webp',
    alt: 'Sala Regală din The Buried Hands, cu statui și mecanism central',
    icon: Landmark,
  },
];

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

export default function BuriedGameplayTheater() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const activeIndexRef = useRef(0);
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
    const position = progress * PASSAGES.length;
    const nextActive = clamp(Math.floor(position), 0, PASSAGES.length - 1);
    section.style.setProperty('--bh-progress', progress.toFixed(4));
    section.style.setProperty('--bh-evidence-index', String(nextActive));

    if (nextActive !== activeIndexRef.current) {
      activeIndexRef.current = nextActive;
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

  const selectPassage = useCallback((index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const sectionTop = window.scrollY + section.getBoundingClientRect().top;
    const travel = Math.max(1, section.offsetHeight - window.innerHeight);
    const target = sectionTop + (index / PASSAGES.length) * travel + 2;
    if (lenis) {
      if (reducedMotion) {
        lenis.scrollTo(target, { immediate: true, force: true });
      } else {
        lenis.scrollTo(target, { duration: 1.05, force: true });
      }
    } else {
      window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion]);

  const activePassage = PASSAGES[activeIndex];
  const ActiveIcon = activePassage.icon;

  return (
    <div id="bh-gameplay" ref={sectionRef} className="bh-evidence-passage">
      <div className="bh-evidence-passage__stage">
        <div className="bh-evidence-passage__frame" aria-hidden="true">
          <i /><i /><i /><i />
        </div>

        <div className="bh-evidence-passage__fallback-media">
          {PASSAGES.map((passage, index) => (
            <figure
              key={passage.id}
              data-active={activeIndex === index || undefined}
              aria-hidden={activeIndex !== index}
            >
              <picture>
                <source media="(max-width: 820px)" srcSet={passage.mobileImage} />
                <img
                  src={passage.image}
                  alt={passage.alt}
                  width="1914"
                  height="1000"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
            </figure>
          ))}
        </div>

        <header className="bh-evidence-passage__head">
          <span>Public gallery / spatial evidence</span>
          <strong>The Buried Hands</strong>
        </header>

        <aside className="bh-evidence-passage__readout" aria-live="polite">
          <span>{activePassage.index} / {activePassage.system}</span>
          <div>
            <ActiveIcon aria-hidden="true" />
            <h3>{activePassage.title}</h3>
          </div>
          <p>{activePassage.detail}</p>
          <small>Cadru din galeria publică a proiectului</small>
        </aside>

        <nav className="bh-evidence-passage__route" aria-label="Dovezi The Buried Hands">
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

        <div className="bh-evidence-passage__depth" aria-hidden="true">
          <span>Premisa jocului / 210 î.Hr.</span>
          <i><b /></i>
          <span>Mausoleul lui Qin Shi Huang</span>
        </div>

        <a className="bh-evidence-passage__exit" href="#mf-build-metrics">
          <span>Build record</span>
          <ArrowDown aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
