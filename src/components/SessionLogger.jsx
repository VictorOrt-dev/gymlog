import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_REST } from '../lib/defaults';
import { useNow, useRestTimer, useWakeLock } from '../lib/hooks';
import { moveItem, removeItem, replaceItem } from '../lib/session';
import { useStore } from '../lib/store';
import { buildSummary } from '../lib/summary';
import { historySets, isStalling, lastPerformances, mmss, seriesFor, work } from '../lib/training';
import ExerciseCard from './ExerciseCard';
import ExercisePicker from './ExercisePicker';
import RestTimer from './RestTimer';
import Sheet from './Sheet';
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
  const { state, setDraft, finishSession, setExerciseRest, setExerciseRange, setNote, switchAthlete, addAthlete } = useStore();
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
  const [newMate, setNewMate] = useState(null); // non-null : saisie du prénom d'un pote
  const timer = useRestTimer(pid);
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
  const total = items.reduce((n, it) => n + work(it.sets).length, 0); // séries de travail (échauffements exclus)
  const any = items.some((it) => it.sets.length);
  const restFor = (ex) => ex?.rest ?? DEFAULT_REST;
  const nameOf = (id) => byId[id]?.name ?? 'Exercice supprimé';

  /** L'exercice ouvert est mémorisé dans la séance : en binôme, chacun retrouve sa place. */
  const setOpen = (i) => {
    setOpenState(i);
    setDraft((d) => ({ ...d, open: i }));
  };
  const patchSets = (i, fn) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, sets: fn(it.sets) } : it)) }));

  const move = (i, dir) => {
    const next = moveItem({ ...draft, open }, i, dir);
    setDraft(() => next);
    setOpenState(next.open);
    setMenu(Math.min(items.length - 1, Math.max(0, i + dir))); // le menu suit l'exercice
  };
  const replace = (i, id) => {
    const next = replaceItem({ ...draft, open }, i, id);
    setDraft(() => next);
    setOpenState(next.open);
  };
  const remove = (i) => {
    setDraft((d) => removeItem(d, i));
    setOpenState(-1);
    setMenu(null);
    setConfirmRemove(false);
  };

  const finish = () => {
    if (!confirming) return setConfirming(true);
    const summary = any ? buildSummary(draft, state.sessions) : null; // avant d'archiver : comparaison avec l'historique d'avant
    timer.stop();
    finishSession();
    onFinished({ summary, athlete: state.profiles.find((p) => p.id === pid)?.name, multi: state.profiles.length > 1 });
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
              <Elapsed since={draft.startedAt} /> · {total} série{total > 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={finish}
            className={`h-11 justify-self-end rounded-full px-4 text-[17px] font-semibold ${confirming ? 'bg-pink text-white' : 'text-pink active:opacity-50'}`}
          >
            {confirming ? (any ? 'Confirmer' : 'Abandonner') : 'Terminer'}
          </button>
        </div>

        {/* Binôme : un tap sur un avatar = on passe sur sa séance */}
        <div className="mx-auto flex max-w-md gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Athlète">
          {state.profiles.map((p) => {
            const d = state.drafts[p.id];
            const active = p.id === pid;
            const done = d ? d.items.reduce((n, it) => n + work(it.sets).length, 0) : null;
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={active}
                onClick={() => switchAthlete(p.id)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-4 transition-colors ${active ? 'bg-pink text-white' : 'bg-fill text-white/85 active:bg-fill-hi'}`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full text-[15px] font-semibold ${active ? 'bg-black/20' : 'bg-fill-hi'}`}>{(p.name || '?')[0].toUpperCase()}</span>
                <span className="max-w-28 truncate text-[15px] font-semibold">{p.name}</span>
                {done != null && <span className="font-num text-[13px] tabular-nums opacity-75">{done}</span>}
              </button>
            );
          })}
          <button onClick={() => setNewMate('')} aria-label="Ajouter un pote à la séance" className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-fill px-4 text-[15px] font-semibold text-pink active:bg-fill-hi">
            <Plus className="h-4 w-4" /> Pote
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
            history={histories[it.exerciseId]}
            note={notes[it.exerciseId]}
            stalled={stalled[it.exerciseId]}
            onRange={(range) => setExerciseRange(it.exerciseId, range)}
            onNote={(text) => setNote(it.exerciseId, text)}
            open={open === i}
            onToggle={() => setOpen(open === i ? -1 : i)}
            onMenu={() => {
              setConfirmRemove(false);
              setMenu(i);
            }}
            onAdd={(set) => {
              patchSets(i, (s) => [...s, { ...set, at: Date.now() }]);
              timer.start(set.wu ? WARMUP_REST : restFor(byId[it.exerciseId])); // le repos démarre tout seul (court après un échauffement)
            }}
            onUpdate={(k, set) => patchSets(i, (s) => s.map((x, j) => (j === k ? { ...x, ...set } : x)))}
            onDelete={(k) => patchSets(i, (s) => s.filter((_, j) => j !== k))}
          />
        ))}

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

      {/* Nouveau pote : il entre directement dans la séance, avec les mêmes exercices */}
      <Sheet open={newMate != null} onClose={() => setNewMate(null)} title="Ajouter un pote">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newMate?.trim()) return;
            addAthlete(newMate.trim());
            setNewMate(null);
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={newMate ?? ''}
            onChange={(e) => setNewMate(e.target.value)}
            placeholder="Prénom"
            enterKeyHint="go"
            className="h-12 min-w-0 flex-1 rounded-xl bg-fill px-4 text-[17px] outline-none placeholder:text-muted"
          />
          <button className="h-12 rounded-full bg-pink px-5 text-[17px] font-semibold text-white active:opacity-80">Ajouter</button>
        </form>
        <p className="mt-3 px-1 text-[13px] leading-snug text-muted">Il reçoit la même séance, dans le même ordre. Chacun garde ses charges, son historique et son chrono.</p>
      </Sheet>

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
