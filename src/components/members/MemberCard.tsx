import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Member } from '../../data/members';
import { Chip } from '../ui/Chip';
import { TarotFrame } from './TarotFrame';

type MemberCardProps = {
  member: Member;
  /** Index in grid — used to stagger entrance animation. */
  index: number;
};

export function MemberCard({ member, index }: MemberCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [locked, setLocked] = useState(false);

  const flipped = locked || hovered || focused;

  // Vacant cards link directly to the Join section instead of flipping.
  if (member.vacant) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: 'easeOut', delay: (index % 4) * 0.06 }}
      >
        <a
          href="#join"
          aria-label={`${t('members.vacant.title')} — ${t('members.vacant.cta')}`}
          className="relative block w-full aspect-[3/4] rounded-md
            focus:outline-none focus-visible:ring-2 focus-visible:ring-bear-gold/70
            focus-visible:ring-offset-2 focus-visible:ring-offset-bear-wine
            transition-transform duration-300 hover:-translate-y-1"
        >
          <VacantFace numeral={member.numeral} />
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: (index % 4) * 0.06 }}
    >
      <div
        className="group [perspective:1200px]"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <button
          type="button"
          onClick={() => {
            if (flipped) {
              navigate(`/echipa/${member.id}`);
            } else {
              setLocked((v) => !v);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label={`${member.name}${member.role ? ` — ${member.role}` : ''}`}
          aria-pressed={locked}
          className="relative block w-full aspect-[3/4] rounded-md text-left
            will-change-transform focus:outline-none
            focus-visible:ring-2 focus-visible:ring-bear-gold/70
            focus-visible:ring-offset-2 focus-visible:ring-offset-bear-wine"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotate3d(0, 1, 0, ${flipped ? 180 : 0.001}deg)`,
            transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Face>
            <FrontContent member={member} />
          </Face>

          <Face back>
            <BackContent member={member} flipped={flipped} />
          </Face>
        </button>
      </div>
    </motion.div>
  );
}

function Face({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-md overflow-hidden surface-parchment border border-bear-gold/30"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: back ? 'rotate3d(0, 1, 0, 180deg)' : undefined,
      }}
    >
      <TarotFrame />
      {/* parchment grain — heavier on tarot than global */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

function FrontContent({ member }: { member: Member }) {
  return (
    <div className="flex h-full flex-col items-center justify-between px-4 pb-[10%] pt-[13%] text-center">
      {/* Top — role label (or invisible spacer if blank to keep layout balanced) */}
      <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-bear-gold/85 tabular min-h-[1em]">
        {member.role || ' '}
      </p>

      {/* Middle — portrait (if any) or symbolic centerpiece */}
      <div className="flex-grow flex items-center justify-center w-full py-3">
        {member.portrait ? (
          <PortraitArea member={member} />
        ) : (
          <SymbolCenterpiece numeral={member.numeral} />
        )}
      </div>

      {/* Bottom — name + numeral rule */}
      <div className="w-full">
        <h3 className="font-display text-base md:text-[1.05rem] font-medium text-bear-bone leading-tight tracking-tight mb-1.5">
          {member.name}
        </h3>
        <div className="flex items-center justify-center gap-2 opacity-80">
          <span className="h-px w-6 bg-bear-gold/45" />
          <span className="font-display text-[10px] tracking-[0.4em] text-bear-gold/85 tabular">
            {member.numeral}
          </span>
          <span className="h-px w-6 bg-bear-gold/45" />
        </div>
      </div>
    </div>
  );
}

function BackContent({ member, flipped }: { member: Member; flipped: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'ro') as 'ro' | 'en';
  const bioText =
    typeof member.bio === 'string' ? member.bio : (member.bio[lang] ?? member.bio.ro);
  const hasRole = member.role.length > 0;
  const hasBio = bioText.length > 0;
  const hasSkills = member.skills.length > 0;

  return (
    <div className="flex h-full flex-col px-5 py-7">
      {hasRole && (
        <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bear-gold/85 mb-1">
          {member.role}
        </p>
      )}
      <h3 className="font-display text-lg font-medium text-bear-bone leading-tight tracking-tight mb-3">
        {member.name}
      </h3>

      {hasBio ? (
        <p className="text-sm leading-relaxed text-bear-bone/80 mb-5 flex-grow">
          {bioText}
        </p>
      ) : (
        <div className="text-sm italic text-bear-bone/55 mb-5 flex-grow flex items-center">
          <span>{t('members.bioPending')}</span>
        </div>
      )}

      {hasSkills && (
        <div className="border-t border-bear-burgundy/40 pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bear-bone/55 mb-2">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {member.skills.map((s) => (
              <Chip key={s} variant="gold" size="sm">
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: flipped ? 1 : 0 }}
        transition={{ duration: 0.4, delay: flipped ? 0.5 : 0 }}
        className="mt-auto pt-3 font-mono text-[9px] uppercase tracking-[0.28em]
          text-bear-gold/55 text-center tabular"
      >
        Click pentru detalii →
      </motion.p>
    </div>
  );
}

function PortraitArea({ member }: { member: Member }) {
  // Heavily feathered vignette: solid only in a small head zone, then a long
  // gradual ramp to transparent so the portrait dissolves into the card
  // background rather than reading as a pasted photograph. The radial center
  // is biased upward (32%) so the face stays the visual anchor.
  const maskImage =
    'radial-gradient(ellipse 65% 80% at 50% 32%, black 0%, rgba(0,0,0,0.95) 22%, rgba(0,0,0,0.75) 42%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.18) 80%, transparent 100%)';

  return (
    <div className="relative w-full max-w-[230px] aspect-[3/4]">
      {/* Tight gold halo just around the head — small radius and low alpha so
          it reads as a faint warm presence, not a spotlight that reveals the
          portrait boundary. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle 95px at 50% 28%, rgba(232,181,71,0.13) 0%, rgba(232,181,71,0.06) 50%, transparent 100%)',
        }}
      />
      <img
        src={member.portrait}
        alt={member.name}
        draggable={false}
        className="relative h-full w-full object-cover object-top select-none"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      />
    </div>
  );
}

/**
 * Open-seat tarot card. Dashed gold ring + question-mark glyph + recruitment
 * copy. Linked to the join CTA. Designed to read as intentional, not broken.
 */
function VacantFace({ numeral }: { numeral: string }) {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 rounded-md overflow-hidden surface-parchment border border-dashed border-bear-gold/45">
      <TarotFrame />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
        }}
      />
      <div className="relative h-full w-full flex flex-col items-center justify-between px-4 py-7 text-center">
        <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-bear-gold/75 tabular">
          {t('members.vacant.eyebrow')}
        </p>

        <div className="flex-grow flex items-center justify-center w-full py-3">
          <div className="relative w-24 h-24 md:w-28 md:h-28">
            {/* dashed halo ring */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full text-bear-gold/55"
              aria-hidden="true"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeDasharray="3 3"
              />
              <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.5" />
            </svg>
            {/* big question mark */}
            <span
              className="absolute inset-0 flex items-center justify-center
                font-display text-5xl md:text-6xl text-bear-gold/75
                drop-shadow-[0_2px_18px_rgba(232,181,71,0.25)]"
            >
              ?
            </span>
          </div>
        </div>

        <div className="w-full">
          <h3 className="font-display text-base md:text-[1.05rem] font-medium text-bear-bone/90 leading-tight tracking-tight mb-1.5">
            {t('members.vacant.title')}
          </h3>
          <p className="font-sans text-[11px] text-bear-bone/55 mb-2 italic">
            {t('members.vacant.cta')}
          </p>
          <div className="flex items-center justify-center gap-2 opacity-70">
            <span className="h-px w-6 bg-bear-gold/45" />
            <span className="font-display text-[10px] tracking-[0.4em] text-bear-gold/75 tabular">
              {numeral}
            </span>
            <span className="h-px w-6 bg-bear-gold/45" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * When no portrait is provided, render a symbolic tarot-card centerpiece:
 * a bear-paw + moon glyph wrapped in a circular gold halo, with the numeral
 * dominating below. Reads as intentional iconography, not "missing photo".
 */
function SymbolCenterpiece({ numeral }: { numeral: string }) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative w-24 h-24 md:w-28 md:h-28">
        {/* outer halo ring */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full text-bear-gold/55"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.65" />
          {/* tick marks at 12/3/6/9 */}
          <g stroke="currentColor" strokeWidth="0.6">
            <line x1="50" y1="2" x2="50" y2="6" />
            <line x1="50" y1="94" x2="50" y2="98" />
            <line x1="2" y1="50" x2="6" y2="50" />
            <line x1="94" y1="50" x2="98" y2="50" />
          </g>
          {/* small bear-paw glyph at center: pad + 4 toes */}
          <g transform="translate(50 56)" fill="currentColor">
            <ellipse cx="0" cy="0" rx="9" ry="7" />
            <circle cx="-9" cy="-9" r="2.6" />
            <circle cx="-3.5" cy="-13" r="2.6" />
            <circle cx="3.5" cy="-13" r="2.6" />
            <circle cx="9" cy="-9" r="2.6" />
          </g>
          {/* crescent moon arc above paw */}
          <g transform="translate(50 30)" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.85">
            <path d="M -7 0 A 7 7 0 1 0 4 -5 A 5.5 5.5 0 1 1 -7 0 Z" fill="currentColor" opacity="0.9" />
          </g>
        </svg>
      </div>
      <span className="font-display text-3xl md:text-4xl font-bold text-bear-gold/90 tracking-[0.18em] tabular drop-shadow-[0_2px_18px_rgba(232,181,71,0.25)]">
        {numeral}
      </span>
    </div>
  );
}
