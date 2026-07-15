import { useTranslation } from 'react-i18next';
import { SectionTitle } from '../ui/SectionTitle';
import { MemberCard } from '../members/MemberCard';
import { SectionFogReveal } from '../layout/SectionFogReveal';
import { MEMBERS } from '../../data/members';

export function Members() {
  const { t } = useTranslation();

  return (
    <section
      id="members"
      className="section-y bg-bear-wine relative overflow-hidden"
      aria-label={t('members.title')}
    >
      {/* faint vertical wash on left edge for texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-32
          bg-gradient-to-r from-bear-night/60 to-transparent"
      />
      {/* gold spark bottom-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 w-[480px] h-[480px] rounded-full
          bg-[radial-gradient(circle,rgba(232,181,71,0.06),transparent_70%)] blur-2xl"
      />

      <SectionFogReveal />

      <div className="container-wide relative">
        <SectionTitle
          eyebrow={t('members.eyebrow')}
          chapter="02"
          kicker={t('members.subtitle')}
        >
          {t('members.title')}
        </SectionTitle>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
          {MEMBERS.map((m, i) => (
            <li
              key={m.id}
              className={
                // Editorial offset — every other row drops 24px so cards don't sit on a flat baseline.
                i % 2 === 0 ? 'lg:translate-y-0' : 'lg:translate-y-6'
              }
            >
              <MemberCard member={m} index={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
