import {
  ArrowDownRight,
  Check,
  ExternalLink,
  FileCheck2,
  QrCode,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import type { CSSProperties } from 'react';
import { ChapterImage } from '../ChapterImage';
import './school-act.css';

export interface SchoolActOverlayProps {
  traceProgress: number;
  traceStep: number;
  traceOutcome: 'idle' | 'running' | 'allowed';
  onStartScan: () => void;
  reducedMotion: boolean;
}

const TRACE_STEPS = [
  {
    label: 'Emis',
    detail: 'Token temporar, cu expirare după 20 de secunde.',
  },
  {
    label: 'Prezentat',
    detail: 'Codul este prezentat cititorului de la poartă.',
  },
  {
    label: 'Rol verificat',
    detail: 'Serverul verifică dreptul terminalului de acces.',
  },
  {
    label: 'Consum atomic',
    detail: 'Tokenul este folosit o singură dată.',
  },
  {
    label: 'Audit',
    detail: 'Rezultatul este păstrat ca eveniment inspectabil.',
  },
] as const;

const SERVER_RESPONSES = [
  { code: 'ALLOW', detail: 'Token valid, rol acceptat, consum înregistrat.' },
  { code: 'EXPIRED', detail: 'Fereastra de 20 de secunde s-a încheiat.' },
  { code: 'ALREADY_USED', detail: 'Tokenul a fost consumat anterior.' },
] as const;

function ExternalProjectLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      <span>{children}</span>
      <ExternalLink aria-hidden="true" />
    </a>
  );
}

export function SchoolActOverlay({
  traceProgress,
  traceStep,
  traceOutcome,
  onStartScan,
  reducedMotion,
}: SchoolActOverlayProps) {
  const progress = Number.isFinite(traceProgress)
    ? Math.min(1, Math.max(0, traceProgress))
    : 0;
  const currentStep = Math.min(TRACE_STEPS.length - 1, Math.max(0, Math.round(traceStep)));
  const progressStyle = { '--sa-trace-progress': progress } as CSSProperties;

  const scanLabel = traceOutcome === 'allowed'
    ? 'Reia demonstrația'
    : traceOutcome === 'running'
      ? 'Validare în curs'
      : 'Încearcă scanarea';

  const liveMessage = traceOutcome === 'allowed'
    ? 'ALLOW. Token consumat o singură dată, iar evenimentul a fost trimis în audit.'
    : traceOutcome === 'running'
      ? `Validare în curs. Pasul ${currentStep + 1} din ${TRACE_STEPS.length}: ${TRACE_STEPS[currentStep].label}.`
      : 'Terminal pregătit. Scanarea demonstrează traseul canonic de acces.';

  return (
    <>
            <section
        id="mf-passage"
        className="sa-passage"
        data-chapter="passage"
        data-reduced-motion={reducedMotion || undefined}
        aria-labelledby="sa-passage-title"
      >
        <div className="sa-passage__continuity" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="sa-passage__copy">
          <p className="sa-kicker">04 / SchoolMate · Aegis</p>
          <h2 id="sa-passage-title">Orașul rămâne în urmă. Școala se deschide.</h2>
          <p>
            Intră în SchoolMate, unde telefonul elevului devine cheia de acces.
            La poartă, Aegis verifică un cod temporar și înregistrează trecerea.
          </p>
          <div className="sa-passage__handoff">
            <span>Semnal detectat</span>
            <i aria-hidden="true" />
            <strong>Decizie de acces</strong>
          </div>
        </div>

        <aside className="sa-passage__note" aria-label="Continuitatea dintre proiecte">
          <small>Urmează o interacțiune</small>
          <p>Telefon → cititor → verificare → acces</p>
        </aside>
      </section>

            <section
        id="mf-access"
        className="sa-access"
        data-chapter="access"
        data-state={traceOutcome}
        data-reduced-motion={reducedMotion || undefined}
        aria-labelledby="sa-access-title"
      >
        <div className="sa-access__stage">
          <header className="sa-access__intro">
            <p className="sa-kicker">05 / Aegis · Demonstrație interactivă</p>
            <h2 id="sa-access-title">Un cod scurt. O singură trecere.</h2>
            <p>
              Pornește demonstrația și urmărește codul: de la telefon, prin verificare,
              până la deschiderea porții.
            </p>

            <button
              className="sa-scan-command"
              type="button"
              onClick={onStartScan}
              disabled={traceOutcome === 'running'}
            >
              {traceOutcome === 'allowed'
                ? <ShieldCheck aria-hidden="true" />
                : <ScanLine aria-hidden="true" />}
              <span>{scanLabel}</span>
            </button>
            <div className="sa-access__feedback">
              <span aria-hidden="true">{traceOutcome === 'allowed' ? '✓' : traceOutcome === 'running' ? `${currentStep + 1}/5` : '→'}</span>
              <p>{traceOutcome === 'allowed' ? 'Poarta este deschisă. Continuă prin școală.' : traceOutcome === 'running' ? TRACE_STEPS[currentStep].detail : 'O simulare a accesului, direct în scena 3D.'}</p>
            </div>
          </header>

          <div className="sa-trace" style={progressStyle}>
            <div className="sa-trace__heading">
              <div>
                <p className="sa-kicker">Canonical trace / 01–05</p>
                <h3>Din QR în audit</h3>
              </div>
              <QrCode aria-hidden="true" />
            </div>

            <div
              className="sa-trace__meter"
              role="progressbar"
              aria-label="Progresul validării Aegis"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-valuetext={traceOutcome === 'allowed' ? 'Acces validat' : traceOutcome === 'running' ? TRACE_STEPS[currentStep].label : 'Pregătit pentru scanare'}
            >
              <span aria-hidden="true" />
            </div>

            <ol className="sa-trace__steps">
              {TRACE_STEPS.map((step, index) => {
                const complete = traceOutcome === 'allowed'
                  || (traceOutcome === 'running' && (index < currentStep || progress >= (index + 1) / TRACE_STEPS.length));
                const active = traceOutcome === 'running' && index === currentStep;

                return (
                  <li
                    key={step.label}
                    data-complete={complete || undefined}
                    data-active={active || undefined}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span className="sa-trace__index">0{index + 1}</span>
                    <span className="sa-trace__step-copy">
                      <strong>{step.label}</strong>
                      <small>{step.detail}</small>
                    </span>
                    <span className="sa-trace__mark" aria-hidden="true">
                      {complete ? <Check /> : null}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="sa-trace__result" role="status" aria-live="polite">
              {traceOutcome === 'allowed'
                ? <ShieldCheck aria-hidden="true" />
                : <FileCheck2 aria-hidden="true" />}
              <span>
                <small>Server result</small>
                <strong>{traceOutcome === 'allowed' ? 'ALLOW' : traceOutcome === 'running' ? 'VERIFYING' : 'READY'}</strong>
                <em>{liveMessage}</em>
              </span>
            </div>
          </div>
        </div>

        <div className="sa-access__handoff">
          <div>
            <p className="sa-kicker">Aegis → SchoolMate</p>
            <h3>Poarta verifică intrarea. Școala începe dincolo de ea.</h3>
          </div>
          <ol aria-label="Traseul continuu prin școală">
            <li><span>01</span> Poartă</li>
            <li><span>02</span> Coridor</li>
            <li><span>03</span> Clasă</li>
            <li><span>04</span> Secretariat</li>
          </ol>
        </div>
      </section>

            <section
        className="sa-classroom-passage"
        data-chapter="schoolmate"
        data-reduced-motion={reducedMotion || undefined}
        aria-labelledby="sa-classroom-passage-title"
      >
        <div className="sa-classroom-passage__frame">
          <div className="sa-classroom-passage__route" aria-hidden="true">
            <span>Poartă</span>
            <i />
            <span>Coridor</span>
            <i />
            <strong>Clasă</strong>
          </div>
          <div className="sa-classroom-passage__copy">
            <p className="sa-kicker">06 / SchoolMate · Clasă</p>
            <h2 id="sa-classroom-passage-title">Tot ce urmează după sonerie.</h2>
            <p>Orarul și anunțurile aduc ziua de școală într-un singur loc. Dincolo de poartă începe SchoolMate.</p>
          </div>
        </div>
      </section>

            <section
        className="sa-secretariat-passage"
        data-chapter="schoolmate"
        data-reduced-motion={reducedMotion || undefined}
        aria-labelledby="sa-secretariat-passage-title"
      >
        <div className="sa-secretariat-passage__frame">
          <div className="sa-secretariat-passage__route" aria-hidden="true">
            <span>Clasă</span>
            <i />
            <strong>Secretariat</strong>
            <i />
            <span>Dovadă</span>
          </div>
          <div className="sa-secretariat-passage__copy">
            <p className="sa-kicker">07 / SchoolMate · Secretariat</p>
            <h2 id="sa-secretariat-passage-title">Cererea ajunge pe birou.</h2>
            <p>Cererile conectează elevii și administrația școlii. Același SchoolMate, văzut de la celălalt capăt al biroului.</p>
          </div>
        </div>
      </section>

            <section
        id="mf-schoolmate"
        className="sa-clearing"
        data-chapter="schoolmate"
        data-reduced-motion={reducedMotion || undefined}
        aria-labelledby="sa-schoolmate-title"
      >
        <div className="sa-clearing__material" aria-hidden="true" />
        <div className="sa-clearing__inner">
          <header className="sa-clearing__head">
            <p className="sa-kicker">07 / School software · Evidence clearing</p>
            <p>Două produse · un context comun</p>
          </header>

          <div className="sa-clearing__intro">
            <span>02 sisteme distincte</span>
            <h2 id="sa-schoolmate-title">Accesul se încheie. Ziua de școală continuă.</h2>
            <p>
              Aegis controlează accesul și auditul de la poartă. SchoolMate conectează
              anunțurile, cererile, orarul și operațiunile dintre rolurile școlii.
            </p>
          </div>

          <article className="sa-product sa-product--aegis" aria-labelledby="sa-aegis-product-title">
            <header className="sa-product__copy">
              <p className="sa-kicker">Aegis / boundary system</p>
              <h3 id="sa-aegis-product-title">Aegis</h3>
              <p>
                Control de acces prin token QR temporar, consum unic, verificarea rolului
                terminalului și înregistrarea rezultatului în audit.
              </p>

              <dl className="sa-facts" aria-label="Proprietăți confirmate Aegis">
                <div><dt>Expirare</dt><dd>20s</dd></div>
                <div><dt>Consum</dt><dd>Single-use</dd></div>
                <div><dt>Control</dt><dd>Role check</dd></div>
                <div><dt>Dovadă</dt><dd>Audit event</dd></div>
              </dl>

              <nav className="sa-project-links" aria-label="Resurse Aegis">
                <ExternalProjectLink href="https://github.com/BosRegele/Aegis">Repository</ExternalProjectLink>
                <ExternalProjectLink href="https://www.jaromania.org/noutati/articole/news/o-noua-editie-a-programului-skills-for-the-future-se-deruleaza-in-bucuresti">
                  Skills for the Future
                </ExternalProjectLink>
              </nav>
            </header>

            <figure className="sa-product__media sa-product__media--aegis">
              <ChapterImage
                chapter="schoolmate"
                src="/assets/projects/aegis.webp"
                alt="Colaj proxy cu interfața QR pentru elev și identitatea Aegis"
                width="851"
                height="656"
              />
              <figcaption>
                <span>Proxy media / nu este captura finală</span>
                <strong>Suprafața de acces a elevului</strong>
              </figcaption>
            </figure>

            <aside className="sa-server-evidence" aria-labelledby="sa-server-evidence-title">
              <header>
                <p className="sa-kicker">Server responses / reference</p>
                <h4 id="sa-server-evidence-title">Aceeași regulă, trei răspunsuri.</h4>
                <p>Comparație pasivă a răspunsurilor serverului, nu rute ale experienței.</p>
              </header>
              <dl>
                {SERVER_RESPONSES.map((response) => (
                  <div key={response.code} data-response={response.code.toLowerCase()}>
                    <dt>{response.code}</dt>
                    <dd>{response.detail}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </article>

          <div className="sa-system-relation" aria-label="Relația dintre Aegis și SchoolMate">
            <strong>Aegis</strong>
            <span aria-hidden="true" />
            <p>Context comun, responsabilități diferite</p>
            <span aria-hidden="true" />
            <strong>SchoolMate</strong>
          </div>

          <article className="sa-product sa-product--schoolmate" aria-labelledby="sa-schoolmate-product-title">
            <header className="sa-product__copy">
              <p className="sa-kicker">SchoolMate / operational system</p>
              <h3 id="sa-schoolmate-product-title">SchoolMate</h3>
              <p>
                Un produs separat pentru comunicarea și operațiunile cotidiene dintre elevi,
                profesori, părinți, secretariat și poartă.
              </p>

              <nav className="sa-project-links" aria-label="Resurse SchoolMate">
                <ExternalProjectLink href="https://schoolmate-portal.web.app/">Portal live</ExternalProjectLink>
                <ExternalProjectLink href="https://www.youtube.com/watch?v=wNU1WhSMBKU">Demo video</ExternalProjectLink>
                <ExternalProjectLink href="https://github.com/calinnedelcu/SchoolMate-final">Repository</ExternalProjectLink>
              </nav>
            </header>

            <figure className="sa-product__media sa-product__media--schoolmate">
              <ChapterImage
                chapter="schoolmate"
                src="/assets/projects/schoolmate.webp"
                alt="Captură proxy a portalului SchoolMate pentru secretariat, cu lista de anunțuri"
                width="1519"
                height="890"
              />
              <figcaption>
                <span>Proxy media / captură existentă</span>
                <strong>Portalul de secretariat</strong>
              </figcaption>
            </figure>

            <div className="sa-workflow" aria-labelledby="sa-workflow-title">
              <p className="sa-kicker">One authored workflow</p>
              <h4 id="sa-workflow-title">O cerere traversează școala.</h4>
              <ol>
                <li><span>01</span><strong>Elev</strong><small>Alege secretariatul</small></li>
                <li><span>02</span><strong>Cerere</strong><small>Ajunge direct la destinatar</small></li>
                <li><span>03</span><strong>Secretariat</strong><small>Aprobă sau respinge</small></li>
                <li><span>04</span><strong>Istoric</strong><small>Păstrează statusul</small></li>
              </ol>
            </div>
          </article>

          <figure className="sa-award-evidence">
            <ChapterImage
              chapter="schoolmate"
                src="/assets/achievements/aegis-skills-future-2026.webp"
              alt="Fotografie de grup de la finala Skills for the Future 2026"
              width="1600"
              height="1200"
            />
            <figcaption>
              <span>Evidence proxy / Aegis</span>
              <strong>Skills for the Future 2026</strong>
              <small>Fotografie de la finală. Documentul oficial al rezultatului va înlocui acest proxy.</small>
            </figcaption>
          </figure>

          <footer className="sa-clearing__exit">
            <div>
              <p className="sa-kicker">Continuity rule / systems → world</p>
              <strong>Regula validată coboară în următorul strat al citadelei.</strong>
            </div>
            <ArrowDownRight aria-hidden="true" />
          </footer>
        </div>
      </section>
    </>
  );
}

export default SchoolActOverlay;
