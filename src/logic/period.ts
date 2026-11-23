/** Chaves de período, sempre no fuso local do aparelho. */

const pad = (n: number) => String(n).padStart(2, '0');

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  c.setDate(c.getDate() + n);
  return c;
}

/** Dia: AAAA-MM-DD */
export function dayKey(d: Date): string {
  return ymd(d);
}

/** Semana: data da segunda-feira da semana (semana de segunda a domingo). */
export function weekKey(d: Date): string {
  const dow = d.getDay(); // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  return ymd(addDays(d, diff));
}

/** Raid: data da sexta-feira da semana (segunda a domingo). */
export function raidKey(d: Date): string {
  return ymd(addDays(parseYmd(weekKey(d)), 4));
}

/** Dias inteiros entre duas datas AAAA-MM-DD (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}

/** Chaves com prefixo usadas no registro de marcações. */
export const pk = {
  day: (d: Date) => `d:${dayKey(d)}`,
  week: (d: Date) => `w:${weekKey(d)}`,
  raid: (d: Date) => `r:${raidKey(d)}`,
};
