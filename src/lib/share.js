/**
 * Envoyer une séance type à un pote par simple lien, sans serveur :
 * la séance (nom + exercices + réglages) est encodée dans l'ancre de l'URL (#seance=…).
 */

const KEY = 'seance';
const MAX = 40; // exercices par séance

const toB64Url = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (b64) => {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/** Charge utile compacte : nom, exercices (avec de quoi recréer un exercice perso), supersets. */
export function encodeTemplate(template, exercisesById) {
  const payload = {
    v: 1,
    n: template.name,
    e: template.exerciseIds
      .map((id) => exercisesById[id])
      .filter(Boolean)
      .map((e) => ({ i: e.id, n: e.name, g: e.group, s: e.sec ?? [], inc: e.inc, rest: e.rest, r: e.range })),
    ss: template.supersets ?? [],
  };
  return toB64Url(JSON.stringify(payload));
}

export const templateLink = (base, code) => `${base.split('#')[0]}#${KEY}=${code}`;

const str = (x, max = 80) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
const num = (x, a, b) => typeof x === 'number' && Number.isFinite(x) && x >= a && x <= b;

/** Décode et VALIDE une séance reçue. → { ok, data } ou { ok: false, error }. Rien n'est jamais injecté sans validation. */
export function decodeTemplate(code) {
  try {
    if (!str(code, 20000)) throw new Error('Lien vide ou trop long.');
    const p = JSON.parse(fromB64Url(code));
    if (!p || p.v !== 1 || !str(p.n) || !Array.isArray(p.e) || p.e.length === 0 || p.e.length > MAX) throw new Error('Séance illisible.');
    const exercises = p.e.map((e) => {
      if (!str(e.i) || !str(e.n) || (e.g != null && !str(e.g, 40))) throw new Error('Exercice illisible.');
      if (e.inc != null && !num(e.inc, 0.25, 50)) throw new Error('Pas de charge invalide.');
      if (e.rest != null && !num(e.rest, 0, 900)) throw new Error('Repos invalide.');
      if (e.r != null && !(Array.isArray(e.r) && e.r.length === 2 && e.r.every((x) => Number.isInteger(x) && x > 0) && e.r[0] < e.r[1])) throw new Error('Fourchette invalide.');
      const sec = Array.isArray(e.s) ? e.s.filter((g) => str(g, 40)).slice(0, 4) : [];
      return { id: e.i, name: e.n.trim(), group: e.g ?? null, sec, inc: e.inc ?? 2.5, rest: e.rest ?? 120, range: e.r ?? [8, 12] };
    });
    const ids = new Set(exercises.map((e) => e.id));
    const supersets = (Array.isArray(p.ss) ? p.ss : []).filter((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((id) => ids.has(id)));
    return { ok: true, data: { name: p.n.trim(), exercises, supersets } };
  } catch (e) {
    return { ok: false, error: e.message && e.message.length < 80 ? e.message : 'Lien de séance invalide.' };
  }
}

/** Lit l'ancre de l'URL : le code de séance reçu, ou null. */
export const readSharedCode = (hash) => {
  const m = /[#&]seance=([A-Za-z0-9_-]+)/.exec(hash || '');
  return m ? m[1] : null;
};
