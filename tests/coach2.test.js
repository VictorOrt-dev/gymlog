import { describe, expect, it } from 'vitest';
import { libraryExercises, migrate, initialState } from '../src/lib/defaults';
import { applySupersets, editSessionSet, linkSuperset, moveItem, removeItem, replaceItem, supersetOf, supersetPairs, unlinkSuperset } from '../src/lib/session';
import { decodeTemplate, encodeTemplate, readSharedCode, templateLink } from '../src/lib/share';
import { mondayOf, repRecords, volumeStatus, weekStreak, weeklyVolume } from '../src/lib/stats';
import { lastPerformances, main, recordOf, recordBook, rirText, target } from '../src/lib/training';

const S = (w, r, rir = 1, extra = {}) => ({ w, r, rir, ...extra });
const DROP = { t: 'drop' };

describe('Forme du jour et décharge', () => {
  const prev = [S(80, 11, 1), S(80, 11, 1)];
  const opts = { inc: 2.5, range: [8, 12] };
  it('normal : +1 rep', () => expect(target(prev, opts)).toMatchObject({ w: 80, r: 12 }));
  it('en forme : on charge un cran plus tôt (à 1 rep du haut partout)', () => expect(target(prev, { ...opts, form: 'high' })).toMatchObject({ w: 82.5, r: 8, mode: 'high' }));
  it('en forme mais loin du haut : progression normale', () => expect(target([S(80, 9, 1)], { ...opts, form: 'high' })).toMatchObject({ w: 80, r: 10 }));
  it('jour sans : −5 % arrondi à une charge faisable, reps égales', () => expect(target(prev, { ...opts, form: 'low' })).toMatchObject({ w: 75, r: 11, mode: 'low' }));
  it('décharge : −10 % arrondi, reps égales', () => expect(target([S(100, 8, 1)], { ...opts, deload: true })).toMatchObject({ w: 90, r: 8, mode: 'deload' }));
});

describe('Drop sets et échec', () => {
  it('un drop set reste du travail mais sort des comparaisons', () => {
    const sets = [S(40, 10, null, { wu: true }), S(80, 8, 1), S(60, 10, 0, DROP)];
    expect(main(sets)).toEqual([S(80, 8, 1)]);
  });
  it('un drop set n’est jamais un record ni la référence « dernière fois »', () => {
    expect(recordOf(S(200, 20, 0, DROP), recordBook([S(80, 8)]))).toBeNull();
    const last = lastPerformances([{ id: 's', profileId: 'p', startedAt: 1, items: [{ exerciseId: 'x', sets: [S(80, 8), S(50, 12, 0, DROP)] }] }], 'p');
    expect(last.x.sets).toEqual([S(80, 8)]);
  });
  it('RIR 0 s’affiche « Échec »', () => {
    expect(rirText(0)).toBe('Échec');
    expect(rirText(4)).toBe('RIR 4+');
  });
  it('la retouche sait passer une série en drop set et revenir', () => {
    const s = { id: 's', items: [{ exerciseId: 'x', sets: [S(80, 8)] }] };
    expect(editSessionSet(s, 0, 0, { t: 'drop' }).items[0].sets[0]).toMatchObject({ t: 'drop' });
    expect(editSessionSet(s, 0, 0, { t: null }).items[0].sets[0].t).toBeUndefined();
    expect(editSessionSet(s, 0, 0, { wu: true, t: 'drop' }).items[0].sets[0]).toEqual({ w: 80, r: 8, rir: null, wu: true });
  });
});

describe('Volume hebdomadaire par muscle', () => {
  const ex = Object.fromEntries(libraryExercises().map((e) => [e.id, e]));
  ex.perso = { id: 'perso', name: 'Perso', group: 'Mes exercices' };
  const week = mondayOf(new Date(2026, 10, 12).getTime());
  const sessions = [
    { profileId: 'p', startedAt: week + 864e5, items: [{ exerciseId: 'developpe-couche', sets: [S(40, 10, null, { wu: true }), S(80, 8), S(80, 8), S(60, 10, 0, DROP)] }, { exerciseId: 'perso', sets: [S(10, 10)] }] },
    { profileId: 'p', startedAt: week - 864e5, items: [{ exerciseId: 'curl-barre', sets: [S(30, 10)] }] },
  ];
  const v = weeklyVolume(sessions, ex, week);
  it('1 série sur le muscle principal, ½ sur chaque secondaire, échauffement exclu, drop inclus', () => {
    expect(v.byGroup).toEqual({ Pectoraux: 3, Triceps: 1.5, Épaules: 1.5 });
  });
  it('ignore les autres semaines et signale les exercices perso sans muscle', () => {
    expect(v.byGroup.Biceps).toBeUndefined();
    expect(v.unassigned).toBe(1);
  });
  it('statut face aux repères 10–20', () => {
    expect([volumeStatus(6), volumeStatus(14), volumeStatus(24)]).toEqual(['low', 'ok', 'high']);
  });
  it('les exercices de la bibliothèque ont leurs muscles secondaires', () => {
    expect(ex['developpe-couche'].sec).toEqual(['Triceps', 'Épaules']);
    expect(ex['curl-barre'].sec).toEqual([]);
  });
});

describe('Régularité', () => {
  const now = new Date(2026, 10, 12, 12).getTime(); // jeudi
  const day = (weeksAgo, d) => ({ startedAt: mondayOf(now) - weeksAgo * 7 * 864e5 + d * 864e5 + 3600e3 });
  it('compte les semaines tenues d’affilée, semaine en cours comprise si validée', () => {
    const s = [day(0, 0), day(0, 2), day(1, 0), day(1, 2), day(2, 1), day(2, 3)];
    expect(weekStreak(s, 2, now)).toMatchObject({ streak: 3, currentDone: true });
  });
  it('une semaine en cours pas encore validée ne casse pas la série', () => {
    const s = [day(0, 0), day(1, 0), day(1, 2), day(2, 1), day(2, 3)];
    expect(weekStreak(s, 2, now)).toMatchObject({ streak: 2, currentDone: false });
  });
  it('deux séances le même jour comptent pour un seul jour', () => {
    expect(weekStreak([day(1, 0), day(1, 0)], 2, now).streak).toBe(0);
  });
});

describe('Records par reps', () => {
  const sets = [S(100, 3, 1, { at: 1 }), S(90, 6, 1, { at: 2 }), S(80, 10, 1, { at: 3 }), S(120, 1, 0, { at: 4 }), S(70, 12, 0, { at: 5, t: 'drop' })];
  it('charge max pour au moins N reps, drop exclu, sans ligne redondante', () => {
    expect(repRecords(sets)).toEqual([
      { r: 1, w: 120, reps: 1, at: 4 },
      { r: 3, w: 100, reps: 3, at: 1 },
      { r: 5, w: 90, reps: 6, at: 2 },
      { r: 10, w: 80, reps: 10, at: 3 }, // « 8 reps : 80 kg » est couvert par « 10 reps : 80 kg »
    ]);
  });
});

describe('Supersets', () => {
  const d = { items: [{ exerciseId: 'a', sets: [] }, { exerciseId: 'b', sets: [] }, { exerciseId: 'c', sets: [] }], open: 0 };
  it('lie deux exercices consécutifs', () => {
    const l = linkSuperset(d, 0);
    expect(supersetOf(l.items, 0)).toEqual({ partner: 1, first: true });
    expect(supersetOf(l.items, 1)).toEqual({ partner: 0, first: false });
    expect(supersetOf(l.items, 2)).toBeNull();
    expect(supersetPairs(l.items)).toEqual([['a', 'b']]);
  });
  it('se défait si on délie, déplace ou retire un des deux', () => {
    const l = linkSuperset(d, 0);
    expect(supersetOf(unlinkSuperset(l, 1).items, 0)).toBeNull();
    expect(supersetPairs(moveItem(l, 1, 1).items)).toEqual([]);
    expect(supersetPairs(removeItem(l, 0).items)).toEqual([]);
  });
  it('un remplaçant sans série reprend la place dans le superset', () => {
    const l = linkSuperset(d, 0);
    expect(supersetPairs(replaceItem(l, 1, 'z').items)).toEqual([['a', 'z']]);
  });
  it('les paires mémorisées se réappliquent au démarrage', () => {
    expect(supersetPairs(applySupersets(d.items, [['b', 'c']]))).toEqual([['b', 'c']]);
    expect(supersetPairs(applySupersets(d.items, [['a', 'c']]))).toEqual([]); // pas consécutifs
  });
});

describe('Envoyer une séance par lien', () => {
  const ex = Object.fromEntries(libraryExercises().map((e) => [e.id, e]));
  ex.perso = { id: 'perso', name: 'Pull-over élastique ✨', group: 'Mes exercices', sec: [], inc: 1, rest: 60, range: [12, 20] };
  const tpl = { name: 'Bras du mardi', exerciseIds: ['curl-barre', 'perso'], supersets: [['curl-barre', 'perso']] };
  it('aller-retour fidèle, accents et emoji compris', () => {
    const code = encodeTemplate(tpl, ex);
    const link = templateLink('https://x.github.io/gymlog/#ancienne', code);
    expect(readSharedCode(new URL(link).hash)).toBe(code);
    const res = decodeTemplate(code);
    expect(res.ok).toBe(true);
    expect(res.data.name).toBe('Bras du mardi');
    expect(res.data.exercises[1]).toMatchObject({ id: 'perso', name: 'Pull-over élastique ✨', inc: 1, range: [12, 20] });
    expect(res.data.supersets).toEqual([['curl-barre', 'perso']]);
  });
  it('refuse un lien corrompu ou trafiqué', () => {
    expect(decodeTemplate('n%importe').ok).toBe(false);
    expect(decodeTemplate(btoa(JSON.stringify({ v: 1, n: 'X', e: [{ i: 'a', n: 'A', inc: -3 }] }))).ok).toBe(false);
    expect(decodeTemplate(btoa(JSON.stringify({ v: 1, n: 'X', e: [] }))).ok).toBe(false);
  });
});

describe('Migration v4', () => {
  it('ajoute muscles secondaires, supersets des séances types et décharge, sans rien perdre', () => {
    const s = initialState();
    const v3 = { ...s, v: 3, deload: undefined, exercises: s.exercises.map(({ sec, ...e }) => e), templates: s.templates.map(({ supersets, ...t }) => t) }; // eslint-disable-line no-unused-vars
    const m = migrate(v3);
    expect(m.v).toBe(5); // jusqu'à la version courante
    expect(m.exercises.find((e) => e.id === 'squat').sec).toEqual(['Ischios & fessiers']);
    expect(m.templates.every((t) => Array.isArray(t.supersets))).toBe(true);
    expect(m.deload).toEqual({});
  });
});
