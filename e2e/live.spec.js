import { expect, test } from '@playwright/test';
import { seed, tap } from './helpers';

test.beforeEach(async ({ page }) => seed(page));

/** Glissement horizontal au doigt (événements pointeur), comme sur iPhone. */
async function swipeLeft(page, locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center' })); // ni sous l'en-tête collant, ni sous le chrono
  const b = await locator.boundingBox();
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width - 10, y);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(b.x + b.width - 10 - k * (b.width * 0.08), y);
  await page.mouse.up();
}

test('séance : progression, objectif ajusté après une série ratée, glisser pour supprimer', async ({ page }) => {
  await page.getByRole('button', { name: 'Démarrer Push' }).click();
  const header = page.locator('header');
  await expect(header).toContainText('0/6 séries'); // 2 + 1 la dernière fois, 3 pour l'exercice nouveau
  const card = page.locator('main section').filter({ hasText: 'Développé couché' }).first();
  await expect(card).toContainText('82,5 kg × 5');
  // Série ratée : 3 reps au lieu de 5
  await card.getByRole('button', { name: 'reps moins 1' }).dispatchEvent('click');
  await card.getByRole('button', { name: 'reps moins 1' }).dispatchEvent('click');
  await tap(page, 'button:has-text("Valider la série 1")');
  await expect(header).toContainText('1/6 séries');
  await expect(page.getByRole('progressbar', { name: 'Séries validées' })).toHaveAttribute('aria-valuenow', '1');
  await expect(card.getByText('Série 1 manquée')).toBeVisible();
  await expect(card).toContainText('77,5 kg × 5'); // −5 % arrondi au cran, mêmes reps visées
  await page.getByRole('button', { name: 'Arrêter le chrono' }).click();
  // Glisser la série vers la gauche : supprimée, annulable
  await swipeLeft(page, card.getByRole('button', { name: /82,5 × 3/ }));
  await expect(page.getByRole('status').filter({ hasText: 'Série supprimée' })).toBeVisible();
  await expect(header).toContainText('0/6 séries');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(card.getByRole('button', { name: /82,5 × 3/ })).toBeVisible();
  await expect(header).toContainText('1/6 séries');
});

test('accueil : jour de repos → prochaine séance à avancer d’un tap ; série de semaines', async ({ page }) => {
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('gymlog:data'));
    const i = (new Date().getDay() + 6) % 7;
    d.plans.p1 = Array(7).fill(null);
    d.plans.p1[(i + 1) % 7] = 'tl';
    localStorage.setItem('gymlog:data', JSON.stringify(d));
  });
  await page.reload();
  await expect(page.getByText('🔥 5 semaines')).toBeVisible(); // 5 semaines d'affilée au rendez-vous dans les données de départ
  await expect(page.getByText(/Repos aujourd’hui/)).toBeVisible();
  await expect(page.locator('main, body').first()).toContainText('Pull · Demain');
  await page.getByRole('button', { name: 'La faire maintenant' }).click();
  await expect(page.locator('header')).toContainText('Pull');
});

test('séance libre : en tête de « Nouvelle séance »', async ({ page }) => {
  await expect(page.getByText('Séance libre', { exact: true })).toHaveCount(0); // plus dans la liste
  await page.getByRole('button', { name: 'Nouvelle séance' }).click();
  await page.getByRole('button', { name: /Séance libre, maintenant/ }).click();
  await expect(page.locator('header')).toContainText('Séance libre');
});

test('progrès : calendrier 12 semaines et niveau de force après le poids de corps', async ({ page }) => {
  await page.getByRole('navigation').getByText('Progrès').click();
  await expect(page.getByRole('img', { name: '15 jours d’entraînement sur les 12 dernières semaines' })).toBeVisible();
  await page.getByRole('button', { name: /Situe ta force/ }).click();
  const input = page.getByRole('textbox', { name: 'Poids de corps en kilos' });
  await input.fill('80');
  await input.press('Enter');
  await page.mouse.click(200, 20);
  const strength = page.locator('section').filter({ hasText: 'Niveau de force' });
  await expect(strength).toContainText('Développé couché');
  await expect(strength).toContainText('Intermédiaire'); // 106,5 kg estimés ÷ 80 kg = 1,33×
  await expect(strength).toContainText('Avancé à 120 kg');
  // Cibles 44 px sur tout l'onglet
  const small = await page.evaluate(() =>
    [...document.querySelectorAll('button, input')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44);
    }).map((b) => b.textContent || b.getAttribute('aria-label')),
  );
  expect(small).toEqual([]);
});
