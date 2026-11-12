/** Données de départ : 6 semaines d'historique Push / Pull / Legs pour le profil « Victor » (format v1 : la migration est testée au passage). */
export async function seed(page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    const ex = [['developpe-couche', 'Développé couché', 180], ['developpe-militaire', 'Développé militaire', 150], ['elevations-laterales', 'Élévations latérales', 90], ['tractions', 'Tractions', 150], ['rowing-barre', 'Rowing barre', 150], ['curl-barre', 'Curl barre', 90], ['squat', 'Squat', 180], ['leg-curl', 'Leg curl', 90]].map(([id, name, rest]) => ({ id, name, inc: 2.5, rest }));
    const T = { push: ['developpe-couche', 'developpe-militaire', 'elevations-laterales'], pull: ['tractions', 'rowing-barre', 'curl-barre'], legs: ['squat', 'leg-curl'] };
    const templates = [['tp', 'Push', T.push], ['tl', 'Pull', T.pull], ['tg', 'Legs', T.legs]].map(([id, name, exerciseIds]) => ({ id, profileId: 'p1', name, exerciseIds }));
    const S = (w, r, rir) => ({ w, r, rir });
    const sessions = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    for (let k = 5; k >= 1; k--) {
      const g = 5 - k;
      const at = (d, h) => { const x = new Date(monday); x.setDate(monday.getDate() - 7 * k + d); x.setHours(h, 0, 0, 0); return +x; };
      const add = (tid, name, t, items) => sessions.push({ id: name + t, profileId: 'p1', templateId: tid, name, startedAt: t, endedAt: t + 55 * 60e3, items: items.map(([exerciseId, sets]) => ({ exerciseId, sets })) });
      add('tp', 'Push', at(0, 18), [['developpe-couche', [S(70 + g * 2.5, 8, 2), S(70 + g * 2.5, 8, 2)]], ['developpe-militaire', [S(40, 8, 2)]]]);
      add('tl', 'Pull', at(2, 18), [['tractions', [S(0, 7 + g, 2)]], ['rowing-barre', [S(60 + g * 2.5, 8, 2)]], ['curl-barre', [S(30, 10, 1)]]]);
      add('tg', 'Legs', at(4, 18), [['squat', [S(100, 6, 2), S(100, 6, 1)]], ['leg-curl', [S(40, 12, 2)]]]);
    }
    localStorage.setItem('gymlog:data', JSON.stringify({ profileId: 'p1', profiles: [{ id: 'p1', name: 'Victor' }], exercises: ex, templates, plans: { p1: ['tp', null, 'tl', null, 'tg', null, null] }, drafts: {}, lastExport: Date.now() }));
    localStorage.setItem('gymlog:sessions', JSON.stringify(sessions));
  });
  await page.reload();
  await page.locator('h1').first().waitFor();
}

/** Un vrai tap sans le défilement automatique de Playwright (qui fausserait le cadrage de la séance). */
export const tap = (page, selector) => page.locator(selector).first().dispatchEvent('click');

export const finishSession = async (page) => {
  await page.getByRole('button', { name: 'Terminer' }).click();
  await page.getByRole('button', { name: 'Confirmer' }).click();
};
