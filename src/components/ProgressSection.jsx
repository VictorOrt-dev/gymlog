import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { fmtSet, pctChange, previousOf, seriesFor } from '../lib/training';
import { Sparkline } from './Charts';
import { Change } from './ProgressDetail';
import { ChevronRight } from './Icons';

const LAST = 8; // séances visibles dans les mini-courbes

/** Une carte par exercice : 1RM estimé de la dernière séance, variation, mini-courbe. Tap → vue dédiée. */
function Tile({ title, series, onClick }) {
  const last = series.points.at(-1);
  return (
    <button onClick={onClick} className="flex w-full flex-col rounded-2xl bg-card p-3.5 text-left active:opacity-70">
      <span className="flex w-full items-start justify-between gap-2">
        <span className="line-clamp-2 min-h-[2.5em] text-[15px] font-semibold leading-tight">{title}</span>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
      </span>
      <span className="mt-2 flex items-baseline gap-1">
        <span className="font-num text-[22px] font-bold leading-none">{last.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>
        <span className="text-[13px] font-semibold text-muted">{series.unit}</span>
      </span>
      <span className="mt-1 truncate text-[13px] text-muted">
        <Change pct={pctChange(last.value, previousOf(series, last)?.value)} /> · {fmtSet(last.best)}
      </span>
      <Sparkline values={series.points.slice(-LAST).map((p) => p.value)} height={34} className="mt-3" />
    </button>
  );
}

/** Grille « Force par exercice » de l'onglet Progrès : un graphique par exercice, la force avant tout. */
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
    <section className="mt-6">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-bold tracking-tight">Force par exercice</h2>
        {mine.length > 0 && <span className="text-[13px] text-muted">1RM estimé</span>}
      </div>
      {!mine.length ? (
        <div className="rounded-3xl bg-card p-5">
          <p className="text-[17px] font-semibold">Ta courbe commence ici</p>
          <p className="mt-1 text-[15px] text-muted">Termine ta première séance : la force de chaque exercice s’affichera ici, semaine après semaine.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(all ? exIds : exIds.slice(0, 6)).map((id) => (
              <Tile key={id} title={names[id] ?? 'Exercice supprimé'} series={seriesFor(mine, id)} onClick={() => onOpen(id)} />
            ))}
          </div>
          {exIds.length > 6 && (
            <button onClick={() => setAll(!all)} className="mt-2 h-11 w-full text-[17px] text-pink active:opacity-50">
              {all ? 'Afficher moins' : `Tous les exercices (${exIds.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
