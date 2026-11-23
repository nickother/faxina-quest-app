import { expect, test } from '@playwright/test';

const SHOTS = 'docs/screenshots';

test.beforeEach(async ({ page }) => {
  // Sexta-feira, 27/11/2026, 19h (dia de raid)
  await page.clock.setFixedTime(new Date('2026-11-27T19:00:00-03:00'));
});

async function open(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeHidden();
}

test('marcar tarefas da raid pinta o cômodo no mapa', async ({ page }) => {
  await open(page);
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
  await open(page);
  for (const tab of ['today', 'map', 'raid', 'radar', 'guide']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${SHOTS}/${tab}.png` });
  }
  for (const [name, file] of [[/Editar tarefas/, 'editor'], [/Histórico/, 'historico'], [/Produtos/, 'produtos'], [/Cômodos/, 'comodos'], [/Ajustes/, 'ajustes']] as const) {
    await page.locator('[data-tab="guide"]').click();
    await page.getByRole('button', { name }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/${file}.png` });
  }
});

test('editor: nova tarefa da raid aparece no mapa', async ({ page }) => {
  await open(page);
  await page.locator('[data-tab="guide"]').click();
  await page.getByRole('button', { name: /Editar tarefas/ }).click();
  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByPlaceholder('Ex.: Regar as plantas').fill('Regar as <b>plantas</b>');
  await page.getByRole('button', { name: /Dia da faxina/ }).click();
  await page.locator('select').selectOption('sala');
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(page.getByText('Regar as <b>plantas</b>').first()).toBeVisible(); // texto escapado
  await page.locator('[data-tab="map"]').click();
  await page.locator('[data-room="sala"]').click();
  await expect(page.getByRole('dialog').getByText('Regar as <b>plantas</b>')).toBeVisible();
});

test('PWA: manifest, service worker e funciona offline', async ({ page, context }) => {
  await open(page);
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

test('apresentação inicial passo a passo', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/apresentacao.png` });
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Sábado' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('dialog', { name: 'Apresentação' }).getByRole('button', { name: 'Começar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Apresentação' })).toBeHidden();
  await expect(page.locator('[data-tab="raid"]')).toContainText('Sábado');
});

test('faxina relâmpago, missões e mascote na aba Hoje', async ({ page }) => {
  await open(page);
  await page.locator('[data-tab="today"]').click();
  await expect(page.getByText('Missões do dia')).toBeVisible();
  await expect(page.getByRole('button', { name: /Esponjito/ })).toBeVisible();
  await page.getByRole('button', { name: /Faxina relâmpago/ }).click();
  await page.getByRole('button', { name: 'Começar 15 minutos' }).click();
  const sheet = page.getByRole('dialog');
  const boxes = sheet.getByRole('checkbox');
  const n = await boxes.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await boxes.nth(i).click();
  await expect(page.getByText('Relâmpago no tempo!')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/relampago.png` });
});

test('editor: excluir, restaurar e rotina em dias específicos', async ({ page }) => {
  await open(page);
  await page.locator('[data-tab="guide"]').click();
  await page.getByRole('button', { name: /Editar tarefas/ }).click();
  const row = page.locator('.edit-row', { hasText: 'Arrumar a cama' }).first();
  await row.locator('.danger-icon').click();
  await row.locator('.danger-icon').click();
  await expect(page.locator('.edit-list').first()).not.toContainText('Arrumar a cama');
  await page.getByRole('button', { name: /Excluídas/ }).click();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await expect(page.locator('.edit-list').first()).toContainText('Arrumar a cama');

  await page.getByRole('button', { name: 'Nova tarefa' }).click();
  await page.getByPlaceholder('Ex.: Regar as plantas').fill('Regar as samambaias');
  await page.getByRole('button', { name: 'Dias específicos' }).click();
  await page.getByRole('group', { name: 'Dias da semana' }).getByRole('button', { name: 'Ter' }).click();
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(page.getByText('Regar as samambaias')).toBeVisible();
  // hoje é sexta: a rotina de terça (e de sexta, marcada por padrão) aparece só se incluir sexta
  await page.locator('[data-tab="today"]').click();
  await expect(page.getByText('Regar as samambaias')).toBeVisible();
});

test('cômodo novo aparece como anexo no mapa e pinta', async ({ page }) => {
  await open(page);
  await page.locator('[data-tab="guide"]').click();
  await page.getByRole('button', { name: /^Cômodos/ }).click();
  await page.getByRole('button', { name: /Área de serviço/ }).click();
  await page.getByRole('button', { name: /Varanda/ }).click();
  await page.locator('[data-tab="map"]').click();
  const annex = page.locator('.room', { hasText: 'Área de serviço' });
  await expect(annex).toHaveAttribute('data-pct', '0');
  await annex.click();
  await page.getByRole('dialog').getByRole('checkbox').first().click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(annex).toHaveAttribute('data-pct', '33');
  await page.waitForTimeout(900);
  await page.locator('.plan').screenshot({ path: `${SHOTS}/mapa-anexos.png` });
});
