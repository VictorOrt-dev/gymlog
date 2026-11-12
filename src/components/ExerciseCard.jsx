import { useEffect, useMemo, useRef, useState } from 'react';
import { RANGES } from '../lib/defaults';
import { ago, fmtInt, fmtKg, fmtSet, isBodyweight, liveRecords, recordBook, recordOf, summarize, target, tonnage, totalReps, trend, work, workSets } from '../lib/training';
import Sheet from './Sheet';
import Stepper from './Stepper';
import { Check } from './Icons';

const RIRS = [0, 1, 2, 3, 4];
const TREND = {
  up: { sign: '▲', cls: 'text-pink' },
  eq: { sign: '=', cls: 'text-muted' },
  down: { sign: '▼', cls: 'text-muted' },
};
const COLS = 'grid-cols-[1.25rem_1fr_1.25rem_7.5rem]';
const WARMUP_STEPS = [[0.5, 10], [0.7, 5], [0.85, 3]]; // % de la charge de travail × reps : montée classique
const rirText = (r) => `RIR ${r >= 4 ? '4+' : r}`;
const toEntry = (s) => ({ w: s.w, r: s.r, rir: s.rir ?? 2 });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Pastille : 32 px à l'œil, 44 px sous le doigt. */
const Chip = ({ active, children, ...props }) => (
  <button type="button" {...props} className="flex h-11 items-center">
    <span className={`flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition-colors ${active ? 'bg-pink text-white' : 'bg-fill text-white/85 active:bg-fill-hi'}`}>
      {children}
    </span>
  </button>
);

/**
 * Une carte = un exercice. Fermée : une ligne de résumé. Ouverte : tout ce qu'il faut, rien de plus.
 *
 * Le tableau aligne chaque série de travail d'aujourd'hui avec LA MÊME série de la dernière fois.
 * Les échauffements sont notés à part et n'entrent dans aucun calcul (À battre, records, courbes).
 * L'objectif suit une double progression par fourchette : les champs sont pré-remplis, 1 tap suffit.
 */
export default function ExerciseCard({ exercise, item, prev, history = [], note, stalled, open, onToggle, onMenu, onAdd, onUpdate, onDelete, onRange, onNote }) {
  const sets = item.sets;
  const indexed = sets.map((s, i) => ({ s, i }));
  const warmups = indexed.filter((x) => x.s.wu);
  const works = indexed.filter((x) => !x.s.wu);
  const nW = works.length;
  const prevSets = prev?.sets ?? []; // séries de travail de la dernière fois
  const range = exercise.range ?? [8, 12];
  const goal = useMemo(() => target(prevSets, { inc: exercise.inc, range }), [prev, exercise.inc, range[0], range[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastWork = works.at(-1)?.s;
  const workEntry = (after = lastWork) => (after ? toEntry(after) : goal ? { w: goal.w, r: goal.r, rir: 2 } : { w: 20, r: range[0], rir: 2 });
  const warmEntry = (count) => {
    const base = goal?.w ?? lastWork?.w ?? 20;
    const [f, r] = WARMUP_STEPS[Math.min(count, WARMUP_STEPS.length - 1)];
    return { w: Math.max(0, Math.round((base * f) / exercise.inc) * exercise.inc), r, rir: null };
  };

  const [entry, setEntry] = useState(() => workEntry());
  const [warm, setWarm] = useState(false); // mode échauffement pour les prochaines séries
  const [editing, setEditing] = useState(null); // index réel de la série en correction
  const [flash, setFlash] = useState(null); // ligne qui vient d'être enregistrée (retour visuel)
  const [saved, setSaved] = useState(0); // relance l'animation du bouton
  const [rangeOpen, setRangeOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(null); // non-null pendant l'édition de la note
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

  const toggleWarm = (on) => {
    setWarm(on);
    setEditing(null);
    setEntry(on ? warmEntry(warmups.length) : workEntry());
  };

  const submit = () => {
    const isWu = editing != null ? !!sets[editing].wu : warm;
    const set = isWu ? { w: entry.w, r: entry.r, rir: null, wu: true } : { w: entry.w, r: entry.r, rir: entry.rir };
    if (editing == null) {
      onAdd(set);
      navigator.vibrate?.(12); // Android ; sur iPhone, le retour est visuel (ligne + bouton)
      setFlash(sets.length);
      setSaved((k) => k + 1);
      if (warm) setEntry(warmEntry(warmups.length + 1)); // échauffement suivant, un cran plus lourd
      return; // en travail, les champs gardent les valeurs : la série suivante est souvent identique
    }
    onUpdate(editing, set);
    setFlash(editing);
    setEditing(null);
    setWarm(false);
    setEntry(workEntry(isWu || editing !== works.at(-1)?.i ? lastWork : set));
  };

  const edit = (i) => {
    if (editing === i) return cancelEdit();
    setEditing(i);
    setWarm(!!sets[i].wu);
    setEntry(toEntry(sets[i]));
  };
  const cancelEdit = () => {
    setEditing(null);
    setWarm(false);
    setEntry(workEntry());
  };
  const remove = () => {
    onDelete(editing);
    setEditing(null);
    setWarm(false);
  };
  const saveNote = () => {
    if (noteDraft != null) onNote(noteDraft);
    setNoteDraft(null);
  };

  // Records en direct : chaque série se mesure à tout l'historique + aux séries d'avant aujourd'hui
  const records = useMemo(() => liveRecords(sets, history), [sets, history]);
  const entryIsRecord = editing == null && !warm && !!recordOf({ ...entry, wu: false }, recordBook([...history, ...work(sets)]));

  const rows = Math.max(nW + 1, prevSets.length);
  const nextRef = prevSets[nW];
  const editingWu = editing != null && !!sets[editing]?.wu;
  const wuMode = editing != null ? editingWu : warm;

  // Tonnage effectif (séries de travail RIR ≤ 3) : aujourd'hui vs la dernière fois. Reps au poids du corps.
  const bw = isBodyweight([...work(sets), ...prevSets]);
  const measure = (list) => (bw ? totalReps(workSets(list)) : tonnage(workSets(list)));
  const done = measure(sets);
  const goalTotal = measure(prevSets);

  return (
    <section ref={ref} className="scroll-mt-20 overflow-hidden rounded-3xl bg-card">
      {/* En-tête : toujours tapable pour ouvrir / fermer ; « ⋯ » pour organiser quand la carte est ouverte */}
      <div className="flex items-center">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-3 pl-3.5 pr-2 text-left">
        <div className="min-w-0 flex-1">
          <div className={`truncate tracking-tight ${open ? 'text-[22px] font-bold' : 'text-[17px] font-semibold'}`}>{exercise.name}</div>
          {!open && (
            <div className="truncate text-[15px] text-muted">
              {nW ? summarize(work(sets)) : prev ? <>Dernière fois · {summarize(prevSets)}</> : 'Nouvel exercice'}
            </div>
          )}
        </div>
        {nW > 0 && !open && (
          <span className="mr-1.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
      </button>
      {open && (
        <button onClick={onMenu} aria-label={`Organiser ${exercise.name} : déplacer, remplacer, retirer`} className="mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted active:bg-fill">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      )}
      </div>

      {open && (
        <div className="@container px-3.5 pb-4">
          {/* Réglages de l'exercice : fourchette, échauffement, note — une seule ligne */}
          <div className="-mt-2 flex flex-wrap gap-x-2">
            <Chip onClick={() => setRangeOpen(true)} aria-label={`Fourchette de reps : ${range[0]} à ${range[1]}`}>
              {range[0]}–{range[1]} reps
            </Chip>
            <Chip active={warm} aria-pressed={warm} onClick={() => toggleWarm(!warm)}>
              Échauffement
            </Chip>
            {!note && noteDraft == null && <Chip onClick={() => setNoteDraft('')}>+ Note</Chip>}
          </div>

          {noteDraft != null ? (
            <input
              autoFocus
              value={noteDraft}
              maxLength={120}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={saveNote}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              placeholder="Ex. : siège cran 4, prise neutre"
              aria-label="Note sur l'exercice"
              enterKeyHint="done"
              className="mb-2 h-11 w-full rounded-xl bg-fill px-3.5 text-[16px] outline-none ring-1 ring-pink/50 placeholder:text-muted"
            />
          ) : (
            note && (
              <button onClick={() => setNoteDraft(note)} className="mb-1 flex min-h-11 w-full items-center gap-2 rounded-xl px-1 text-left text-[15px] text-white/80 active:bg-fill">
                <span aria-hidden="true" className="text-muted">✎</span>
                <span className="min-w-0 flex-1">{note}</span>
              </button>
            )
          )}

          {/* Stagnation : un conseil discret, avant de commencer l'exercice */}
          {stalled && nW === 0 && !warm && (
            <div className="mb-3 rounded-2xl bg-fill px-3.5 py-2.5 text-[13px] leading-snug">
              <span className="font-semibold text-white">Ça stagne depuis 3 séances.</span>{' '}
              <span className="text-muted">Fais une séance allégée (−10 % de charge) ou change de variante pour relancer.</span>
            </div>
          )}

          {/* Objectif du jour, avant la 1re série de travail */}
          {nW === 0 && goal && !wuMode && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-pink/12 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-pink">Objectif du jour</div>
                <div className="text-[13px] leading-snug text-muted">{goal.why}</div>
              </div>
              <div className="shrink-0 font-num text-[20px] font-bold tabular-nums">
                {fmtKg(goal.w)} × {goal.r}
              </div>
            </div>
          )}

          {/* Échauffements : notés, mais hors calcul */}
          {(warmups.length > 0 || warm) && (
            <div className="mb-1 flex flex-wrap items-center gap-x-1.5 px-1">
              <span className="mr-1 text-[13px] font-medium text-muted">Échauffement</span>
              {warmups.map(({ s, i }) => (
                <button key={i} type="button" onClick={() => edit(i)} className="flex h-11 items-center">
                  <span
                    className={`rounded-full px-2.5 py-1 font-num text-[13px] font-semibold tabular-nums ${editing === i ? 'bg-seg text-white' : 'bg-fill text-white/80'} ${flash === i ? 'animate-set-in' : ''}`}
                  >
                    {fmtSet(s)}
                  </span>
                </button>
              ))}
              {!warmups.length && <span className="text-[13px] text-muted">aucun pour l’instant</span>}
            </div>
          )}

          {/* Aujourd'hui vs dernière fois, série de travail par série de travail */}
          <div className={`grid ${COLS} gap-2 px-1 pb-1 text-[13px] font-medium text-muted`}>
            <span />
            <span>Aujourd'hui</span>
            <span />
            <span className="truncate text-right">{prev ? cap(ago(prev.at)) : 'Première fois'}</span>
          </div>
          <div>
            {Array.from({ length: rows }, (_, k) => {
              const s = works[k]?.s;
              const real = works[k]?.i;
              const p = prevSets[k];
              const isNext = k === nW && editing == null && !warm;
              const t = TREND[trend(s, p)];
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!s}
                  onClick={() => edit(real)}
                  className={`grid min-h-11 w-full ${COLS} items-center gap-2 rounded-xl px-1 text-left ${editing === real && s ? 'bg-fill' : s && records[real] ? 'bg-pink/12' : 'sep [--sep-inset:0.25rem]'} ${s && flash === real ? 'animate-set-in' : ''}`}
                >
                  <span className="font-num text-[13px] font-medium tabular-nums text-muted">{k + 1}</span>
                  <span className="truncate">
                    {s ? (
                      <>
                        <span className="font-num text-[17px] font-semibold tabular-nums">{fmtSet(s)}</span>
                        {s.rir != null && <span className="ml-2 text-[13px] text-muted">{rirText(s.rir)}</span>}
                      </>
                    ) : isNext ? (
                      <span className="text-[15px] font-semibold text-pink">{p ? 'À battre' : nW ? 'Série bonus' : 'Pose ta référence'}</span>
                    ) : (
                      <span className="text-muted" aria-hidden="true">–</span>
                    )}
                  </span>
                  <span className={`text-center text-[13px] ${t?.cls ?? ''}`} aria-label={t ? (t.sign === '▲' ? 'en progrès' : t.sign === '▼' ? 'en baisse' : 'égal') : undefined}>{t?.sign}</span>
                  <span className="flex min-w-0 flex-col items-end leading-tight">
                    {s && records[real] ? (
                      <span className="whitespace-nowrap rounded-full bg-pink px-2 py-0.5 text-[13px] font-bold text-white">Nouveau record</span>
                    ) : (
                      p && (
                        <>
                          <span className={`truncate font-num tabular-nums ${isNext ? 'text-[17px] font-semibold text-white' : 'text-[15px] text-muted'}`}>{fmtSet(p)}</span>
                          {p.rir != null && <span className={`text-[13px] ${isNext ? 'text-white/80' : 'text-muted'}`}>{rirText(p.rir)}</span>}
                        </>
                      )
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Jauge : le tonnage effectif se remplit série après série jusqu'au total de la dernière fois */}
          {goalTotal > 0 && (
            <div className="mt-2 px-1">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium text-muted">{bw ? 'Reps de travail' : 'Tonnage effectif'}</span>
                <span className="font-num tabular-nums">
                  {done > goalTotal && <span className="text-pink">▲ </span>}
                  <span className="font-semibold text-white">{fmtInt(done)}</span>
                  <span className="text-muted">
                    {' '}/ {fmtInt(goalTotal)} {bw ? 'reps' : 'kg'} la dernière fois
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-fill">
                <div className="h-full rounded-full bg-pink transition-[width] duration-300" style={{ width: `${Math.min(100, (done / goalTotal) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* Saisie : côte à côte si la carte est assez large, l'un sous l'autre sinon (iPhone SE) */}
          <div className="mt-3 flex flex-col gap-2 @[20rem]:flex-row">
            <Stepper label="kg" value={entry.w} step={exercise.inc} decimal onChange={(w) => setEntry((e) => ({ ...e, w }))} className="@[20rem]:flex-[1.2]" />
            <Stepper label="reps" value={entry.r} step={1} min={1} onChange={(r) => setEntry((e) => ({ ...e, r }))} className="@[20rem]:flex-1" />
          </div>

          {!wuMode && (
            <div className="mt-2 flex flex-col gap-1.5 @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-3">
              <span className="shrink-0 pl-1 text-[13px] font-medium leading-tight text-muted @[20rem]:w-[4.75rem]">Reps en réserve</span>
              <div className="grid flex-1 grid-cols-5 gap-0.5 rounded-xl bg-fill p-0.5" role="radiogroup" aria-label="Reps en réserve (RIR)">
                {RIRS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={entry.rir === v}
                    onClick={() => setEntry((e) => ({ ...e, rir: v }))}
                    className={`h-11 rounded-[10px] font-num text-[15px] font-semibold tabular-nums transition-colors ${entry.rir === v ? 'bg-seg text-white shadow-sm' : 'text-muted active:text-white'}`}
                  >
                    {v === 4 ? '4+' : v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            key={saved}
            ref={validateRef}
            type="button"
            onClick={submit}
            className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold text-white transition-transform active:scale-[.97] ${wuMode ? 'bg-fill-hi' : 'bg-pink'} ${saved ? 'animate-pop' : ''}`}
          >
            {flash != null && editing == null && <Check className="h-5 w-5" strokeWidth={3} />}
            {editing != null
              ? editingWu
                ? 'Corriger l’échauffement'
                : `Corriger la série ${works.findIndex((x) => x.i === editing) + 1}`
              : warm
                ? 'Valider l’échauffement'
                : `Valider la série ${nW + 1}`}
            {entryIsRecord ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-[13px] font-bold text-pink">★ Record</span>
            ) : (
              editing == null && !warm && nextRef && trend(entry, nextRef) === 'up' && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[13px] font-semibold">▲ Progrès</span>
            )}
          </button>

          {editing != null && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={remove} className="h-12 rounded-full bg-fill text-[17px] font-medium text-pink active:opacity-60">
                Supprimer
              </button>
              <button type="button" onClick={cancelEdit} className="h-12 rounded-full bg-fill text-[17px] font-medium active:opacity-60">
                Annuler
              </button>
            </div>
          )}

        </div>
      )}

      <Sheet open={rangeOpen} onClose={() => setRangeOpen(false)} title="Fourchette de reps">
        <p className="mb-4 text-[15px] leading-snug text-muted">
          Monte les reps jusqu’en haut de la fourchette sur toutes tes séries de travail. Une fois atteint, ajoute {fmtKg(exercise.inc)} et repars du bas.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {RANGES.map(([a, b]) => (
            <button
              key={a}
              onClick={() => {
                onRange([a, b]);
                setRangeOpen(false);
              }}
              className={`h-14 rounded-2xl font-num text-[17px] font-semibold ${a === range[0] && b === range[1] ? 'bg-pink text-white' : 'bg-fill text-white active:bg-fill-hi'}`}
            >
              {a}–{b}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-snug text-muted">Repères : 3–5 force max · 5–10 force et muscle · 8–15 muscle · 12–20 petits muscles et abdos.</p>
      </Sheet>
    </section>
  );
}
