/** Gera um cartão (PNG 1080×1350) e abre o Compartilhar do iPhone. */
export interface CardData {
  kicker: string;
  title: string;
  big: string;
  subtitle?: string;
  stats?: { label: string; value: string }[];
  mascotSvg?: string;
  accent?: string;
}

const W = 1080;
const H = 1350;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function svgImage(svg: string): Promise<HTMLImageElement | null> {
  try {
    const markup = svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

export async function makeCard(d: CardData): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load('600 80px Fredoka'), document.fonts.load('700 40px "Nunito Sans"')]);
  } catch {
    /* segue com a fonte do sistema */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  const accent = d.accent ?? '#ffc43d';

  // fundo
  ctx.fillStyle = '#f7f4ee';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(W - 120, 160, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, H - 120, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // cartão
  ctx.shadowColor = 'rgba(16,33,58,0.12)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, 70, 110, W - 140, H - 260, 56);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  let y = 190;
  if (d.mascotSvg) {
    const img = await svgImage(d.mascotSvg);
    if (img) {
      ctx.drawImage(img, W / 2 - 150, y - 20, 300, 300);
      y += 300;
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#b07800';
  ctx.font = '800 34px "Nunito Sans", sans-serif';
  ctx.fillText(d.kicker.toUpperCase(), W / 2, y + 20);

  ctx.fillStyle = '#10213a';
  ctx.font = '600 74px Fredoka, sans-serif';
  const titleLines = wrap(ctx, d.title, W - 260);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 110 + i * 84));
  y += 110 + (titleLines.length - 1) * 84;

  ctx.fillStyle = '#12804f';
  ctx.font = '600 130px Fredoka, sans-serif';
  ctx.fillText(d.big, W / 2, y + 150);
  y += 150;

  if (d.subtitle) {
    ctx.fillStyle = '#3f4f66';
    ctx.font = '600 38px "Nunito Sans", sans-serif';
    wrap(ctx, d.subtitle, W - 280).forEach((l, i) => ctx.fillText(l, W / 2, y + 70 + i * 48));
  }

  // estatísticas
  if (d.stats?.length) {
    const n = d.stats.length;
    const bw = (W - 220 - (n - 1) * 24) / n;
    d.stats.forEach((st, i) => {
      const x = 110 + i * (bw + 24);
      const by = H - 380;
      ctx.fillStyle = '#fbf9f5';
      roundRect(ctx, x, by, bw, 150, 28);
      ctx.fill();
      ctx.fillStyle = '#10213a';
      ctx.font = '600 56px Fredoka, sans-serif';
      ctx.fillText(st.value, x + bw / 2, by + 78);
      ctx.fillStyle = '#6f7b8d';
      ctx.font = '700 28px "Nunito Sans", sans-serif';
      ctx.fillText(st.label, x + bw / 2, by + 120);
    });
  }

  // rodapé
  ctx.fillStyle = '#10213a';
  ctx.font = '600 40px Fredoka, sans-serif';
  ctx.fillText('🧽 Faxina Quest', W / 2, H - 70);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem'))), 'image/png'));
}

export async function shareCard(d: CardData): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await makeCard(d);
  const file = new File([blob], 'faxina-quest.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Faxina Quest' });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'faxina-quest.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return 'downloaded';
}

export async function shareText(text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return true;
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
