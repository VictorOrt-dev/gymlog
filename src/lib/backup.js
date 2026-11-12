import { migrate, VERSION } from './defaults';

/**
 * Sauvegardes : on ne fait JAMAIS confiance à un fichier importé.
 * Tout est vérifié avant d'injecter quoi que ce soit ; à la moindre anomalie, rien n'est remplacé
 * et un message précis dit ce qui ne va pas.
 */

export const MAX_BYTES = 10 * 1024 * 1024;
const APP = 'gymlog';

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string' && x.length > 0 && x.length <= 200;
const isNum = (x, min = -Infinity, max = Infinity) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;

class Invalid extends Error {}
const check = (ok, msg) => {
  if (!ok) throw new Invalid(msg);
};

function checkSet(s, where) {
  check(isObj(s), `${where} : série illisible`);
  check(isNum(s.w, 0, 1000), `${where} : charge invalide (${s.w})`);
  check(Number.isInteger(s.r) && s.r >= 0 && s.r <= 1000, `${where} : reps invalides (${s.r})`);
  check(s.rir == null || (Number.isInteger(s.rir) && s.rir >= 0 && s.rir <= 10), `${where} : RIR invalide (${s.rir})`);
  check(s.wu == null || typeof s.wu === 'boolean', `${where} : marqueur d'échauffement invalide`);
  check(s.t == null || s.t === 'drop', `${where} : type de série inconnu`);
}

function checkSession(s, i, profileIds) {
  const where = `Séance n° ${i + 1}`;
  check(isObj(s), `${where} : illisible`);
  check(isStr(s.id), `${where} : identifiant manquant`);
  check(profileIds.has(s.profileId), `${where} : profil inconnu`);
  check(isNum(s.startedAt, 0), `${where} : date invalide`);
  check(s.endedAt == null || isNum(s.endedAt, 0), `${where} : date de fin invalide`);
  check(Array.isArray(s.items), `${where} : liste d'exercices manquante`);
  s.items.forEach((it, j) => {
    check(isObj(it) && isStr(it.exerciseId) && Array.isArray(it.sets), `${where}, exercice ${j + 1} : illisible`);
    it.sets.forEach((x, k) => checkSet(x, `${where}, exercice ${j + 1}, série ${k + 1}`));
  });
}

/** Vérifie la structure complète. Lève une erreur au message lisible si quelque chose cloche. */
export function validate(data) {
  check(isObj(data), 'Ce fichier ne contient pas une sauvegarde GymLog.');
  check(data.app == null || data.app === APP, 'Ce fichier vient d’une autre application.');
  check(data.v == null || (Number.isInteger(data.v) && data.v >= 1), 'Version de sauvegarde inconnue.');
  check((data.v ?? 1) <= VERSION, 'Sauvegarde créée par une version plus récente de GymLog : mets l’app à jour d’abord.');

  check(Array.isArray(data.profiles) && data.profiles.length > 0, 'Aucun profil dans la sauvegarde.');
  data.profiles.forEach((p, i) => check(isObj(p) && isStr(p.id) && typeof p.name === 'string', `Profil n° ${i + 1} invalide`));
  const profileIds = new Set(data.profiles.map((p) => p.id));
  check(profileIds.size === data.profiles.length, 'Deux profils ont le même identifiant.');
  check(profileIds.has(data.profileId), 'Profil actif introuvable.');

  check(Array.isArray(data.exercises), 'Liste d’exercices manquante.');
  data.exercises.forEach((e, i) => {
    check(isObj(e) && isStr(e.id) && isStr(e.name), `Exercice n° ${i + 1} invalide`);
    check(e.inc == null || isNum(e.inc, 0.25, 50), `Exercice « ${e.name} » : pas de charge invalide`);
    check(e.range == null || (Array.isArray(e.range) && e.range.length === 2 && e.range.every((x) => Number.isInteger(x) && x > 0) && e.range[0] < e.range[1]), `Exercice « ${e.name} » : fourchette invalide`);
  });

  check(Array.isArray(data.templates), 'Liste de séances types manquante.');
  data.templates.forEach((t, i) => {
    check(isObj(t) && isStr(t.id) && profileIds.has(t.profileId) && Array.isArray(t.exerciseIds), `Séance type n° ${i + 1} invalide`);
    check(t.supersets == null || (Array.isArray(t.supersets) && t.supersets.every((p) => Array.isArray(p) && p.length === 2 && p.every(isStr))), `Séance type n° ${i + 1} : supersets invalides`);
  });

  check(data.plans == null || isObj(data.plans), 'Planning invalide.');
  check(data.drafts == null || isObj(data.drafts), 'Séances en cours invalides.');
  check(data.notes == null || isObj(data.notes), 'Notes invalides.');
  check(data.deload == null || isObj(data.deload), 'Décharge invalide.');
  check(Array.isArray(data.sessions), 'Historique des séances manquant.');
  data.sessions.forEach((s, i) => checkSession(s, i, profileIds));
  Object.values(data.drafts ?? {}).forEach((d, i) => checkSession(d, i, profileIds));
  return true;
}

/**
 * Lit un fichier de sauvegarde (texte JSON).
 * → { ok: true, data } prêt à injecter (migré au format courant), ou { ok: false, error } sans rien toucher.
 */
export function parseBackup(text) {
  try {
    check(typeof text === 'string' && text.length > 0, 'Fichier vide.');
    check(text.length <= MAX_BYTES, 'Fichier trop volumineux pour être une sauvegarde GymLog.');
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Invalid('Fichier illisible : ce n’est pas du JSON valide.');
    }
    validate(data);
    const { app, exportedAt, ...rest } = data; // eslint-disable-line no-unused-vars
    const migrated = migrate({ plans: {}, drafts: {}, notes: {}, deload: {}, lastExport: null, ...rest });
    migrated.sessions = [...migrated.sessions].sort((a, b) => a.startedAt - b.startedAt);
    return { ok: true, data: migrated };
  } catch (e) {
    return { ok: false, error: e instanceof Invalid ? e.message : 'Sauvegarde inutilisable.' };
  }
}

/** Contenu du fichier exporté : l'état complet + une signature pour le reconnaître à l'import. */
export const serializeBackup = (state) => JSON.stringify({ app: APP, exportedAt: new Date().toISOString(), ...state });
