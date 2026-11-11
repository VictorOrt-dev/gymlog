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

/** Colonne à bout arrondi (4px), carrée sur la ligne de base. */
const barPath = (x, y, w, h, r) => {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

const fmtTick = (v) => (v >= 10000 ? `${round(v / 1000)} k` : Math.round(v).toLocaleString('fr-FR'));
const fmtShort = (ts) => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** iOS segmented control. */
export function Segmented({ options, value, onChange, label, size = 'h-9 text-[15px]' }) {
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

/**
 * Mini-colonnes pour une carte : l'historique en gris, la dernière séance en rose.
 * Pas d'axe ni de valeur : le chiffre est affiché en gros juste au-dessus.
 */
export function Sparkbars({ values, height = 40, className = '' }) {
  const [ref, w] = useWidth();
  const max = Math.max(1, ...values);
  const slot = values.length ? w / values.length : 0;
  const bw = Math.max(2, Math.min(14, slot - 3));
  return (
    <div ref={ref} className={className} aria-hidden="true">
      {w > 0 && (
        <svg width={w} height={height}>
          {values.map((v, i) => {
            const h = Math.max(v > 0 ? 3 : 0, (v / max) * (height - 2));
            return h > 0 && <path key={i} d={barPath(i * slot + (slot - bw) / 2, height - h, bw, h, 2)} fill={i === values.length - 1 ? 'var(--color-pink)' : 'var(--color-faint)'} />;
          })}
        </svg>
      )}
    </div>
  );
}

/**
 * Colonnes cliquables : une colonne = une séance.
 * Toucher (ou survoler) une colonne la sélectionne ; la valeur s'affiche au-dessus et en gros dans l'en-tête.
 */
export function Columns({ points, selected, onSelect, height = 220, label }) {
  const [ref, w] = useWidth();
  const pad = { l: 2, r: 46, t: 26, b: 24 };
  const n = points.length;
  const { hi, ticks } = niceTicks(0, Math.max(1, ...points.map((p) => p.value)), 3);
  const iw = Math.max(1, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const slot = iw / Math.max(1, n);
  const bw = Math.max(1.5, Math.min(24, slot * 0.62, slot - 2));
  const sy = (v) => pad.t + (1 - v / hi) * ih;
  const a = selected ?? n - 1;

  // L'étiquette de valeur ne sort jamais du graphique : alignée sur la colonne près des bords.
  const cx = pad.l + a * slot + slot / 2;
  const labelAnchor = cx < pad.l + 28 ? 'start' : cx > pad.l + iw - 28 ? 'end' : 'middle';
  const labelX = labelAnchor === 'start' ? Math.max(pad.l, cx - bw / 2) : labelAnchor === 'end' ? Math.min(pad.l + iw, cx + bw / 2) : cx;

  const indexAt = (clientX) => {
    const px = clientX - ref.current.getBoundingClientRect().left - pad.l;
    return Math.max(0, Math.min(n - 1, Math.floor(px / slot)));
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label={label}
      onPointerDown={(e) => onSelect(indexAt(e.clientX))}
      onPointerMove={(e) => (e.pointerType === 'mouse' || e.buttons) && onSelect(indexAt(e.clientX))}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onSelect(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onSelect(Math.max(0, a - 1));
        if (e.key === 'ArrowRight') onSelect(Math.min(n - 1, a + 1));
        if (e.key === 'Escape') onSelect(null);
      }}
      className="cursor-pointer touch-pan-y select-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-pink/60"
    >
      {w > 0 && n > 0 && (
        <svg width={w} height={height}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={pad.l + iw} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={pad.l + iw + 8} y={sy(t)} dy="0.35em" className="fill-muted text-[11px] tabular-nums">
                {fmtTick(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x = pad.l + i * slot + (slot - bw) / 2;
            const y = sy(p.value);
            return (
              p.value > 0 && (
                <path
                  key={i}
                  d={barPath(x, y, bw, pad.t + ih - y, Math.min(4, bw / 2))}
                  fill="var(--color-pink)"
                  opacity={selected == null || i === a ? 1 : 0.4}
                  className="transition-opacity duration-150"
                />
              )
            );
          })}
          <text
            x={labelX}
            y={sy(points[a].value) - 8}
            textAnchor={labelAnchor}
            className="fill-white text-[12px] font-semibold"
          >
            {Math.round(points[a].value).toLocaleString('fr-FR')}
          </text>
          <text x={pad.l} y={height - 7} className="fill-muted text-[11px]">
            {fmtShort(points[0].at)}
          </text>
          {n > 1 && (
            <text x={pad.l + iw} y={height - 7} textAnchor="end" className="fill-muted text-[11px]">
              {fmtShort(points.at(-1).at)}
            </text>
          )}
        </svg>
      )}
    </div>
  );
}
