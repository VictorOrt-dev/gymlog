import { describe, expect, it } from 'vitest';
import { moveItem, removeItem, replaceItem } from '../src/lib/session';

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
