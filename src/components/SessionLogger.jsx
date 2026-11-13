import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_REST } from '../lib/defaults';
import { useNow, useRestTimer, useWakeLock } from '../lib/hooks';
import { linkSuperset, moveItem, removeItem, replaceItem, supersetOf, supersetPairs, unlinkSuperset } from '../lib/session';
import { useStore } from '../lib/store';
import { sessionProgress } from '../lib/stats';
import { buildSummary } from '../lib/summary';
import { historySets, isStalling, lastPerformances, mmss, seriesFor, work } from '../lib/training';
import ExerciseCard from './ExerciseCard';
import ExerciseSettings from './ExerciseSettings';
import ExercisePicker from './ExercisePicker';
import ProgressDetail from './ProgressDetail';
import RestTimer from './RestTimer';
import Sheet from './Sheet';
import { useToast } from './Toast';
import { Back, Plus, Up } from './Icons';

/** Isolé pour que seul ce texte se redessine chaque seconde, pas toute la séance. */
function Elapsed({ since }) {
  const now = useNow(1000);
  return mmss((now - since) / 1000);
}

const WARMUP_REST = 60; // un échauffement ne mérite pas 3 minutes de repos
const firstIncomplete = (items) => Math.max(0, items.findIndex((it) => !it.sets.length));

/**
 * L'écran où on passe 95 % du temps.
 * Règles : un seul exercice ouvert à la fois, valider une série lance le repos tout seul,
 * tout est sauvegardé à chaque tap (verrouiller le téléphone ou recharger ne perd rien).
 * En binôme : un tap sur l'avatar du pote, et on passe sur SA séance (son exercice ouvert, son chrono).
 */
export default function SessionLogger({ onExit, onFinished }) {
  const { state, setDraft, finishSession, setExerciseRest, rememberSupersets } = useStore();
  const pid = state.profileId;
  const draft = state.drafts[pid];
  const items = draft?.items ?? [];

  const byId = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e])), [state.exercises]);
  const last = useMemo(() => lastPerformances(state.sessions, pid), [state.sessions, pid]);
  const notes = state.notes?.[pid] ?? {};
  const mineSessions = useMemo(() => state.sessions.filter((s) => s.profileId === pid), [state.sessions, pid]);
  // Historique de travail de chaque exercice : le carnet de records en direct
  const histories = useMemo(() => Object.fromEntries(items.map((it) => [it.exerciseId, historySets(mineSessions, it.exerciseId)])), [mineSessions, items.map((it) => it.exerciseId).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  // Stagnation : meilleure série (1RM estimé) qui ne progresse plus depuis 3 séances
  const stalled = useMemo(() => {
    const mine = state.sessions.filter((s) => s.profileId === pid);
    return Object.fromEntries(items.map((it) => [it.exerciseId, isStalling(seriesFor(mine, it.exerciseId).points.map((p) => p.value))]));
  }, [state.sessions, pid, items.map((it) => it.exerciseId).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const [open, setOpenState] = useState(() => draft?.open ?? firstIncomplete(items));
  const [picking, setPicking] = useState(null); // null | 'add' | index de l'exercice à remplacer
  const [menu, setMenu] = useState(null); // index de l'exercice dont on organise la place
  const [confirming, setConfirming] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [chartOf, setChartOf] = useState(null); // courbe d'un exercice, ouverte sans quitter la séance
  const timer = useRestTimer();
  const notify = useToast();
  useWakeLock(true);

  // L'exercice ouvert est écrit dans la séance dès l'arrivée : en binôme, chacun retrouve exactement sa place.
  useEffect(() => {
    if (draft && draft.open == null) setDraft((d) => ({ ...d, open }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // « Terminer » demande un 2e tap dans les 3 s : zéro modale, zéro fin de séance accidentelle.
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  if (!draft) return null;

  const openEx = byId[items[open]?.exerciseId];
  const deloadOn = (state.deload?.[pid] ?? 0) > Date.now();
  const progress = sessionProgress(items, last, deloadOn); // séries principales validées / prévues
  const any = items.some((it) => it.sets.length);
  const restFor = (ex) => ex?.rest ?? DEFAULT_REST;
  const nameOf = (id) => byId[id]?.name ?? 'Exercice supprimé';

  /** L'exercice ouvert est mémorisé dans la séance : en binôme, chacun retrouve sa place. */
  const setOpen = (i) => {
    setOpenState(i);
    setDraft((d) => ({ ...d, open: i }));
  };
  const form = draft.form ?? 'ok';
  const deloadActive = deloadOn;
  const FORMS = [
    ['low', 'Fatigué'],
    ['ok', 'Normal'],
    ['high', 'En forme'],
  ];
  // Lettres des supersets (A, B, C…) dans l'ordre de la séance
  const ssLabel = {};
  let letter = 0;
  items.forEach((_, i) => {
    const r = supersetOf(items, i);
    if (r?.first) {
      const L = String.fromCharCode(65 + letter++);
      ssLabel[i] = `${L}1`;
      ssLabel[r.partner] = `${L}2`;
    }
  });
  /** Applique un changement de structure et mémorise les supersets dans la séance type. */
  const restructure = (next) => {
    setDraft(() => next);
    setOpenState(next.open ?? open);
    if (draft.templateId && JSON.stringify(supersetPairs(next.items)) !== JSON.stringify(supersetPairs(items))) rememberSupersets(draft.templateId, supersetPairs(next.items));
  };

  const patchSets = (i, fn) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, sets: fn(it.sets) } : it)) }));

  const move = (i, dir) => {
    restructure(moveItem({ ...draft, open }, i, dir));
    setMenu(Math.min(items.length - 1, Math.max(0, i + dir))); // le menu suit l'exercice
  };
  const replace = (i, id) => restructure(replaceItem({ ...draft, open }, i, id));
  const remove = (i) => {
    restructure(removeItem({ ...draft, open }, i));
    setMenu(null);
    setConfirmRemove(false);
  };
  const toggleSuperset = (i) => {
    restructure(supersetOf(items, i) ? unlinkSuperset({ ...draft, open }, i) : linkSuperset({ ...draft, open }, i));
    setMenu(null);
  };

  /**
   * Après une série : repos automatique, sauf dans un superset où l'on enchaîne d'abord le second exercice.
   * Échauffement → 60 s. Drop set → le repos repart à zéro (il compte après la dernière série de la chaîne).
   */
  const afterSet = (i, set) => {
    const ss = !set.wu && supersetOf(items, i);
    if (ss?.first) {
      timer.stop();
      setOpen(ss.partner); // A1 → A2 sans repos
      return;
    }
    timer.start(set.wu ? WARMUP_REST : restFor(byId[items[i].exerciseId]));
    if (ss && !ss.first) setOpen(ss.partner); // A2 → repos → retour sur A1
  };

  const finish = () => {
    if (!confirming) return setConfirming(true);
    const summary = any ? buildSummary(draft, state.sessions) : null; // avant d'archiver : comparaison avec l'historique d'avant
    timer.stop();
    finishSession();
    onFinished({ summary, sessionId: draft.id });
  };

  const menuItem = menu != null ? items[menu] : null;
  const menuDone = menuItem ? work(menuItem.sets).length : 0;

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
            <div className="font-num text-[13px] tabular-nums text-muted">
              <Elapsed since={draft.startedAt} /> · {progress.done}/{progress.planned} séries
            </div>
          </div>
          <button
            onClick={finish}
            className={`h-11 justify-self-end rounded-full px-4 text-[17px] font-semibold ${confirming ? 'bg-pink text-white' : 'text-pink active:opacity-50'}`}
          >
            {confirming ? (any ? 'Confirmer' : 'Abandonner') : 'Terminer'}
          </button>
        </div>

        {/* Progression de la séance : un trait fin sous le titre, rien de plus */}
        <div
          className="mx-auto h-[3px] max-w-md px-3"
          role="progressbar"
          aria-label="Séries validées"
          aria-valuemin={0}
          aria-valuemax={progress.planned}
          aria-valuenow={progress.done}
          aria-valuetext={`${progress.done} séries validées sur ${progress.planned}`}
        >
          <div className="h-full overflow-hidden rounded-full bg-fill">
            <div className="h-full rounded-full bg-pink transition-[width] duration-300 ease-out" style={{ width: `${progress.planned ? Math.min(100, (progress.done / progress.planned) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="h-2" aria-hidden="true" />

        {/* Forme du jour : dans l'en-tête, toujours visible et modifiable ; les objectifs s'adaptent (autorégulation) */}
        <div className="mx-auto flex max-w-md items-center gap-2 px-3 pb-2" role="radiogroup" aria-label="Forme du jour">
          {deloadActive && <span className="shrink-0 pl-1 text-[13px] font-semibold text-pink">Décharge</span>}
          <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-xl bg-fill p-0.5">
            {FORMS.map(([k, label]) => (
              <button
                key={k}
                role="radio"
                aria-checked={form === k}
                onClick={() => setDraft((d) => ({ ...d, form: k }))}
                className={`h-11 rounded-[10px] text-[15px] font-semibold transition-colors ${form === k ? (k === 'high' ? 'bg-pink text-white' : 'bg-seg text-white') : 'text-muted active:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 pt-3">
        {items.map((it, i) => (
          <ExerciseCard
            key={it.exerciseId}
            exercise={byId[it.exerciseId] ?? { name: 'Exercice supprimé', inc: 2.5 }}
            item={it}
            prev={last[it.exerciseId]}
            history={histories[it.exerciseId]}
            note={notes[it.exerciseId]}
            stalled={stalled[it.exerciseId]}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            onMenu={() => {
              setConfirmRemove(false);
              setMenu(i);
            }}
            form={form}
            deload={deloadActive}
            superset={ssLabel[i]}
            onChart={() => setChartOf(it.exerciseId)}
            onAdd={(set) => {
              patchSets(i, (s) => [...s, { ...set, at: Date.now() }]);
              afterSet(i, set);
            }}
            onUpdate={(k, set) => patchSets(i, (s) => s.map((x, j) => (j === k ? { ...x, ...set } : x)))}
            onDelete={(k) => {
              const removed = it.sets[k];
              patchSets(i, (s) => s.filter((_, j) => j !== k));
              notify('Série supprimée', () => patchSets(i, (s) => [...s.slice(0, k), removed, ...s.slice(k)]));
            }}
          />
        ))}

        {!items.length && (
          <div className="px-4 pb-2 pt-8 text-center">
            <p className="text-[20px] font-bold tracking-tight">Séance libre</p>
            <p className="mt-1 text-[15px] text-muted">Ajoute ton premier exercice : ta dernière fois et ton objectif s’affichent tout seuls.</p>
          </div>
        )}
        <button
          onClick={() => setPicking('add')}
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

      {/* Organiser un exercice : sa place, le remplacer, le retirer */}
      <Sheet open={menuItem != null} onClose={() => setMenu(null)} title={menuItem ? nameOf(menuItem.exerciseId) : ''}>
        {menuItem && (
          <>
            <p className="-mt-2 mb-4 text-[15px] text-muted">
              Exercice {menu + 1} sur {items.length}
              {menuDone > 0 && ` · ${menuDone} série${menuDone > 1 ? 's' : ''} faite${menuDone > 1 ? 's' : ''}`}
            </p>
            {/* Réglages de l'exercice : nom, fourchette, note (les mêmes que dans les séances types) */}
            <ExerciseSettings exerciseId={menuItem.exerciseId} />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => move(menu, -1)}
                disabled={menu === 0}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-fill text-[17px] font-semibold active:bg-fill-hi disabled:opacity-30"
              >
                <Up className="h-5 w-5" /> Monter
              </button>
              <button
                onClick={() => move(menu, 1)}
                disabled={menu === items.length - 1}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-fill text-[17px] font-semibold active:bg-fill-hi disabled:opacity-30"
              >
                <Up className="h-5 w-5 rotate-180" /> Descendre
              </button>
            </div>
            <button
              onClick={() => {
                setPicking(menu);
                setMenu(null);
              }}
              className="mt-2 h-14 w-full rounded-2xl bg-pink text-[17px] font-semibold text-white active:opacity-80"
            >
              Remplacer (machine prise)
            </button>
            {(supersetOf(items, menu) || menu < items.length - 1) && (
              <button onClick={() => toggleSuperset(menu)} className="mt-2 h-14 w-full rounded-2xl bg-fill text-[17px] font-semibold active:bg-fill-hi">
                {supersetOf(items, menu) ? 'Délier le superset' : `Superset avec ${nameOf(items[menu + 1].exerciseId)}`}
              </button>
            )}
            <p className="mt-2 px-1 text-[13px] leading-snug text-muted">
              {menuItem.sets.length
                ? 'Les séries déjà faites restent enregistrées sur cet exercice ; le remplaçant s’insère juste après.'
                : 'Le remplaçant prend sa place dans la séance. Ton programme ne change pas.'}
            </p>
            <button
              onClick={() => (menuItem.sets.length && !confirmRemove ? setConfirmRemove(true) : remove(menu))}
              className={`mt-4 h-12 w-full rounded-full text-[17px] ${confirmRemove ? 'bg-pink font-semibold text-white' : 'text-pink active:opacity-50'}`}
            >
              {confirmRemove ? `Retirer et perdre ${menuItem.sets.length} série${menuItem.sets.length > 1 ? 's' : ''}` : 'Retirer de la séance'}
            </button>
          </>
        )}
      </Sheet>

      <ProgressDetail exerciseId={chartOf} onClose={() => setChartOf(null)} backLabel="Séance" />

      <ExercisePicker
        open={picking != null}
        onClose={() => setPicking(null)}
        exclude={items.map((it) => it.exerciseId)}
        onPick={(id) => {
          if (picking === 'add') {
            setDraft((d) => ({ ...d, items: [...d.items, { exerciseId: id, sets: [] }], open: items.length }));
            setOpenState(items.length);
          } else replace(picking, id);
        }}
      />
    </div>
  );
}
