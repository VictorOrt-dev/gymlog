import { ago, fmtSet, rirText, trend } from '../../lib/training';

const TREND = {
  up: { sign: '▲', cls: 'text-pink', label: 'en progrès' },
  eq: { sign: '=', cls: 'text-muted', label: 'égal' },
  down: { sign: '▼', cls: 'text-muted', label: 'en baisse' },
};
export const COLS = 'grid-cols-[1.25rem_1fr_1.25rem_7.5rem]';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Aujourd'hui vs la dernière fois, série principale par série principale.
 * La ligne « À battre » montre le chiffre exact à dépasser ; un record illumine sa ligne.
 */
export default function SetTable({ mainSets, prevSets, prevAt, records, editing, flash, nextVisible, rowsWanted, onEdit }) {
  const n = mainSets.length;
  const rows = Math.max(n + 1, rowsWanted);
  return (
    <>
      <div className={`grid ${COLS} gap-2 px-1 pb-1 text-[13px] font-medium text-muted`}>
        <span />
        <span>Aujourd'hui</span>
        <span />
        <span className="truncate text-right">{prevAt ? cap(ago(prevAt)) : 'Première fois'}</span>
      </div>
      <div>
        {Array.from({ length: rows }, (_, k) => {
          const s = mainSets[k]?.s;
          const real = mainSets[k]?.i;
          const p = k < rowsWanted ? prevSets[k] : null;
          const isNext = k === n && nextVisible;
          const t = TREND[trend(s, p)];
          const rec = s && records[real];
          return (
            <button
              key={k}
              type="button"
              disabled={!s}
              onClick={() => onEdit(real)}
              className={`grid min-h-11 w-full ${COLS} items-center gap-2 rounded-xl px-1 text-left ${editing === real && s ? 'bg-fill' : rec ? 'bg-pink/12' : 'sep [--sep-inset:0.25rem]'} ${s && flash === real ? 'animate-set-in' : ''}`}
            >
              <span className="font-num text-[13px] font-medium tabular-nums text-muted">{k + 1}</span>
              <span className="truncate">
                {s ? (
                  <>
                    <span className="font-num text-[17px] font-semibold tabular-nums">{fmtSet(s)}</span>
                    {s.rir != null && <span className={`ml-2 text-[13px] ${s.rir === 0 ? 'font-semibold text-white/85' : 'text-muted'}`}>{rirText(s.rir)}</span>}
                  </>
                ) : isNext ? (
                  <span className="text-[15px] font-semibold text-pink">{p ? 'À battre' : n ? 'Série bonus' : 'Pose ta référence'}</span>
                ) : (
                  <span className="text-muted" aria-hidden="true">–</span>
                )}
              </span>
              <span className={`text-center text-[13px] ${t?.cls ?? ''}`} aria-label={t?.label}>
                {t?.sign}
              </span>
              <span className="flex min-w-0 flex-col items-end leading-tight">
                {rec ? (
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
    </>
  );
}
