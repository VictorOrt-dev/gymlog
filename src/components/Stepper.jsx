import { useState } from 'react';
import { round } from '../lib/training';

const fmt = (v) => String(v).replace('.', ',');
const show = (v, decimal) => (decimal && v === 0 ? 'PDC' : fmt(v)); // 0 kg = poids du corps

/** Gros −/+ pour le pouce ; le chiffre au centre ouvre le pavé numérique pour les grands sauts. */
export default function Stepper({ label, value, onChange, step, min = 0, decimal = false, className = '' }) {
  const [text, setText] = useState(null); // non-null pendant la frappe
  const commit = (n) => onChange(Math.max(min, round(n)));

  return (
    <div className={`relative flex h-16 min-w-0 items-stretch overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-zinc-700/60 ${className}`}>
      <span className="pointer-events-none absolute inset-x-0 top-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <button type="button" aria-label={`${label} moins ${fmt(step)}`} onClick={() => commit(value - step)} className="w-12 shrink-0 text-3xl font-light text-zinc-300 active:bg-zinc-700">
        −
      </button>
      <input
        inputMode={decimal ? 'decimal' : 'numeric'}
        aria-label={label}
        value={text ?? show(value, decimal)}
        onFocus={(e) => {
          setText(value === 0 ? '' : fmt(value));
          const el = e.target;
          requestAnimationFrame(() => el.setSelectionRange(0, el.value.length));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value.replace(',', '.'));
          if (!Number.isNaN(n)) commit(n);
        }}
        onBlur={() => setText(null)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="w-full min-w-0 bg-transparent pt-3 text-center text-3xl font-black tabular-nums outline-none"
      />
      <button type="button" aria-label={`${label} plus ${fmt(step)}`} onClick={() => commit(value + step)} className="w-12 shrink-0 text-3xl font-light text-zinc-300 active:bg-zinc-700">
        +
      </button>
    </div>
  );
}
