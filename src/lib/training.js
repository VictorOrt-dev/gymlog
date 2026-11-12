// Toute la « science » de l'app tient dans ce fichier. Volontairement simple et lisible.

export const round = (x) => Math.round(x * 100) / 100;
export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * 1RM estimé (Epley) calculé sur les reps JUSQU'À L'ÉCHEC = reps faites + RIR.
 * 80 × 8 à RIR 3 (11 reps possibles) pèse plus lourd que 80 × 8 à l'échec. Au poids du corps : la même logique en reps.
 */
export const repsToFailure = ({ r, rir }) => r + Math.min(4, Math.max(0, rir ?? 0));
export const e1rm = (s) => (s.w > 0 ? s.w * (1 + Math.min(30, repsToFailure(s)) / 30) : repsToFailure(s));

/** Séries d'échauffement : visibles, mais exclues de « À battre », des records et des courbes. */
export const isWarmup = (s) => !!s.wu;
export const work = (sets) => sets.filter((s) => !s.wu);

/** Dernière perf de chaque exercice pour un profil → { [exerciseId]: { at, sets } } */
export function lastPerformances(sessions, profileId) {
  const out = {};
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.profileId !== profileId) continue;
    for (const it of s.items) {
      const sets = work(it.sets);
      if (!out[it.exerciseId] && sets.length) out[it.exerciseId] = { at: s.startedAt, sets }; // séries de travail uniquement
    }
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
 * Objectif du jour — double progression par fourchette (ex. 8–12) :
 *  - toutes les séries de travail ont atteint le haut de la fourchette → on charge et on repart du bas ;
 *  - sinon → même charge, +1 rep (sans dépasser le haut) ;
 *  - sous le bas de la fourchette → même charge, on vise le bas.
 */
export function target(prevSets, { inc = 2.5, range = [8, 12] } = {}) {
  const sets = work(prevSets ?? []);
  if (!sets.length) return null;
  const [lo, hi] = range;
  const top = sets[0];
  if (sets.every((s) => s.r >= hi)) {
    if (top.w > 0) return { w: round(top.w + inc), r: lo, why: `Haut de fourchette (${hi}) atteint : on charge, on repart à ${lo}` };
    return { w: 0, r: hi, why: `${hi} reps partout : ajoute du lest ou passe à une variante plus dure` };
  }
  if (top.r < lo) return { w: top.w, r: lo, why: `Vise le bas de ta fourchette (${lo}–${hi}) à cette charge` };
  const r = Math.min(hi, top.r + 1);
  return { w: top.w, r, why: r === hi ? `Dernière marche : ${hi} reps, puis on charge` : `+1 rep, objectif ${hi} reps avant de charger` };
}

/**
 * Stagnation : la meilleure série (1RM estimé) des 3 dernières séances ne dépasse pas celle d'avant.
 * `values` = une valeur par séance, de la plus ancienne à la plus récente.
 */
export function isStalling(values) {
  if (values.length < 4) return false;
  const ref = values.at(-4);
  return Math.max(...values.slice(-3)) <= ref * 1.005;
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
export const workSets = (sets) => sets.filter((s) => !s.wu && (s.rir == null || s.rir <= 3));

/** La meilleure série d'une liste, au sens du 1RM estimé. */
export const bestOf = (sets) => sets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a));

export const METRICS = {
  best: { label: 'Force', short: '1RM estimé', help: 'Ta meilleure série convertie en 1RM estimé (reps + RIR, échauffements exclus) : le poids que tu pourrais soulever une seule fois. Le vrai thermomètre de ta force.' },
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
    const sets = it ? work(it.sets) : [];
    if (sets.length) pts.push({ at: s.startedAt, sets, session: s });
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
