import { expect, test } from '@playwright/test';
import { finishSession, seed, tap } from './helpers';

test('premier lancement : prénom, jours, séances gardées — et rien d’autre', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Ton prénom' }).fill('Léa');
  await page.getByRole('button', { name: /^Legs/ }).click(); // décochée
  await expect(page.getByText('Ta semaine : Lun Push · Mer Pull · Ven Push')).toBeVisible();
  // Cibles 44 px sur l'écran de bienvenue
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, input:not([type=file])')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44);
    }).length,
  );
  expect(small).toBe(0);
  await page.getByRole('button', { name: 'C’est parti' }).click();
  const list = page.locator('section').filter({ hasText: 'Mes séances' });
  await expect(list).toContainText('Push');
  await expect(list).toContainText('Pull');
  await expect(list).not.toContainText('Legs');
  await expect(list).not.toContainText('Upper');
  await page.reload(); // le choix est mémorisé
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toHaveCount(0);
});

test.describe('avec historique', () => {
  test.beforeEach(async ({ page }) => seed(page));

  test('une séance oubliée se range au bon jour depuis le récapitulatif', async ({ page }) => {
    await page.getByRole('button', { name: 'Démarrer Push' }).click();
    await tap(page, 'button:has-text("Valider la série 1")');
    await finishSession(page);
    const summary = page.getByRole('dialog', { name: 'Récapitulatif de la séance' });
    await summary.getByRole('radio', { name: 'Hier' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Séance rangée au' })).toBeVisible();
    await summary.getByRole('button', { name: 'Terminé' }).click();
    await page.getByRole('navigation').getByText('Progrès').click();
    await expect(page.getByRole('img', { name: '16 jours d’entraînement sur les 12 dernières semaines' })).toBeVisible();
    await page.locator('section').filter({ hasText: 'Dernières séances' }).getByRole('button', { name: /Push/ }).first().click();
    await expect(page.getByRole('dialog').getByRole('radio', { name: 'Hier' })).toHaveAttribute('aria-checked', 'true');
  });

  test('progrès : 4 blocs, 🔥 dans la régularité, volume replié sur la semaine dernière', async ({ page }) => {
    await page.getByRole('navigation').getByText('Progrès').click();
    const titles = await page.locator('main h2, h2').allTextContents();
    expect(titles.filter((t) => ['Force', 'Volume', 'Régularité', 'Dernières séances'].includes(t))).toEqual(['Force', 'Volume', 'Régularité', 'Dernières séances']);
    await expect(page.locator('section').filter({ hasText: 'Régularité' }).getByText('🔥 5 semaines')).toBeVisible();
    await expect(page.getByText('🔥')).toHaveCount(1); // plus de doublon (tuile, accueil)
    await expect(page.getByRole('radio', { name: 'Semaine dernière' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText(/Rien encore cette semaine/)).toBeVisible();
    await page.getByRole('navigation').getByText('Entraînement').click();
    await expect(page.getByText('🔥')).toHaveCount(0);
  });

  test('accueil : aucune cible sous 44 px, même sur iPhone SE', async ({ page }) => {
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, input:not([type=file])')].filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44);
      }).map((b) => b.getAttribute('aria-label') || b.textContent),
    );
    expect(small).toEqual([]);
  });

  test('progrès sans aucune séance : un état vide soigné', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('gymlog:sessions', '[]'));
    await page.reload();
    await page.getByRole('navigation').getByText('Progrès').click();
    await expect(page.getByText('Ta progression commence ici')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Volume' })).toHaveCount(0);
  });
});
