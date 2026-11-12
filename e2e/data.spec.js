import { expect, test } from '@playwright/test';
import { finishSession, seed, tap } from './helpers';

test.beforeEach(async ({ page }) => seed(page));

test('binôme : un pote entre dans la séance, chacun son chrono, bascule à la fin', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  await tap(page, 'button:has-text("Valider la série 1")');
  await page.getByRole('button', { name: 'Ajouter un pote à la séance' }).click();
  await page.getByPlaceholder('Prénom').fill('Max');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { selected: true })).toContainText('Max');
  await expect(page.getByRole('button', { name: 'Arrêter le chrono' })).toHaveCount(0);
  await page.getByRole('tab', { name: /Victor/ }).click();
  await expect(page.getByRole('button', { name: 'Arrêter le chrono' })).toBeVisible();
  await finishSession(page);
  await expect(page.getByRole('dialog', { name: 'Récapitulatif de la séance' })).toContainText('Victor');
  await page.getByRole('button', { name: 'Continuer avec Max' }).click();
  await expect(page.getByRole('tab', { selected: true })).toContainText('Max');
});

test('corriger une séance passée recalcule l’objectif', async ({ page }) => {
  await page.getByRole('navigation').getByText('Progrès').click();
  await page.locator('section').filter({ hasText: 'Dernières séances' }).getByRole('button', { name: /Push/ }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Corriger/ }).first().click();
  for (let k = 0; k < 4; k++) await dialog.getByRole('button', { name: 'kg plus 2,5' }).click();
  await dialog.getByRole('button', { name: 'Enregistrer la correction' }).click();
  await expect(page.getByRole('status')).toContainText('Série corrigée');
  await page.mouse.click(200, 20);
  await page.getByRole('navigation').getByText('Entraînement').click();
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  await expect(page.locator('main section').filter({ hasText: 'Développé couché' }).first()).toContainText('92,5 kg × 5'); // 90 × 8 corrigé : haut de fourchette atteint → on charge
});

test('volume par muscle et records par reps', async ({ page }) => {
  await page.getByRole('navigation').getByText('Progrès').click();
  await page.getByRole('radio', { name: 'Semaine dernière' }).click();
  const vol = page.locator('section').filter({ hasText: 'Volume par muscle' });
  await expect(vol).toContainText('Pectoraux');
  await expect(vol).toContainText('Triceps'); // muscle secondaire du développé couché
  await page.getByRole('button', { name: /^Développé couché/ }).first().click();
  await expect(page.getByText('Records par reps')).toBeVisible();
});

test('séance envoyée par lien : validée puis ajoutée', async ({ page, context }) => {
  const code = await page.evaluate(async () => {
    const { encodeTemplate } = await import('/src/lib/share.js').catch(() => ({}));
    return encodeTemplate ? encodeTemplate({ name: 'Bras', exerciseIds: ['curl-barre'] }, { 'curl-barre': { id: 'curl-barre', name: 'Curl barre', inc: 2.5, rest: 90, range: [10, 15] } }) : null;
  });
  // En production le module n'est pas exposé : on fabrique le lien comme l'app le ferait.
  const payload = code ?? Buffer.from(JSON.stringify({ v: 1, n: 'Bras', e: [{ i: 'curl-barre', n: 'Curl barre', inc: 2.5, rest: 90, r: [10, 15] }], ss: [] })).toString('base64url');
  const p2 = await context.newPage();
  await p2.goto(`/#seance=${payload}`);
  const dialog = p2.getByRole('dialog');
  await expect(dialog).toContainText('Séance reçue');
  await dialog.getByRole('button', { name: 'Ajouter à mes séances' }).click();
  await expect(p2.locator('section').filter({ hasText: 'Mes séances' })).toContainText('Bras');
  await p2.goto('/#seance=corrompu');
  await expect(p2.getByRole('dialog')).toContainText('Lien invalide');
});

test('import d’une sauvegarde corrompue : refusé, données intactes', async ({ page }) => {
  const before = await page.evaluate(() => localStorage.getItem('gymlog:sessions'));
  const bad = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('gymlog:data'));
    const s = JSON.parse(localStorage.getItem('gymlog:sessions'));
    s[0].items[0].sets[0].rir = 99;
    return JSON.stringify({ app: 'gymlog', ...d, sessions: s });
  });
  const messages = [];
  page.on('dialog', async (d) => {
    messages.push(d.message());
    await d.dismiss();
  });
  await page.getByRole('button', { name: /^Profil/ }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(bad) });
  await expect.poll(() => messages.join(' ')).toContain('RIR invalide');
  expect(await page.evaluate(() => localStorage.getItem('gymlog:sessions'))).toBe(before);
});
