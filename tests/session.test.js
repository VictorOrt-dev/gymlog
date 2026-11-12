import { describe, expect, it } from 'vitest';
import { moveItem, removeItem, replaceItem, withAthlete } from '../src/lib/session';

const draft = (open = 0) => ({
  id: 'd',
  profileId: 'a',
  templateId: 't',
  name: 'Push',
  startedAt: 1,
  open,
  items: [
    { exerciseId: 'dc', sets: [{ w: 80, r: 8, rir: 2 }] },
    { exerciseId: 'dm', sets: [] },
    { exerciseId: 'el', sets: [] },
  ],
});
const state = () => ({
  profileId: 'a',
  profiles: [{ id: 'a', name: 'Victor' }, { id: 'b', name: 'Max' }],
  templates: [{ id: 'tb', profileId: 'b', name: 'Push', exerciseIds: [] }],
  drafts: { a: draft() },
});

describe('Binôme', () => {
  it('le pote reçoit la même séance, vide, dans le même ordre', () => {
    const s = withAthlete(state(), 'b');
    expect(s.profileId).toBe('b');
    expect(s.drafts.b.items.map((i) => i.exerciseId)).toEqual(['dc', 'dm', 'el']);
    expect(s.drafts.b.items.every((i) => i.sets.length === 0)).toBe(true);
    expect(s.drafts.b.templateId).toBe('tb'); // relié à SA séance « Push »
  });
  it('ne touche pas à la séance de l’athlète qu’on quitte', () => {
    const before = state();
    const s = withAthlete(before, 'b');
    expect(s.drafts.a).toBe(before.drafts.a);
  });
  it('retrouve la séance déjà en cours du pote', () => {
    const s1 = withAthlete(state(), 'b');
    const withSet = { ...s1, drafts: { ...s1.drafts, b: { ...s1.drafts.b, items: [{ exerciseId: 'dc', sets: [{ w: 60, r: 10, rir: 2 }] }] } } };
    const back = withAthlete(withAthlete(withSet, 'a'), 'b');
    expect(back.drafts.b.items[0].sets).toHaveLength(1);
  });
  it('ignore un profil inconnu', () => {
    const s = state();
    expect(withAthlete(s, 'zzz')).toBe(s);
  });
});

describe('Réordonner', () => {
  it('échange deux exercices et l’exercice ouvert suit', () => {
    const d = moveItem(draft(0), 0, 1);
    expect(d.items.map((i) => i.exerciseId)).toEqual(['dm', 'dc', 'el']);
    expect(d.open).toBe(1);
  });
  it('garde les séries avec leur exercice', () => {
    expect(moveItem(draft(), 0, 1).items[1].sets).toHaveLength(1);
  });
  it('ne sort pas des bornes', () => {
    const d = draft();
    expect(moveItem(d, 0, -1)).toBe(d);
    expect(moveItem(d, 2, 1)).toBe(d);
  });
});

describe('Remplacer', () => {
  it('sans série faite, le remplaçant prend la place', () => {
    const d = replaceItem(draft(), 1, 'dh');
    expect(d.items.map((i) => i.exerciseId)).toEqual(['dc', 'dh', 'el']);
    expect(d.open).toBe(1);
  });
  it('avec des séries faites, l’original les garde et le remplaçant s’insère après', () => {
    const d = replaceItem(draft(), 0, 'dh');
    expect(d.items.map((i) => i.exerciseId)).toEqual(['dc', 'dh', 'dm', 'el']);
    expect(d.items[0].sets).toHaveLength(1);
    expect(d.open).toBe(1);
  });
  it('refuse un exercice déjà dans la séance', () => {
    const d = draft();
    expect(replaceItem(d, 1, 'el')).toBe(d);
  });
  it('retirer ferme la carte', () => {
    const d = removeItem(draft(), 1);
    expect(d.items).toHaveLength(2);
    expect(d.open).toBe(-1);
  });
});
