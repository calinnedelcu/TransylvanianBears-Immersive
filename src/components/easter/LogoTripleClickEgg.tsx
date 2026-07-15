import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const EVENT_NAME = 'tb:logo-triple-click';

/**
 * Fires the easter egg from anywhere in the tree (e.g. the Navbar logo).
 */
export function fireLogoTripleClick() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * Shows a friendly bear-waving cameo in the bottom-right corner with a
 * speech bubble. Triggered by triple-clicking the logo within 500ms.
 * Auto-dismisses after ~2.6s.
 */
export function LogoTripleClickEgg() {
  const reduce = useReducedMotion();
  const { i18n } = useTranslation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;
    const onFire = () => {
      setActive(true);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setActive(false), 2600);
    };
    window.addEventListener(EVENT_NAME, onFire);
    return () => {
      window.removeEventListener(EVENT_NAME, onFire);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const greeting = i18n.language?.startsWith('ro') ? 'Salut!' : 'Hi!';

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="logo-egg"
          initial={{ opacity: 0, x: 80, y: 30 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 60, y: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[180] pointer-events-none flex items-end gap-3"
          aria-hidden="true"
        >
          {/* speech bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 380, damping: 18 }}
            className="relative mb-6 px-4 py-2 bg-bear-cream text-bear-night
              font-display text-base md:text-lg
              shadow-[0_18px_30px_rgba(0,0,0,0.45)]
              border border-bear-gold/30"
          >
            {greeting}
            <span
              className="absolute -bottom-2 right-6 w-3 h-3 rotate-45 bg-bear-cream
                border-r border-b border-bear-gold/30"
            />
          </motion.div>

          {/* halo */}
          <div className="relative">
            <motion.div
              className="absolute inset-0 -m-4 rounded-full blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(212,168,83,0.55) 0%, rgba(140,21,46,0.18) 50%, transparent 75%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.85, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.img
              src="/assets/bear-waving.webp"
              alt=""
              loading="eager"
              decoding="async"
              className="relative w-28 md:w-36 h-auto drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
              style={{ transformOrigin: '50% 100%' }}
              animate={
                reduce
                  ? undefined
                  : {
                      rotate: [-4, 6, -4, 6, -2, 0],
                      y: [0, -4, 0, -4, 0, 0],
                    }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: 2.2, ease: 'easeInOut', times: [0, 0.18, 0.36, 0.54, 0.72, 1] }
              }
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
