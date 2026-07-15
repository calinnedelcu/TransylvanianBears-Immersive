import { ArrowDown, Cpu, ExternalLink, HardDrive, MonitorUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import './infect-interlude.css';

type InfectStage = 'gpu' | 'ssd' | 'cpu';

const STAGES: Array<{
  id: InfectStage;
  index: string;
  label: string;
  action: string;
  detail: string;
  image: string;
  alt: string;
  icon: typeof MonitorUp;
}> = [
  {
    id: 'gpu',
    index: '01',
    label: 'GPU',
    action: 'Hack the GPU',
    detail: 'Infiltrează primul subsistem și fură unealta de atac.',
    image: '/assets/projects/infect-exe/gpu.png',
    alt: 'Virusul traversează nivelul GPU din Infect.exe',
    icon: MonitorUp,
  },
  {
    id: 'ssd',
    index: '02',
    label: 'SSD',
    action: 'Breach the SSD',
    detail: 'Folosește uneltele obținute pentru a trece de firewall.',
    image: '/assets/projects/infect-exe/ssd.png',
    alt: 'Virusul atacă un firewall în nivelul SSD din Infect.exe',
    icon: HardDrive,
  },
  {
    id: 'cpu',
    index: '03',
    label: 'CPU',
    action: 'Infect the CPU',
    detail: 'Ajungi la nucleu și corupi sistemul din interior.',
    image: '/assets/projects/infect-exe/cpu.png',
    alt: 'Puzzle-ul de conectare a cablurilor din nucleul CPU în Infect.exe',
    icon: Cpu,
  },
];

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 270;

export default function InfectInterlude() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const visibleRef = useRef(false);
  const [activeStage, setActiveStage] = useState<InfectStage>('gpu');
  const [visited, setVisited] = useState<Set<InfectStage>>(() => new Set(['gpu']));
  const reducedMotion = usePrefersReducedMotion();

  const stage = STAGES.find((item) => item.id === activeStage) ?? STAGES[0];

  const selectStage = useCallback((id: InfectStage) => {
    setActiveStage(id);
    setVisited((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  const moveSignal = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      active: true,
    };
  }, []);

  const leaveSignal = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const image = new Image();
    image.src = stage.image;
    imageRef.current = image;
    let animationFrame = 0;
    let disposed = false;

    const drawFrame = (time = 0) => {
      if (disposed) return;
      context.imageSmoothingEnabled = false;
      context.fillStyle = '#000';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (image.complete && image.naturalWidth > 0) {
        const sourceRatio = image.naturalWidth / image.naturalHeight;
        const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        const sourceWidth = sourceRatio > targetRatio
          ? image.naturalHeight * targetRatio
          : image.naturalWidth;
        const sourceHeight = sourceRatio > targetRatio
          ? image.naturalHeight
          : image.naturalWidth / targetRatio;
        const sourceX = (image.naturalWidth - sourceWidth) / 2;
        const sourceY = (image.naturalHeight - sourceHeight) / 2;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      const pointer = pointerRef.current;
      if (pointer.active && !reducedMotion) {
        const px = pointer.x * CANVAS_WIDTH;
        const py = pointer.y * CANVAS_HEIGHT;
        context.save();
        context.globalCompositeOperation = 'difference';
        context.fillStyle = '#fff';
        for (let index = 0; index < 18; index += 1) {
          const phase = time * 0.002 + index * 1.91;
          const radius = 18 + (index % 5) * 8;
          const x = px + Math.sin(phase * 1.7) * radius;
          const y = py + Math.cos(phase * 1.3) * radius * 0.62;
          const size = 2 + (index % 4) * 2;
          context.fillRect(Math.round(x / 4) * 4, Math.round(y / 4) * 4, size, size);
        }
        context.restore();
      }

      if (!reducedMotion) {
        const scanY = Math.floor((time * 0.045) % CANVAS_HEIGHT);
        context.fillStyle = 'rgba(255,255,255,0.2)';
        context.fillRect(0, scanY, CANVAS_WIDTH, 1);
      }

    };

    const handleLoad = () => drawFrame();
    const loop = (time: number) => {
      if (disposed) return;
      if (visibleRef.current) drawFrame(time);
      animationFrame = requestAnimationFrame(loop);
    };

    image.addEventListener('load', handleLoad);
    drawFrame();
    if (!reducedMotion) animationFrame = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      image.removeEventListener('load', handleLoad);
      cancelAnimationFrame(animationFrame);
    };
  }, [reducedMotion, stage.image]);

  return (
    <section id="mf-infect" className="ix-section" data-chapter="infect">
      <div className="ix-stage" onPointerMove={moveSignal} onPointerLeave={leaveSignal}>
        <canvas
          ref={canvasRef}
          className="ix-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          role="img"
          aria-label={stage.alt}
        >
          {stage.alt}. Selectează GPU, SSD sau CPU din controalele următoare.
        </canvas>
        <div className="ix-grid" aria-hidden="true" />

        <header className="ix-head">
          <p>Interlude / Infect.exe</p>
          <h2>You are<br />the enemy.</h2>
          <span>O singură limitare. Două culori. Un sistem de corupt.</span>
        </header>

        <nav className="ix-nodes" aria-label="Infect.exe subsystems">
          {STAGES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                data-active={activeStage === item.id || undefined}
                data-visited={visited.has(item.id) || undefined}
                onClick={() => selectStage(item.id)}
                onFocus={() => selectStage(item.id)}
                aria-pressed={activeStage === item.id}
              >
                <span>{item.index}</span>
                <Icon aria-hidden="true" />
                <strong>{item.label}</strong>
              </button>
            );
          })}
        </nav>

        <aside className="ix-readout" aria-live="polite">
          <span>{stage.index} / subsystem</span>
          <strong>{stage.action}</strong>
          <p>{stage.detail}</p>
        </aside>

        <div className="ix-progress">
          <span>{visited.size.toString().padStart(2, '0')} / 03 breached</span>
          <i aria-hidden="true"><b style={{ width: `${(visited.size / STAGES.length) * 100}%` }} /></i>
          <a href="#ix-proof" aria-label="Vezi rezultatele Infect.exe"><ArrowDown aria-hidden="true" /></a>
        </div>
      </div>

      <div id="ix-proof" className="ix-proof">
        <div className="ix-proof__title">
          <p>Verified result / 1-BIT JAM 7</p>
          <h3>Restricția devine identitate.</h3>
          <span>56 entries / 15 ratings</span>
        </div>

        <dl>
          <div><dt>Overall</dt><dd>#19</dd></div>
          <div><dt>Theme</dt><dd>#08</dd></div>
          <div><dt>Art</dt><dd>#14</dd></div>
        </dl>

        <div className="ix-proof__footer">
          <p>ShieldSentinel × andreiChe × calin.nedelcu</p>
          <nav aria-label="Infect.exe links">
            <a href="https://shieldsentinel.itch.io/infectexe" target="_blank" rel="noreferrer">Play browser build <ExternalLink aria-hidden="true" /></a>
            <a href="https://itch.io/jam/1-bit-jam-7/rate/4068020" target="_blank" rel="noreferrer">Official results <ExternalLink aria-hidden="true" /></a>
          </nav>
        </div>

        <div className="ix-handoff">
          <span>Continuity / bit → observation</span>
          <strong>Semnalul devine măsură.</strong>
          <div aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} />)}</div>
          <small>Next / Research Crossing</small>
        </div>
      </div>
    </section>
  );
}
