import { describe, expect, it } from 'vitest';
import { CUSTOM_GROUP, VERSION, defaultRange, initialState, libraryExercises, migrate } from '../src/lib/defaults';

const v1 = () => ({
  profileId: 'p1',
  profiles: [{ id: 'p1', name: 'Victor' }],
  exercises: [
    { id: 'squat', name: 'Squat', inc: 2.5, rest: 180 },
    { id: 'perso', name: 'Mon exo', inc: 2.5, rest: 120 },
  ],
  templates: [{ id: 't1', profileId: 'p1', name: 'Push', exerciseIds: ['squat'] }],
  plans: { p1: ['t1', null, null, null, null, null, null] },
  drafts: {},
  sessions: [{ id: 's1', profileId: 'p1', startedAt: 1, items: [{ exerciseId: 'squat', sets: [{ w: 100, r: 5, rir: 1 }] }] }],
});

describe('Migration des données', () => {
  it('amène une sauvegarde v1 jusqu’à la version courante', () => {
    expect(migrate(v1()).v).toBe(VERSION);
  });
  it('ne perd ni séance, ni profil, ni planning, ni exercice perso', () => {
    const m = migrate(v1());
    expect(m.sessions).toEqual(v1().sessions);
    expect(m.profiles).toEqual(v1().profiles);
    expect(m.plans).toEqual(v1().plans);
    expect(m.exercises.find((e) => e.id === 'perso')).toMatchObject({ name: 'Mon exo', group: CUSTOM_GROUP });
  });
  it('complète la bibliothèque et ajoute Upper / Lower / Full body', () => {
    const m = migrate(v1());
    expect(m.exercises.length).toBe(libraryExercises().length + 1);
    expect(m.templates.map((t) => t.name)).toEqual(['Push', 'Upper', 'Lower', 'Full body']);
  });
  it('donne une fourchette à chaque exercice (8–12 pour un exercice perso)', () => {
    const m = migrate(v1());
    expect(m.exercises.every((e) => Array.isArray(e.range))).toBe(true);
    expect(m.exercises.find((e) => e.id === 'perso').range).toEqual([8, 12]);
    expect(m.exercises.find((e) => e.id === 'squat').range).toEqual(defaultRange(180));
    expect(m.notes).toEqual({});
  });
  it('est idempotente', () => {
    const once = migrate(v1());
    expect(migrate(once)).toBe(once);
  });
  it('l’état initial est déjà au format courant', () => {
    const s = initialState();
    expect(s.v).toBe(VERSION);
    expect(migrate(s)).toBe(s);
  });
});
