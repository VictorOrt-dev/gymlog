import { expect, test } from '@playwright/test';
import { finishSession, seed, tap } from './helpers';

test.beforeEach(async ({ page }) => seed(page));

test('séance : objectif, record en direct, échauffement court, récapitulatif', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  const card = page.locator('main section').filter({ hasText: 'Développé couché' }).first();
  await expect(card.getByText('Objectif du jour')).toBeVisible();
  await expect(card.getByRole('button', { name: /Valider la série 1/ })).toContainText('Record');
  await tap(page, 'button:has-text("Valider la série 1")');
  await expect(card.getByText('Nouveau record')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Arrêter le chrono' })).toBeVisible();
  // Échauffement → 60 s de repos
  await card.getByRole('button', { name: 'Échauffement', exact: true }).click();
  await tap(page, 'button:has-text("Valider l’échauffement")');
  await expect(page.locator('.fixed.bottom-0').last()).toContainText(/1:00|0:59/);
  await finishSession(page);
  const summary = page.getByRole('dialog', { name: 'Récapitulatif de la séance' });
  await expect(summary).toContainText('Séance terminée');
  await expect(summary).toContainText('1 nouveau record');
  await summary.getByRole('button', { name: 'Terminé' }).click();
  await expect(page.getByRole('navigation')).toBeVisible();
});

test('forme du jour : « Fatigué » allège l’objectif', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  const card = page.locator('main section').filter({ hasText: 'Développé couché' }).first();
  await expect(card).toContainText('82,5 kg × 5'); // fourchette 5–8 atteinte : on charge
  await page.getByRole('radio', { name: 'Fatigué' }).click();
  await expect(card).toContainText('Jour sans');
  await expect(card).toContainText('75 kg × 8');
});

test('drop set : noté à part, hors comparaison', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  const card = page.locator('main section').filter({ hasText: 'Développé couché' }).first();
  await tap(page, 'button:has-text("Valider la série 1")');
  await card.getByRole('button', { name: 'Drop set', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Valider le drop set' })).toBeVisible();
  await tap(page, 'button:has-text("Valider le drop set")');
  await expect(card.getByText('Drop sets')).toBeVisible();
  await expect(card.getByRole('button', { name: /Valider la série 2/ })).toBeVisible();
});

test('superset : la carte bascule seule, le repos part après le second', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  await page.getByRole('button', { name: /^Organiser Développé couché/ }).click();
  await page.getByRole('button', { name: /Superset avec Développé militaire/ }).click();
  await expect(page.getByText('Superset A1')).toBeVisible();
  await tap(page, 'button:has-text("Valider la série 1")');
  await expect(page.getByRole('button', { name: 'Arrêter le chrono' })).toHaveCount(0); // pas de repos entre A1 et A2
  await expect(page.locator('main section:has(button[aria-expanded=true])')).toContainText('Développé militaire');
  await tap(page, 'button:has-text("Valider la série 1")');
  await expect(page.getByRole('button', { name: 'Arrêter le chrono' })).toBeVisible();
  await expect(page.locator('main section:has(button[aria-expanded=true])')).toContainText('Développé couché');
});

test('lisibilité : aucune cible sous 44 px ni chiffre coupé en séance', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  await page.waitForTimeout(600);
  const problems = await page.evaluate(() => {
    const small = [...document.querySelectorAll('button, input')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight && (r.width < 44 || r.height < 44);
    });
    const clipped = [...document.querySelectorAll('input')].filter((i) => i.scrollWidth > i.clientWidth + 1);
    return { small: small.length, clipped: clipped.length };
  });
  expect(problems).toEqual({ small: 0, clipped: 0 });
});
