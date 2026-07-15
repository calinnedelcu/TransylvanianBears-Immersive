import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SectionTitle } from '../ui/SectionTitle';
import { ProjectCard } from '../projects/ProjectCard';
import { SectionFogReveal } from '../layout/SectionFogReveal';
import { PROJECTS } from '../../data/projects';

export function Projects() {
  const { t } = useTranslation();

  return (
    <section
      id="projects"
      className="section-y bg-bear-wine relative overflow-hidden"
      aria-label={t('projects.title')}
    >
      {/* bear-thinking watermark — bottom-right, behind content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 w-[420px] md:w-[560px] opacity-[0.07]"
      >
        <img
          src="/assets/bear-thinking.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="w-full h-auto select-none"
        />
      </div>

      <SectionFogReveal />

      <div className="container-wide relative">
        <SectionTitle
          eyebrow={t('projects.eyebrow')}
          chapter="04"
          kicker={t('projects.subtitle')}
        >
          {t('projects.title')}
        </SectionTitle>

        {/* Editorial article list — alternating L/R per row, full-width separators. */}
        <div className="border-y border-bear-burgundy/40">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>

        {/* CTA — link to full projects page */}
        <div className="mt-12 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-bone/35 tabular">
            {PROJECTS.length} {t('projects.eyebrow').toLowerCase()}
          </span>
          <Link
            to="/proiecte"
            className="group inline-flex items-center gap-2
              font-mono text-[11px] uppercase tracking-[0.32em] tabular
              text-bear-gold/70 hover:text-bear-gold
              border border-bear-gold/25 hover:border-bear-gold/55
              px-5 py-2.5 rounded-full transition-all duration-200"
          >
            {t('projects.viewAll') as string || 'Vezi toate'}
            <ArrowUpRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
