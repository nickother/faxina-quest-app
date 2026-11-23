import { expect, test } from '@playwright/test';

const SHOTS = 'docs/screenshots';

test.beforeEach(async ({ page }) => {
  // Sexta-feira, 27/11/2026, 19h (dia de raid)
  await page.clock.setFixedTime(new Date('2026-11-27T19:00:00-03:00'));
});

test('marcar tarefas da raid pinta o cômodo no mapa', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-tab="map"]').click();

  const quarto = page.locator('[data-room="quarto"]');
  await expect(quarto).toHaveAttribute('data-pct', '0');
  await expect(page.getByTestId('house-pct')).toHaveText('0%');

  // abre o cômodo e marca duas tarefas no bottom sheet
  await quarto.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  const boxes = sheet.getByRole('checkbox');
  const total = await boxes.count();
  expect(total).toBeGreaterThan(2);
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await expect(boxes.nth(0)).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();

  const expected = String(Math.round((2 / total) * 100));
  await expect(quarto).toHaveAttribute('data-pct', expected);
  await expect(page.getByTestId('house-pct')).not.toHaveText('0%');

  // completa o quarto pela aba Sexta
  await page.locator('[data-tab="raid"]').click();
  const phase = page.locator('[data-phase="quarto"]');
  await phase.locator('.phase-head').click();
  const raidBoxes = phase.getByRole('checkbox');
  for (let i = 0; i < total; i++) {
    if ((await raidBoxes.nth(i).getAttribute('aria-checked')) !== 'true') await raidBoxes.nth(i).click();
  }
  // fecha modais/dicas que aparecerem
  await page.locator('[data-tab="map"]').click();
  await expect(page.locator('[data-room="quarto"]')).toHaveAttribute('data-pct', '100');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/mapa-progresso.png` });

  // persiste após recarregar (IndexedDB)
  await page.reload();
  await page.locator('[data-tab="map"]').click();
  await expect(page.locator('[data-room="quarto"]')).toHaveAttribute('data-pct', '100');
});

test('screenshots de cada aba', async ({ page }) => {
  await page.goto('./');
  for (const tab of ['today', 'map', 'raid', 'radar', 'guide']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${tab}.png` });
  }
  await page.getByRole('button', { name: /Editar tarefas/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/editor.png` });
});

test('editor: nova tarefa da raid aparece no mapa', async ({ page }) => {
  await page.goto('./');
  await page.locator('[data-tab="guide"]').click();
  await page.getByRole('button', { name: /Editar tarefas/ }).click();
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByPlaceholder('Ex.: Regar as plantas').fill('Regar as <b>plantas</b>');
  await page.getByRole('button', { name: 'Raid de sexta' }).click();
  await page.locator('select').selectOption('sala');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(page.getByText('Regar as <b>plantas</b>').first()).toBeVisible(); // texto escapado
  await page.locator('[data-tab="map"]').click();
  await page.locator('[data-room="sala"]').click();
  await expect(page.getByRole('dialog').getByText('Regar as <b>plantas</b>')).toBeVisible();
});

test('PWA: manifest, service worker e funciona offline', async ({ page, context }) => {
  await page.goto('./');
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return href ? (await fetch(href)).json() : null;
  });
  expect(manifest?.display).toBe('standalone');
  expect(manifest?.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // passa a ser controlada pelo SW
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-tab="map"]')).toBeVisible();
  await context.setOffline(false);
});
