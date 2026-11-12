import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_REST } from '../lib/defaults';
import { useNow, useRestTimer, useWakeLock } from '../lib/hooks';
import { useStore } from '../lib/store';
import { bestOf, e1rm, lastPerformances, mmss } from '../lib/training';
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
    // Records de force : exercices dont la meilleure série (1RM estimé) bat celle de la dernière fois
    const records = items.filter((it) => it.sets.length && last[it.exerciseId] && e1rm(bestOf(it.sets)) > e1rm(bestOf(last[it.exerciseId].sets)) + 0.05).length;
    timer.stop();
    finishSession();
    onFinished({ sets: total, records });
  };

  return (
    <div className="min-h-dvh pb-32">
      <header className="sticky top-[var(--banner-h,0px)] z-30 border-b-[0.5px] border-line/70 bg-black/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto grid h-14 max-w-md grid-cols-[1fr_auto_1fr] items-center px-2">
          <button onClick={onExit} aria-label="Retour à l'accueil (la séance reste en cours)" className="flex h-11 items-center justify-self-start pr-2 text-[17px] text-pink active:opacity-50">
            <Back className="h-6 w-6" strokeWidth={2.5} />
            Accueil
          </button>
          <div className="min-w-0 max-w-[42vw] text-center leading-tight">
            <div className="truncate text-[17px] font-semibold">{draft.name}</div>
            <div className="font-num text-[12px] tabular-nums text-muted">
              <Elapsed since={draft.startedAt} /> · {total} série{total > 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={finish}
            className={`h-11 justify-self-end rounded-full px-4 text-[17px] font-semibold ${confirming ? 'bg-pink text-white' : 'text-pink active:opacity-50'}`}
          >
            {confirming ? (total ? 'Confirmer' : 'Abandonner') : 'Terminer'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 pt-3">
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
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-card text-[17px] font-medium text-pink active:opacity-60"
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
