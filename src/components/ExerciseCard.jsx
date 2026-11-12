import { useEffect, useMemo, useRef, useState } from 'react';
import { ago, fmtInt, fmtKg, fmtSet, isBodyweight, summarize, target, tonnage, totalReps, trend, workSets } from '../lib/training';
import Stepper from './Stepper';
import { Check } from './Icons';

const RIRS = [0, 1, 2, 3, 4];
const TREND = {
  up: { sign: '▲', cls: 'text-pink' },
  eq: { sign: '=', cls: 'text-muted' },
  down: { sign: '▼', cls: 'text-muted' },
};
const COLS = 'grid-cols-[1.25rem_1fr_1.25rem_6.75rem]';
const rirText = (r) => `RIR ${r >= 4 ? '4+' : r}`;

const toEntry = (s) => ({ w: s.w, r: s.r, rir: s.rir ?? 2 });
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Une carte = un exercice. Fermée : une ligne de résumé. Ouverte : tout ce qu'il faut, rien de plus.
 *
 * Le tableau aligne chaque série d'aujourd'hui avec LA MÊME série de la dernière fois.
 * La ligne « À battre » montre le chiffre exact à dépasser, les champs sont déjà pré-remplis :
 * si tu as fait ta série comme prévu, la noter = 1 tap sur Valider.
 */
export default function ExerciseCard({ exercise, item, prev, open, onToggle, onAdd, onUpdate, onDelete, onRemove }) {
  const sets = item.sets;
  const prevSets = prev?.sets ?? [];
  const n = sets.length;
  const goal = useMemo(() => target(prev, exercise.inc), [prev, exercise.inc]);

  const [entry, setEntry] = useState(() => (sets.length ? toEntry(sets.at(-1)) : goal ? { w: goal.w, r: goal.r, rir: 2 } : { w: 20, r: 10, rir: 2 }));
  const [editing, setEditing] = useState(null); // index de la série en correction
  const [flash, setFlash] = useState(null); // ligne qui vient d'être enregistrée (retour visuel)
  const [saved, setSaved] = useState(0); // compteur qui relance l'animation du bouton
  const ref = useRef(null);
  const validateRef = useRef(null);

  /**
   * Cadrage : on montre le haut de la carte, MAIS le bouton Valider doit rester au-dessus du chrono.
   * Sur petit écran (iPhone SE), on sacrifie le titre plutôt que le bouton.
   */
  const reveal = (smooth = true) => {
    const card = ref.current;
    const btn = validateRef.current;
    if (!card || !btn) return;
    const header = 64 + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--banner-h') || 0);
    const bottomSafe = window.innerHeight - 92; // capsule du chrono + marge
    const top = window.scrollY + card.getBoundingClientRect().top - header - 8;
    const btnBottom = window.scrollY + btn.getBoundingClientRect().bottom;
    const needed = btnBottom - bottomSafe;
    window.scrollTo({ top: Math.max(0, needed > top ? needed : top), behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (open) requestAnimationFrame(() => reveal());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Après chaque série, la carte grandit d'une ligne : on garde Valider visible.
  useEffect(() => {
    if (!open || !validateRef.current) return;
    if (validateRef.current.getBoundingClientRect().bottom > window.innerHeight - 92) reveal();
  }, [n]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (flash == null) return;
    const id = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(id);
  }, [flash]);

  const submit = () => {
    const set = { w: entry.w, r: entry.r, rir: entry.rir };
    if (editing == null) {
      onAdd(set);
      navigator.vibrate?.(12); // Android ; sur iPhone, le retour est visuel (ligne + bouton)
      setFlash(n);
      setSaved((k) => k + 1);
      return; // les champs gardent les valeurs : la série suivante est souvent identique
    }
    onUpdate(editing, set);
    setFlash(editing);
    setEntry(toEntry(editing === n - 1 ? set : sets[n - 1]));
    setEditing(null);
  };

  const edit = (i) => {
    if (editing === i) return cancelEdit();
    setEditing(i);
    setEntry(toEntry(sets[i]));
  };

  const cancelEdit = () => {
    setEditing(null);
    if (n) setEntry(toEntry(sets[n - 1]));
  };

  const remove = () => {
    onDelete(editing);
    setEditing(null);
  };

  const rows = Math.max(n + 1, prevSets.length);
  const nextRef = prevSets[n];

  // Tonnage effectif (séries de travail RIR ≤ 3) : aujourd'hui vs la dernière fois. Reps au poids du corps.
  const bw = isBodyweight([...sets, ...prevSets]);
  const measure = (list) => (bw ? totalReps(workSets(list)) : tonnage(workSets(list)));
  const done = measure(sets);
  const goalTotal = measure(prevSets);

  return (
    <section ref={ref} className="scroll-mt-20 overflow-hidden rounded-3xl bg-card">
      {/* En-tête : toujours tapable pour ouvrir / fermer */}
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left">
        <div className="min-w-0 flex-1">
          <div className={`truncate tracking-tight ${open ? 'text-[22px] font-bold' : 'text-[17px] font-semibold'}`}>{exercise.name}</div>
          {!open && (
            <div className="truncate text-[15px] text-muted">
              {n ? summarize(sets) : prev ? <>Dernière fois · {summarize(prevSets)}</> : 'Nouvel exercice'}
            </div>
          )}
        </div>
        {n > 0 && !open && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pink text-white">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
      </button>

      {open && (
        <div className="@container px-3.5 pb-4">
          {/* Objectif du jour, avant la 1re série */}
          {n === 0 && goal && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-pink/12 px-4 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-pink">Objectif du jour</div>
                <div className="truncate text-[13px] text-muted">{goal.why}</div>
              </div>
              <div className="shrink-0 font-num text-[20px] font-bold tabular-nums">
                {fmtKg(goal.w)} × {goal.r}
              </div>
            </div>
          )}

          {/* Aujourd'hui vs dernière fois, série par série */}
          <div className={`grid ${COLS} gap-2 px-1 pb-1 text-[13px] font-medium text-muted`}>
            <span />
            <span>Aujourd'hui</span>
            <span />
            <span className="truncate text-right">{prev ? cap(ago(prev.at)) : 'Première fois'}</span>
          </div>
          <div>
            {Array.from({ length: rows }, (_, i) => {
              const s = sets[i];
              const p = prevSets[i];
              const isNext = i === n && editing == null;
              const t = TREND[trend(s, p)];
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!s}
                  onClick={() => edit(i)}
                  className={`grid h-11 w-full ${COLS} items-center gap-2 rounded-xl px-1 text-left ${editing === i ? 'bg-fill' : 'sep [--sep-inset:0.25rem]'} ${flash === i ? 'animate-set-in' : ''}`}
                >
                  <span className="font-num text-[13px] font-medium tabular-nums text-faint">{i + 1}</span>
                  <span className="truncate">
                    {s ? (
                      <>
                        <span className="font-num text-[17px] font-semibold tabular-nums">{fmtSet(s)}</span>
                        {s.rir != null && <span className="ml-2 text-[13px] text-muted">{rirText(s.rir)}</span>}
                      </>
                    ) : isNext ? (
                      <span className="text-[15px] font-semibold text-pink">{p ? 'À battre' : n ? 'Série bonus' : 'Pose ta référence'}</span>
                    ) : (
                      <span className="text-faint">–</span>
                    )}
                  </span>
                  <span className={`text-center text-[12px] ${t?.cls ?? ''}`}>{t?.sign}</span>
                  <span className="flex min-w-0 flex-col items-end leading-tight">
                    {p && (
                      <>
                        <span className={`truncate font-num tabular-nums ${isNext ? 'text-[17px] font-semibold text-white' : 'text-[15px] text-muted'}`}>{fmtSet(p)}</span>
                        {p.rir != null && <span className={`text-[11px] ${isNext ? 'text-white/70' : 'text-faint'}`}>{rirText(p.rir)}</span>}
                      </>
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

          {/* Saisie : pré-remplie, ajustable au pouce */}
          {/* Côte à côte si la carte est assez large, l'un sous l'autre sinon (iPhone SE) : jamais de chiffre coupé */}
          <div className="mt-3 flex flex-col gap-2 @[20rem]:flex-row">
            <Stepper label="kg" value={entry.w} step={exercise.inc} decimal onChange={(w) => setEntry((e) => ({ ...e, w }))} className="@[20rem]:flex-[1.2]" />
            <Stepper label="reps" value={entry.r} step={1} min={1} onChange={(r) => setEntry((e) => ({ ...e, r }))} className="@[20rem]:flex-1" />
          </div>

          <div className="mt-2 flex flex-col gap-1.5 @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-3">
            <span className="shrink-0 pl-1 text-[12px] font-medium leading-tight text-muted @[20rem]:w-[4.5rem]">Reps en réserve</span>
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

          <button
            key={saved}
            ref={validateRef}
            type="button"
            onClick={submit}
            className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-pink text-[17px] font-semibold text-white transition-transform active:scale-[.97] ${saved ? 'animate-pop' : ''}`}
          >
            {flash != null && editing == null && <Check className="h-5 w-5" strokeWidth={3} />}
            {editing == null ? `Valider la série ${n + 1}` : `Corriger la série ${editing + 1}`}
            {editing == null && nextRef && trend(entry, nextRef) === 'up' && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[12px] font-semibold">▲ Progrès</span>
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

          {n === 0 && (
            <button type="button" onClick={onRemove} className="mt-1 h-11 w-full text-[15px] text-muted active:opacity-50">
              Retirer cet exercice
            </button>
          )}
        </div>
      )}
    </section>
  );
}
