import { describe, expect, it } from 'vitest';
import { initialState, migrate, planFromChoice } from '../src/lib/defaults';
import { moveSessionToDay } from '../src/lib/session';

describe('Planning du premier lancement', () => {
  it('distribue les séances gardées dans l’ordre sur les jours choisis', () => {
    expect(planFromChoice([4, 0, 2], ['push', 'pull', 'legs'])).toEqual(['push', null, 'pull', null, 'legs', null, null]);
  });
  it('boucle quand il y a plus de jours que de séances', () => {
    expect(planFromChoice([0, 1, 3, 4], ['up', 'low'])).toEqual(['up', 'low', null, 'up', 'low', null, null]);
  });
  it('aucune séance → semaine vide', () => expect(planFromChoice([0, 2], [])).toEqual(Array(7).fill(null)));
});

describe('Écran de bienvenue', () => {
  it('une installation neuve le montre', () => expect(initialState().onboarded).toBe(false));
  it('des données existantes (sans le drapeau) ne le montrent pas', () => {
    const { onboarded, ...old } = initialState(); // eslint-disable-line no-unused-vars
    expect(migrate(old).onboarded).toBe(true);
  });
  it('le drapeau est conservé', () => expect(migrate(initialState()).onboarded).toBe(false));
});

describe('Changer la date d’une séance', () => {
  const start = new Date(2026, 10, 12, 18, 30).getTime();
  const session = { id: 's', startedAt: start, endedAt: start + 3600e3, items: [{ exerciseId: 'squat', sets: [{ w: 100, r: 5, rir: 1, at: start + 600e3 }, { w: 100, r: 5, rir: 1 }] }] };
  it('garde l’heure, la durée et l’écart entre les séries', () => {
    const m = moveSessionToDay(session, new Date(2026, 10, 11).getTime());
    expect(new Date(m.startedAt)).toEqual(new Date(2026, 10, 11, 18, 30));
    expect(m.endedAt - m.startedAt).toBe(3600e3);
    expect(m.items[0].sets[0].at - m.startedAt).toBe(600e3);
    expect(m.items[0].sets[1].at).toBeUndefined();
  });
  it('même jour → séance inchangée', () => expect(moveSessionToDay(session, new Date(2026, 10, 12, 8).getTime())).toBe(session));
});

describe('Renommer une séance type', async () => {
  const { renameTemplateIn } = await import('../src/lib/session');
  const state = {
    templates: [{ id: 't1', name: 'Nouvelle séance' }, { id: 't2', name: 'Legs' }],
    sessions: [{ id: 's1', templateId: 't1', name: 'Nouvelle séance' }, { id: 's2', templateId: 't2', name: 'Legs' }],
    drafts: { p1: { templateId: 't1', name: 'Nouvelle séance' } },
  };
  it('renomme la séance type, son historique et la séance en cours', () => {
    const s = renameTemplateIn(state, 't1', '  Bras  ');
    expect(s.templates[0].name).toBe('Bras');
    expect(s.sessions.map((x) => x.name)).toEqual(['Bras', 'Legs']);
    expect(s.drafts.p1.name).toBe('Bras');
  });
  it('un nom vide ou identique ne change rien', () => {
    expect(renameTemplateIn(state, 't1', '   ')).toBe(state);
    expect(renameTemplateIn(state, 't2', 'Legs')).toBe(state);
  });
});
