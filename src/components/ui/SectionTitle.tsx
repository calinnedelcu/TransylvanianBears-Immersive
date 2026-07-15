import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

type SectionTitleProps = {
  eyebrow?: ReactNode;
  /** Two-digit chapter index, e.g. "01" — rendered as a huge outline serif. */
  chapter?: string;
  align?: 'left' | 'center';
  /** Optional kicker rendered to the right of the chapter numeral. */
  kicker?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
};

/**
 * Editorial section header. The chapter numeral lives as a giant outline serif
 * in the gutter; the title is a tight Cinzel display with optional eyebrow and
 * kicker. No flat gold underline — the type carries the section by itself.
 */
export function SectionTitle({
  eyebrow,
  chapter,
  align = 'left',
  kicker,
  children,
  className,
  id,
}: SectionTitleProps) {
  const isCenter = align === 'center';

  return (
    <header
      className={cn('relative mb-14 md:mb-20', isCenter && 'text-center', className)}
      id={id}
    >
      {/* Massive chapter numeral, sits in the gutter behind the title. */}
      {chapter && !isCenter && (
        <motion.span
          aria-hidden="true"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="chapter-numeral pointer-events-none absolute -left-1 -top-10 md:-left-3 md:-top-16
            text-[7rem] md:text-[12rem] lg:text-[14rem] leading-none select-none
            opacity-70"
        >
          {chapter}
        </motion.span>
      )}

      <div className={cn('relative', chapter && !isCenter && 'pl-0 md:pl-4')}>
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-3 mb-5',
              isCenter && 'justify-center',
            )}
          >
            <span className="h-px w-8 bg-bear-gold/60" />
            <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.32em] text-bear-gold/95 tabular">
              {eyebrow}
            </span>
            {chapter && isCenter && (
              <span className="font-mono text-[10px] md:text-xs uppercase tracking-[0.32em] text-bear-gold/55 tabular">
                — {chapter}
              </span>
            )}
            <span className="h-px w-8 bg-bear-gold/60" />
          </motion.div>
        )}

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className={cn(
            'font-display font-medium text-bear-bone',
            'text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem]',
            'leading-[0.9] tracking-tightest',
          )}
        >
          {children}
        </motion.h2>

        {kicker && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.22 }}
            className={cn(
              'mt-5 max-w-2xl text-bear-bone/70 text-base md:text-lg leading-relaxed',
              isCenter && 'mx-auto',
            )}
          >
            {kicker}
          </motion.p>
        )}
      </div>
    </header>
  );
}
