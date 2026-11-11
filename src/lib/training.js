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

/** Séries de travail : RIR ≤ 3. Une série à 5 reps de l'échec, c'est de l'échauffement. */
export const workSets = (sets) => sets.filter((s) => s.rir == null || s.rir <= 3);

/** La meilleure série d'une liste, au sens du 1RM estimé. */
export const bestOf = (sets) => sets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a));

export const METRICS = {
  best: { label: 'Force', short: '1RM estimé', help: 'Ta meilleure série convertie en 1RM estimé : le poids que tu pourrais soulever une seule fois. Le vrai thermomètre de ta force.' },
  effective: { label: 'Tonnage effectif', short: 'Tonnage effectif', help: 'Poids × reps des seules séries de travail (RIR ≤ 3). Les séries trop faciles ne gonflent pas le chiffre.' },
};

/**
 * Une valeur par séance pour un exercice.
 * best      → 1RM estimé de la meilleure série (reps max au poids du corps)
 * effective → tonnage des séries RIR ≤ 3 (reps des séries de travail au poids du corps)
 */
export function seriesFor(sessions, exerciseId, metric = 'best') {
  const pts = [];
  for (const s of sessions) {
    const it = s.items.find((i) => i.exerciseId === exerciseId);
    if (it?.sets.length) pts.push({ at: s.startedAt, sets: it.sets, session: s });
  }
  const bw = isBodyweight(pts.flatMap((p) => p.sets));
  const value = (sets) => {
    if (metric === 'effective') return bw ? totalReps(workSets(sets)) : Math.round(tonnage(workSets(sets)));
    return bw ? Math.max(...sets.map((x) => x.r)) : Math.round(e1rm(bestOf(sets)) * 2) / 2;
  };
  return {
    bw,
    unit: bw ? 'reps' : 'kg',
    label: bw ? (metric === 'effective' ? 'Reps de travail' : 'Reps max') : METRICS[metric].label,
    points: pts.map((p) => ({ ...p, x: p.at, value: value(p.sets), y: value(p.sets), best: bestOf(p.sets) })),
  };
}

export const previousOf = (series, point) => series.points[series.points.indexOf(point) - 1] ?? null;

/** Variation en % par rapport à la séance précédente (null s'il n'y en a pas). */
export const pctChange = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
