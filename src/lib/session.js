import { uid } from './defaults';

/**
 * Logique pure de la séance en cours (aucune dépendance à React) : testée unitairement.
 * Un « draft » = { id, profileId, templateId, name, startedAt, open, items: [{ exerciseId, sets }] }.
 */

/** Déplace l'exercice `i` d'un cran (dir = -1 / +1). L'exercice ouvert suit son déplacement. */
export function moveItem(draft, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= draft.items.length) return draft;
  const items = unlinkAround(draft.items, i);
  [items[i], items[j]] = [items[j], items[i]];
  const open = draft.open === i ? j : draft.open === j ? i : draft.open;
  return { ...draft, items, open };
}

/**
 * Remplace l'exercice `i` (machine prise). Sans série faite : le remplaçant prend sa place.
 * Avec des séries : l'original les garde, le remplaçant s'insère juste après. Rien n'est perdu.
 */
export function replaceItem(draft, i, exerciseId) {
  if (draft.items.some((it) => it.exerciseId === exerciseId)) return draft;
  const keep = draft.items[i].sets.length > 0;
  const at = keep ? i + 1 : i;
  const items = keep ? unlinkAround(draft.items, i) : [...draft.items];
  items.splice(at, keep ? 0 : 1, { exerciseId, sets: [], ...(!keep && draft.items[i].ss ? { ss: draft.items[i].ss } : {}) });
  return { ...draft, items, open: at };
}

export function removeItem(draft, i) {
  return { ...draft, items: unlinkAround(draft.items, i).filter((_, j) => j !== i), open: -1 };
}

// ── Supersets : deux exercices enchaînés, le repos ne part qu'après le second ──

/** Rôle d'un exercice dans un superset : { partner, first } ou null. */
export function supersetOf(items, i) {
  const id = items[i]?.ss;
  if (!id) return null;
  if (items[i + 1]?.ss === id) return { partner: i + 1, first: true };
  if (items[i - 1]?.ss === id) return { partner: i - 1, first: false };
  return null;
}

/** Lie l'exercice i au suivant (et défait leurs anciens supersets). */
export function linkSuperset(draft, i) {
  if (i < 0 || i >= draft.items.length - 1) return draft;
  const id = uid();
  const items = unlinkAround(unlinkAround(draft.items, i), i + 1).map((it, j) => (j === i || j === i + 1 ? { ...it, ss: id } : it));
  return { ...draft, items };
}

export function unlinkSuperset(draft, i) {
  return { ...draft, items: unlinkAround(draft.items, i) };
}

/** Retire le marqueur de superset de l'exercice i et de son partenaire. */
function unlinkAround(items, i) {
  const id = items[i]?.ss;
  if (!id) return [...items];
  return items.map((it) => (it.ss === id ? (({ ss, ...rest }) => rest)(it) : it)); // eslint-disable-line no-unused-vars
}

/** Paires de supersets d'une séance, en ids d'exercices (pour les mémoriser dans la séance type). */
export const supersetPairs = (items) => items.flatMap((it, i) => (supersetOf(items, i)?.first ? [[it.exerciseId, items[i + 1].exerciseId]] : []));

/** Applique les paires mémorisées à une séance qui démarre (si les deux exercices se suivent). */
export function applySupersets(items, pairs = []) {
  let out = items;
  for (const pair of pairs) {
    const i = out.findIndex((it) => it.exerciseId === pair[0]);
    if (i >= 0 && out[i + 1]?.exerciseId === pair[1]) out = linkSuperset({ items: out }, i).items;
  }
  return out;
}

/**
 * Retouche d'une séance terminée. `patch` = nouvelles valeurs de la série, ou null pour la supprimer.
 * Un exercice vidé disparaît ; une séance vidée renvoie null (à supprimer par l'appelant).
 */
export function editSessionSet(session, itemIdx, setIdx, patch) {
  const items = session.items
    .map((it, i) => {
      if (i !== itemIdx) return it;
      const sets = patch == null ? it.sets.filter((_, j) => j !== setIdx) : it.sets.map((s, j) => (j === setIdx ? clean({ ...s, ...patch }) : s));
      return { ...it, sets };
    })
    .filter((it) => it.sets.length);
  return items.length ? { ...session, items } : null;
}

/** Une série propre : un échauffement n'a pas de RIR ; un seul type à la fois (échauffement OU drop set). */
function clean(s) {
  const out = { ...s, w: Math.max(0, Math.round(s.w * 100) / 100), r: Math.max(0, Math.round(s.r)) };
  if (out.wu) {
    out.rir = null;
    delete out.t;
  } else delete out.wu;
  if (out.t !== 'drop') delete out.t;
  return out;
}

const dayStart = (ts) => new Date(ts).setHours(0, 0, 0, 0);

/**
 * Déplace une séance sur un autre jour (« j'ai oublié de noter hier ») : l'heure, la durée
 * et l'horodatage de chaque série suivent. Le jour se décale en jours calendaires (changement d'heure compris).
 */
export function moveSessionToDay(session, dayTs) {
  const from = new Date(session.startedAt);
  const to = new Date(dayTs);
  const target = new Date(to.getFullYear(), to.getMonth(), to.getDate(), from.getHours(), from.getMinutes(), from.getSeconds(), from.getMilliseconds()).getTime();
  const delta = target - session.startedAt;
  if (!delta || dayStart(target) === dayStart(session.startedAt)) return session;
  return {
    ...session,
    startedAt: target,
    endedAt: session.endedAt == null ? session.endedAt : session.endedAt + delta,
    items: session.items.map((it) => ({ ...it, sets: it.sets.map((s) => (s.at == null ? s : { ...s, at: s.at + delta })) })),
  };
}

/**
 * Renomme une séance type, et avec elle son historique et la séance en cours qui en viennent :
 * « Nouvelle séance » devenue « Bras » s'appelle « Bras » partout. Nom vide → on garde l'ancien.
 */
export function renameTemplateIn(state, templateId, rawName) {
  const name = rawName.trim().slice(0, 40);
  const tpl = state.templates.find((t) => t.id === templateId);
  if (!tpl || !name || name === tpl.name) return state;
  const drafts = Object.fromEntries(Object.entries(state.drafts).map(([pid, d]) => [pid, d?.templateId === templateId ? { ...d, name } : d]));
  return {
    ...state,
    templates: state.templates.map((t) => (t.id === templateId ? { ...t, name } : t)),
    sessions: state.sessions.some((x) => x.templateId === templateId) ? state.sessions.map((x) => (x.templateId === templateId ? { ...x, name } : x)) : state.sessions,
    drafts,
  };
}
