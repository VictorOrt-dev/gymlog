import { bestOf, e1rm, historySets, liveRecords, main, pctChange, tonnage, work, workSets } from './training';

/**
 * Récapitulatif de fin de séance (logique pure, testée).
 * Compare chaque exercice à la dernière séance DU MÊME TYPE (même séance type, sinon même nom) ;
 * à défaut, à la dernière fois où l'exercice a été fait.
 */
export function buildSummary(draft, sessions, endedAt = Date.now()) {
  const mine = sessions.filter((s) => s.profileId === draft.profileId && s.startedAt < draft.startedAt);
  const sameType = mine.filter((s) => (draft.templateId ? s.templateId === draft.templateId : s.name === draft.name)).at(-1) ?? null;

  const exercises = draft.items
    .filter((it) => it.sets.length)
    .map((it) => {
      const today = work(it.sets); // compteur : drop sets inclus
      const ref = sameType?.items.find((i) => i.exerciseId === it.exerciseId && main(i.sets).length) ?? [...mine].reverse().flatMap((s) => s.items).find((i) => i.exerciseId === it.exerciseId && main(i.sets).length);
      const prev = ref ? main(ref.sets) : [];
      const best = main(it.sets).length ? bestOf(main(it.sets)) : null;
      const prevBest = prev.length ? bestOf(prev) : null;
      const records = liveRecords(it.sets, historySets(mine, it.exerciseId)).filter(Boolean).length;
      return {
        exerciseId: it.exerciseId,
        sets: today.length,
        warmups: it.sets.length - today.length,
        best,
        prevBest,
        change: best && prevBest ? pctChange(e1rm(best), e1rm(prevBest)) : null,
        records,
        fromSameType: !!(sameType && sameType.items.some((i) => i.exerciseId === it.exerciseId)),
      };
    });

  const kg = draft.items.reduce((a, it) => a + tonnage(workSets(it.sets)), 0);
  const prevKg = sameType ? sameType.items.reduce((a, it) => a + tonnage(workSets(it.sets)), 0) : 0;
  return {
    name: draft.name,
    minutes: Math.max(1, Math.round((endedAt - draft.startedAt) / 60e3)),
    sets: exercises.reduce((n, e) => n + e.sets, 0),
    records: exercises.reduce((n, e) => n + e.records, 0),
    kg: Math.round(kg),
    kgChange: pctChange(kg, prevKg),
    previousAt: sameType?.startedAt ?? null,
    exercises,
  };
}
