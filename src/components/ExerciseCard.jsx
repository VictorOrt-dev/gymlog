import { useEffect, useMemo, useRef, useState } from 'react';
import { ago, fmtKg, fmtSet, summarize, target, trend } from '../lib/training';
import Stepper from './Stepper';
import { Check } from './Icons';

const RIRS = [0, 1, 2, 3, 4];
const TREND = {
  up: { sign: '▲', cls: 'text-acid' },
  eq: { sign: '=', cls: 'text-zinc-400' },
  down: { sign: '▼', cls: 'text-orange-400' },
};

const toEntry = (s) => ({ w: s.w, r: s.r, rir: s.rir ?? 2 });

/**
 * Une carte = un exercice. Fermée : une ligne de résumé. Ouverte : tout ce qu'il faut, rien de plus.
 *
 * Le tableau aligne chaque série d'aujourd'hui avec LA MÊME série de la dernière fois.
 * La ligne « À battre » montre le chiffre exact à dépasser, les champs sont déjà pré-remplis :
 * si tu as fait ta série comme prévu, logger = 1 tap sur Valider.
 */
export default function ExerciseCard({ exercise, item, prev, open, onToggle, onAdd, onUpdate, onDelete, onRemove }) {
  const sets = item.sets;
  const prevSets = prev?.sets ?? [];
  const n = sets.length;
  const goal = useMemo(() => target(prev, exercise.inc), [prev, exercise.inc]);

  const [entry, setEntry] = useState(() => (sets.length ? toEntry(sets.at(-1)) : goal ? { w: goal.w, r: goal.r, rir: 2 } : { w: 20, r: 10, rir: 2 }));
  const [editing, setEditing] = useState(null); // index de la série en correction
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [open]);

  const submit = () => {
    const set = { w: entry.w, r: entry.r, rir: entry.rir };
    if (editing == null) {
      onAdd(set);
      navigator.vibrate?.(12);
      return; // les champs gardent les valeurs : la série suivante est souvent identique
    }
    onUpdate(editing, set);
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

  return (
    <section ref={ref} className={`scroll-mt-20 rounded-3xl transition-colors ${open ? 'bg-zinc-900 ring-1 ring-zinc-700' : 'bg-zinc-900/60 ring-1 ring-zinc-900'}`}>
      {/* En-tête : toujours tapable pour ouvrir / fermer */}
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <div className={`truncate font-black ${open ? 'text-xl' : 'text-lg'}`}>{exercise.name}</div>
          {!open && (
            <div className="truncate text-sm tabular-nums text-zinc-400">
              {n ? summarize(sets) : prev ? <>Dernière fois · {summarize(prevSets)}</> : 'Nouvel exercice'}
            </div>
          )}
        </div>
        {n > 0 && (
          <span className={`grid h-8 min-w-8 place-items-center rounded-full px-2 text-sm font-black tabular-nums ${open ? 'bg-zinc-800 text-zinc-200' : 'bg-acid text-black'}`}>
            {open ? n : <Check className="h-5 w-5" />}
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2.5 px-3 pb-3">
          {/* Objectif du jour, avant la 1re série */}
          {n === 0 && goal && (
            <div className="rounded-2xl bg-acid/10 px-4 py-2 text-sm ring-1 ring-acid/25">
              <span className="font-black text-acid">
                Objectif : {fmtKg(goal.w)} × {goal.r}
              </span>
              <span className="text-zinc-400"> · {goal.why}</span>
            </div>
          )}

          {/* Aujourd'hui vs dernière fois, série par série */}
          <div>
            <div className="grid grid-cols-[1.5rem_1fr_1.25rem_7.5rem] gap-2 px-3 pb-1">
              <span />
              <span className="eyebrow">Aujourd'hui</span>
              <span />
              <span className="eyebrow truncate text-right">{prev ? ago(prev.at) : '1re fois'}</span>
            </div>
            <div className="space-y-1">
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
                    className={`grid h-10 w-full grid-cols-[1.5rem_1fr_1.25rem_7.5rem] items-center gap-2 rounded-xl px-3 text-left ${
                      editing === i ? 'bg-zinc-700 ring-1 ring-zinc-500' : isNext ? 'bg-zinc-800 ring-1 ring-acid/40' : s ? 'active:bg-zinc-800' : ''
                    }`}
                  >
                    <span className="text-xs font-bold tabular-nums text-zinc-500">{i + 1}</span>
                    <span className="truncate tabular-nums">
                      {s ? (
                        <>
                          <span className="text-lg font-black">{fmtSet(s)}</span>
                          {s.rir != null && <span className="ml-2 text-xs font-semibold text-zinc-500">RIR {s.rir >= 4 ? '4+' : s.rir}</span>}
                        </>
                      ) : isNext ? (
                        <span className="text-xs font-black uppercase tracking-widest text-acid">{p ? 'À battre →' : n ? 'Série bonus' : 'Pose ta référence'}</span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </span>
                    <span className={`text-center text-sm font-black ${t?.cls ?? ''}`}>{t?.sign}</span>
                    <span className={`truncate text-right tabular-nums ${isNext && p ? 'text-base font-black text-zinc-100' : 'text-sm text-zinc-500'}`}>
                      {p ? fmtSet(p) : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saisie : pré-remplie, ajustable au pouce */}
          <div className="flex gap-2.5">
            <Stepper label="Kg" value={entry.w} step={exercise.inc} decimal onChange={(w) => setEntry((e) => ({ ...e, w }))} className="flex-[1.35]" />
            <Stepper label="Reps" value={entry.r} step={1} min={1} onChange={(r) => setEntry((e) => ({ ...e, r }))} className="flex-1" />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-14 shrink-0 text-center leading-tight" title="Reps In Reserve : combien tu aurais encore pu en faire">
              <div className="text-sm font-black text-zinc-300">RIR</div>
              <div className="text-[10px] font-semibold text-zinc-500">en réserve</div>
            </div>
            <div className="grid flex-1 grid-cols-5 gap-1.5">
              {RIRS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setEntry((e) => ({ ...e, rir: v }))}
                  aria-pressed={entry.rir === v}
                  className={`h-12 rounded-xl text-lg font-black tabular-nums ${entry.rir === v ? 'bg-zinc-100 text-black' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-700'}`}
                >
                  {v === 4 ? '4+' : v}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-acid text-lg font-black text-black shadow-[0_0_30px_-8px] shadow-acid/50 active:scale-[.98]"
          >
            <Check />
            {editing == null ? `Valider série ${n + 1}` : `Corriger série ${editing + 1}`}
            {editing == null && nextRef && trend(entry, nextRef) === 'up' && <span className="rounded-full bg-black/15 px-2 py-0.5 text-xs">▲ progrès</span>}
          </button>

          {editing != null && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={remove} className="h-12 rounded-xl bg-zinc-800 font-bold text-orange-400 active:bg-zinc-700">
                Supprimer
              </button>
              <button type="button" onClick={cancelEdit} className="h-12 rounded-xl bg-zinc-800 font-bold text-zinc-300 active:bg-zinc-700">
                Annuler
              </button>
            </div>
          )}

          {n === 0 && (
            <button type="button" onClick={onRemove} className="w-full py-1 text-sm font-medium text-zinc-500">
              Retirer cet exercice
            </button>
          )}
        </div>
      )}
    </section>
  );
}
