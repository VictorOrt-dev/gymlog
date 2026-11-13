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
    await expect(summary).toContainText(/≈ \d+ kcalCalories actives/); // une vraie case pour les calories
    await expect(summary).toContainText('un poids de 75 kg'); // sans poids de corps : hypothèse affichée
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

test.describe('renommer', () => {
  test.beforeEach(async ({ page }) => seed(page));

  test('une séance créée se renomme, et l’historique suit', async ({ page }) => {
    await page.getByRole('button', { name: 'Nouvelle séance' }).click();
    await page.getByRole('button', { name: /Séance vide/ }).click();
    const field = page.getByRole('textbox', { name: 'Nom de la séance' });
    await expect(field).toBeFocused();
    await page.keyboard.type('Bras'); // le nom par défaut est sélectionné : on tape directement
    await field.press('Enter');
    await page.mouse.click(200, 20);
    await expect(page.locator('section').filter({ hasText: 'Mes séances' })).toContainText('Bras');
    // Renommer une séance déjà faite : ses séances passées prennent le nouveau nom
    await page.getByRole('button', { name: /^Push/ }).first().click();
    await field.fill('Pecs épaules');
    await field.press('Enter');
    await page.mouse.click(200, 20);
    await page.getByRole('navigation').getByText('Progrès').click();
    await expect(page.locator('section').filter({ hasText: 'Dernières séances' })).toContainText('Pecs épaules');
    await expect(page.locator('section').filter({ hasText: 'Dernières séances' })).not.toContainText('Push');
  });
});

test.describe('renommer un exercice', () => {
  test.beforeEach(async ({ page }) => seed(page));

  test('depuis une séance type : le nom change partout, l’historique reste', async ({ page }) => {
    await page.getByRole('button', { name: /^Push/ }).first().click();
    await page.getByRole('button', { name: /^Modifier Développé couché/ }).click();
    const field = page.getByRole('textbox', { name: 'Nom de l’exercice' });
    await field.fill('Squat');
    await expect(page.getByRole('alert')).toHaveText('« Squat » existe déjà.'); // pas de doublon
    await field.fill('Développé couché pause 1 s');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.getByRole('button', { name: 'Terminé' }).click();
    await page.getByRole('button', { name: 'Démarrer Push' }).click();
    const card = page.locator('main section').first();
    await expect(card).toContainText('Développé couché pause 1 s');
    await expect(card).toContainText('82,5 kg × 6'); // l'objectif vient toujours de l'historique
  });

  test('depuis la séance, dans « ⋯ »', async ({ page }) => {
    await page.getByRole('button', { name: 'Démarrer Push' }).click();
    await page.locator('main section').filter({ hasText: 'Développé militaire' }).getByRole('button', { expanded: false }).first().click();
    await page.getByRole('button', { name: /^Réglages de Développé militaire/ }).click();
    await page.getByRole('textbox', { name: 'Nom de l’exercice' }).fill('Développé militaire debout');
    await page.mouse.click(200, 20);
    await expect(page.locator('main')).toContainText('Développé militaire debout');
  });
});

test('mise à jour de l’app : séance en cours, notes et historique intacts', async ({ page }) => {
  await seed(page);
  // Données telles qu'une version précédente (v4) les a laissées, avec une séance en cours et une note
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('gymlog:data'));
    d.v = 4;
    d.notes = { p1: { 'developpe-couche': 'Banc cran 3' } };
    d.drafts = { p1: { id: 'dx', profileId: 'p1', templateId: 'tp', name: 'Push', startedAt: Date.now() - 600e3, open: 0, form: 'ok', items: [{ exerciseId: 'developpe-couche', sets: [{ w: 82.5, r: 6, rir: 1, at: Date.now() - 300e3 }] }, { exerciseId: 'developpe-militaire', sets: [] }] } };
    localStorage.setItem('gymlog:data', JSON.stringify(d));
  });
  const sessionsBefore = await page.evaluate(() => localStorage.getItem('gymlog:sessions'));
  await page.reload(); // = ouverture de la nouvelle version
  await expect(page.locator('header')).toContainText('Push'); // on retombe directement dans la séance en cours
  const card = page.locator('main section').first();
  await expect(card).toContainText('82,5 × 6'); // la série déjà faite est là
  await expect(card).toContainText('Banc cran 3'); // la note aussi
  const after = await page.evaluate(() => ({ sessions: localStorage.getItem('gymlog:sessions'), v: JSON.parse(localStorage.getItem('gymlog:data')).v, safety: !!localStorage.getItem('gymlog:avant-mise-a-jour') }));
  expect(after).toEqual({ sessions: sessionsBefore, v: 5, safety: true }); // historique octet pour octet, filet de sécurité posé
});

test.describe('variantes biomécaniques : suggérées, jamais imposées', () => {
  test.beforeEach(async ({ page }) => seed(page));

  test('dans la séance type : la variante remplace l’exercice si on le choisit', async ({ page }) => {
    await page.getByRole('button', { name: /^Pull/ }).first().click();
    await page.getByRole('button', { name: /^Modifier Curl barre/ }).click();
    const sheet = page.getByRole('dialog').last();
    await expect(sheet).toContainText('Variante à essayer');
    await expect(sheet).toContainText('Curl incliné haltères');
    await expect(sheet).toContainText('Tu kiffes le tien ? Garde-le');
    await sheet.getByRole('button', { name: 'Remplacer dans la séance type' }).click();
    await page.getByRole('button', { name: 'Terminé' }).click();
    const list = page.locator('section').filter({ hasText: 'Mes séances' });
    await expect(list).toContainText('Curl incliné haltères');
  });

  test('en séance : « Essayer pour cette séance », la séance type ne change pas', async ({ page }) => {
    await page.getByRole('button', { name: 'Démarrer Pull' }).click();
    await page.locator('main section').filter({ hasText: 'Curl barre' }).getByRole('button', { expanded: false }).first().click();
    await page.getByRole('button', { name: /^Réglages de Curl barre/ }).click();
    await page.getByRole('button', { name: 'Essayer pour cette séance' }).click();
    await expect(page.locator('main')).toContainText('Curl incliné haltères');
    await expect(page.locator('main')).not.toContainText('Curl barre');
  });

  test('un exercice sans meilleure variante n’affiche rien', async ({ page }) => {
    await page.getByRole('button', { name: /^Push/ }).first().click();
    await page.getByRole('button', { name: /^Modifier Développé couché/ }).click();
    await expect(page.getByText('Variante à essayer')).toHaveCount(0);
  });
});

test('hors ligne : l’app s’ouvre quand même (cache de secours)', async ({ page, context }) => {
  await seed(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.waitForTimeout(800); // la version reçue finit d'être rangée
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Aujourd’hui' }).or(page.locator('h1').first())).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('section').filter({ hasText: 'Mes séances' })).toContainText('Push');
  await context.setOffline(false);
});

test('Réglages affichent la date de la version', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Réglages et sauvegarde' }).click();
  await expect(page.getByText(/^Version du \d+ \S+ à \d{2}:\d{2}$/)).toBeVisible();
});

test.describe('nouvelle version détectée', () => {
  test.use({ serviceWorkers: 'block' }); // pour simuler la version en ligne

  test('un bouton « Recharger » apparaît, jamais en pleine séance', async ({ page }) => {
    await seed(page);
    await page.route(/\?maj=/, (route) => route.fulfill({ contentType: 'text/html', body: '<script type="module" crossorigin src="./assets/index-NOUVELLE.js"></script>' }));
    const pill = page.getByRole('status').filter({ hasText: 'Mise à jour' });
    await expect(pill).toBeVisible({ timeout: 10_000 });
    await expect(pill.getByRole('button', { name: 'Recharger' })).toBeVisible();
    // En séance : masqué, pour ne jamais gêner
    await page.getByRole('button', { name: 'Démarrer Push' }).click();
    await expect(pill).toHaveCount(0);
    await page.getByRole('button', { name: /Retour à l'accueil/ }).click();
    await expect(pill).toBeVisible();
    // « Plus tard » : on ne le revoit pas avant la prochaine ouverture
    await pill.getByRole('button', { name: 'Plus tard' }).click();
    await expect(pill).toHaveCount(0);
  });

  test('pas de bouton quand l’app est déjà à jour', async ({ page }) => {
    await seed(page);
    await page.waitForTimeout(4500);
    await expect(page.getByRole('status').filter({ hasText: 'Mise à jour' })).toHaveCount(0);
  });
});
