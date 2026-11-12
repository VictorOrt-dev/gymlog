import { describe, expect, it } from 'vitest';
import { calendarGrid, mondayOf, nextPlanned, sessionProgress, strengthLevel } from '../src/lib/stats';
import { setTargets } from '../src/lib/training';

const S = (w, r, rir = 1) => ({ w, r, rir });
const opts = { inc: 2.5, range: [8, 12] };

describe('Objectif série par série', () => {
  const goal = { w: 80, r: 10 };
  it('série 1 = objectif de séance', () => expect(setTargets(goal, [], opts)[0]).toMatchObject({ w: 80, r: 10 }));
  it('objectif tenu → on garde le cap', () => expect(setTargets(goal, [S(80, 10, 1)], opts)[1]).toMatchObject({ w: 80, r: 10, why: null }));
  it('série manquée → −5 % arrondi (au moins un cran), mêmes reps visées', () => {
    expect(setTargets(goal, [S(80, 7, 1)], opts)[1]).toMatchObject({ w: 75, r: 10 });
    expect(setTargets({ w: 40, r: 10 }, [S(40, 8, 0)], opts)[1]).toMatchObject({ w: 37.5, r: 10 });
  });
  it('échec pile à l’objectif → une rep de moins', () => expect(setTargets(goal, [S(80, 10, 0)], opts)[1]).toMatchObject({ w: 80, r: 9 }));
  it('trop facile → +1 rep, ou on charge en haut de fourchette', () => {
    expect(setTargets(goal, [S(80, 10, 3)], opts)[1]).toMatchObject({ w: 80, r: 11 });
    expect(setTargets({ w: 80, r: 12 }, [S(80, 12, 4)], opts)[1]).toMatchObject({ w: 82.5, r: 8 });
  });
  it('s’enchaîne série après série', () => {
    const t = setTargets(goal, [S(80, 10, 0), S(80, 9, 0), S(80, 6, 0)], opts);
    expect(t.map((x) => `${x.w}×${x.r}`)).toEqual(['80×10', '80×9', '80×8', '75×8']);
  });
  it('sans historique, part de la série précédente', () => expect(setTargets(null, [S(50, 10, 2)], opts)[1]).toMatchObject({ w: 50, r: 10 }));
});

describe('Progression de la séance', () => {
  const items = [{ exerciseId: 'a', sets: [S(80, 8), { w: 40, r: 10, wu: true }] }, { exerciseId: 'b', sets: [] }, { exerciseId: 'c', sets: [] }];
  const last = { a: { sets: [S(1, 1), S(1, 1), S(1, 1)] }, b: { sets: [S(1, 1), S(1, 1)] } };
  it('prévu = séries de la dernière fois (3 si nouveau), fait = séries principales', () => expect(sessionProgress(items, last)).toEqual({ done: 1, planned: 8 }));
  it('décharge : une série de moins par exercice connu', () => expect(sessionProgress(items, last, true)).toEqual({ done: 1, planned: 6 }));
});

describe('Prochaine séance', () => {
  const plan = ['push', null, 'pull', null, 'legs', null, null];
  const ok = new Set(['push', 'pull', 'legs']);
  it('trouve la suivante après aujourd’hui', () => expect(nextPlanned(plan, ok, 3)).toMatchObject({ templateId: 'legs', label: 'demain' }));
  it('boucle sur la semaine', () => expect(nextPlanned(plan, ok, 5)).toMatchObject({ templateId: 'push', label: 'lundi' }));
  it('ignore une séance supprimée, null si planning vide', () => {
    expect(nextPlanned(plan, new Set(['pull']), 3)).toMatchObject({ templateId: 'pull', label: 'mercredi' });
    expect(nextPlanned(Array(7).fill(null), ok, 0)).toBeNull();
  });
});

describe('Calendrier de régularité', () => {
  const now = new Date(2026, 10, 12, 12).getTime();
  it('12 colonnes de 7 jours, la dernière = semaine en cours', () => {
    const g = calendarGrid([], 12, now);
    expect(g.cols).toHaveLength(12);
    expect(g.cols.every((c) => c.length === 7)).toBe(true);
    expect(g.cols[11][0].ts).toBe(mondayOf(now));
    expect(g.cols[11].find((d) => d.today)).toBeTruthy();
    expect(g.cols[11][6].future).toBe(true);
  });
  it('compte les jours entraînés (un jour = une case, même avec 2 séances)', () => {
    const at = mondayOf(now) + 3600e3;
    expect(calendarGrid([{ startedAt: at }, { startedAt: at + 60e3 }, { startedAt: at - 7 * 864e5 }], 12, now).count).toBe(2);
  });
});

describe('Statut de force', () => {
  it('classe selon le 1RM estimé / poids de corps', () => {
    expect(strengthLevel(70, 80, 'developpe-couche')).toMatchObject({ level: 'Novice', next: { level: 'Intermédiaire', kg: 80 } });
    expect(strengthLevel(125, 80, 'developpe-couche')).toMatchObject({ level: 'Avancé', index: 2 });
    expect(strengthLevel(250, 80, 'developpe-couche')).toMatchObject({ level: 'Élite', next: null, progress: 1 });
  });
  it('repères différents pour les femmes', () => expect(strengthLevel(40, 60, 'developpe-couche', 'f').level).toBe('Intermédiaire'));
  it('progression vers le palier suivant', () => expect(strengthLevel(100, 80, 'developpe-couche').progress).toBeCloseTo((1.25 - 1) / 0.5));
  it('null sans poids de corps ou hors mouvements de référence', () => {
    expect(strengthLevel(100, 0, 'squat')).toBeNull();
    expect(strengthLevel(100, 80, 'curl-barre')).toBeNull();
  });
});
