import { describe, expect, it } from 'vitest';
import { editSessionSet } from '../src/lib/session';
import { buildSummary } from '../src/lib/summary';
import { liveRecords, recordBook, recordOf } from '../src/lib/training';

const S = (w, r, rir = 1, wu) => ({ w, r, rir, ...(wu ? { wu: true } : {}) });
const history = [S(80, 8, 1), S(80, 8, 1), S(75, 10, 1)];

describe('Records en direct', () => {
  it('record de force quand le 1RM estimé (reps + RIR) dépasse le meilleur', () => {
    expect(recordOf(S(82.5, 8, 1), recordBook(history))).toMatchObject({ e1rm: true });
  });
  it('record à N reps : plus lourd que jamais pour au moins ce nombre de reps', () => {
    // 77,5 × 10 : 1RM estimé inférieur à 80 × 8, mais jamais fait 77,5 kg pour 10 reps
    const rec = recordOf(S(77.5, 10, 0), recordBook(history));
    expect(rec).toMatchObject({ reps: true, e1rm: false });
  });
  it('égaler n’est pas un record', () => {
    expect(recordOf(S(80, 8, 1), recordBook(history))).toBeNull();
  });
  it('pas de record la toute première fois, ni sur un échauffement', () => {
    expect(recordOf(S(100, 10), recordBook([]))).toBeNull();
    expect(recordOf(S(100, 10, null, true), recordBook(history))).toBeNull();
  });
  it('chaque série se mesure aussi aux séries précédentes du jour', () => {
    const recs = liveRecords([S(40, 10, null, true), S(82.5, 8, 1), S(82.5, 8, 1), S(85, 8, 1)], history);
    expect(recs.map(Boolean)).toEqual([false, true, false, true]);
  });
});

describe('Récapitulatif de fin de séance', () => {
  const sessions = [
    { id: 'old', profileId: 'p', templateId: 't', name: 'Push', startedAt: 1, items: [{ exerciseId: 'dc', sets: history }] },
    { id: 'other', profileId: 'p', templateId: 'u', name: 'Pull', startedAt: 2, items: [{ exerciseId: 'dc', sets: [S(60, 10)] }] },
    { id: 'mate', profileId: 'q', templateId: 't', name: 'Push', startedAt: 3, items: [{ exerciseId: 'dc', sets: [S(150, 10)] }] },
  ];
  const draft = { profileId: 'p', templateId: 't', name: 'Push', startedAt: 100, items: [{ exerciseId: 'dc', sets: [S(40, 10, null, true), S(82.5, 8, 1), S(80, 8, 1)] }, { exerciseId: 'dm', sets: [S(40, 8, 2)] }, { exerciseId: 'el', sets: [] }] };
  const sum = buildSummary(draft, sessions, 100 + 52 * 60e3);

  it('durée, séries de travail et records', () => {
    expect(sum.minutes).toBe(52);
    expect(sum.sets).toBe(3);
    expect(sum.records).toBe(1);
  });
  it('compare à la dernière séance du même type, pas à un autre type ni à un pote', () => {
    const dc = sum.exercises.find((e) => e.exerciseId === 'dc');
    expect(dc.prevBest).toEqual(S(80, 8, 1));
    expect(dc.fromSameType).toBe(true);
    expect(dc.change).toBeGreaterThan(0);
    expect(dc.warmups).toBe(1);
  });
  it('un exercice jamais fait n’a pas de comparaison ; un exercice vide est ignoré', () => {
    expect(sum.exercises.find((e) => e.exerciseId === 'dm').prevBest).toBeNull();
    expect(sum.exercises.some((e) => e.exerciseId === 'el')).toBe(false);
  });
});

describe('Correction d’une séance passée', () => {
  const session = { id: 's', profileId: 'p', startedAt: 1, items: [{ exerciseId: 'dc', sets: [S(80, 8, 1), S(825, 8, 1)] }, { exerciseId: 'dm', sets: [S(40, 8, 2)] }] };
  it('corrige une faute de frappe sans toucher au reste', () => {
    const s = editSessionSet(session, 0, 1, { w: 82.5 });
    expect(s.items[0].sets[1]).toEqual(S(82.5, 8, 1));
    expect(s.items[1]).toBe(session.items[1]);
  });
  it('bascule en échauffement (le RIR disparaît) et revient en travail', () => {
    const wu = editSessionSet(session, 0, 0, { wu: true });
    expect(wu.items[0].sets[0]).toMatchObject({ wu: true, rir: null });
    const back = editSessionSet(wu, 0, 0, { wu: false, rir: 2 });
    expect(back.items[0].sets[0]).toEqual(S(80, 8, 2));
  });
  it('supprime une série ; l’exercice vidé disparaît ; la séance vidée renvoie null', () => {
    expect(editSessionSet(session, 1, 0, null).items).toHaveLength(1);
    const one = { ...session, items: [{ exerciseId: 'dc', sets: [S(80, 8)] }] };
    expect(editSessionSet(one, 0, 0, null)).toBeNull();
  });
  it('nettoie les valeurs (pas de charge négative, reps entières)', () => {
    expect(editSessionSet(session, 0, 0, { w: -5, r: 7.6 }).items[0].sets[0]).toMatchObject({ w: 0, r: 8 });
  });
});
