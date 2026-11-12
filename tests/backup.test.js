import { describe, expect, it } from 'vitest';
import { parseBackup, serializeBackup } from '../src/lib/backup';
import { VERSION, initialState } from '../src/lib/defaults';

const withSession = () => {
  const s = initialState();
  s.sessions = [{ id: 's1', profileId: s.profileId, startedAt: 2, endedAt: 3, items: [{ exerciseId: 'squat', sets: [{ w: 100, r: 5, rir: 1 }, { w: 60, r: 5, rir: null, wu: true }] }] }];
  return s;
};

describe('Sauvegardes', () => {
  it('un export se réimporte à l’identique', () => {
    const s = withSession();
    const res = parseBackup(serializeBackup(s));
    expect(res.ok).toBe(true);
    expect(res.data).toEqual(s);
  });
  it('garde le poids de corps et le sexe, refuse des valeurs absurdes', () => {
    const s = withSession();
    s.profiles[0] = { ...s.profiles[0], bw: 80, sex: 'f' };
    expect(parseBackup(serializeBackup(s)).data.profiles[0]).toMatchObject({ bw: 80, sex: 'f' });
    expect(parseBackup(JSON.stringify({ ...s, profiles: [{ ...s.profiles[0], bw: 5000 }] })).error).toMatch(/poids de corps/);
    expect(parseBackup(JSON.stringify({ ...s, profiles: [{ ...s.profiles[0], sex: 'x' }] })).error).toMatch(/sexe/);
  });
  it('l’export est signé', () => {
    expect(JSON.parse(serializeBackup(initialState()))).toMatchObject({ app: 'gymlog' });
  });
  it('refuse un fichier qui n’est pas du JSON', () => {
    expect(parseBackup('pas du json')).toMatchObject({ ok: false, error: expect.stringMatching(/JSON/) });
  });
  it('refuse un fichier vide ou trop gros', () => {
    expect(parseBackup('').ok).toBe(false);
    expect(parseBackup('x'.repeat(11 * 1024 * 1024)).ok).toBe(false);
  });
  it('refuse une autre application', () => {
    expect(parseBackup(JSON.stringify({ ...initialState(), app: 'autre' })).ok).toBe(false);
  });
  it('refuse une version plus récente que l’app', () => {
    expect(parseBackup(JSON.stringify({ ...initialState(), v: VERSION + 1 })).error).toMatch(/plus récente/);
  });
  it('localise précisément une série corrompue', () => {
    const s = withSession();
    s.sessions[0].items[0].sets[0].r = 'huit';
    const res = parseBackup(JSON.stringify(s));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Séance n° 1, exercice 1, série 1/);
  });
  it('refuse des charges absurdes et des RIR hors bornes', () => {
    const a = withSession();
    a.sessions[0].items[0].sets[0].w = -5;
    expect(parseBackup(JSON.stringify(a)).ok).toBe(false);
    const b = withSession();
    b.sessions[0].items[0].sets[0].rir = 42;
    expect(parseBackup(JSON.stringify(b)).ok).toBe(false);
  });
  it('refuse une séance rattachée à un profil inexistant', () => {
    const s = withSession();
    s.sessions[0].profileId = 'fantome';
    expect(parseBackup(JSON.stringify(s)).error).toMatch(/profil inconnu/);
  });
  it('refuse des profils en double et un profil actif manquant', () => {
    const s = initialState();
    expect(parseBackup(JSON.stringify({ ...s, profiles: [...s.profiles, s.profiles[0]] })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...s, profileId: 'x' })).ok).toBe(false);
  });
  it('accepte et migre une vieille sauvegarde v1', () => {
    const old = { profileId: 'p', profiles: [{ id: 'p', name: 'A' }], exercises: [{ id: 'squat', name: 'Squat', inc: 2.5, rest: 180 }], templates: [], sessions: [] };
    const res = parseBackup(JSON.stringify(old));
    expect(res.ok).toBe(true);
    expect(res.data.v).toBe(VERSION);
  });
  it('remet l’historique dans l’ordre chronologique', () => {
    const s = withSession();
    s.sessions.unshift({ ...s.sessions[0], id: 's0', startedAt: 9 });
    const res = parseBackup(JSON.stringify(s));
    expect(res.data.sessions.map((x) => x.id)).toEqual(['s1', 's0']);
  });
});
