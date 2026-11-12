import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtKg, liveRecords, main, recordBook, recordOf, roundTo, summarize, target, trend } from '../lib/training';
import EntryPad from './exercise/EntryPad';
import ExtraSets from './exercise/ExtraSets';
import SetTable from './exercise/SetTable';
import { Check, TabProgress } from './Icons';

const WARMUP_STEPS = [[0.5, 10], [0.7, 5], [0.85, 3]]; // % de la charge de travail × reps : montée classique
const toEntry = (s) => ({ w: s.w, r: s.r, rir: s.rir ?? 2 });
const modeOf = (s) => (s.wu ? 'wu' : s.t === 'drop' ? 'drop' : 'work');

/** Pastille : 32 px à l'œil, 44 px sous le doigt. */
const Chip = ({ active, children, ...props }) => (
  <button type="button" {...props} className="flex h-11 items-center">
    <span className={`flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition-colors ${active ? 'bg-pink text-white' : 'bg-fill text-white/85 active:bg-fill-hi'}`}>
      {children}
    </span>
  </button>
);

const IconButton = ({ label, onClick, children }) => (
  <button onClick={onClick} aria-label={label} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted active:bg-fill">
    {children}
  </button>
);

/**
 * Une carte = un exercice. Fermée : une ligne de résumé. Ouverte : tout ce qu'il faut, rien de plus.
 *
 * Trois sortes de séries : principales (comparées, records, objectif), échauffements et drop sets (notés à part).
 * L'objectif suit une double progression par fourchette, ajustée à la forme du jour et à la décharge.
 */
export default function ExerciseCard({ exercise, item, prev, history = [], note, stalled, form = 'ok', deload = false, superset, open, onToggle, onMenu, onChart, onAdd, onUpdate, onDelete }) {
  const sets = item.sets;
  const indexed = sets.map((s, i) => ({ s, i }));
  const warmups = indexed.filter((x) => x.s.wu);
  const drops = indexed.filter((x) => x.s.t === 'drop');
  const mains = indexed.filter((x) => !x.s.wu && x.s.t !== 'drop');
  const nM = mains.length;
  const prevSets = prev?.sets ?? []; // séries principales de la dernière fois
  const range = exercise.range ?? [8, 12];
  const goal = useMemo(() => target(prevSets, { inc: exercise.inc, range, form, deload }), [prev, exercise.inc, range[0], range[1], form, deload]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastMain = mains.at(-1)?.s;
  const workEntry = (after = lastMain) => (after ? toEntry(after) : goal ? { w: goal.w, r: goal.r, rir: 2 } : { w: 20, r: range[0], rir: 2 });
  const warmEntry = (count) => {
    const base = goal?.w ?? lastMain?.w ?? 20;
    const [f, r] = WARMUP_STEPS[Math.min(count, WARMUP_STEPS.length - 1)];
    return { w: Math.max(0, roundTo(base * f, exercise.inc)), r, rir: null };
  };
  const dropEntry = () => {
    const ref = (drops.at(-1) ?? mains.at(-1))?.s ?? { w: goal?.w ?? 20, r: range[0] };
    return { w: Math.max(0, roundTo(ref.w * 0.8, exercise.inc)), r: ref.r, rir: 0 };
  };

  const [entry, setEntry] = useState(() => workEntry());
  const [mode, setMode] = useState('work'); // 'work' | 'wu' | 'drop' pour la prochaine série
  const [editing, setEditing] = useState(null); // index réel de la série en correction
  const [flash, setFlash] = useState(null); // ligne qui vient d'être enregistrée (retour visuel)
  const [saved, setSaved] = useState(0); // relance l'animation du bouton
  const ref = useRef(null);
  const validateRef = useRef(null);

  /** Cadrage : le haut de la carte, MAIS Valider toujours au-dessus du chrono (on sacrifie le titre, pas le bouton). */
  const reveal = (smooth = true) => {
    const card = ref.current;
    const btn = validateRef.current;
    if (!card || !btn) return;
    const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 64; // en-tête + barre binôme + alerte éventuelle
    const bottomSafe = window.innerHeight - 92; // capsule du chrono + marge
    const top = window.scrollY + card.getBoundingClientRect().top - header - 8;
    const needed = window.scrollY + btn.getBoundingClientRect().bottom - bottomSafe;
    window.scrollTo({ top: Math.max(0, needed > top ? needed : top), behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => reveal());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Après chaque série, la carte grandit d'une ligne : on garde Valider visible.
  useEffect(() => {
    if (open && validateRef.current && validateRef.current.getBoundingClientRect().bottom > window.innerHeight - 92) reveal();
  }, [sets.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (flash == null) return;
    const id = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(id);
  }, [flash]);

  const switchMode = (m) => {
    const next = mode === m ? 'work' : m;
    setMode(next);
    setEditing(null);
    setEntry(next === 'wu' ? warmEntry(warmups.length) : next === 'drop' ? dropEntry() : workEntry());
  };

  const submit = () => {
    const m = editing != null ? modeOf(sets[editing]) : mode;
    const set = m === 'wu' ? { w: entry.w, r: entry.r, rir: null, wu: true } : { w: entry.w, r: entry.r, rir: entry.rir, ...(m === 'drop' ? { t: 'drop' } : {}) };
    if (editing == null) {
      onAdd(set);
      navigator.vibrate?.(12); // Android ; sur iPhone, le retour est visuel (ligne + bouton)
      setFlash(sets.length);
      setSaved((k) => k + 1);
      if (m === 'wu') setEntry(warmEntry(warmups.length + 1)); // échauffement suivant, un cran plus lourd
      if (m === 'drop') {
        setMode('work'); // un drop set à la fois ; un tap sur « Drop set » pour en enchaîner un autre
        setEntry(workEntry());
      }
      return; // en travail, les champs gardent les valeurs : la série suivante est souvent identique
    }
    onUpdate(editing, set);
    setFlash(editing);
    setEditing(null);
    setMode('work');
    setEntry(workEntry(m !== 'work' || editing !== mains.at(-1)?.i ? lastMain : set));
  };

  const edit = (i) => {
    if (editing === i) return cancelEdit();
    setEditing(i);
    setMode(modeOf(sets[i]));
    setEntry(toEntry(sets[i]));
  };
  const cancelEdit = () => {
    setEditing(null);
    setMode('work');
    setEntry(workEntry());
  };
  const remove = () => {
    onDelete(editing);
    setEditing(null);
    setMode('work');
  };

  // Records en direct : chaque série se mesure à tout l'historique + aux séries d'avant aujourd'hui
  const records = useMemo(() => liveRecords(sets, history), [sets, history]);
  const entryIsRecord = editing == null && mode === 'work' && !!recordOf({ ...entry }, recordBook([...history, ...main(sets)]));
  const nextRef = prevSets[nM];
  const rowsWanted = deload ? Math.max(1, prevSets.length - 1) : prevSets.length; // décharge : une série de moins
  const editMode = editing != null ? modeOf(sets[editing]) : null;
  const editingLabel = editing == null ? null : editMode === 'wu' ? 'Corriger l’échauffement' : editMode === 'drop' ? 'Corriger le drop set' : `Corriger la série ${mains.findIndex((x) => x.i === editing) + 1}`;

  return (
    <section ref={ref} className={`scroll-mt-20 overflow-hidden rounded-3xl bg-card ${superset ? 'ring-1 ring-pink/40' : ''}`}>
      {/* En-tête : toujours tapable pour ouvrir / fermer ; courbe et « ⋯ » quand la carte est ouverte */}
      <div className="flex items-center">
        <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 pr-2 text-left">
          <div className="min-w-0 flex-1">
            {superset && <div className="text-[13px] font-semibold text-pink">Superset {superset}</div>}
            <div className={`truncate tracking-tight ${open ? 'text-[22px] font-bold' : 'text-[17px] font-semibold'}`}>{exercise.name}</div>
            {!open && (
              <div className="truncate text-[15px] text-muted">
                {nM ? summarize(main(sets)) : prev ? <>Dernière fois · {summarize(prevSets)}</> : 'Nouvel exercice'}
              </div>
            )}
          </div>
          {nM > 0 && !open && (
            <span className="mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink text-white">
              <Check className="h-4 w-4" strokeWidth={3} />
            </span>
          )}
        </button>
        {open && (
          <div className="mr-1.5 flex">
            {prev && (
              <IconButton label={`Voir la progression de ${exercise.name}`} onClick={onChart}>
                <TabProgress className="h-6 w-6" />
              </IconButton>
            )}
            <IconButton label={`Réglages de ${exercise.name} : fourchette, note, ordre, remplacer, superset`} onClick={onMenu}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </IconButton>
          </div>
        )}
      </div>

      {open && (
        <div className="@container px-3.5 pb-4">
          {/* Type de la prochaine série : deux pastilles seulement (fourchette et note : menu « ⋯ ») */}
          <div className="-mt-2 flex flex-wrap gap-x-2">
            <Chip active={mode === 'wu'} aria-pressed={mode === 'wu'} onClick={() => switchMode('wu')}>
              Échauffement
            </Chip>
            {nM > 0 && (
              <Chip active={mode === 'drop'} aria-pressed={mode === 'drop'} onClick={() => switchMode('drop')}>
                Drop set
              </Chip>
            )}
          </div>

          {note && (
            <button onClick={onMenu} className="mb-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-1 text-left text-[15px] text-white/85 active:bg-fill">
              <span aria-hidden="true" className="text-muted">✎</span>
              <span className="min-w-0 flex-1">{note}</span>
            </button>
          )}

          {/* Stagnation : un conseil discret, avant de commencer l'exercice */}
          {stalled && nM === 0 && mode === 'work' && !deload && (
            <div className="mb-3 rounded-2xl bg-fill px-3.5 py-2.5 text-[13px] leading-snug">
              <span className="font-semibold text-white">Ça stagne depuis 3 séances.</span>{' '}
              <span className="text-muted">Fais une séance allégée (−10 % de charge) ou change de variante pour relancer.</span>
            </div>
          )}

          {/* Objectif du jour, avant la 1re série principale */}
          {nM === 0 && goal && mode === 'work' && editing == null && (
            <div className={`mb-3 flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 ${goal.mode === 'low' || goal.mode === 'deload' ? 'bg-fill' : 'bg-pink/12'}`}>
              <div className="min-w-0">
                <div className={`text-[13px] font-semibold ${goal.mode === 'low' || goal.mode === 'deload' ? 'text-white' : 'text-pink'}`}>Objectif du jour</div>
                <div className="text-[13px] leading-snug text-muted">{goal.why}</div>
              </div>
              <div className="shrink-0 font-num text-[20px] font-bold tabular-nums">
                {fmtKg(goal.w)} × {goal.r}
              </div>
            </div>
          )}

          {(warmups.length > 0 || mode === 'wu') && <ExtraSets label="Échauffement" sets={warmups} editing={editing} flash={flash} onEdit={edit} emptyText="aucun pour l’instant" />}

          <SetTable
            mainSets={mains}
            prevSets={prevSets}
            prevAt={prev?.at}
            records={records}
            editing={editing}
            flash={flash}
            nextVisible={editing == null && mode === 'work'}
            rowsWanted={rowsWanted}
            onEdit={edit}
          />

          {(drops.length > 0 || mode === 'drop') && (
            <div className="mt-1">
              <ExtraSets label="Drop sets" sets={drops} editing={editing} flash={flash} onEdit={edit} emptyText="−20 %, enchaîné sans repos" />
            </div>
          )}

          <EntryPad
            entry={entry}
            setEntry={setEntry}
            inc={exercise.inc}
            mode={editMode ?? mode}
            editingLabel={editingLabel}
            nextIndex={nM + 1}
            flashing={flash != null && editing == null}
            saved={saved}
            validateRef={validateRef}
            onSubmit={submit}
            onDelete={remove}
            onCancel={cancelEdit}
            badge={
              entryIsRecord ? (
                <span className="rounded-full bg-white px-2 py-0.5 text-[13px] font-bold text-pink">★ Record</span>
              ) : (
                editing == null && mode === 'work' && nextRef && trend(entry, nextRef) === 'up' && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[13px] font-semibold">▲ Progrès</span>
              )
            }
          />
        </div>
      )}

    </section>
  );
}
