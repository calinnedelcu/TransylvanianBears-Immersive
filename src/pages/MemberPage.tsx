import { useParams, Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Github, Mail, Instagram, Linkedin, Globe, MessageCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import { MEMBERS } from '../data/members';
import type { MemberContact } from '../data/members';
import { Chip } from '../components/ui/Chip';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { TarotFrame } from '../components/members/TarotFrame';
import { CapeSweepProvider } from '../components/layout/CapeSweepProvider';
import { useLenis } from '../hooks/useLenis';

const maskImage =
  'radial-gradient(ellipse 70% 85% at 50% 28%, black 0%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.75) 48%, rgba(0,0,0,0.4) 68%, rgba(0,0,0,0.12) 85%, transparent 100%)';

function ContactLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith('mailto') ? undefined : '_blank'}
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3 rounded-md border border-bear-burgundy/40
        bg-bear-wine/40 hover:border-bear-gold/50 hover:bg-bear-wine/70
        text-bear-bone/75 hover:text-bear-gold transition-all duration-200"
    >
      <Icon size={16} className="shrink-0 text-bear-gold/70 group-hover:text-bear-gold transition-colors" />
      <span className="text-sm font-sans">{label}</span>
    </a>
  );
}

function buildContactLinks(contact: MemberContact) {
  const links: { href: string; icon: React.ElementType; label: string }[] = [];

  if (contact.email) {
    links.push({ href: `mailto:${contact.email}`, icon: Mail, label: contact.email });
  }
  if (contact.github) {
    const handle = contact.github.replace('https://github.com/', '');
    links.push({ href: contact.github, icon: Github, label: `github.com/${handle}` });
  }
  if (contact.instagram) {
    const handle = contact.instagram.replace('https://instagram.com/', '').replace('@', '');
    links.push({ href: contact.instagram, icon: Instagram, label: `@${handle}` });
  }
  if (contact.linkedin) {
    links.push({ href: contact.linkedin, icon: Linkedin, label: 'LinkedIn' });
  }
  if (contact.discord) {
    links.push({ href: `#`, icon: MessageCircle, label: contact.discord });
  }
  if (contact.website) {
    links.push({ href: contact.website, icon: Globe, label: contact.website.replace(/^https?:\/\//, '') });
  }

  return links;
}

export function MemberPage() {
  useLenis();
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? 'ro') as 'ro' | 'en';

  const member = MEMBERS.find((m) => m.id === id && !m.vacant);
  if (!member) return <Navigate to="/" replace />;


  const bio =
    typeof member.bio === 'string' ? member.bio : (member.bio[lang] ?? member.bio.ro);

  const bioExtended = member.bioExtended
    ? typeof member.bioExtended === 'string'
      ? member.bioExtended
      : (member.bioExtended[lang] ?? member.bioExtended.ro)
    : null;

  const contactLinks = member.contact ? buildContactLinks(member.contact) : [];

  const memberIndex = MEMBERS.findIndex((m) => m.id === id);
  const prevMember = MEMBERS.slice(0, memberIndex).reverse().find((m) => !m.vacant);
  const nextMember = MEMBERS.slice(memberIndex + 1).find((m) => !m.vacant);

  return (
    <CapeSweepProvider>
    <motion.div
      key={member.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }}
    >
    <div className="bg-bear-night min-h-dvh">
      <Navbar breadcrumbs={[{ label: 'echipa', to: '/echipa' }, { label: member.id }]} />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative pt-32 md:pt-40 pb-20 md:pb-28 overflow-hidden">
          {/* Atmospheric background blobs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 60% 20%, rgba(74,14,31,0.55) 0%, transparent 70%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 w-[500px] h-[500px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(232,181,71,0.04) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          <div className="container-wide relative grid md:grid-cols-2 gap-12 md:gap-16 lg:gap-20 items-center">
            {/* Left — text */}
            <div className="order-2 md:order-1">
              {/* Breadcrumb */}
              <motion.nav
                aria-label="Breadcrumb"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 mb-10"
              >
                <Link
                  to="/"
                  className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-bone/55
                    hover:text-bear-gold transition-colors"
                >
                  transylvanianbears
                </Link>
                <ChevronRight size={12} className="text-bear-gold/40" />
                <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-bear-gold/90">
                  {member.id}
                </span>
              </motion.nav>

              {/* Role label */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="font-mono text-[10px] uppercase tracking-[0.38em] text-bear-gold/85 mb-4 tabular"
              >
                {member.role}
              </motion.p>

              {/* Name */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                className="font-display font-medium text-bear-bone leading-[0.9] tracking-tightest
                  text-5xl md:text-6xl lg:text-7xl mb-6"
              >
                {member.name}
              </motion.h1>

              {/* Numeral rule */}
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.2, transformOrigin: 'left' }}
                className="flex items-center gap-3 mb-8"
              >
                <span className="h-px w-12 bg-bear-gold/50" />
                <span className="font-display text-sm tracking-[0.4em] text-bear-gold/75 tabular">
                  {member.numeral}
                </span>
                <span className="h-px flex-1 bg-bear-burgundy/40" />
              </motion.div>

              {/* Bio */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-base md:text-lg leading-relaxed text-bear-bone/75 mb-10 max-w-lg whitespace-pre-line"
              >
                {bioExtended ?? bio}
              </motion.p>

              {/* Skills */}
              {member.skills.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32 }}
                  className="mb-10"
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-bear-bone/45 mb-3 tabular">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(member.skillsExtended ?? member.skills).map((s) => (
                      <Chip key={s} variant="gold" size="sm">
                        {s}
                      </Chip>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Contact links */}
              {contactLinks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.38 }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-bear-bone/45 mb-3 tabular">
                    Contact
                  </p>
                  <div className="flex flex-col gap-2">
                    {contactLinks.map((link) => (
                      <ContactLink key={link.href} {...link} />
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Right — tarot card portrait */}
            <motion.div
              className="order-1 md:order-2 flex justify-center md:justify-end"
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative w-full max-w-[300px] md:max-w-[340px] aspect-[3/4]">
                {/* Outer glow */}
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 rounded-full"
                  style={{
                    background:
                      'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(232,181,71,0.08) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                />

                {/* Card */}
                <div className="relative w-full h-full rounded-md overflow-hidden surface-parchment border border-bear-gold/35 shadow-burgundy-lg">
                  <TarotFrame />
                  {/* Grain */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")",
                    }}
                  />

                  {/* Content */}
                  <div className="relative h-full w-full flex flex-col items-center justify-between px-4 py-7 text-center">
                    <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-bear-gold/85 tabular">
                      {member.role}
                    </p>

                    <div className="flex-grow flex items-center justify-center w-full py-3">
                      {member.portrait ? (
                        <div className="relative w-full max-w-[230px] aspect-[3/4]">
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
                            style={{ maskImage, WebkitMaskImage: maskImage }}
                          />
                        </div>
                      ) : (
                        <NumeralSymbol numeral={member.numeral} />
                      )}
                    </div>

                    <div className="w-full">
                      <h2 className="font-display text-base font-medium text-bear-bone leading-tight tracking-tight mb-1.5">
                        {member.name}
                      </h2>
                      <div className="flex items-center justify-center gap-2 opacity-80">
                        <span className="h-px w-6 bg-bear-gold/45" />
                        <span className="font-display text-[10px] tracking-[0.4em] text-bear-gold/85 tabular">
                          {member.numeral}
                        </span>
                        <span className="h-px w-6 bg-bear-gold/45" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Prev / Next navigation ───────────────────────────────── */}
        {(prevMember || nextMember) && (
          <section
            aria-label="Alți membri"
            className="border-t border-bear-burgundy/25 bg-bear-wine/30"
          >
            <div className="container-wide py-10 flex items-center justify-between gap-6">
              <div className="flex-1">
                {prevMember && (
                  <Link
                    to={`/echipa/${prevMember.id}`}
                    className="group inline-flex items-center gap-3 text-bear-bone/60 hover:text-bear-gold transition-colors"
                  >
                    <ArrowLeft size={16} className="shrink-0 transition-transform group-hover:-translate-x-1" />
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-bear-bone/40 mb-0.5 tabular">
                        Anterior
                      </p>
                      <p className="font-display text-base md:text-lg text-current">
                        {prevMember.name}
                      </p>
                    </div>
                  </Link>
                )}
              </div>

              <Link
                to="/#members"
                className="font-mono text-[10px] uppercase tracking-[0.32em] text-bear-gold/60
                  hover:text-bear-gold transition-colors shrink-0 tabular"
              >
                Echipa
              </Link>

              <div className="flex-1 flex justify-end">
                {nextMember && (
                  <Link
                    to={`/echipa/${nextMember.id}`}
                    className="group inline-flex items-center gap-3 text-right text-bear-bone/60 hover:text-bear-gold transition-colors"
                  >
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-bear-bone/40 mb-0.5 tabular">
                        Următor
                      </p>
                      <p className="font-display text-base md:text-lg text-current">
                        {nextMember.name}
                      </p>
                    </div>
                    <ArrowLeft
                      size={16}
                      className="shrink-0 rotate-180 transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
    </motion.div>
    </CapeSweepProvider>
  );
}

function NumeralSymbol({ numeral }: { numeral: string }) {
  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-bear-gold/55" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="0.25" opacity="0.65" />
          <g stroke="currentColor" strokeWidth="0.6">
            <line x1="50" y1="2" x2="50" y2="6" />
            <line x1="50" y1="94" x2="50" y2="98" />
            <line x1="2" y1="50" x2="6" y2="50" />
            <line x1="94" y1="50" x2="98" y2="50" />
          </g>
          <g transform="translate(50 56)" fill="currentColor">
            <ellipse cx="0" cy="0" rx="9" ry="7" />
            <circle cx="-9" cy="-9" r="2.6" />
            <circle cx="-3.5" cy="-13" r="2.6" />
            <circle cx="3.5" cy="-13" r="2.6" />
            <circle cx="9" cy="-9" r="2.6" />
          </g>
        </svg>
      </div>
      <span className="font-display text-3xl font-bold text-bear-gold/90 tracking-[0.18em] tabular drop-shadow-[0_2px_18px_rgba(232,181,71,0.25)]">
        {numeral}
      </span>
    </div>
  );
}
