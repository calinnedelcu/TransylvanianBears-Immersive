import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { ParallaxLayer } from '../hero/ParallaxLayer';
import { BearMascot } from '../hero/BearMascot';
import { FogDrift } from '../hero/FogDrift';
import { Stars } from '../hero/Stars';
import { Bats } from '../hero/Bats';
import { CastleFlicker } from '../hero/CastleFlicker';
import { GodRays } from '../hero/GodRays';
import { Typewriter } from '../hero/Typewriter';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export function Hero() {
  const { t } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Shared mouse motion values, normalized to -1..1.
  const rawMx = useMotionValue(0);
  const rawMy = useMotionValue(0);
  const mouseX = useSpring(rawMx, { stiffness: 80, damping: 20, mass: 0.5 });
  const mouseY = useSpring(rawMy, { stiffness: 80, damping: 20, mass: 0.5 });

  // Scroll progress through the Hero (0 at top, 1 when bottom of Hero leaves top).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // Per-layer scroll-driven Y translations. Kept conservative so the layer's
  // hard bottom edge never enters the visible viewport during scroll. Combined
  // with an oversized layer height (115% via inline style overrides on each
  // ParallaxLayer below), the seam between layers stays hidden.
  const ySkyMoon = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const yMountainsFar = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const yMountainsNear = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const yCastle = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const yForest = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const yBear = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const opacityBear = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0]);
  const opacityContent = useTransform(scrollYProgress, [0, 0.4, 0.7], [1, 1, 0]);

  useEffect(() => {
    if (reduce) return;
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

    const el = sectionRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      rawMx.set(nx);
      rawMy.set(ny);
    };
    const onLeave = () => {
      rawMx.set(0);
      rawMy.set(0);
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [rawMx, rawMy, reduce]);

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-dvh overflow-hidden bg-bear-night"
      style={{
        backgroundImage: 'linear-gradient(180deg, #1A0509 0%, #2A0810 100%)',
      }}
      aria-label={t('hero.title')}
    >
      {/*
        Scene layers — all share the same 1672x941 canvas, designed to be stacked
        edge-to-edge (Photoshop layers exported individually). Each one fills the
        section; depth comes from the asset composition + parallax speed difference.
      */}

      {/* z-0 — sky + moon (faded so it doesn't compete with the title) */}
      <ParallaxLayer
        src="/assets/sky-moon.webp"
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        style={{ zIndex: 0, opacity: 0.5 }}
        mouseX={mouseX}
        mouseY={mouseY}
        mouseStrength={0.15}
        scrollY={ySkyMoon}
      />

      {/* Stars — over sky */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <Stars count={22} />
      </div>

      {/* God rays — subtle, over sky */}
      <div className="absolute inset-0 opacity-40" style={{ zIndex: 2 }}>
        <GodRays />
      </div>

      {/* z-10 — mountains far */}
      <ParallaxLayer
        src="/assets/mountains-far.webp"
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        style={{ zIndex: 10 }}
        mouseX={mouseX}
        mouseY={mouseY}
        mouseStrength={0.25}
        scrollY={yMountainsFar}
      />

      {/* z-20 — mountains near */}
      <ParallaxLayer
        src="/assets/mountains-near.webp"
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        style={{ zIndex: 20 }}
        mouseX={mouseX}
        mouseY={mouseY}
        mouseStrength={0.4}
        scrollY={yMountainsNear}
      />

      {/* z-25 — castle (full-canvas layer, silhouette already in correct spot) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 25 }}>
        <ParallaxLayer
          src="/assets/castle.webp"
          className="absolute inset-0 w-full h-full object-cover object-bottom"
          mouseX={mouseX}
          mouseY={mouseY}
          mouseStrength={0.35}
          scrollY={yCastle}
        />
        <CastleFlicker />
      </div>

      {/* z-30 — fog mid (drifts L→R, sits in the lower-middle band) */}
      <FogDrift
        src="/assets/fog.webp"
        direction="l-to-r"
        durationSec={32}
        opacity={0.22}
        className="inset-0 w-full h-full"
        style={{ zIndex: 30 }}
      />

      {/* Bats — atmosphere, rare passes (above fog so they read clearly) */}
      <div className="absolute inset-0" style={{ zIndex: 35 }}>
        <Bats src="/assets/bats.webp" />
      </div>

      {/* z-40 — forest (full-canvas, foreground silhouette anchored at bottom) */}
      <ParallaxLayer
        src="/assets/forest.webp"
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        style={{ zIndex: 40 }}
        mouseX={mouseX}
        mouseY={mouseY}
        mouseStrength={0.6}
        scrollY={yForest}
      />

      {/* z-45 — bear mascot (square 1:1 asset, anchored bottom-center) */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none"
        style={{ zIndex: 45 }}
      >
        <BearMascot
          src="/assets/bear-mascot.webp"
          alt="TransylvanianBears mascot"
          className="w-[44%] sm:w-[32%] md:w-[24%] lg:w-[20%] xl:w-[17%] max-w-[320px] origin-bottom"
          mouseX={mouseX}
          mouseY={mouseY}
          mouseStrength={0.7}
          scrollY={yBear}
          scrollOpacity={opacityBear}
        />
      </div>

      {/* z-50 — fog foreground (drifts R→L, lighter, ground-hugging) */}
      <FogDrift
        src="/assets/fog.webp"
        direction="r-to-l"
        durationSec={45}
        opacity={0.14}
        className="inset-x-0 bottom-0 h-[26%]"
        style={{ zIndex: 50 }}
      />

      {/* z-60 — content overlay positioned below the moon to keep the title readable */}
      <motion.div
        className="absolute inset-x-0 top-[28%] md:top-[24%] container-tb text-center px-6"
        style={{ zIndex: 60, opacity: opacityContent }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <span className="h-px w-10 bg-bear-gold/55" />
          <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.4em] text-bear-gold/95 tabular">
            {t('hero.eyebrow')}
          </span>
          <span className="h-px w-10 bg-bear-gold/55" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-bold text-gradient-gold
            text-[clamp(1.5rem,6vw,6rem)]
            leading-[0.9] tracking-tightest mb-6
            drop-shadow-[0_4px_30px_rgba(74,14,31,0.7)]
            whitespace-nowrap"
        >
          {t('hero.title')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9 }}
          className="font-sans font-light text-base md:text-2xl text-bear-bone/90 mb-10 max-w-2xl mx-auto leading-[1.4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] min-h-[1.4em]"
        >
          <Typewriter text={t('hero.tagline')} cps={42} startDelay={1100} />
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          className="flex flex-wrap items-center justify-center gap-3 md:gap-4"
        >
          <Button href="#about" size="lg">
            {t('hero.cta')} ↓
          </Button>
          <Button href="#join" variant="outline" size="lg">
            {t('hero.ctaSecondary')}
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll hint indicator */}
      <motion.a
        href="#about"
        aria-label={t('hero.cta')}
        initial={{ opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0.6 }
            : { opacity: [0, 0.7, 0.7, 0.4], y: [0, 6, 0] }
        }
        transition={
          reduce
            ? { duration: 0.4, delay: 1.6 }
            : {
                opacity: { duration: 2, delay: 1.6 },
                y: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
              }
        }
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-bear-bone/70 hover:text-bear-gold transition-colors"
        style={{ zIndex: 60 }}
      >
        <ChevronDown size={28} />
      </motion.a>

      {/* Bottom dark gradient — masks the parallax seam zone where layers'
          bottom edges expose during scroll. Sits BETWEEN the forest (z-40)
          and the bear (z-45) so it darkens the seams behind the bear without
          covering the bear's lower body. */}
      <div
        className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
        style={{
          zIndex: 42,
          background:
            'linear-gradient(180deg, transparent 0%, rgba(26,5,9,0.4) 30%, rgba(26,5,9,0.85) 70%, #1A0509 100%)',
        }}
      />
    </section>
  );
}
