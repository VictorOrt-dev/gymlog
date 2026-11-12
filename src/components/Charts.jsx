import { useLayoutEffect, useRef, useState } from 'react';
import { round } from '../lib/training';

export function useWidth() {
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
export function niceTicks(min, max, count = 3) {
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

const fmtShort = (ts) => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** iOS segmented control. */
export function Segmented({ options, value, onChange, label, size = 'h-11 text-[15px]' }) {
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


const DAY = 864e5;
const fmtDate = fmtShort;

/** Courbe d'un exercice : trait 2px, voile léger, point final cerclé, réticule qui suit le doigt. */
export function LineChart({ points, active, onActive, format, label }) {
  const [ref, w] = useWidth();
  const H = 200;
  const pad = { l: 6, r: 50, t: 14, b: 28 };
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
              <text x={pad.l + iw + 8} y={sy(t)} dy="0.35em" className="fill-muted text-[13px] tabular-nums">
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
          <text x={sx(points[0].x)} y={H - 7} textAnchor={points.length > 1 ? 'start' : 'middle'} className="fill-muted text-[13px]">
            {fmtDate(points[0].x)}
          </text>
          {points.length > 1 && (
            <text x={sx(points.at(-1).x)} y={H - 7} textAnchor="end" className="fill-muted text-[13px]">
              {fmtDate(points.at(-1).x)}
            </text>
          )}
        </svg>
      )}
    </div>
  );
}

/** Mini-courbe pour une carte : trait 2px rose, point final cerclé. Pas d'axe : le chiffre est au-dessus. */
export function Sparkline({ values, height = 36, className = '' }) {
  const [ref, w] = useWidth();
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 5;
  const sx = (i) => (values.length < 2 ? w / 2 : pad + (i / (values.length - 1)) * (w - 2 * pad));
  const sy = (v) => (hi === lo ? height / 2 : pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(v)}`).join('');
  return (
    <div ref={ref} className={className} aria-hidden="true">
      {w > 0 && values.length > 0 && (
        <svg width={w} height={height}>
          <path d={d} fill="none" stroke="var(--color-pink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={sx(values.length - 1)} cy={sy(values.at(-1))} r={4} fill="var(--color-pink)" stroke="var(--color-card)" strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}
