import { uid } from './defaults';

/**
 * Logique pure de la séance en cours (aucune dépendance à React) : testée unitairement.
 * Un « draft » = { id, profileId, templateId, name, startedAt, open, items: [{ exerciseId, sets }] }.
 */

/**
 * Binôme : rend `pid` actif. S'il n'a pas de séance en cours, il reçoit la même que l'athlète actuel
 * (mêmes exercices, même ordre, aucune série) ; sa séance type du même nom est reliée si elle existe.
 */
export function withAthlete(state, pid) {
  if (pid === state.profileId || !state.profiles.some((p) => p.id === pid)) return state;
  const cur = state.drafts[state.profileId];
  let drafts = state.drafts;
  if (!drafts[pid] && cur) {
    const tpl = state.templates.find((t) => t.profileId === pid && t.name === cur.name);
    drafts = {
      ...drafts,
      [pid]: {
        id: uid(),
        profileId: pid,
        templateId: tpl?.id ?? null,
        name: cur.name,
        startedAt: Date.now(),
        open: cur.open,
        items: cur.items.map((it) => ({ exerciseId: it.exerciseId, sets: [] })),
      },
    };
  }
  return { ...state, profileId: pid, drafts };
}

/** Déplace l'exercice `i` d'un cran (dir = -1 / +1). L'exercice ouvert suit son déplacement. */
export function moveItem(draft, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= draft.items.length) return draft;
  const items = [...draft.items];
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
  const items = [...draft.items];
  items.splice(at, keep ? 0 : 1, { exerciseId, sets: [] });
  return { ...draft, items, open: at };
}

export function removeItem(draft, i) {
  return { ...draft, items: draft.items.filter((_, j) => j !== i), open: -1 };
}
