import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { e1rm, fmtSet, fmtW, round } from '../lib/training';
import { Group, LargeTitle, Page } from './ui';

const DAY = 864e5;
const fmtNum = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
const fmtDate = (ts, opts = { day: 'numeric', month: 'short' }) => new Date(ts).toLocaleDateString('fr-FR', opts);
const roundHalf = (x) => Math.round(x * 2) / 2;
const setsOf = (s) => s.items.reduce((n, it) => n + it.sets.length, 0);
const bestSet = (sets) => sets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a));

const mondayOf = (ts) => {
  const d = new Date(new Date(ts).setHours(0, 0, 0, 0));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const METRICS = [
  { key: 'e1rm', label: 'Force', unit: 'kg', help: '1RM estimé : le poids que tu pourrais soulever une seule fois.', value: (sets) => roundHalf(Math.max(...sets.map(e1rm))) },
  { key: 'max', label: 'Charge max', unit: 'kg', help: 'La charge la plus lourde soulevée à chaque séance.', value: (sets) => Math.max(...sets.map((s) => s.w)) },
  { key: 'volume', label: 'Volume', unit: 'kg', help: 'Poids × reps, toutes les séries de la séance additionnées.', value: (sets) => sets.reduce((a, s) => a + s.w * s.r, 0) },
];
const BW_METRICS = [
  { key: 'reps', label: 'Reps max', unit: 'reps', help: 'Le plus de reps en une seule série.', value: (sets) => Math.max(...sets.map((s) => s.r)) },
  { key: 'total', label: 'Reps totales', unit: 'reps', help: 'Toutes les reps de la séance additionnées.', value: (sets) => sets.reduce((a, s) => a + s.r, 0) },
];
const RANGES = [
  ['1m', '1 mois', 30],
  ['3m', '3 mois', 90],
  ['all', 'Tout', null],
];

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Graduations « rondes » (1, 2, 2,5, 5 × 10ⁿ) pour un axe lisible. */
function niceTicks(min, max, count = 3) {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.05);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round(v));
  return { lo, hi: hi === lo ? lo + step : hi, ticks };
}

const barPath = (x, y, w, h, r) => {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

/** iOS segmented control. */
function Segmented({ options, value, onChange, label, size = 'h-9 text-[15px]' }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-0.5 rounded-xl bg-fill p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([key, text]) => (
        <button
          key={key}
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={`rounded-[10px] font-semibold ${size} ${value === key ? 'bg-seg text-white shadow-sm' : 'text-muted'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Colonnes « séries par semaine ». Une seule série → une seule couleur ; la valeur s'affiche sur la colonne touchée. */
function WeeklyBars({ weeks, active, onActive }) {
  const [ref, w] = useWidth();
  const H = 132;
  const padT = 22;
  const padB = 24;
  const { hi } = niceTicks(0, Math.max(1, ...weeks.map((x) => x.value)), 2);
  const slot = w / weeks.length;
  const bw = Math.max(6, Math.min(24, slot - 12));
  const sy = (v) => padT + (1 - v / hi) * (H - padT - padB);

  return (
    <div ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Séries par semaine sur les 8 dernières semaines">
          <line x1={0} x2={w} y1={H - padB} y2={H - padB} stroke="var(--color-line)" strokeWidth={1} />
          {weeks.map((wk, i) => {
            const x = i * slot + (slot - bw) / 2;
            const y = sy(wk.value);
            return (
              <g key={i} onPointerEnter={() => onActive(i)} onClick={() => onActive(i)} className="cursor-pointer">
                <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
                {wk.value > 0 && <path d={barPath(x, y, bw, H - padB - y, 4)} fill="var(--color-pink)" />}
                {i === active && (
                  <text x={x + bw / 2} y={y - 7} textAnchor="middle" className="fill-white text-[12px] font-semibold">
                    {wk.value}
                  </text>
                )}
                <text x={x + bw / 2} y={H - 7} textAnchor="middle" className={`text-[11px] ${i === active ? 'fill-white' : 'fill-muted'}`}>
                  {wk.start.getDate()}/{wk.start.getMonth() + 1}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** Courbe d'un exercice : trait 2px, voile léger, point final cerclé, réticule qui suit le doigt. */
function LineChart({ points, active, onActive, format, label }) {
  const [ref, w] = useWidth();
  const H = 200;
  const pad = { l: 6, r: 46, t: 14, b: 26 };
  const ys = points.map((p) => p.y);
  const { lo, hi, ticks } = niceTicks(Math.min(...ys), Math.max(...ys), 3);
  let x0 = points[0].x;
  let x1 = points.at(-1).x;
  if (x1 === x0) {
    x0 -= DAY;
    x1 += DAY;
  }
  const iw = Math.max(1, w - pad.l - pad.r);
  const ih = H - pad.t - pad.b;
  const sx = (x) => pad.l + ((x - x0) / (x1 - x0)) * iw;
  const sy = (y) => pad.t + (1 - (y - lo) / (hi - lo)) * ih;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join('');
  const area = `${line}L${sx(points.at(-1).x)},${pad.t + ih}L${sx(points[0].x)},${pad.t + ih}Z`;
  const a = active ?? points.length - 1;

  const nearest = (clientX) => {
    const px = clientX - ref.current.getBoundingClientRect().left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(sx(p.x) - px) < Math.abs(sx(points[best].x) - px)) best = i;
    });
    return best;
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label={label}
      onPointerDown={(e) => onActive(nearest(e.clientX))}
      onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && onActive(nearest(e.clientX))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onActive(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onActive(Math.max(0, a - 1));
        if (e.key === 'ArrowRight') onActive(Math.min(points.length - 1, a + 1));
        if (e.key === 'Escape') onActive(null);
      }}
      className="touch-pan-y select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pink/60"
    >
      {w > 0 && (
        <svg width={w} height={H}>
          <defs>
            <linearGradient id="progress-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-pink)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--color-pink)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.l + iw + 8} y={sy(t)} dy="0.35em" className="fill-muted text-[11px] tabular-nums">
                {format(t)}
              </text>
            </g>
          ))}
          {points.length > 1 && <path d={area} fill="url(#progress-area)" />}
          <path d={line} fill="none" stroke="var(--color-pink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {active != null && <line x1={sx(points[a].x)} x2={sx(points[a].x)} y1={pad.t} y2={pad.t + ih} stroke="var(--color-muted)" strokeWidth={1} />}
          {points.length <= 16 &&
            points.map((p, i) => i !== a && <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4} fill="var(--color-pink)" stroke="var(--color-card)" strokeWidth={2} />)}
          <circle cx={sx(points[a].x)} cy={sy(points[a].y)} r={6} fill="var(--color-pink)" stroke="var(--color-card)" strokeWidth={2.5} />
          <text x={sx(points[0].x)} y={H - 7} textAnchor={points.length > 1 ? 'start' : 'middle'} className="fill-muted text-[11px]">
            {fmtDate(points[0].x)}
          </text>
          {points.length > 1 && (
            <text x={sx(points.at(-1).x)} y={H - 7} textAnchor="end" className="fill-muted text-[11px]">
              {fmtDate(points.at(-1).x)}
            </text>
          )}
        </svg>
      )}
    </div>
  );
}

const Delta = ({ value, unit, text }) => (
  <span>
    <span className={value > 0 ? 'text-pink' : 'text-muted'}>{value > 0 ? '▲' : value < 0 ? '▼' : '='}</span>{' '}
    <span className="font-semibold text-white">
      {value > 0 ? '+' : ''}
      {fmtNum(value)} {unit}
    </span>{' '}
    {text}
  </span>
);

/** Onglet « Progrès » : régularité sur 8 semaines, puis la courbe de chaque exercice. */
export default function Progress() {
  const { state } = useStore();
  const pid = state.profileId;
  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === pid), [state.sessions, pid]);
  const names = useMemo(() => Object.fromEntries(state.exercises.map((e) => [e.id, e.name])), [state.exercises]);

  // Régularité : séries par semaine, 8 semaines
  const weeks = useMemo(() => {
    const monday = mondayOf(Date.now());
    return Array.from({ length: 8 }, (_, i) => {
      const start = addDays(monday, -7 * (7 - i));
      const end = addDays(start, 7);
      const ss = mine.filter((s) => s.startedAt >= +start && s.startedAt < +end);
      return { start, value: ss.reduce((n, s) => n + setsOf(s), 0), sessions: ss.length };
    });
  }, [mine]);
  const [activeWeek, setActiveWeek] = useState(7);
  const wk = weeks[activeWeek];
  const wkDelta = activeWeek > 0 ? wk.value - weeks[activeWeek - 1].value : 0;

  // Exercices avec un historique, du plus pratiqué au moins pratiqué
  const byEx = useMemo(() => {
    const m = {};
    for (const s of mine) for (const it of s.items) if (it.sets.length) (m[it.exerciseId] ??= []).push({ at: s.startedAt, sets: it.sets });
    return m;
  }, [mine]);
  const exIds = useMemo(() => Object.keys(byEx).sort((a, b) => byEx[b].length - byEx[a].length || byEx[b].at(-1).at - byEx[a].at(-1).at), [byEx]);

  const [exPick, setExPick] = useState(null);
  const [metricKey, setMetricKey] = useState('e1rm');
  const [range, setRange] = useState('all');
  const [active, setActive] = useState(null);
  const [showAll, setShowAll] = useState(false);

  const exId = exPick && byEx[exPick] ? exPick : exIds[0];
  const entries = byEx[exId] ?? [];
  const bodyweight = entries.length > 0 && entries.every((e) => e.sets.every((s) => s.w === 0));
  const metrics = bodyweight ? BW_METRICS : METRICS;
  const metric = metrics.find((m) => m.key === metricKey) ?? metrics[0];
  const days = RANGES.find(([k]) => k === range)[2];
  const inRange = entries.filter((e) => !days || e.at >= Date.now() - days * DAY);
  const points = (inRange.length ? inRange : entries.slice(-1)).map((e) => ({ x: e.at, y: metric.value(e.sets), best: bestSet(e.sets) }));
  const shown = active != null && active < points.length ? active : null;
  const cur = points[shown ?? points.length - 1];
  const first = points[0];

  const pick = (fn) => (v) => {
    fn(v);
    setActive(null);
    setShowAll(false);
  };

  // Records, tous temps confondus
  const allSets = entries.flatMap((e) => e.sets.map((s) => ({ ...s, at: e.at })));
  const record = allSets.length ? allSets.reduce((a, b) => (e1rm(b) > e1rm(a) ? b : a)) : null;
  const heaviest = allSets.length ? allSets.reduce((a, b) => (b.w > a.w ? b : a)) : null;
  const list = [...points].reverse();

  if (!mine.length) {
    return (
      <Page>
        <LargeTitle title="Progrès" />
        <div className="mt-5 rounded-3xl bg-card p-5">
          <p className="text-[20px] font-bold">Pas encore de données</p>
          <p className="mt-1 text-[15px] text-muted">Termine ta première séance : tes courbes de progression apparaîtront ici.</p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <LargeTitle title="Progrès" />

      {/* Régularité */}
      <section className="mt-5 rounded-3xl bg-card p-5">
        <p className="text-[13px] font-semibold text-muted">Séries par semaine</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-num text-[34px] font-bold leading-none">{wk.value}</span>
          <span className="text-[17px] font-semibold text-muted">séries</span>
        </div>
        <p className="mt-1 text-[15px] text-muted">
          {activeWeek === 7 ? 'Cette semaine' : `Semaine du ${fmtDate(wk.start, { day: 'numeric', month: 'long' })}`} · {wk.sessions} séance{wk.sessions > 1 ? 's' : ''}
          {activeWeek > 0 && activeWeek < 7 && (
            <>
              {' · '}
              <Delta value={wkDelta} unit="" text="vs la précédente" />
            </>
          )}
        </p>
        <div className="mt-4">
          <WeeklyBars weeks={weeks} active={activeWeek} onActive={setActiveWeek} />
        </div>
      </section>

      {/* Par exercice */}
      <h2 className="mb-3 mt-9 px-1 text-[20px] font-bold tracking-tight">Par exercice</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {exIds.map((id) => (
          <button
            key={id}
            onClick={() => pick(setExPick)(id)}
            className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[15px] font-medium ${id === exId ? 'bg-white text-black' : 'bg-card text-white active:bg-fill'}`}
          >
            {names[id] ?? 'Exercice supprimé'}
          </button>
        ))}
      </div>

      <section className="mt-3 rounded-3xl bg-card p-4">
        <Segmented label="Mesure" options={metrics.map((m) => [m.key, m.label])} value={metric.key} onChange={pick(setMetricKey)} />

        <div className="mt-4 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-num text-[34px] font-bold leading-none">{fmtNum(cur.y)}</span>
              <span className="text-[17px] font-semibold text-muted">{metric.unit}</span>
            </div>
            <p className="mt-1 truncate text-[15px] text-muted first-letter:uppercase">
              {shown != null ? (
                <>
                  {fmtDate(cur.x, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmtSet(cur.best)}
                </>
              ) : points.length > 1 ? (
                <Delta value={round(cur.y - first.y)} unit={metric.unit} text={`depuis le ${fmtDate(first.x)}`} />
              ) : (
                'Une seule séance pour l’instant'
              )}
            </p>
          </div>
        </div>

        <div className="mt-3">
          <LineChart
            points={points}
            active={shown}
            onActive={setActive}
            format={(v) => (metric.unit === 'kg' && v >= 10000 ? `${fmtNum(v / 1000)} k` : fmtNum(v))}
            label={`${names[exId]} : ${metric.label}, ${points.length} séances`}
          />
        </div>

        <div className="mt-3">
          <Segmented label="Période" options={RANGES.map(([k, t]) => [k, t])} value={range} onChange={pick(setRange)} size="h-8 text-[13px]" />
        </div>
        <p className="mt-3 px-1 text-[13px] text-muted">{metric.help} Glisse le doigt sur la courbe pour voir chaque séance.</p>
      </section>

      <Group title="Records" className="mt-8">
        {record && (
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Meilleure série</span>
            <span className="text-right">
              <span className="font-num text-[17px] font-semibold">{fmtSet(record)}</span>
              <span className="block text-[13px] text-muted">{fmtDate(record.at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </span>
          </div>
        )}
        {!bodyweight && heaviest && (
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">Charge max</span>
            <span className="font-num text-[17px] font-semibold">{fmtW(heaviest.w)} kg</span>
          </div>
        )}
        {!bodyweight && record && (
          <div className="sep flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[17px]">1RM estimé</span>
            <span className="font-num text-[17px] font-semibold">{fmtNum(roundHalf(e1rm(record)))} kg</span>
          </div>
        )}
        <div className="sep flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-[17px]">Séances</span>
          <span className="font-num text-[17px] font-semibold">{entries.length}</span>
        </div>
      </Group>

      {/* Les valeurs de la courbe, lisibles sans toucher le graphique */}
      <Group title="Séance par séance" className="mt-8">
        {(showAll ? list : list.slice(0, 6)).map((p) => (
          <div key={p.x} className="sep flex items-center gap-3 px-4 py-3">
            <span className="w-24 shrink-0 text-[15px] text-muted first-letter:uppercase">{fmtDate(p.x, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <span className="flex-1 font-num text-[15px]">{fmtSet(p.best)}</span>
            <span className="font-num text-[15px] font-semibold">
              {fmtNum(p.y)} <span className="font-normal text-muted">{metric.unit}</span>
            </span>
          </div>
        ))}
        {list.length > 6 && (
          <button onClick={() => setShowAll(!showAll)} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
            {showAll ? 'Afficher moins' : `Tout afficher (${list.length})`}
          </button>
        )}
      </Group>
    </Page>
  );
}
