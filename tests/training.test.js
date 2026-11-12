import { describe, expect, it } from 'vitest';
import { bestOf, e1rm, isStalling, lastPerformances, pctChange, repsToFailure, seriesFor, target, trend, work, workSets } from '../src/lib/training';

const S = (w, r, rir = null, wu) => ({ w, r, rir, ...(wu ? { wu: true } : {}) });
const session = (at, items, profileId = 'p') => ({ id: `s${at}`, profileId, startedAt: at, items: Object.entries(items).map(([exerciseId, sets]) => ({ exerciseId, sets })) });

describe('1RM estimé ajusté au RIR', () => {
  it('compte les reps jusqu’à l’échec (reps + RIR)', () => {
    expect(repsToFailure(S(80, 8, 3))).toBe(11);
    expect(e1rm(S(80, 8, 0))).toBeCloseTo(80 * (1 + 8 / 30));
    expect(e1rm(S(80, 8, 3))).toBeCloseTo(80 * (1 + 11 / 30));
  });
  it('8 reps à RIR 3 pèsent plus que 8 reps à l’échec', () => {
    expect(e1rm(S(80, 8, 3))).toBeGreaterThan(e1rm(S(80, 8, 0)));
  });
  it('plafonne le RIR à 4 (« 4+ ») et ignore un RIR absent', () => {
    expect(repsToFailure(S(80, 8, 9))).toBe(12);
    expect(repsToFailure(S(80, 8, null))).toBe(8);
  });
  it('au poids du corps, raisonne en reps', () => {
    expect(e1rm(S(0, 10, 2))).toBe(12);
  });
  it('compare deux séries sur la même échelle', () => {
    expect(trend(S(82.5, 8, 1), S(80, 8, 1))).toBe('up');
    expect(trend(S(80, 8, 1), S(80, 8, 1))).toBe('eq');
    expect(trend(S(80, 6, 0), S(80, 8, 0))).toBe('down');
    expect(trend(S(80, 8), undefined)).toBeNull();
  });
});

describe('Échauffements', () => {
  const sets = [S(40, 10, null, true), S(60, 5, null, true), S(80, 8, 2), S(80, 7, 4)];
  it('sont exclus des séries de travail', () => {
    expect(work(sets)).toHaveLength(2);
  });
  it('sont exclus du tonnage effectif, comme les séries trop faciles (RIR > 3)', () => {
    expect(workSets(sets)).toEqual([S(80, 8, 2)]);
  });
  it('ne comptent pas dans « la dernière fois »', () => {
    const last = lastPerformances([session(1, { dc: sets })], 'p');
    expect(last.dc.sets.every((s) => !s.wu)).toBe(true);
  });
  it('ne peuvent pas devenir la meilleure série d’une courbe', () => {
    const sets2 = [S(100, 10, null, true), S(80, 8, 1)];
    const series = seriesFor([session(1, { dc: sets2 })], 'dc');
    expect(series.points[0].best).toEqual(S(80, 8, 1));
  });
});

describe('Double progression par fourchette', () => {
  const opts = { inc: 2.5, range: [8, 12] };
  it('charge et repart du bas quand toutes les séries touchent le haut', () => {
    expect(target([S(80, 12, 1), S(80, 12, 2), S(80, 13, 1)], opts)).toMatchObject({ w: 82.5, r: 8 });
  });
  it('ajoute une rep tant que toutes les séries ne sont pas en haut', () => {
    expect(target([S(80, 12, 1), S(80, 11, 0)], opts)).toMatchObject({ w: 80, r: 12 });
    expect(target([S(80, 9, 1)], opts)).toMatchObject({ w: 80, r: 10 });
  });
  it('vise le bas de la fourchette si on est en dessous', () => {
    expect(target([S(80, 6, 0)], opts)).toMatchObject({ w: 80, r: 8 });
  });
  it('ignore les échauffements', () => {
    expect(target([S(40, 12, null, true), S(80, 9, 1)], opts)).toMatchObject({ w: 80, r: 10 });
  });
  it('au poids du corps, propose du lest ou une variante en haut de fourchette', () => {
    expect(target([S(0, 12, 1), S(0, 12, 1)], opts)).toMatchObject({ w: 0, r: 12 });
  });
  it('sans historique, pas d’objectif', () => {
    expect(target([], opts)).toBeNull();
    expect(target(undefined, opts)).toBeNull();
  });
});

describe('Stagnation', () => {
  it('détecte 3 séances sans dépasser celle d’avant', () => {
    expect(isStalling([100, 104, 103, 104, 103.5])).toBe(true);
  });
  it('ne déclenche pas tant que ça progresse', () => {
    expect(isStalling([100, 101, 102, 103])).toBe(false);
  });
  it('demande au moins 4 séances', () => {
    expect(isStalling([100, 100, 100])).toBe(false);
  });
});

describe('Séries de progression', () => {
  const sessions = [session(1, { dc: [S(80, 8, 2)] }), session(2, { sq: [S(100, 5, 1)] }), session(3, { dc: [S(82.5, 8, 2)] }), session(4, { dc: [S(85, 8, 2)] }, 'other')];
  it('une valeur par séance, uniquement les séances de l’exercice et du profil filtré en amont', () => {
    const mine = sessions.filter((s) => s.profileId === 'p');
    const s = seriesFor(mine, 'dc');
    expect(s.points.map((p) => p.at)).toEqual([1, 3]);
    expect(s.unit).toBe('kg');
  });
  it('tonnage effectif arrondi au kilo', () => {
    const s = seriesFor([session(1, { dc: [S(82.5, 7, 2), S(82.5, 7, 4)] })], 'dc', 'effective');
    expect(s.points[0].value).toBe(578); // 82,5 × 7 = 577,5 ; la série RIR 4 ne compte pas
  });
  it('variation en %', () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(100, 0)).toBeNull();
  });
  it('meilleure série', () => {
    expect(bestOf([S(80, 8, 0), S(75, 10, 3)])).toEqual(S(75, 10, 3));
  });
});
