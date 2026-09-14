import { useEffect, useRef } from 'react';

// Seeded value noise keeps the sky stable across resizing and navigation.
function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const dx = x - ix, dy = y - iy;
  const sx = dx * dx * (3 - 2 * dx), sy = dy * dy * (3 - 2 * dy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function cloud(x: number, y: number) {
  let sum = 0, amplitude = .54;
  for (let octave = 0; octave < 5; octave++) {
    sum += noise(x, y) * amplitude;
    x = x * 2.06 + 13.7;
    y = y * 2.06 + 7.3;
    amplitude *= .48;
  }
  return sum;
}

function drawSky(nebula: HTMLCanvasElement, stars: HTMLCanvasElement, width: number, height: number) {
  const sky = nebula.getContext('2d');
  const points = stars.getContext('2d');
  if (!sky || !points || width <= 0 || height <= 0) return;

  // Diffuse clouds need fewer pixels than pin-sharp stars. Neither repaints per frame.
  const w = Math.min(720, Math.round(width));
  const h = Math.min(720, Math.round(w * height / width));
  nebula.width = w;
  nebula.height = h;
  const pixels = sky.createImageData(w, h);
  const portrait = width < 900;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px / w, y = py / h;
      const warp = noise(x * 3 + 41, y * 3 + 11);
      const grain = cloud(x * 4 + warp * 1.6, y * 4 + warp);
      const axis = .96 - y * .62 + Math.sin(y * 5) * .07;
      const band = Math.exp(-(((x - axis) / .23) ** 2));
      const lane = noise(x * 8 + 12 + warp, y * 7 + 7);
      const gas = band * Math.max(0, grain - .18) * 2.6 * (.32 + lane * .85);
      const dust = Math.max(0, cloud(x * 13 + 22, y * 12 + 9) - .52) * band * .8;
      const quiet = portrait
        ? 1 - .65 * Math.max(0, (y - .35) / .65)
        : 1 - .5 * Math.exp(-(((x - .24) / .28) ** 2) - ((y - .5) / .36) ** 2);
      const blue = noise(x * 2 + 3, y * 2 + 17);
      const i = (py * w + px) * 4;
      pixels.data[i] = 7 + (gas * (28 + 27 * blue) + dust * 72) * quiet;
      pixels.data[i + 1] = 11 + (gas * (28 + 12 * (1 - blue)) + dust * 68) * quiet;
      pixels.data[i + 2] = 24 + (gas * 93 + dust * 110) * quiet;
      pixels.data[i + 3] = 255;
    }
  }
  sky.putImageData(pixels, 0, 0);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  stars.width = Math.round(width * dpr);
  stars.height = Math.round(height * dpr);
  points.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 71421;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const count = Math.min(1150, Math.round(width * height / 1250));
  for (let i = 0; i < count; i++) {
    const x = random() * width, y = random() * height;
    const size = random();
    const radius = size > .98 ? 1.15 : .25 + size * .5;
    const warm = random() > .87;
    const muted = portrait ? y > height * .36 : x < width * .46 && y > height * .2 && y < height * .82;
    const alpha = (.16 + size ** 3 * .68) * (muted ? .35 : 1);
    const color = warm ? '238,208,176' : '188,209,244';
    if (size > .98 && !muted) {
      const glow = points.createRadialGradient(x, y, 0, x, y, 8);
      glow.addColorStop(0, `rgba(${color},.2)`);
      glow.addColorStop(1, `rgba(${color},0)`);
      points.fillStyle = glow;
      points.fillRect(x - 8, y - 8, 16, 16);
    }
    points.fillStyle = `rgba(${color},${alpha})`;
    points.beginPath(); points.arc(x, y, radius, 0, Math.PI * 2); points.fill();
  }
}

export function CosmicBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const nebula = useRef<HTMLCanvasElement>(null);
  const stars = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let timer = 0;
    let lastWidth = 0, lastHeight = 0;
    const paint = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!nebula.current || !stars.current || (width === lastWidth && height === lastHeight)) return;
      lastWidth = width; lastHeight = height;
      drawSky(nebula.current, stars.current, width, height);
    };
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 100);
    });
    observer.observe(element);
    paint();
    return () => { observer.disconnect(); window.clearTimeout(timer); };
  }, []);

  return (
    <div className="hp-cosmos" ref={root} aria-hidden="true">
      <canvas className="hp-cosmos__nebula" ref={nebula} />
      <canvas className="hp-cosmos__stars" ref={stars} />
      <div className="hp-cosmos__veil" />
    </div>
  );
}
