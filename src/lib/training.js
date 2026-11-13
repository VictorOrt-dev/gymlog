// Toute la « science » de l'app tient dans ce fichier. Volontairement simple et lisible.

export const round = (x) => Math.round(x * 100) / 100;
export const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * 1RM estimé (Epley) calculé sur les reps JUSQU'À L'ÉCHEC = reps faites + RIR.
 * 80 × 8 à RIR 3 (11 reps possibles) pèse plus lourd que 80 × 8 à l'échec. Au poids du corps : la même logique en reps.
 */
export const repsToFailure = ({ r, rir }) => r + Math.min(4, Math.max(0, rir ?? 0));
export const e1rm = (s) => (s.w > 0 ? s.w * (1 + Math.min(30, repsToFailure(s)) / 30) : repsToFailure(s));

/**
 * Types de série. Échauffement (wu) : hors de tout calcul. Drop set (t: 'drop') : compte dans le volume,
 * mais pas dans « À battre », l'objectif, les records ni les courbes (on le fait fatigué, plus léger).
 */
export const isWarmup = (s) => !!s.wu;
export const isDrop = (s) => s.t === 'drop';
/** Séries de travail (volume, compteurs) : tout sauf l'échauffement. */
export const work = (sets) => sets.filter((s) => !s.wu);
/** Séries principales (comparaisons, records, objectifs) : ni échauffement, ni drop set. */
export const main = (sets) => sets.filter((s) => !s.wu && s.t !== 'drop');
export const roundTo = (x, inc) => Math.round(x / inc) * inc;
export const rirText = (r) => (r === 0 ? 'Échec' : `RIR ${r >= 4 ? '4+' : r}`);

/** Dernière perf de chaque exercice pour un profil → { [exerciseId]: { at, sets } } */
export function lastPerformances(sessions, profileId) {
  const out = {};
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.profileId !== profileId) continue;
    for (const it of s.items) {
      const sets = main(it.sets);
      if (!out[it.exerciseId] && sets.length) out[it.exerciseId] = { at: s.startedAt, sets }; // séries principales uniquement
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
 *  - toutes les séries principales ont atteint le haut de la fourchette → on charge et on repart du bas ;
 *  - sinon → même charge, +1 rep (sans dépasser le haut) ;
 *  - sous le bas de la fourchette → même charge, on vise le bas.
 * Autorégulation : `form` = 'low' (jour sans : −5 %, entretien) | 'high' (en forme : on charge un cran plus tôt).
 * Décharge : −10 % à reps égales.
 */
export function target(prevSets, { inc = 2.5, range = [8, 12], form = 'ok', deload = false } = {}) {
  const sets = main(prevSets ?? []);
  if (!sets.length) return null;
  const [lo, hi] = range;
  const top = sets[0];
  if (deload) return { w: top.w > 0 ? roundTo(top.w * 0.9, inc) : 0, r: top.r, why: 'Semaine de décharge : −10 %, une série de moins', mode: 'deload' };
  if (form === 'low') return { w: top.w > 0 ? roundTo(top.w * 0.95, inc) : 0, r: top.r, why: 'Jour sans : −5 %, on entretient sans se cramer', mode: 'low' };
  const charge = () => ({ w: round(top.w + inc), r: lo });
  if (sets.every((s) => s.r >= hi)) {
    if (top.w > 0) return { ...charge(), why: `Haut de fourchette (${hi}) atteint : on charge, on repart à ${lo}` };
    return { w: 0, r: hi, why: `${hi} reps partout : ajoute du lest ou passe à une variante plus dure` };
  }
  if (form === 'high' && top.w > 0 && sets.every((s) => s.r >= hi - 1)) return { ...charge(), why: `En forme : on charge un cran plus tôt, repars à ${lo}`, mode: 'high' };
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
    const sets = it ? main(it.sets) : [];
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

// ── Records ────────────────────────────────────────────────────────────────

/**
 * Bilan des records d'un exercice à partir d'une liste de séries de travail (historique + séries déjà faites).
 * best   : meilleur 1RM estimé (reps + RIR)
 * byReps : pour chaque nombre de reps, la charge la plus lourde soulevée pour AU MOINS ce nombre de reps
 */
export function recordBook(sets) {
  let best = 0;
  const byReps = {};
  for (const s of main(sets)) {
    best = Math.max(best, e1rm(s));
    for (let r = 1; r <= s.r; r++) byReps[r] = Math.max(byReps[r] ?? 0, s.w);
  }
  return { best, byReps, empty: main(sets).length === 0 };
}

/**
 * Une série est-elle un record ? Pas de record sans historique (la 1re fois, tout serait record).
 * Renvoie null, ou { e1rm: bool, reps: bool } (record de force, record à ce nombre de reps).
 */
export function recordOf(set, book) {
  if (!set || set.wu || set.t === 'drop' || book.empty) return null;
  const strength = e1rm(set) > book.best + 0.05;
  const reps = set.w > 0 && set.w > (book.byReps[set.r] ?? 0) + 0.001;
  return strength || reps ? { e1rm: strength, reps } : null;
}

/** Toutes les séries de travail passées d'un exercice (pour construire le carnet de records). */
export const historySets = (sessions, exerciseId) => sessions.flatMap((s) => s.items.filter((i) => i.exerciseId === exerciseId).flatMap((i) => main(i.sets).map((x) => ({ ...x, at: x.at ?? s.startedAt }))));

/** Records d'une liste de séries du jour, dans l'ordre : chaque série se mesure à l'historique + aux séries d'avant. */
export function liveRecords(todaySets, history) {
  const out = [];
  const seen = [...history];
  for (const s of todaySets) {
    out.push(recordOf(s, recordBook(seen)));
    if (!s.wu && s.t !== 'drop') seen.push(s);
  }
  return out;
}

// ── Objectifs série par série (autorégulation en direct) ─────────────────────

/**
 * Objectif de chaque série principale du jour, recalculé après chaque série faite.
 * Série 1 : l'objectif de séance (double progression). Ensuite, on suit ce qui se passe vraiment :
 *  - vraie chute (3 reps ou plus sous l'objectif) → −5 % de charge (au moins un cran), ~2 reps de plus visées ;
 *  - échec → même charge, une rep de moins que celles qu'on vient de faire (jamais plus après un échec) ;
 *  - trop facile (RIR ≥ 3, objectif atteint) → +1 rep, ou +1 cran en haut de fourchette ;
 *  - sinon → même charge, mêmes reps que la série faite.
 * Perdre 1 à 2 reps d'une série à l'autre à l'échec, c'est de la fatigue normale : la charge ne baisse pas.
 * La fourchette ne s'impose pas pendant la séance : elle décide seulement quand charger la séance suivante.
 * Renvoie un tableau de longueur sets.length + 1 : la dernière case est l'objectif de la PROCHAINE série.
 */
export function setTargets(goal, todayMain, { inc = 2.5, range = [8, 12] } = {}) {
  const hi = range[1];
  const out = [];
  let t = goal ? { w: goal.w, r: goal.r, why: null } : null;
  for (let k = 0; k <= todayMain.length; k++) {
    if (k > 0) {
      const last = todayMain[k - 1];
      const aim = t ?? { w: last.w, r: last.r };
      if (last.r <= aim.r - 3 && last.w > 0) {
        const w = Math.max(0, Math.min(roundTo(last.w * 0.95, inc), last.w - inc));
        t = { w, r: Math.min(aim.r, last.r + 2), why: `Série ${k} : ${aim.r - last.r} reps sous l’objectif, ${fmtW(last.w - w)} kg de moins` };
      } else if (last.rir === 0) {
        t = { w: last.w, r: Math.max(1, last.r - 1), why: `Échec à la série ${k} : une rep de moins, même charge` };
      } else if ((last.rir ?? 0) >= 3 && last.r >= aim.r) {
        t = last.r >= hi && last.w > 0 ? { w: round(last.w + inc), r: last.r, why: `Série ${k} trop facile : on charge` } : { w: last.w, r: last.r + 1, why: `Série ${k} trop facile : +1 rep` };
      } else {
        t = { w: last.w, r: last.r, why: null };
      }
    }
    out.push(t);
  }
  return out;
}
