// Toute la « science » de l'app tient dans ce fichier. Volontairement simple et lisible.

export const round = (x) => Math.round(x * 100) / 100;
export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** 1RM estimé (Epley) : met 82,5×6 et 80×8 sur la même échelle. Au poids du corps : les reps. */
export const e1rm = ({ w, r }) => (w > 0 ? w * (1 + r / 30) : r);

/** Dernière perf de chaque exercice pour un profil → { [exerciseId]: { at, sets } } */
export function lastPerformances(sessions, profileId) {
  const out = {};
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.profileId !== profileId) continue;
    for (const it of s.items) if (!out[it.exerciseId] && it.sets.length) out[it.exerciseId] = { at: s.startedAt, sets: it.sets };
  }
  return out;
}

/** Compare une série à la même série de la dernière fois : 'up' | 'eq' | 'down' | null */
export function trend(set, ref) {
  if (!set || !ref) return null;
  const d = e1rm(set) - e1rm(ref);
  return d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'eq';
}

/**
 * Objectif du jour — double progression pilotée par le RIR :
 *  - de la marge sur TOUTES les séries (RIR ≥ 2) → on charge
 *  - 1 rep de marge au pire                      → même charge, +1 rep
 *  - échec (RIR 0)                               → on égale, proprement
 */
export function target(prev, inc = 2.5) {
  if (!prev?.sets?.length) return null;
  const top = prev.sets[0];
  const rirs = prev.sets.map((s) => s.rir).filter((x) => x != null);
  const minRir = rirs.length ? Math.min(...rirs) : 1;
  if (minRir >= 2 && top.w > 0) return { w: round(top.w + inc), r: top.r, why: 'De la marge partout : on charge' };
  if (minRir >= 1) return { w: top.w, r: top.r + 1, why: '+1 rep à charge égale' };
  return { w: top.w, r: top.r, why: "Échec la dernière fois : on égale" };
}

export const fmtInt = (n) => Math.round(n).toLocaleString('fr-FR');

/** Tonnage = Σ poids × reps sur toutes les séries. Au poids du corps (0 kg), on compte les reps. */
export const isBodyweight = (sets) => sets.length > 0 && sets.every((s) => s.w === 0);
export const tonnage = (sets) => sets.reduce((a, s) => a + s.w * s.r, 0);
export const totalReps = (sets) => sets.reduce((a, s) => a + s.r, 0);

export const fmtW = (w) => (w > 0 ? String(round(w)).replace('.', ',') : 'PDC');
export const fmtKg = (w) => (w > 0 ? `${fmtW(w)} kg` : 'PDC');
export const fmtSet = (s) => `${fmtW(s.w)} × ${s.r}`;

/** « 80 kg × 8 · 8 · 6 » si charge constante, sinon « 80 × 8  82,5 × 6 » */
export function summarize(sets) {
  if (!sets?.length) return '';
  return sets.every((s) => s.w === sets[0].w)
    ? `${fmtKg(sets[0].w)} × ${sets.map((s) => s.r).join(' · ')}`
    : sets.map(fmtSet).join('  ');
}

export const mmss = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

const dayStart = (ts) => new Date(ts).setHours(0, 0, 0, 0);

export function ago(ts) {
  const d = Math.round((dayStart(Date.now()) - dayStart(ts)) / 864e5);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 14) return `il y a ${d} j`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Série « une valeur par séance » pour les graphiques de tonnage.
 * Sans exercice : tonnage total de chaque séance. Avec : tonnage de l'exercice (ou reps au poids du corps).
 */
export function seriesFor(sessions, exerciseId = null) {
  if (!exerciseId) {
    return {
      unit: 'kg',
      bw: false,
      global: true,
      points: sessions.map((s) => ({ at: s.startedAt, value: s.items.reduce((a, it) => a + tonnage(it.sets), 0), session: s })),
    };
  }
  const pts = [];
  for (const s of sessions) {
    const it = s.items.find((i) => i.exerciseId === exerciseId);
    if (it?.sets.length) pts.push({ at: s.startedAt, sets: it.sets, session: s });
  }
  const bw = isBodyweight(pts.flatMap((p) => p.sets));
  return { unit: bw ? 'reps' : 'kg', bw, points: pts.map((p) => ({ ...p, value: bw ? totalReps(p.sets) : tonnage(p.sets) })) };
}

/**
 * Le point de comparaison d'une séance : la précédente pour un exercice,
 * la dernière séance DU MÊME TYPE pour le tonnage global (un Push se compare à un Push, pas à un Legs).
 */
export function previousOf(series, point) {
  const pts = series.points;
  for (let j = pts.indexOf(point) - 1; j >= 0; j--) {
    if (!series.global) return pts[j];
    const a = pts[j].session;
    const b = point.session;
    if (b.templateId ? a.templateId === b.templateId : a.name === b.name) return pts[j];
  }
  return null;
}

/** Variation en % par rapport à la séance précédente (null s'il n'y en a pas). */
export const pctChange = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
