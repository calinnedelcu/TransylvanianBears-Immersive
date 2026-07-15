import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ACHIEVEMENTS,
  RANKING_COLOR,
  RANKING_LABEL,
  type AchievementCategory,
} from '../../data/achievements';
import { Chip } from '../ui/Chip';

const CATEGORY_LABEL: Record<AchievementCategory, { ro: string; en: string }> = {
  national: { ro: 'Național', en: 'National' },
  international: { ro: 'Internațional', en: 'International' },
  hackathon: { ro: 'Hackathon', en: 'Hackathon' },
};

export function Timeline() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'ro';
  const [activeId, setActiveId] = useState<string | null>(null);

  // Reverse so the most recent achievement sits at the top of the list.
  const items = [...ACHIEVEMENTS].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return (b.month ?? 0) - (a.month ?? 0);
  });

  return (
    <div className="relative">
      {/* Vertical guide line — center on desktop, left on mobile */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-4 md:left-1/2 md:-translate-x-1/2
          w-px bg-gradient-to-b from-transparent via-bear-burgundy/60 to-transparent"
      />

      <ul className="space-y-10 md:space-y-14">
        {items.map((it, idx) => {
          const onLeft = idx % 2 === 0;
          return (
            <li key={it.id} className="relative">
              <div className="md:grid md:grid-cols-2 md:gap-12 items-center">
                {/* Card slot — uses md:col-start to position L or R */}
                <motion.div
                  initial={{ opacity: 0, x: onLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className={
                    'pl-12 md:pl-0 ' +
                    (onLeft ? 'md:col-start-1 md:pr-10 md:text-right' : 'md:col-start-2 md:pl-10')
                  }
                >
                  <article
                    tabIndex={it.image ? 0 : -1}
                    onMouseEnter={() => setActiveId(it.id)}
                    onMouseLeave={() =>
                      setActiveId((curr) => (curr === it.id ? null : curr))
                    }
                    onFocus={() => setActiveId(it.id)}
                    onBlur={() =>
                      setActiveId((curr) => (curr === it.id ? null : curr))
                    }
                    className="rounded-md border border-bear-burgundy/40 bg-bear-night/70 backdrop-blur-sm p-5 shadow-burgundy
                      transition-colors hover:border-bear-burgundy/70 focus-visible:border-bear-gold/70
                      focus:outline-none cursor-default"
                  >
                    <div
                      className={
                        'flex items-center gap-3 mb-2 ' +
                        (onLeft ? 'md:justify-end' : 'md:justify-start')
                      }
                    >
                      <span className="font-mono text-xs tracking-widest text-bear-gold/85">
                        {it.year}
                        {it.month
                          ? ` · ${String(it.month).padStart(2, '0')}`
                          : ''}
                      </span>
                      <Chip variant="outline" size="sm">
                        {CATEGORY_LABEL[it.category][lang]}
                      </Chip>
                    </div>

                    <h3 className="font-display text-xl md:text-2xl text-bear-bone leading-tight mb-1">
                      {it.title}
                    </h3>
                    <p className="text-sm text-bear-bone/70 leading-relaxed">
                      {typeof it.detail === 'string' ? it.detail : (it.detail[lang] ?? it.detail.ro)}
                    </p>

                    {it.link && (
                      <div
                        className={
                          'mt-3 ' +
                          (onLeft ? 'md:text-right' : 'md:text-left')
                        }
                      >
                        <a
                          href={it.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase
                            tracking-[0.22em] text-bear-gold/85 hover:text-bear-gold
                            border-b border-bear-gold/40 hover:border-bear-gold pb-0.5 transition-colors"
                        >
                          {it.linkLabel
                            ? typeof it.linkLabel === 'string'
                              ? it.linkLabel
                              : (it.linkLabel[lang] ?? it.linkLabel.ro)
                            : (lang === 'ro' ? 'Deschide' : 'Open')}
                          <span aria-hidden="true">↗</span>
                        </a>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {it.image && activeId === it.id && (
                        <motion.div
                          key="image-reveal"
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginTop: 14 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.42, ease: [0.32, 0.72, 0, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="relative rounded-sm overflow-hidden border border-bear-burgundy/40 ring-1 ring-bear-gold/15">
                            <img
                              src={it.image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="block w-full h-auto select-none"
                              draggable={false}
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bear-night/55 via-transparent to-transparent"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className={
                        'mt-3 flex items-center gap-2 ' +
                        (onLeft ? 'md:justify-end' : 'md:justify-start')
                      }
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-bear-night"
                        style={{ background: RANKING_COLOR[it.ranking] }}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-bear-bone/70">
                        {RANKING_LABEL[it.ranking][lang]}
                      </span>
                    </div>
                  </article>
                </motion.div>
              </div>

              {/* Dot on the spine */}
              <span
                aria-hidden="true"
                className="absolute top-6 left-4 md:left-1/2 md:-translate-x-1/2
                  inline-block h-3.5 w-3.5 rounded-full ring-4 ring-bear-night"
                style={{ background: RANKING_COLOR[it.ranking] }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
