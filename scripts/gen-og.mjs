#!/usr/bin/env node
/**
 * Generate the 1200×630 OG image (apps/web/public/og.png) from the brand mark.
 * Uses sharp's built-in SVG rendering to composite the background, mark, wordmark, and tagline.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../apps/web/public');

// Read the icon SVG as a string; we'll embed it at a fixed size inside a wrapper.
const iconSvg = readFileSync(path.join(publicDir, 'icon.svg'), 'utf8');
const iconInner = iconSvg
  .replace(/^<svg[^>]*>\s*/, '')
  .replace(/\s*<\/svg>\s*$/, '');

const W = 1200;
const H = 630;

const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF7ED"/>
      <stop offset="100%" stop-color="#FED7AA"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C2410C"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="${H - 28}" width="${W}" height="28" fill="url(#bar)"/>
</svg>`;

const iconSize = 420;
const iconX = 90;
const iconY = Math.round((H - iconSize) / 2);

const placedIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <g transform="translate(${iconX}, ${iconY})">
    <svg x="0" y="0" width="${iconSize}" height="${iconSize}" viewBox="0 0 512 512">
      ${iconInner}
    </svg>
  </g>
</svg>`;

const textX = iconX + iconSize + 60;
const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>
    .word { font: 800 110px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; fill: #1C140D; letter-spacing: -2px; }
    .tag  { font: 500 42px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; fill: #7C2D12; }
    .url  { font: 700 30px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; fill: #9A3412; letter-spacing: 1px; }
  </style>
  <text x="${textX}" y="${iconY + 155}" class="word">NaWeAgree</text>
  <text x="${textX}" y="${iconY + 225}" class="tag">Two people. One shared plan.</text>
  <text x="${textX}" y="${iconY + 285}" class="tag">No accounts. No fine print.</text>
  <text x="${textX}" y="${iconY + 370}" class="url">naweagree.app</text>
</svg>`;

const composed = await sharp({
  create: { width: W, height: H, channels: 4, background: '#FFF7ED' },
})
  .composite([
    { input: Buffer.from(bg), top: 0, left: 0 },
    { input: Buffer.from(placedIcon), top: 0, left: 0 },
    { input: Buffer.from(text), top: 0, left: 0 },
  ])
  .png()
  .toBuffer();

writeFileSync(path.join(publicDir, 'og.png'), composed);
console.log('Wrote og.png', composed.length, 'bytes');
