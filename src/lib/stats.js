import { CUSTOM_GROUP, GROUPS } from './defaults';
import { main, work } from './training';

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
/**
 * Séries « dures » : celles qui stimulent vraiment (RIR ≤ 3). Une série à 4 reps de l'échec ou plus ne compte pas ;
 * un drop set compte ½ (c'est un prolongement de la série, pas une série complète) ; l'échauffement ne compte pas.
 */
export const hardSets = (sets) => sets.reduce((n, s) => n + (s.wu || (s.rir != null && s.rir > 3) ? 0 : s.t === 'drop' ? 0.5 : 1), 0);

/** Au-delà de ~10 séries dures pour un muscle dans UNE séance, chaque série rapporte de moins en moins. */
export const SESSION_CAP = 10;

/** Séances de la semaine où un muscle (principal) dépasse le plafond : [{ group, sets, at, name }]. */
export function crowdedSessions(sessions, exercisesById, weekStart) {
  const end = addDays(weekStart, 7);
  const out = [];
  for (const s of sessions) {
    if (s.startedAt < weekStart || s.startedAt >= end) continue;
    const by = {};
    for (const it of s.items) {
      const g = exercisesById[it.exerciseId]?.group;
      if (g && g !== CUSTOM_GROUP) by[g] = (by[g] ?? 0) + hardSets(it.sets);
    }
    for (const [group, n] of Object.entries(by)) if (n > SESSION_CAP) out.push({ group, sets: n, at: s.startedAt, name: s.name });
  }
  return out;
}

export function weeklyVolume(sessions, exercisesById, weekStart) {
  const end = addDays(weekStart, 7);
  const out = {};
  let unassigned = 0;
  for (const s of sessions) {
    if (s.startedAt < weekStart || s.startedAt >= end) continue;
    for (const it of s.items) {
      const n = hardSets(it.sets);
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

/** Exercices qui stagnent (parmi ceux faits récemment) : déclencheur de la proposition de décharge. */
export function stallingExercises(sessions, isStallingFor, sinceDays = 21, now = Date.now()) {
  const recent = new Set(sessions.filter((s) => s.startedAt >= now - sinceDays * 864e5).flatMap((s) => s.items.map((i) => i.exerciseId)));
  return [...recent].filter((id) => isStallingFor(id));
}

// ── Progression de la séance en cours ───────────────────────────────────────

/** Séries prévues vs faites : prévu = séries principales de la dernière fois (moitié en décharge), 3 pour un exercice nouveau. */
export function sessionProgress(items, lastByExercise, deload = false) {
  let planned = 0;
  let done = 0;
  for (const it of items) {
    const d = main(it.sets).length;
    const prev = lastByExercise[it.exerciseId]?.sets.length;
    const p = prev ? (deload ? Math.ceil(prev / 2) : prev) : 3; // décharge : moitié des séries
    planned += Math.max(p, d);
    done += d;
  }
  return { done, planned };
}

// ── Accueil : prochaine séance planifiée ─────────────────────────────────────

const DAY_NAMES = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** La prochaine séance du planning après aujourd'hui (en bouclant sur la semaine) → { templateId, day, label } ou null. */
export function nextPlanned(plan, validIds, todayIdx) {
  for (let k = 1; k <= 7; k++) {
    const day = (todayIdx + k) % 7;
    if (plan[day] && validIds.has(plan[day])) return { templateId: plan[day], day, label: k === 1 ? 'demain' : DAY_NAMES[day] };
  }
  return null;
}

// ── Calendrier de régularité (12 semaines) ───────────────────────────────────

/** Grille lundi → dimanche sur `weeks` semaines, la dernière colonne = semaine en cours. */
export function calendarGrid(sessions, weeks = 12, now = Date.now()) {
  const trained = new Set(sessions.map((s) => new Date(s.startedAt).toDateString()));
  const today = new Date(new Date(now).setHours(0, 0, 0, 0)).getTime();
  const start = mondayOf(now) - (weeks - 1) * WEEK_MS;
  const cols = [];
  let count = 0;
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const ts = addDays(start, w * 7 + d);
      const on = trained.has(new Date(ts).toDateString());
      if (on) count += 1;
      col.push({ ts, on, future: ts > today, today: ts === today });
    }
    cols.push(col);
  }
  return { cols, count };
}

// ── Statut de force (repères indicatifs, 1RM estimé / poids de corps) ────────

export const LEVELS = ['Novice', 'Intermédiaire', 'Avancé', 'Élite'];

/**
 * Seuils (multiples du poids de corps) pour passer Intermédiaire / Avancé / Élite, sur les mouvements de référence.
 * Repères indicatifs inspirés des standards de force courants ; en dessous du premier seuil : Novice.
 */
export const STANDARDS = {
  h: { squat: [1.25, 1.75, 2.5], 'developpe-couche': [1, 1.5, 2], 'souleve-de-terre': [1.5, 2.25, 3], 'developpe-militaire': [0.6, 0.85, 1.15] },
  f: { squat: [0.85, 1.25, 1.75], 'developpe-couche': [0.6, 0.9, 1.25], 'souleve-de-terre': [1.1, 1.6, 2.25], 'developpe-militaire': [0.4, 0.6, 0.8] },
};

/** Niveau pour un 1RM estimé : { level, index, ratio, next: { level, kg } | null, progress (0–1 vers le palier suivant) }. */
export function strengthLevel(e1rmKg, bodyweight, exerciseId, sex = 'h') {
  const th = STANDARDS[sex]?.[exerciseId];
  if (!th || !(bodyweight > 0) || !(e1rmKg > 0)) return null;
  const ratio = e1rmKg / bodyweight;
  const index = th.filter((x) => ratio >= x).length; // 0 = Novice … 3 = Élite
  const lowRatio = index === 0 ? 0 : th[index - 1];
  const highRatio = th[index];
  return {
    level: LEVELS[index],
    index,
    ratio,
    next: highRatio ? { level: LEVELS[index + 1], kg: Math.ceil(highRatio * bodyweight * 2) / 2 } : null,
    progress: highRatio ? Math.min(1, (ratio - lowRatio) / (highRatio - lowRatio)) : 1,
  };
}
