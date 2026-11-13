import { useEffect, useState } from 'react';
import { BIOMECH, RANGES, exerciseNameError } from '../lib/defaults';
import { useStore } from '../lib/store';
import { Pencil } from './Icons';

/**
 * Les réglages d'un exercice, au même endroit partout (séance et séances types) :
 * son nom (modifiable : « Développé couché » → « Développé couché prise serrée »), sa fourchette, ta note.
 * L'historique est lié à l'exercice, pas à son nom : renommer ne perd ni courbe ni record.
 */
export default function ExerciseSettings({ exerciseId, onSwap, swapLabel = 'Essayer à la place', exclude = [] }) {
  const { state, renameExercise, setExerciseRange, setNote } = useStore();
  const ex = state.exercises.find((e) => e.id === exerciseId);
  const [name, setName] = useState(ex?.name ?? '');
  useEffect(() => setName(ex?.name ?? ''), [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ex) return null;
  const error = exerciseNameError(state.exercises, exerciseId, name);
  const note = state.notes?.[state.profileId]?.[exerciseId] ?? '';
  const bio = BIOMECH[exerciseId];
  const alt = bio?.alt && state.exercises.find((e) => e.id === bio.alt);

  return (
    <>
      <label className="block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Nom de l’exercice</span>
        <span className="flex items-center gap-2 rounded-xl bg-fill pl-3.5 pr-3 focus-within:ring-1 focus-within:ring-pink">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!exerciseNameError(state.exercises, exerciseId, e.target.value)) renameExercise(exerciseId, e.target.value); // enregistré à chaque frappe
            }}
            onBlur={() => error && setName(ex.name)} // nom vide ou déjà pris : on reprend le nom enregistré
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            maxLength={50}
            enterKeyHint="done"
            aria-label="Nom de l’exercice"
            aria-invalid={!!error}
            className="h-12 min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
          />
          <Pencil className="h-5 w-5 shrink-0 text-muted" />
        </span>
      </label>
      <p className={`mb-4 mt-1.5 px-1 text-[13px] leading-snug ${error ? 'text-pink' : 'text-muted'}`} role={error ? 'alert' : undefined}>
        {error ?? 'Ajoute une variante, une prise, une machine… Ton historique et tes records restent attachés.'}
      </p>

      {/* Biomécanique : une piste, jamais une obligation — le plaisir et la régularité comptent plus que l'exercice parfait */}
      {(alt || bio?.tip) && (
        <div className="mb-4 rounded-2xl bg-fill px-3.5 py-3">
          <p className="text-[13px] font-semibold text-pink">{alt ? 'Variante à essayer' : 'Réglage conseillé'}</p>
          {alt && <p className="mt-0.5 text-[17px] font-semibold leading-tight">{alt.name}</p>}
          <p className="mt-1 text-[13px] leading-snug text-muted">{alt ? bio.why : bio.tip}</p>
          {alt && onSwap && !exclude.includes(alt.id) && (
            <button type="button" onClick={() => onSwap(alt.id)} className="mt-2.5 h-11 w-full rounded-full bg-card text-[15px] font-semibold text-pink active:opacity-60">
              {swapLabel}
            </button>
          )}
          {alt && <p className="mt-2 text-[13px] leading-snug text-muted">Tu kiffes le tien ? Garde-le : le meilleur exercice, c’est celui que tu fais avec plaisir et régularité.</p>}
        </div>
      )}

      <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">Fourchette de reps</p>
      <div className="mb-1 grid grid-cols-6 gap-1" role="radiogroup" aria-label="Fourchette de reps">
        {RANGES.map(([a, b]) => {
          const on = ex.range?.[0] === a && ex.range?.[1] === b;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setExerciseRange(exerciseId, [a, b])}
              className={`h-11 rounded-xl font-num text-[15px] font-semibold ${on ? 'bg-pink text-white' : 'bg-fill text-white active:bg-fill-hi'}`}
            >
              {a}–{b}
            </button>
          );
        })}
      </div>
      <p className="mb-3 px-1 text-[13px] leading-snug text-muted">Monte les reps jusqu’en haut sur toutes tes séries principales, puis charge et repars du bas.</p>
      <label className="mb-4 block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Note (réglage machine, prise…)</span>
        <input
          key={exerciseId}
          defaultValue={note}
          maxLength={120}
          onBlur={(e) => setNote(exerciseId, e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          placeholder="Ex. : siège cran 4, prise neutre"
          enterKeyHint="done"
          className="h-11 w-full rounded-xl bg-fill px-3.5 text-[16px] outline-none placeholder:text-muted focus:ring-1 focus:ring-pink/60"
        />
      </label>
    </>
  );
}
