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

describe('Renommer un exercice', async () => {
  const { exerciseNameError } = await import('../src/lib/defaults');
  const ex = [{ id: 'squat', name: 'Squat' }, { id: 'dc', name: 'Développé couché' }];
  it('accepte une variante', () => expect(exerciseNameError(ex, 'dc', 'Développé couché prise serrée')).toBeNull());
  it('accepte de garder son propre nom', () => expect(exerciseNameError(ex, 'dc', 'developpe couche')).toBeNull());
  it('refuse un nom vide', () => expect(exerciseNameError(ex, 'dc', '   ')).toMatch(/nom/));
  it('refuse le nom d’un autre exercice (accents et majuscules ignorés)', () => expect(exerciseNameError(ex, 'dc', ' SQUAT ')).toBe('« Squat » existe déjà.'));
});

describe('Mise à jour v4 → v5 : rien ne se perd', () => {
  const v4 = () => {
    const s = initialState();
    const pid = s.profileId;
    s.v = 4;
    s.exercises = s.exercises.map((e) =>
      e.id === 'leg-extension' ? { ...e, range: [10, 15] } : e.id === 'curl-barre' ? { ...e, range: [12, 20] } : e,
    );
    s.exercises.push({ id: 'perso', name: 'Machine du fond', group: 'Perso', inc: 2.5, rest: 90, range: [10, 15], sec: [] });
    s.sessions = [{ id: 's1', profileId: pid, templateId: null, name: 'Jambes', startedAt: 1, endedAt: 2, items: [{ exerciseId: 'leg-extension', sets: [{ w: 80, r: 8, rir: 1 }, { w: 80, r: 9, rir: 0 }] }] }];
    s.notes = { [pid]: { 'leg-extension': 'Dossier cran 4' } };
    s.drafts = { [pid]: { id: 'd1', profileId: pid, templateId: null, name: 'En cours', startedAt: 3, form: 'ok', items: [{ exerciseId: 'squat', sets: [{ w: 100, r: 5, rir: 2 }] }] } };
    s.deload = { [pid]: 123 };
    s.profiles = s.profiles.map((p) => ({ ...p, name: 'Victor', bw: 80, sex: 'h' }));
    s.lastExport = 99;
    s.onboarded = true;
    return s;
  };

  it('historique, notes, séance en cours, séances types, planning, profil : identiques', () => {
    const before = v4();
    const after = migrate(structuredClone(before));
    for (const key of ['sessions', 'notes', 'drafts', 'templates', 'plans', 'profiles', 'deload', 'lastExport', 'profileId', 'onboarded']) expect(after[key]).toEqual(before[key]);
    expect(after.exercises.map((e) => e.id)).toEqual(before.exercises.map((e) => e.id));
    expect(after.exercises.map((e) => e.name)).toEqual(before.exercises.map((e) => e.name));
  });
  it('seules les isolations encore sur l’ancien défaut passent en 8–12', () => {
    const ex = Object.fromEntries(migrate(v4()).exercises.map((e) => [e.id, e.range]));
    expect(ex['leg-extension']).toEqual([8, 12]);
    expect(ex['curl-barre']).toEqual([12, 20]); // réglé à la main : gardé
    expect(ex.perso).toEqual([10, 15]); // exercice perso : gardé
    expect(ex.squat).toEqual([5, 8]);
  });
  it('ne s’applique qu’une fois : un 10–15 choisi après la mise à jour reste', () => {
    const once = migrate(v4());
    once.exercises = once.exercises.map((e) => (e.id === 'leg-extension' ? { ...e, range: [10, 15] } : e));
    expect(migrate(once).exercises.find((e) => e.id === 'leg-extension').range).toEqual([10, 15]);
    expect(migrate(once).v).toBe(5);
  });
  it('une sauvegarde v4 se restaure dans la nouvelle version', async () => {
    const { parseBackup } = await import('../src/lib/backup');
    const before = v4();
    const res = parseBackup(JSON.stringify({ app: 'gymlog', ...before }));
    expect(res.ok).toBe(true);
    expect(res.data.notes).toEqual(before.notes);
    expect(res.data.sessions).toEqual(before.sessions);
    expect(res.data.drafts).toEqual(before.drafts);
  });
});

describe('Effort visé, volume en séries dures, variantes', async () => {
  const { effortOf, BIOMECH, libraryExercises } = await import('../src/lib/defaults');
  const { hardSets, crowdedSessions } = await import('../src/lib/stats');
  it('gros polyarticulaires « lourds », machines et isolation « légers » — même si le repos a été changé', () => {
    expect(effortOf({ id: 'developpe-couche', rest: 60 })).toBe('heavy');
    expect(effortOf({ id: 'squat' })).toBe('heavy');
    expect(effortOf({ id: 'leg-extension', rest: 180 })).toBe('light');
    expect(effortOf({ id: 'developpe-couche-machine' })).toBe('light');
    expect(effortOf({ id: 'perso', rest: 150 })).toBe('heavy'); // exercice perso : d'après son repos
  });
  it('séries dures : RIR ≤ 3 comptent 1, drop set ½, RIR 4+ et échauffements 0', () => {
    expect(hardSets([{ w: 80, r: 8, rir: 1 }, { w: 80, r: 8, rir: 3 }, { w: 60, r: 10, rir: 4 }, { w: 40, r: 10, rir: null, wu: true }, { w: 60, r: 8, rir: 0, t: 'drop' }])).toBe(2.5);
  });
  it('signale un muscle au-delà de 10 séries dures dans une séance', () => {
    const byId = { a: { group: 'Pectoraux' }, b: { group: 'Pectoraux' } };
    const sets = (n) => Array.from({ length: n }, () => ({ w: 50, r: 10, rir: 1 }));
    const s = [{ name: 'Push', startedAt: 1000, items: [{ exerciseId: 'a', sets: sets(6) }, { exerciseId: 'b', sets: sets(5) }] }, { name: 'Push 2', startedAt: 2000, items: [{ exerciseId: 'a', sets: sets(10) }] }];
    expect(crowdedSessions(s, byId, 0)).toEqual([{ group: 'Pectoraux', sets: 11, at: 1000, name: 'Push' }]);
  });
  it('chaque variante suggérée existe dans la bibliothèque, et diffère de l’exercice', () => {
    const ids = new Set(libraryExercises().map((e) => e.id));
    for (const [id, v] of Object.entries(BIOMECH)) {
      expect(ids.has(id), id).toBe(true);
      if (v.alt) {
        expect(ids.has(v.alt), v.alt).toBe(true);
        expect(v.alt).not.toBe(id);
      } else expect(v.tip).toBeTruthy();
    }
  });
});
