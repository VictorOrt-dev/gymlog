import { useEffect, useMemo, useState } from 'react';
import { duel, repRecords } from '../lib/stats';
import { useStore } from '../lib/store';
import { METRICS, bestOf, e1rm, fmtSet, pctChange, previousOf, seriesFor } from '../lib/training';
import { LineChart, Segmented } from './Charts';
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
const fmtNum = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const fmtDay = (ts, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(ts).toLocaleDateString('fr-FR', opts);
const longDate = { day: 'numeric', month: 'long', year: 'numeric' };

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
      {vs && <> {vs}</>}
    </span>
  );

/**
 * La progression d'un exercice, semaine après semaine.
 * Par défaut : la force (meilleure série → 1RM estimé). En option : le tonnage effectif (séries RIR ≤ 3).
 * Chaque séance de la liste s'ouvre : c'est aussi l'historique de l'exercice.
 */
export default function ProgressDetail({ exerciseId, onClose, backLabel = 'Accueil' }) {
  const { state, deleteSession, restoreSession } = useStore();
  const notify = useToast();
  const open = exerciseId != null;
  const [metric, setMetric] = useState('best');
  const [range, setRange] = useState('all');
  const [active, setActive] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    setMetric('best');
    setRange('all');
    setActive(null);
    setShowAll(false);
  }, [exerciseId]);

  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === state.profileId), [state.sessions, state.profileId]);
  const series = useMemo(() => (open ? seriesFor(mine, exerciseId, metric) : null), [mine, exerciseId, metric, open]);
  const empty = open && series && !series.points.length;

  useEffect(() => {
    if (empty) onClose(); // dernière séance de l'exercice supprimée : retour à l'accueil
  }, [empty, onClose]);

  if (!open || !series || empty) return null;

  const name = state.exercises.find((e) => e.id === exerciseId)?.name ?? 'Exercice supprimé';
  const days = RANGES.find(([k]) => k === range)[2];
  const inRange = series.points.filter((p) => !days || p.at >= Date.now() - days * DAY);
  const points = inRange.length ? inRange : series.points.slice(-1);
  const idx = active != null && active < points.length ? active : null;
  const cur = points[idx ?? points.length - 1];
  const first = points[0];
  const prev = previousOf(series, cur);

  const allSets = series.points.flatMap((p) => p.sets.map((s) => ({ ...s, at: p.at })));
  const record = bestOf(allSets);
  const heaviest = allSets.reduce((a, b) => (b.w > a.w ? b : a));
  const list = [...points].reverse();
  const repRows = repRecords(allSets);
  const duelRows = duel(state.sessions, state.profiles, exerciseId);

  const reset = (fn) => (v) => {
    fn(v);
    setActive(null);
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
            {backLabel}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pb-16 pt-2">
        <p className="text-[15px] font-medium text-muted">Progression</p>
        <h1 className="text-[30px] font-bold leading-tight tracking-tight">{name}</h1>

        <div className="mt-4 space-y-2">
          <Segmented label="Indicateur" options={[['best', series.bw ? 'Reps max' : 'Force'], ['effective', series.bw ? 'Reps de travail' : 'Tonnage effectif']]} value={metric} onChange={reset(setMetric)} />
          <Segmented label="Période" options={RANGES.map(([k, t]) => [k, t])} value={range} onChange={reset(setRange)} size="h-11 text-[13px]" />
        </div>

        <section className="mt-3 rounded-3xl bg-card p-4">
          <div className="px-1">
            <p className="text-[13px] font-semibold text-muted">{series.bw ? series.label : METRICS[metric].short}</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-num text-[34px] font-bold leading-none">{fmtNum(cur.value)}</span>
              <span className="text-[17px] font-semibold text-muted">{series.unit}</span>
            </div>
            <p className="mt-1 text-[15px] text-muted first-letter:uppercase">
              {idx != null || points.length < 2 ? (
                <>
                  {fmtDay(cur.at)} · meilleure série {fmtSet(cur.best)} · <Change pct={pctChange(cur.value, prev?.value)} vs="vs la précédente" />
                </>
              ) : (
                <Change pct={pctChange(cur.value, first.value)} vs={`depuis le ${fmtDay(first.at, { day: 'numeric', month: 'short' })}`} />
              )}
            </p>
          </div>
          <div className="mt-3">
            <LineChart
              points={points}
              active={idx}
              onActive={setActive}
              format={(v) => (v >= 10000 ? `${fmtNum(v / 1000)} k` : fmtNum(v))}
              label={`${name} : ${series.label}, ${points.length} séances`}
            />
          </div>
          <p className="mt-2 px-1 text-[13px] text-muted">Glisse le doigt sur la courbe pour lire chaque séance.</p>
        </section>

        <p className="mt-3 px-4 text-[13px] leading-snug text-muted">
          {series.bw ? 'Au poids du corps, on suit les reps. Au-delà de 15 reps par série, ajoute du lest.' : METRICS[metric].help}
        </p>

        <Group title="Records" className="mt-8">
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Meilleure série</span>
            <span className="text-right">
              <span className="font-num text-[17px] font-semibold">{fmtSet(record)}</span>
              <span className="block text-[13px] text-muted">{fmtDay(record.at, longDate)}</span>
            </span>
          </div>
          {!series.bw && (
            <>
              <div className="sep flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[17px]">1RM estimé</span>
                <span className="font-num text-[17px] font-semibold">{fmtNum(Math.round(e1rm(record) * 2) / 2)} kg</span>
              </div>
              <div className="sep flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[17px]">Charge max</span>
                <span className="text-right">
                  <span className="font-num text-[17px] font-semibold">{fmtSet(heaviest)}</span>
                  <span className="block text-[13px] text-muted">{fmtDay(heaviest.at, longDate)}</span>
                </span>
              </div>
            </>
          )}
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Séances</span>
            <span className="font-num text-[17px] font-semibold">{series.points.length}</span>
          </div>
        </Group>

        {/* Records par nombre de reps : la charge max soulevée pour au moins N reps */}
        {!series.bw && repRows.length > 0 && (
          <Group title="Records par reps" className="mt-8" footer="La charge la plus lourde soulevée pour au moins ce nombre de reps.">
            {repRows.map((x) => (
              <div key={x.r} className="sep flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[17px]">
                  {x.r} rep{x.r > 1 ? 's' : ''}
                </span>
                <span className="text-right">
                  <span className="font-num text-[17px] font-semibold">{fmtNum(x.w)} kg</span>
                  <span className="block text-[13px] text-muted">
                    {x.reps !== x.r ? `fait à ${x.reps} reps · ` : ''}
                    {x.at ? fmtDay(x.at, { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </span>
              </div>
            ))}
          </Group>
        )}

        {/* Duel amical : la meilleure série de chaque pote sur cet exercice */}
        {duelRows.length > 1 && (
          <Group title="Duel" className="mt-8" footer="1RM estimé de la meilleure série de chacun (reps + RIR).">
            {duelRows.map((d, k) => (
              <div key={d.profile.id} className="sep px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${k === 0 ? 'bg-pink text-white' : 'bg-fill-hi text-white'}`}>{(d.profile.name || '?')[0].toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">
                    {d.profile.name}
                    {d.profile.id === state.profileId && <span className="text-[13px] font-normal text-muted"> · toi</span>}
                  </span>
                  <span className="text-right">
                    <span className="font-num text-[17px] font-semibold">{fmtNum(d.e1rm)} kg</span>
                    <span className="block font-num text-[13px] text-muted">{fmtSet(d.best)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
                  <div className={`h-full rounded-full ${k === 0 ? 'bg-pink' : 'bg-muted'}`} style={{ width: `${(d.e1rm / duelRows[0].e1rm) * 100}%` }} />
                </div>
              </div>
            ))}
          </Group>
        )}

        {/* Les valeurs de la courbe, lisibles sans la toucher — et l'historique : chaque séance s'ouvre */}
        <Group title="Séance par séance" className="mt-8" footer="Touche une séance pour revoir chaque série.">
          {(showAll ? list : list.slice(0, 10)).map((p) => (
            <button key={p.session.id} onClick={() => setSessionId(p.session.id)} className="sep flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left active:bg-fill">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold first-letter:uppercase">{fmtDay(p.at)}</div>
                <div className="truncate text-[15px] text-muted">
                  {p.sets.length} séries · meilleure {fmtSet(p.best)}
                </div>
              </div>
              <span className="shrink-0 font-num text-[17px] font-semibold">
                {fmtNum(p.value)} <span className="text-[15px] font-normal text-muted">{series.unit}</span>
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
