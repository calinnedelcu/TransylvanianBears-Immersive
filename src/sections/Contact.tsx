import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { mailto } from '../data';
import { useContent } from '../i18n/useContent';
import { PawMark } from '../components/PawMark';
import { Reveal } from '../components/Reveal';
import './contact.css';

export function Contact() {
  const { COPY, SITE, UI } = useContent();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be blocked; the address stays visible and selectable.
      window.prompt(UI.emailPrompt, SITE.email);
    }
  };

  return (
    <section id="contact" className="contact section surface-ink grain" aria-labelledby="contact-title" data-station="contact">
      <div className="contact__bg" aria-hidden="true">
        <PawMark className="contact__paw" />
      </div>

      <div className="wrap contact__inner">
        <Reveal className="contact__copy">
          <p className="eyebrow">{UI.contactIndex}</p>
          <h2 id="contact-title" className="display">
            {COPY.contact.title}
          </h2>
          <p className="lead">{COPY.contact.body}</p>

          <div className="contact__actions">
            <a className="btn btn--gold btn--lg" href={mailto()}>
              {UI.writeToUs}
              <ArrowUpRight aria-hidden="true" />
            </a>
            <button type="button" className="btn btn--bone btn--lg" onClick={copyEmail}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? UI.copied : UI.copyAddress}
            </button>
            <span className="sr-only" role="status">
              {copied ? UI.copiedStatus : ''}
            </span>
          </div>

          <p className="contact__address">
            <a href={mailto()}>{SITE.email}</a>
          </p>
        </Reveal>

        <Reveal className="contact__topics" delay={120}>
          <p className="eyebrow">{UI.whatToTalkAbout}</p>
          <ul>
            {UI.topics.map((topic) => (
              <li key={topic}>
                <a href={mailto(`Transylvanian Bears — ${topic}`)}>
                  {topic}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
