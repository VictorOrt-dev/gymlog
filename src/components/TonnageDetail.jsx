import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { e1rm, fmtInt, fmtSet, pctChange, previousOf, seriesFor } from '../lib/training';
import { Columns, Segmented } from './Charts';
import SessionDetail from './SessionDetail';
import { useToast } from './Toast';
import { Back, ChevronRight } from './Icons';
import { Group } from './ui';

const DAY = 864e5;
const RANGES = [
  ['1m', '1 mois', 30],
  ['3m', '3 mois', 90],
  ['all', 'Tout', null],
];
const fmtDay = (ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(ts).toLocaleDateString('fr-FR', opts);

export const Change = ({ pct, vs }) =>
  pct == null ? (
    <span>1re séance</span>
  ) : (
    <span>
      <span className={pct > 0 ? 'text-pink' : 'text-muted'}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '='}</span>{' '}
      <span className="font-semibold text-white">
        {pct > 0 ? '+' : ''}
        {pct} %
      </span>
      {vs && <> vs {vs}</>}
    </span>
  );

/**
 * Vue détaillée du tonnage (Σ poids × reps sur toutes les séries), séance par séance.
 * `exerciseId` : un exercice ; `null` : toutes les séances. Sert aussi d'historique : chaque séance s'ouvre.
 */
export default function TonnageDetail({ exerciseId, onClose }) {
  const { state, deleteSession, restoreSession } = useStore();
  const notify = useToast();
  const open = exerciseId !== undefined;
  const [range, setRange] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setRange('all');
    setSelected(null);
    setShowAll(false);
  }, [exerciseId, open]);

  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === state.profileId), [state.sessions, state.profileId]);
  const series = useMemo(() => (open ? seriesFor(mine, exerciseId) : null), [mine, exerciseId, open]);
  const empty = open && series && !series.points.length;

  // Dernière séance de cet exercice supprimée : plus rien à montrer, on revient à l'accueil.
  useEffect(() => {
    if (empty) onClose();
  }, [empty, onClose]);

  if (!open || !series || empty) return null;

  const name = exerciseId ? state.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercice supprimé' : 'Toutes les séances';
  const days = RANGES.find(([k]) => k === range)[2];
  const inRange = series.points.filter((p) => !days || p.at >= Date.now() - days * DAY);
  const points = inRange.length ? inRange : series.points.slice(-1);
  const idx = selected != null && selected < points.length ? selected : points.length - 1;
  const cur = points[idx];
  const prevPoint = previousOf(series, cur);
  const unit = series.unit;
  const metricName = series.bw ? 'Reps totales' : 'Tonnage';

  const record = series.points.reduce((a, b) => (b.value > a.value ? b : a), series.points[0]);
  const allSets = exerciseId ? series.points.flatMap((p) => p.sets.map((s) => ({ ...s, at: p.at }))) : [];
  const bestSet = allSets.length ? allSets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a)) : null;
  const average = points.reduce((a, p) => a + p.value, 0) / points.length;
  const list = [...points].reverse();

  const pick = (fn) => (v) => {
    fn(v);
    setSelected(null);
    setShowAll(false);
  };

  const removeSession = (s) => {
    deleteSession(s.id);
    setSessionId(null);
    notify(`Séance « ${s.name} » supprimée`, () => restoreSession(s));
  };

  return (
    <div className="fixed inset-0 z-[55] animate-sheet overflow-y-auto overscroll-contain bg-black">
      <header className="sticky top-0 z-10 border-b-[0.5px] border-line/70 bg-black/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center px-2">
          <button onClick={onClose} className="flex h-11 items-center pr-2 text-[17px] text-pink active:opacity-50">
            <Back className="h-6 w-6" strokeWidth={2.5} />
            Accueil
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pb-16 pt-2">
        <p className="text-[15px] font-medium text-muted">{metricName} par séance</p>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight">{name}</h1>

        <div className="mt-4">
          <Segmented label="Période" options={RANGES.map(([k, t]) => [k, t])} value={range} onChange={pick(setRange)} size="h-8 text-[13px]" />
        </div>

        <section className="mt-3 rounded-3xl bg-card p-4">
          <div className="px-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-num text-[34px] font-bold leading-none">{fmtInt(cur.value)}</span>
              <span className="text-[17px] font-semibold text-muted">{unit}</span>
            </div>
            <p className="mt-1 text-[15px] text-muted first-letter:uppercase">
              {fmtDay(cur.at)} · {exerciseId ? `${cur.sets.length} séries` : cur.session.name} ·{' '}
              <Change pct={pctChange(cur.value, prevPoint?.value)} vs={exerciseId ? 'précédente' : `${cur.session.name} précédent`} />
            </p>
          </div>
          <div className="mt-3">
            <Columns points={points} selected={selected} onSelect={setSelected} label={`${metricName} de ${name}, ${points.length} séances`} />
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">Touche une colonne pour voir la séance.</p>
        </section>

        <div className="mt-4 rounded-2xl bg-pink/12 px-4 py-3 text-[15px] leading-snug">
          <p className="font-semibold text-pink">Le mot du coach</p>
          <p className="mt-1 text-white/85">
            {series.bw
              ? 'Au poids du corps, on compte les reps : si le total monte, tu progresses. Quand tu dépasses 15 reps par série, ajoute du lest.'
              : 'Le tonnage, c’est poids × reps, additionné sur toutes les séries : ton travail total. S’il monte de semaine en semaine, tu progresses. Fais-le monter avec des séries propres (1 à 3 reps en réserve), pas en empilant des séries bâclées.'}
          </p>
        </div>

        <Group title="Records" className="mt-8">
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Meilleur {series.bw ? 'total' : 'tonnage'}</span>
            <span className="text-right">
              <span className="font-num text-[17px] font-semibold">
                {fmtInt(record.value)} {unit}
              </span>
              <span className="block text-[13px] text-muted">{fmtDay(record.at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </span>
          </div>
          {bestSet && (
            <div className="sep flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[17px]">Meilleure série</span>
              <span className="text-right">
                <span className="font-num text-[17px] font-semibold">{fmtSet(bestSet)}</span>
                <span className="block text-[13px] text-muted">{fmtDay(bestSet.at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </span>
            </div>
          )}
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Moyenne par séance</span>
            <span className="font-num text-[17px] font-semibold">
              {fmtInt(average)} {unit}
            </span>
          </div>
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Séances</span>
            <span className="font-num text-[17px] font-semibold">{series.points.length}</span>
          </div>
        </Group>

        {/* Les valeurs du graphique, lisibles sans le toucher — et l'historique : chaque séance s'ouvre */}
        <Group title="Séance par séance" className="mt-8" footer="Touche une séance pour revoir chaque série.">
          {(showAll ? list : list.slice(0, 10)).map((p) => (
            <button key={p.session.id} onClick={() => setSessionId(p.session.id)} className="sep flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left active:bg-fill">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold first-letter:uppercase">{fmtDay(p.at)}</div>
                <div className="truncate text-[15px] text-muted">
                  {exerciseId ? `${p.sets.length} séries · meilleure ${fmtSet(p.sets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a)))}` : p.session.name}
                </div>
              </div>
              <span className="shrink-0 font-num text-[17px] font-semibold">
                {fmtInt(p.value)} <span className="text-[15px] font-normal text-muted">{unit}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
            </button>
          ))}
          {list.length > 10 && (
            <button onClick={() => setShowAll(!showAll)} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
              {showAll ? 'Afficher moins' : `Tout afficher (${list.length})`}
            </button>
          )}
        </Group>
      </div>

      <SessionDetail session={mine.find((s) => s.id === sessionId)} onClose={() => setSessionId(null)} onDelete={() => removeSession(mine.find((s) => s.id === sessionId))} />
    </div>
  );
}
