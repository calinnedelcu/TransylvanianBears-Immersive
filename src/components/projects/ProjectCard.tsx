import { useRef, useState, type PointerEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CATEGORY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  type Project,
} from '../../data/projects';
import { Chip } from '../ui/Chip';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

type ProjectCardProps = {
  project: Project;
  /** Position in the lineup, used to drive the editorial numeral. */
  index: number;
};

const initialsFromName = (name: string) =>
  name
    .replace(/[^A-Za-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || name.slice(0, 2).toUpperCase();

/**
 * Editorial project card. Two-column layout: massive numeric index + thumbnail
 * stacked vertically on one side, copy on the other. Alternates direction per
 * row so the page reads like a magazine spread, not a uniform grid.
 *
 * Animations: subtle hover lift, in-thumbnail parallax tracking cursor, corner
 * brackets that fade in on hover. No 3D tilt — that was the generic AI tell.
 */
export function ProjectCard({ project, index }: ProjectCardProps) {
  const { i18n } = useTranslation();
  const reduce = usePrefersReducedMotion();
  const lang = (i18n.resolvedLanguage ?? 'ro') as 'ro' | 'en';

  const cardRef = useRef<HTMLDivElement>(null);

  // Parallax-only motion values for the thumbnail.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 180, damping: 22, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 180, damping: 22, mass: 0.6 });
  const thumbX = useTransform(sx, [-1, 1], [-10, 10]);
  const thumbY = useTransform(sy, [-1, 1], [-8, 8]);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    px.set(nx);
    py.set(ny);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
  };

  const status = STATUS_LABEL[project.status][lang];
  const statusColor = STATUS_COLOR[project.status];
  const category = CATEGORY_LABEL[project.category][lang];
  const numeral = String(index + 1).padStart(2, '0');
  const reverse = index % 2 === 1;

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group relative grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-stretch
        py-10 md:py-12
        border-t border-bear-burgundy/40 first:border-t-0"
    >
      {/* MEDIA — thumbnail with status pill + year + numeral */}
      <div
        className={`relative md:col-span-7 ${
          reverse ? 'md:order-2' : 'md:order-1'
        }`}
      >
        <Thumbnail project={project} thumbX={thumbX} thumbY={thumbY} reduce={reduce} />

        {/* status pill */}
        <div className="absolute left-4 top-4 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full
            bg-bear-night/75 backdrop-blur-sm px-2.5 py-1
            font-mono text-[9px] uppercase tracking-[0.28em] text-bear-bone/85 tabular">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: statusColor,
                boxShadow: `0 0 10px ${statusColor}`,
              }}
            />
            {status}
          </span>
        </div>

        {/* year top-right */}
        <div className="absolute right-4 top-4 z-10">
          <span className="font-mono text-bear-gold/85 text-[11px] tracking-[0.25em] tabular
            bg-bear-night/55 backdrop-blur-sm px-2 py-0.5 rounded">
            {project.year}
          </span>
        </div>

        {/* corner brackets — fade in on hover */}
        <CornerBrackets />
      </div>

      {/* COPY — numeral + title + tagline + description + tech + links */}
      <div
        className={`relative md:col-span-5 flex flex-col ${
          reverse ? 'md:order-1' : 'md:order-2'
        }`}
      >
        {/* huge editorial numeral */}
        <span
          aria-hidden="true"
          className="chapter-numeral pointer-events-none select-none
            text-[5rem] md:text-[6rem] leading-none mb-4 -ml-1 md:-ml-2"
        >
          {numeral}
        </span>

        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-gold/85 mb-3 tabular">
          {category}
        </p>

        <h3 className="font-display font-medium text-bear-bone text-3xl md:text-4xl leading-[1.05] tracking-tight mb-3">
          {project.name}
        </h3>

        <p className="text-bear-bone/85 text-base leading-relaxed mb-3 max-w-[42ch]">
          {project.tagline[lang]}
        </p>

        <p className="text-bear-bone/55 text-sm leading-relaxed mb-4 max-w-[44ch]">
          {project.description[lang]}
        </p>

        {project.award && (
          <p className="inline-flex items-center gap-2 mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-bear-gold/70 tabular">
            <span className="h-px w-4 bg-bear-gold/40" />
            {project.award[lang]}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mb-6">
          {project.tech.map((t) => (
            <Chip key={t} variant="outline" size="sm">
              {t}
            </Chip>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-5 pt-4 border-t border-bear-burgundy/30">
          {project.liveUrl && (
            <ArrowLink href={project.liveUrl} label={`${project.name} — Demo`}>
              {lang === 'ro' ? 'Demo live' : 'Live demo'}
            </ArrowLink>
          )}
          {project.repoUrl && (
            <ArrowLink href={project.repoUrl} label={`${project.name} — Code`}>
              {lang === 'ro' ? 'Cod sursă' : 'Source code'}
            </ArrowLink>
          )}
          {project.paperUrl && (
            <ArrowLink href={project.paperUrl} label={`${project.name} — Paper`}>
              {lang === 'ro' ? 'Lucrare' : 'Paper'}
            </ArrowLink>
          )}
        </div>
      </div>
    </motion.article>
  );
}

type ThumbnailProps = {
  project: Project;
  thumbX: ReturnType<typeof useMotionValue<number>>;
  thumbY: ReturnType<typeof useMotionValue<number>>;
  reduce: boolean;
};

function Thumbnail({ project, thumbX, thumbY, reduce }: ThumbnailProps) {
  const monogram = project.monogram ?? initialsFromName(project.name);
  const [imgFailed, setImgFailed] = useState(false);
  const useImage = !!project.thumbnail && !imgFailed;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md
      border border-bear-gold/15 surface-card
      group-hover:surface-card-hover transition-all duration-500">
      {/* sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100
          transition-opacity duration-700 z-[1]
          bg-[radial-gradient(circle_at_30%_0%,rgba(232,181,71,0.18),transparent_55%)]"
      />

      <motion.div
        style={reduce ? undefined : { x: thumbX, y: thumbY }}
        className="absolute inset-0"
      >
        {useImage ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover select-none
              transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <MonogramFallback monogram={monogram} />
        )}
      </motion.div>

      {/* gradient floor */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2
        bg-gradient-to-b from-transparent to-bear-night/70" />
    </div>
  );
}

function MonogramFallback({ monogram }: { monogram: string }) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(232,181,71,0.18),transparent_55%)]" />
      {/* faint hex grid */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full opacity-[0.18]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(232,181,71,0.35)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div className="relative flex h-full w-full items-center justify-center">
        <span
          className="font-display font-bold text-[7rem] md:text-[9rem]
            text-bear-gold/30 tracking-[0.04em] leading-none
            drop-shadow-[0_2px_18px_rgba(232,181,71,0.18)]"
          aria-hidden="true"
          style={{ WebkitTextStroke: '1px rgba(232,181,71,0.55)' }}
        >
          {monogram}
        </span>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const common =
    'pointer-events-none absolute h-5 w-5 border-bear-gold/65 transition-opacity duration-500 opacity-0 group-hover:opacity-100 z-[2]';
  return (
    <>
      <span className={`${common} left-2 top-2 border-l border-t`} />
      <span className={`${common} right-2 top-2 border-r border-t`} />
      <span className={`${common} left-2 bottom-2 border-l border-b`} />
      <span className={`${common} right-2 bottom-2 border-r border-b`} />
    </>
  );
}

function ArrowLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group/link inline-flex items-center gap-1.5
        font-mono text-[10px] uppercase tracking-[0.28em] tabular
        text-bear-bone/75 hover:text-bear-gold
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bear-gold rounded
        transition-colors duration-200"
    >
      <span className="relative">
        {children}
        <span className="absolute left-0 -bottom-0.5 h-px w-full bg-bear-gold scale-x-0 origin-left
          transition-transform duration-300 group-hover/link:scale-x-100" />
      </span>
      <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
    </a>
  );
}
