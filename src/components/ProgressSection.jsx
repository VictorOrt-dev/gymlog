import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { fmtInt, pctChange, previousOf, seriesFor } from '../lib/training';
import { Sparkbars } from './Charts';
import { Change } from './TonnageDetail';
import { ChevronRight } from './Icons';

const LAST = 8; // séances visibles dans les mini-graphiques

/** Une carte cliquable : titre, dernière valeur en gros, variation, mini-colonnes. */
function Tile({ title, series, onClick, big = false }) {
  const pts = series.points;
  const last = pts.at(-1);
  const prev = previousOf(series, last);
  return (
    <button onClick={onClick} className={`flex w-full flex-col bg-card text-left active:opacity-70 ${big ? 'rounded-3xl p-5' : 'rounded-2xl p-3.5'}`}>
      <span className="flex w-full items-start justify-between gap-2">
        <span className={big ? 'text-[13px] font-semibold text-muted' : 'line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-tight'}>{title}</span>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
      </span>
      <span className={`flex items-baseline gap-1 ${big ? 'mt-1' : 'mt-2'}`}>
        <span className={`font-num font-bold leading-none ${big ? 'text-[34px]' : 'text-[20px]'}`}>{fmtInt(last.value)}</span>
        <span className={`font-semibold text-muted ${big ? 'text-[17px]' : 'text-[13px]'}`}>{series.unit}</span>
      </span>
      <span className={`mt-1 text-muted ${big ? 'text-[15px]' : 'text-[13px]'}`}>
        {big && <>{last.session.name} · </>}
        <Change pct={pctChange(last.value, prev?.value)} />
      </span>
      <Sparkbars values={pts.slice(-LAST).map((p) => p.value)} height={big ? 56 : 32} className={big ? 'mt-4' : 'mt-3'} />
    </button>
  );
}

/** Section « Progression » de l'écran principal : le tonnage en un coup d'œil, le détail au clic. */
export default function ProgressSection({ onOpen }) {
  const { state } = useStore();
  const names = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e.name])), [state.exercises]);
  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === state.profileId), [state.sessions, state.profileId]);
  const [all, setAll] = useState(false);

  // Exercices du plus pratiqué au moins pratiqué
  const exIds = useMemo(() => {
    const count = {};
    const lastAt = {};
    for (const s of mine) {
      for (const it of s.items) {
        if (!it.sets.length) continue;
        count[it.exerciseId] = (count[it.exerciseId] ?? 0) + 1;
        lastAt[it.exerciseId] = s.startedAt;
      }
    }
    return Object.keys(count).sort((a, b) => count[b] - count[a] || lastAt[b] - lastAt[a]);
  }, [mine]);

  return (
    <section className="mt-9">
      <h2 className="mb-2 px-1 text-[20px] font-bold tracking-tight">Progression</h2>
      {!mine.length ? (
        <div className="rounded-3xl bg-card p-5">
          <p className="text-[17px] font-semibold">Ta courbe commence ici</p>
          <p className="mt-1 text-[15px] text-muted">Termine ta première séance : ton tonnage s’affichera ici, séance après séance.</p>
        </div>
      ) : (
        <>
          <Tile big title="Tonnage par séance" series={seriesFor(mine)} onClick={() => onOpen(null)} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(all ? exIds : exIds.slice(0, 4)).map((id) => (
              <Tile key={id} title={names[id] ?? 'Exercice supprimé'} series={seriesFor(mine, id)} onClick={() => onOpen(id)} />
            ))}
          </div>
          {exIds.length > 4 && (
            <button onClick={() => setAll(!all)} className="mt-2 h-11 w-full text-[17px] text-pink active:opacity-50">
              {all ? 'Afficher moins' : `Tous les exercices (${exIds.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
