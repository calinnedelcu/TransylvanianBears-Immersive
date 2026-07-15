#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'og-image.jpg');
const WIDTH = 1200;
const HEIGHT = 630;

function node(x, y, color, label, index) {
  const alignRight = x > 1050;
  const textX = alignRight ? -29 : 29;
  const anchor = alignRight ? 'end' : 'start';
  return `
    <g transform="translate(${x} ${y})">
      <circle r="18" fill="#0b1012" stroke="${color}" stroke-width="2"/>
      <circle r="4" fill="${color}"/>
      <text x="${textX}" y="-3" text-anchor="${anchor}" fill="#e4e1d9" font-family="Arial, sans-serif" font-size="13" font-weight="700">${label}</text>
      <text x="${textX}" y="13" text-anchor="${anchor}" fill="#77817f" font-family="monospace" font-size="9">${index}</text>
    </g>`;
}

function socialCard() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070a0b"/>
      <stop offset="0.58" stop-color="#0b1012"/>
      <stop offset="1" stop-color="#111719"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#72d9d6" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#72d9d6" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#72d9d6" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M34 0H0V34" fill="none" stroke="#e4e1d9" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .12 0"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="664" width="536" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" opacity="0.09" filter="url(#grain)"/>
  <path d="M0 523C226 444 342 548 558 455S918 352 1200 418" fill="none" stroke="#72d9d6" stroke-opacity="0.12"/>
  <path d="M0 545C228 466 352 570 568 477S930 374 1200 440" fill="none" stroke="#df6553" stroke-opacity="0.1"/>

  <g transform="translate(64 54)">
    <path d="M0 14 9 2l12 4 9-6 9 6 12-4 9 12-5 13 5 13-12 12-12 8H24l-12-8L0 40l5-13Z" fill="#e4e1d9"/>
    <path d="M17 19 30 11l13 8 3 13-9 11-7-9-7 9-9-11Z" fill="#090d0f"/>
    <rect x="27" y="27" width="6" height="6" transform="rotate(45 30 30)" fill="#df6553"/>
  </g>
  <text x="142" y="78" fill="#e4e1d9" font-family="Arial, sans-serif" font-size="16" font-weight="700">TRANSYLVANIAN BEARS</text>
  <text x="142" y="99" fill="#77817f" font-family="monospace" font-size="10">C.N.I. TUDOR VIANU / BUCHAREST</text>

  <g transform="translate(64 200)">
    <text fill="#72d9d6" font-family="monospace" font-size="11">ONE TEAM / SEVEN PROJECTS / FOUR DOMAINS</text>
    <text y="82" fill="#e4e1d9" font-family="Arial, sans-serif" font-size="74" font-weight="700">WE BUILD</text>
    <text y="151" fill="#e4e1d9" font-family="Arial, sans-serif" font-size="74" font-weight="700">THE SYSTEM.</text>
    <text y="201" fill="#929b99" font-family="Arial, sans-serif" font-size="19">Products, games, machine learning and applied research.</text>
    <g transform="translate(0 246)" font-family="monospace" font-size="10">
      <rect width="132" height="34" fill="none" stroke="#72d9d6" stroke-opacity="0.58"/>
      <text x="14" y="22" fill="#72d9d6">OBSERVE</text>
      <rect x="142" width="132" height="34" fill="none" stroke="#d7b468" stroke-opacity="0.58"/>
      <text x="156" y="22" fill="#d7b468">PROTECT</text>
      <rect x="284" width="132" height="34" fill="none" stroke="#df6553" stroke-opacity="0.58"/>
      <text x="298" y="22" fill="#df6553">IMAGINE</text>
      <rect x="426" width="132" height="34" fill="none" stroke="#e4e1d9" stroke-opacity="0.4"/>
      <text x="440" y="22" fill="#e4e1d9">MEASURE</text>
    </g>
  </g>

  <g transform="translate(904 309)">
    <ellipse rx="238" ry="238" fill="none" stroke="#e4e1d9" stroke-opacity="0.08"/>
    <ellipse rx="175" ry="175" fill="none" stroke="#72d9d6" stroke-opacity="0.13"/>
    <path d="M-180 42-72-76 56-118 174-32 115 112-25 157Z" fill="#0d1416" stroke="#e4e1d9" stroke-opacity="0.22"/>
    <path d="m-72-76 98 36 30-78M26-40 115 112M26-40-25 157M26-40-180 42M26-40 174-32" fill="none" stroke="#72d9d6" stroke-opacity="0.38"/>
    <path d="M-31-69 30-105 92-68 91 4 29 40-32 4Z" fill="#172124" stroke="#72d9d6" stroke-width="1.5"/>
    <path d="m-31-69 61 37 62-36M30-32v72" fill="none" stroke="#72d9d6" stroke-opacity="0.5"/>
    <circle cy="-32" r="12" fill="#72d9d6"/>
    <circle cy="-32" r="4" fill="#070a0b"/>
    <path d="M-222-148 215 161" stroke="url(#beam)" stroke-width="18"/>
  </g>

  <g>
    <path d="M730 175 818 237M996 135 944 219M1087 232 986 270M1069 403 987 354M916 510 918 385M744 440 832 362M720 298 827 305" fill="none" stroke="#e4e1d9" stroke-opacity="0.15"/>
    ${node(710, 158, '#72d9d6', 'NEXUS', 'ML / 01')}
    ${node(1012, 118, '#d7b468', 'AEGIS', 'SCHOOL / 02')}
    ${node(1103, 220, '#d7b468', 'SCHOOLMATE', 'SCHOOL / 03')}
    ${node(1092, 422, '#8f8368', 'BURIED HANDS', 'GAME / 04')}
    ${node(912, 532, '#df6553', 'INFECT.EXE', 'GAME / 05')}
    ${node(710, 458, '#c4a65f', 'ECONOMYNEWS', 'RESEARCH / 06')}
    ${node(688, 300, '#c4a65f', 'AUTOMATION RISK', 'RESEARCH / 07')}
  </g>

  <line x1="64" y1="582" x2="1136" y2="582" stroke="#e4e1d9" stroke-opacity="0.16"/>
  <text x="64" y="608" fill="#77817f" font-family="monospace" font-size="10">TRANSYLVANIANBEARS.COM</text>
  <text x="1136" y="608" text-anchor="end" fill="#77817f" font-family="monospace" font-size="10">ROMANIA / 2026</text>
</svg>`;
}

await sharp(Buffer.from(socialCard()))
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(OUT);

console.log(`Wrote ${OUT}`);
