import Stepper from '../Stepper';
import { Check } from '../Icons';

const RIRS = [0, 1, 2, 3, 4];
const LABEL = { wu: 'Valider l’échauffement', drop: 'Valider le drop set' };

/**
 * Le pavé de saisie : kg et reps au pouce, RIR en un tap, un seul gros bouton.
 * Côte à côte si la carte est assez large, l'un sous l'autre sinon (iPhone SE).
 */
export default function EntryPad({ entry, setEntry, inc, mode, editingLabel, nextIndex, badge, flashing, saved, validateRef, onSubmit, onDelete, onCancel }) {
  const showRir = mode !== 'wu';
  return (
    <>
      <div className="mt-3 flex flex-col gap-2 @[20rem]:flex-row">
        <Stepper label="kg" value={entry.w} step={inc} decimal onChange={(w) => setEntry((e) => ({ ...e, w }))} className="@[20rem]:flex-[1.2]" />
        <Stepper label="reps" value={entry.r} step={1} min={1} onChange={(r) => setEntry((e) => ({ ...e, r }))} className="@[20rem]:flex-1" />
      </div>

      {showRir && (
        <div className="mt-2 flex flex-col gap-1.5 @[20rem]:flex-row @[20rem]:items-center @[20rem]:gap-3">
          <span className="shrink-0 pl-1 text-[13px] font-medium leading-tight text-muted @[20rem]:w-[4.75rem]">Reps en réserve</span>
          <div className="grid flex-1 grid-cols-5 gap-0.5 rounded-xl bg-fill p-0.5" role="radiogroup" aria-label="Reps en réserve (RIR), 0 = échec">
            {RIRS.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={entry.rir === v}
                aria-label={v === 0 ? 'Échec (0)' : v === 4 ? '4 ou plus' : String(v)}
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
        onClick={onSubmit}
        className={`mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold text-white transition-transform active:scale-[.97] ${mode === 'work' ? 'bg-pink' : 'bg-fill-hi'} ${saved ? 'animate-pop' : ''}`}
      >
        {flashing && <Check className="h-5 w-5" strokeWidth={3} />}
        {editingLabel ?? LABEL[mode] ?? `Valider la série ${nextIndex}`}
        {badge}
      </button>

      {editingLabel && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onDelete} className="h-12 rounded-full bg-fill text-[17px] font-medium text-pink active:opacity-60">
            Supprimer
          </button>
          <button type="button" onClick={onCancel} className="h-12 rounded-full bg-fill text-[17px] font-medium active:opacity-60">
            Annuler
          </button>
        </div>
      )}
    </>
  );
}
