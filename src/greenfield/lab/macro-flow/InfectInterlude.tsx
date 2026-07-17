import { ArrowDown, Cpu, ExternalLink, HardDrive, MonitorUp } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import './infect-interlude.css';

type InfectStage = 'gpu' | 'ssd' | 'cpu';
type RoutePoint = readonly [number, number];

const STAGES: Array<{
  id: InfectStage;
  index: string;
  label: string;
  action: string;
  detail: string;
  objective: string;
  image: string;
  alt: string;
  icon: typeof MonitorUp;
}> = [
  {
    id: 'gpu',
    index: '01',
    label: 'GPU',
    action: 'Hack the GPU',
    detail: 'Infiltrezi primul subsistem și extragi unealta care poate sparge firewall-ul.',
    objective: 'Firewall destroyer acquired',
    image: '/assets/projects/infect-exe/gpu.png',
    alt: 'Virusul traversează nivelul GPU din Infect.exe',
    icon: MonitorUp,
  },
  {
    id: 'ssd',
    index: '02',
    label: 'SSD',
    action: 'Breach the SSD',
    detail: 'Traseul folosește unealta obținută pentru a deschide memoria și a recupera cheia CPU.',
    objective: 'CPU key located',
    image: '/assets/projects/infect-exe/ssd.png',
    alt: 'Virusul atacă un firewall în nivelul SSD din Infect.exe',
    icon: HardDrive,
  },
  {
    id: 'cpu',
    index: '03',
    label: 'CPU',
    action: 'Infect the CPU',
    detail: 'În nucleu, platforming-ul se contractă într-un puzzle de cabluri. Sistemul cade din interior.',
    objective: 'Core infection complete',
    image: '/assets/projects/infect-exe/cpu.png',
    alt: 'Puzzle-ul de conectare a cablurilor din nucleul CPU în Infect.exe',
    icon: Cpu,
  },
];

const ROUTES: Record<InfectStage, readonly RoutePoint[]> = {
  gpu: [[0.16, 0.72], [0.25, 0.64], [0.35, 0.68], [0.47, 0.53], [0.59, 0.49], [0.72, 0.38], [0.84, 0.31]],
  ssd: [[0.18, 0.67], [0.3, 0.62], [0.41, 0.48], [0.55, 0.48], [0.65, 0.36], [0.76, 0.36], [0.86, 0.25]],
  cpu: [[0.23, 0.75], [0.33, 0.62], [0.43, 0.62], [0.49, 0.46], [0.61, 0.36], [0.72, 0.53], [0.82, 0.34]],
};

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 360;

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));
const smoothstep = (minimum: number, maximum: number, value: number) => {
  const normalized = clamp((value - minimum) / Math.max(0.0001, maximum - minimum));
  return normalized * normalized * (3 - 2 * normalized);
};

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  offsetX = 0,
  zoom = 1,
) {
  if (!image.complete || image.naturalWidth === 0) return;
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
  const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  const targetWidth = CANVAS_WIDTH * zoom;
  const targetHeight = CANVAS_HEIGHT * zoom;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    offsetX - (targetWidth - CANVAS_WIDTH) / 2,
    -(targetHeight - CANVAS_HEIGHT) / 2,
    targetWidth,
    targetHeight,
  );
}

function pointOnRoute(points: readonly RoutePoint[], progress: number): RoutePoint {
  const position = clamp(progress) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  const local = position - index;
  const start = points[index];
  const end = points[index + 1];
  return [start[0] + (end[0] - start[0]) * local, start[1] + (end[1] - start[1]) * local];
}

function drawVirusRoute(
  context: CanvasRenderingContext2D,
  stage: InfectStage,
  progress: number,
  time: number,
) {
  const points = ROUTES[stage];
  const tracerProgress = clamp(progress);
  const [x, y] = pointOnRoute(points, tracerProgress);
  const px = Math.round(x * CANVAS_WIDTH / 4) * 4;
  const py = Math.round(y * CANVAS_HEIGHT / 4) * 4;

  context.save();
  context.globalCompositeOperation = 'difference';
  context.strokeStyle = '#fff';
  context.fillStyle = '#fff';
  context.lineWidth = 2;
  context.setLineDash([4, 6]);
  context.beginPath();
  points.forEach((point, index) => {
    const pointProgress = index / (points.length - 1);
    if (pointProgress > tracerProgress + 0.02) return;
    const pointX = Math.round(point[0] * CANVAS_WIDTH / 4) * 4;
    const pointY = Math.round(point[1] * CANVAS_HEIGHT / 4) * 4;
    if (index === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  });
  context.stroke();

  for (let index = 5; index >= 1; index -= 1) {
    const trailPoint = pointOnRoute(points, clamp(tracerProgress - index * 0.025));
    const trailX = Math.round(trailPoint[0] * CANVAS_WIDTH / 4) * 4;
    const trailY = Math.round(trailPoint[1] * CANVAS_HEIGHT / 4) * 4;
    context.globalAlpha = (6 - index) / 12;
    context.fillRect(trailX - 2, trailY - 2, 4, 4);
  }

  context.globalAlpha = 1;
  const pulse = Math.sin(time * 0.008) > 0 ? 0 : 2;
  context.fillRect(px - 6 - pulse, py - 2, 12 + pulse * 2, 4);
  context.fillRect(px - 2, py - 6 - pulse, 4, 12 + pulse * 2);
  context.fillRect(px - 4, py - 4, 8, 8);
  context.restore();
}

export default function InfectInterlude() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Partial<Record<InfectStage, HTMLImageElement>>>({});
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });
  const journeyProgressRef = useRef(0);
  const drawStaticFrameRef = useRef<(() => void) | null>(null);
  const scrollFrameRef = useRef(0);
  const lastStageIndexRef = useRef(0);
  const [activeStage, setActiveStage] = useState<InfectStage>('gpu');
  const [visited, setVisited] = useState<Set<InfectStage>>(() => new Set(['gpu']));
  const [nearViewport, setNearViewport] = useState(false);
  const lenis = useLenis();
  const reducedMotion = usePrefersReducedMotion();

  const stageIndex = STAGES.findIndex((item) => item.id === activeStage);
  const stage = STAGES[stageIndex] ?? STAGES[0];

  const syncJourney = useCallback(() => {
    scrollFrameRef.current = 0;
    const journey = journeyRef.current;
    if (!journey) return;
    const rect = journey.getBoundingClientRect();
    const travel = Math.max(1, journey.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel);
    const nextStageIndex = progress >= 1
      ? STAGES.length - 1
      : Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));

    journeyProgressRef.current = progress;
    journey.style.setProperty('--ix-route-progress', progress.toFixed(4));
    journey.style.setProperty('--ix-stage-progress', ((progress * STAGES.length) % 1).toFixed(4));
    drawStaticFrameRef.current?.();

    if (nextStageIndex !== lastStageIndexRef.current) {
      lastStageIndexRef.current = nextStageIndex;
      const nextStage = STAGES[nextStageIndex];
      setActiveStage(nextStage.id);
      setVisited((current) => {
        const next = new Set(current);
        for (let index = 0; index <= nextStageIndex; index += 1) next.add(STAGES[index].id);
        return next;
      });
    }
  }, []);

  const scheduleJourneySync = useCallback(() => {
    if (scrollFrameRef.current) return;
    scrollFrameRef.current = window.requestAnimationFrame(syncJourney);
  }, [syncJourney]);

  useEffect(() => {
    syncJourney();
    window.addEventListener('scroll', scheduleJourneySync, { passive: true });
    window.addEventListener('resize', scheduleJourneySync);
    return () => {
      window.removeEventListener('scroll', scheduleJourneySync);
      window.removeEventListener('resize', scheduleJourneySync);
      window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [scheduleJourneySync, syncJourney]);

  useEffect(() => {
    STAGES.forEach((item) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => drawStaticFrameRef.current?.();
      image.src = item.image;
      imagesRef.current[item.id] = image;
    });
    return () => {
      Object.values(imagesRef.current).forEach((image) => {
        if (image) image.onload = null;
      });
      imagesRef.current = {};
    };
  }, []);

  useEffect(() => {
    const journey = journeyRef.current;
    if (!journey) return;
    const observer = new IntersectionObserver(([entry]) => {
      setNearViewport(entry.isIntersecting);
    }, { rootMargin: '100% 0px', threshold: 0 });
    observer.observe(journey);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nearViewport) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    let animationFrame = 0;
    let disposed = false;

    const drawFrame = (time = 0) => {
      if (disposed) return;
      const progress = journeyProgressRef.current;
      const scaled = Math.min(STAGES.length - 0.0001, progress * STAGES.length);
      const currentIndex = Math.min(STAGES.length - 1, Math.floor(scaled));
      const localProgress = currentIndex === STAGES.length - 1 ? clamp(scaled - currentIndex) : scaled - currentIndex;
      const transition = currentIndex < STAGES.length - 1
        ? smoothstep(0.7, 0.98, localProgress)
        : 0;
      const currentStage = STAGES[currentIndex];
      const nextStage = STAGES[Math.min(STAGES.length - 1, currentIndex + 1)];
      const currentImage = imagesRef.current[currentStage.id];
      const nextImage = imagesRef.current[nextStage.id];

      context.imageSmoothingEnabled = false;
      context.fillStyle = '#000';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      if (currentImage) {
        drawCover(context, currentImage, -transition * CANVAS_WIDTH, 1.025 + localProgress * 0.035);
      }
      if (transition > 0 && nextImage) {
        drawCover(context, nextImage, (1 - transition) * CANVAS_WIDTH, 1.025);
      }

      const tracerProgress = clamp(localProgress / 0.7);
      drawVirusRoute(context, currentStage.id, tracerProgress, reducedMotion ? 0 : time);

      if (transition > 0.03 && !reducedMotion) {
        context.save();
        context.globalCompositeOperation = 'difference';
        context.fillStyle = '#fff';
        for (let index = 0; index < 9; index += 1) {
          const barY = Math.floor(((index * 71 + time * 0.03) % CANVAS_HEIGHT) / 4) * 4;
          const barWidth = 22 + ((index * 37) % 110);
          const barX = Math.floor((CANVAS_WIDTH * (1 - transition) + Math.sin(time * 0.01 + index) * 36) / 4) * 4;
          context.globalAlpha = transition * (0.16 + (index % 3) * 0.12);
          context.fillRect(barX - barWidth / 2, barY, barWidth, 4 + (index % 2) * 4);
        }
        context.restore();
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
        context.fillStyle = 'rgba(255,255,255,0.18)';
        context.fillRect(0, scanY, CANVAS_WIDTH, 1);
      }

    };

    const animate = (time: number) => {
      drawFrame(time);
      if (!disposed) animationFrame = window.requestAnimationFrame(animate);
    };
    const drawStaticFrame = () => drawFrame(0);

    if (reducedMotion) {
      drawStaticFrameRef.current = drawStaticFrame;
      drawStaticFrame();
    } else {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      disposed = true;
      if (drawStaticFrameRef.current === drawStaticFrame) drawStaticFrameRef.current = null;
      window.cancelAnimationFrame(animationFrame);
    };
  }, [nearViewport, reducedMotion]);

  const moveSignal = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
      active: true,
    };
  }, []);

  const leaveSignal = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  const selectStage = useCallback((index: number) => {
    const journey = journeyRef.current;
    if (!journey) return;
    const sectionTop = window.scrollY + journey.getBoundingClientRect().top;
    const travel = Math.max(1, journey.offsetHeight - window.innerHeight);
    const slotProgress = Math.min(0.96, index / STAGES.length + 0.035);
    const target = sectionTop + slotProgress * travel;
    if (lenis) {
      if (reducedMotion) {
        lenis.scrollTo(target, { immediate: true, force: true });
      } else {
        lenis.scrollTo(target, { duration: 0.95, force: true });
      }
    } else {
      window.scrollTo({ top: target, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [lenis, reducedMotion]);

  return (
    <section id="mf-infect" className="ix-section" data-chapter="infect">
      <div id="ix-route" ref={journeyRef} className="ix-journey">
        <div className="ix-stage" onPointerMove={moveSignal} onPointerLeave={leaveSignal}>
          <canvas
            ref={canvasRef}
            className="ix-canvas"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            role="img"
            aria-label={stage.alt}
          >
            {stage.alt}. Traseul continuă prin GPU, SSD și CPU.
          </canvas>
          <div className="ix-grid" aria-hidden="true" />

          <header className="ix-head">
            <p>Playable route / authentic captures</p>
            <h2>You are<br />the enemy.</h2>
            <span>O singură limitare. Două culori. Trei subsisteme legate într-o singură infiltrare.</span>
          </header>

          <div className="ix-topology" aria-hidden="true">
            <span>Infection vector / 0x1B</span>
            <div>
              {STAGES.map((item, index) => (
                <i key={item.id} data-active={stageIndex === index || undefined} data-visited={visited.has(item.id) || undefined}>
                  <b>{item.label}</b>
                </i>
              ))}
            </div>
            <small>Capture-based route reconstruction</small>
          </div>

          <nav className="ix-nodes" aria-label="Infect.exe subsystems">
            {STAGES.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={activeStage === item.id || undefined}
                  data-visited={visited.has(item.id) || undefined}
                  onClick={() => selectStage(index)}
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
            <span>{stage.index} / {stage.objective}</span>
            <strong>{stage.action}</strong>
            <p>{stage.detail}</p>
          </aside>

          <div className="ix-progress">
            <span>{visited.size.toString().padStart(2, '0')} / 03 breached</span>
            <i aria-hidden="true"><b /></i>
            <a href="#ix-proof" aria-label="Vezi rezultatele Infect.exe"><ArrowDown aria-hidden="true" /></a>
          </div>
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
