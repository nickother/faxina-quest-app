// Gera os PNGs dos ícones a partir de public/favicon.svg usando o Chromium do Playwright.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const svg = readFileSync(resolve('public/favicon.svg'), 'utf8');
const targets = [
  { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#f7f4ee' },
  { file: 'pwa-192x192.png', size: 192, pad: 0 },
  { file: 'pwa-512x512.png', size: 512, pad: 0 },
  { file: 'maskable-512x512.png', size: 512, pad: 0.12, bg: '#f7f4ee' },
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2));
  const body = t.bg
    ? `<div style="width:${t.size}px;height:${t.size}px;background:${t.bg};display:grid;place-items:center">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `).replace(/rx="112"/, t.pad || t.file.startsWith('apple') ? 'rx="0"' : 'rx="112"')}</div>`
    : svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" `);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`);
  await page.screenshot({ path: `public/${t.file}`, omitBackground: !t.bg, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  console.log('ok', t.file);
}
await browser.close();
