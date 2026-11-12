import { CUSTOM_GROUP, GROUPS } from './defaults';
import { e1rm, bestOf, main, work } from './training';

/**
 * Statistiques de suivi (logique pure, testée).
 */

export const WEEK_MS = 7 * 864e5;
export const mondayOf = (ts) => {
  const d = new Date(new Date(ts).setHours(0, 0, 0, 0));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};
const addDays = (ts, n) => {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

/** Repères d'hypertrophie : séries de travail par muscle et par semaine. */
export const VOLUME_ZONE = [10, 20];

/**
 * Volume de la semaine par groupe musculaire : 1 série par série de travail sur le muscle principal,
 * ½ série sur chaque muscle secondaire (le développé couché travaille aussi triceps et épaules).
 * Les échauffements ne comptent pas ; les drop sets comptent.
 */
export function weeklyVolume(sessions, exercisesById, weekStart) {
  const end = addDays(weekStart, 7);
  const out = {};
  let unassigned = 0;
  for (const s of sessions) {
    if (s.startedAt < weekStart || s.startedAt >= end) continue;
    for (const it of s.items) {
      const n = work(it.sets).length;
      if (!n) continue;
      const ex = exercisesById[it.exerciseId];
      if (!ex || !ex.group || ex.group === CUSTOM_GROUP) {
        unassigned += n;
        continue;
      }
      out[ex.group] = (out[ex.group] ?? 0) + n;
      for (const g of ex.sec ?? []) out[g] = (out[g] ?? 0) + n / 2;
    }
  }
  return { byGroup: out, unassigned };
}

/** Le statut d'un volume face aux repères 10–20 séries. */
export const volumeStatus = (v) => (v < VOLUME_ZONE[0] ? 'low' : v > VOLUME_ZONE[1] ? 'high' : 'ok');

/** Ordre d'affichage : groupes du corps, puis ceux qui ont du volume en premier. */
export const muscleOrder = (byGroup) => GROUPS.filter((g) => byGroup[g] > 0);

/**
 * Régularité : nombre de semaines d'affilée où le nombre de séances prévu a été atteint.
 * La semaine en cours compte si elle est déjà validée ; sinon on part de la semaine dernière.
 */
export function weekStreak(sessions, perWeek, now = Date.now()) {
  const goal = Math.max(1, perWeek);
  const count = (start) => {
    const days = new Set();
    for (const s of sessions) if (s.startedAt >= start && s.startedAt < addDays(start, 7)) days.add(new Date(s.startedAt).toDateString());
    return days.size;
  };
  let start = mondayOf(now);
  let streak = 0;
  const current = count(start) >= goal;
  if (current) streak = 1;
  start = addDays(start, -7);
  while (count(start) >= goal) {
    streak += 1;
    start = addDays(start, -7);
  }
  return { streak, currentDone: current, goal };
}

/**
 * Records par nombre de reps : la charge la plus lourde soulevée pour AU MOINS r reps.
 * Une ligne n'apparaît que si elle apporte un record distinct (sinon une ligne plus « longue » la couvre déjà).
 */
export function repRecords(sets, targets = [1, 3, 5, 8, 10, 12]) {
  const ms = main(sets).filter((s) => s.w > 0);
  const rows = targets
    .map((r) => {
      const ok = ms.filter((s) => s.r >= r);
      if (!ok.length) return null;
      const best = ok.reduce((a, b) => (b.w > a.w || (b.w === a.w && (b.at ?? 0) < (a.at ?? 0)) ? b : a));
      return { r, w: best.w, reps: best.r, at: best.at ?? null };
    })
    .filter(Boolean);
  return rows.filter((x, i) => !rows.slice(i + 1).some((y) => y.w === x.w));
}

/** Duel en binôme : meilleure série (1RM estimé) de chaque athlète sur un exercice, du plus fort au moins fort. */
export function duel(sessions, profiles, exerciseId) {
  return profiles
    .map((p) => {
      const sets = sessions.filter((s) => s.profileId === p.id).flatMap((s) => s.items.filter((i) => i.exerciseId === exerciseId).flatMap((i) => main(i.sets)));
      if (!sets.length) return null;
      const best = bestOf(sets);
      return { profile: p, best, e1rm: Math.round(e1rm(best) * 2) / 2 };
    })
    .filter(Boolean)
    .sort((a, b) => b.e1rm - a.e1rm);
}

/** Exercices qui stagnent (parmi ceux faits récemment) : déclencheur de la proposition de décharge. */
export function stallingExercises(sessions, isStallingFor, sinceDays = 21, now = Date.now()) {
  const recent = new Set(sessions.filter((s) => s.startedAt >= now - sinceDays * 864e5).flatMap((s) => s.items.map((i) => i.exerciseId)));
  return [...recent].filter((id) => isStallingFor(id));
}
