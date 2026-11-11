import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_REST } from '../lib/defaults';
import { useNow, useRestTimer, useWakeLock } from '../lib/hooks';
import { useStore } from '../lib/store';
import { lastPerformances, mmss, trend } from '../lib/training';
import ExerciseCard from './ExerciseCard';
import ExercisePicker from './ExercisePicker';
import RestTimer from './RestTimer';
import { Back, Plus } from './Icons';

/** Isolé pour que seul ce texte se redessine chaque seconde, pas toute la séance. */
function Elapsed({ since }) {
  const now = useNow(1000);
  return mmss((now - since) / 1000);
}

/**
 * L'écran où on passe 95 % du temps.
 * Règles : un seul exercice ouvert à la fois, valider une série lance le repos tout seul,
 * tout est sauvegardé à chaque tap (verrouiller le téléphone ou recharger ne perd rien).
 */
export default function SessionLogger({ onExit, onFinished }) {
  const { state, setDraft, finishSession, setExerciseRest } = useStore();
  const draft = state.drafts[state.profileId];
  const items = draft?.items ?? [];

  const byId = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e])), [state.exercises]);
  const last = useMemo(() => lastPerformances(state.sessions, state.profileId), [state.sessions, state.profileId]);

  const [open, setOpen] = useState(() => Math.max(0, items.findIndex((it) => !it.sets.length)));
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const timer = useRestTimer();
  useWakeLock(true);

  // « Terminer » demande un 2e tap dans les 3 s : zéro modale, zéro fin de séance accidentelle.
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  if (!draft) return null;

  const openEx = byId[items[open]?.exerciseId];
  const total = items.reduce((n, it) => n + it.sets.length, 0);
  const restFor = (ex) => ex?.rest ?? DEFAULT_REST;

  const patchSets = (i, fn) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, sets: fn(it.sets) } : it)) }));

  const finish = () => {
    if (!confirming) return setConfirming(true);
    const ups = items.reduce((n, it) => n + it.sets.filter((s, i) => trend(s, last[it.exerciseId]?.sets[i]) === 'up').length, 0);
    timer.stop();
    finishSession();
    onFinished({ sets: total, ups });
  };

  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-2">
          <button onClick={onExit} aria-label="Retour à l'accueil (la séance reste en cours)" className="grid h-12 w-12 place-items-center rounded-xl text-zinc-400 active:bg-zinc-800">
            <Back />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black leading-tight">{draft.name}</div>
            <div className="text-xs font-semibold tabular-nums text-zinc-500">
              <Elapsed since={draft.startedAt} /> · {total} série{total > 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={finish}
            className={`h-12 rounded-xl px-4 font-black transition-colors ${confirming ? 'bg-acid text-black' : 'bg-zinc-800 text-zinc-100 active:bg-zinc-700'}`}
          >
            {confirming ? (total ? 'Confirmer ✓' : 'Abandonner ?') : 'Terminer'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-2 p-3">
        {items.map((it, i) => (
          <ExerciseCard
            key={it.exerciseId}
            exercise={byId[it.exerciseId] ?? { name: 'Exercice supprimé', inc: 2.5 }}
            item={it}
            prev={last[it.exerciseId]}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            onAdd={(set) => {
              patchSets(i, (s) => [...s, { ...set, at: Date.now() }]);
              timer.start(restFor(byId[it.exerciseId])); // le repos démarre tout seul
            }}
            onUpdate={(k, set) => patchSets(i, (s) => s.map((x, j) => (j === k ? { ...x, ...set } : x)))}
            onDelete={(k) => patchSets(i, (s) => s.filter((_, j) => j !== k))}
            onRemove={() => {
              setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }));
              setOpen(-1);
            }}
          />
        ))}

        <button
          onClick={() => setPicking(true)}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700 font-bold text-zinc-300 active:bg-zinc-900"
        >
          <Plus className="h-5 w-5" /> Ajouter un exercice
        </button>
      </main>

      <RestTimer
        timer={timer}
        current={openEx ? restFor(openEx) : null}
        onPreset={(sec) => {
          if (openEx) setExerciseRest(openEx.id, sec); // mémorisé pour cet exercice
          timer.start(sec);
        }}
      />

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exclude={items.map((it) => it.exerciseId)}
        onPick={(id) => {
          setDraft((d) => ({ ...d, items: [...d.items, { exerciseId: id, sets: [] }] }));
          setOpen(items.length);
        }}
      />
    </div>
  );
}
