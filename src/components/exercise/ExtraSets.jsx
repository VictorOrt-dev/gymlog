import { fmtSet } from '../../lib/training';

/** Une ligne de pastilles pour les séries « à part » (échauffements, drop sets) : notées, touchables, hors comparaison. */
export default function ExtraSets({ label, sets, editing, flash, onEdit, emptyText }) {
  return (
    <div className="mb-1 flex flex-wrap items-center gap-x-1.5 px-1">
      <span className="mr-1 text-[13px] font-medium text-muted">{label}</span>
      {sets.map(({ s, i }) => (
        <button key={i} type="button" onClick={() => onEdit(i)} className="flex h-11 items-center">
          <span className={`rounded-full px-2.5 py-1 font-num text-[13px] font-semibold tabular-nums ${editing === i ? 'bg-seg text-white' : 'bg-fill text-white/85'} ${flash === i ? 'animate-set-in' : ''}`}>
            {fmtSet(s)}
          </span>
        </button>
      ))}
      {!sets.length && emptyText && <span className="text-[13px] text-muted">{emptyText}</span>}
    </div>
  );
}
