import { useState } from 'react';
import { round } from '../lib/training';
import { Minus, Plus } from './Icons';

const fmt = (v) => String(v).replace('.', ',');
const show = (v, decimal) => (decimal && v === 0 ? 'PDC' : fmt(v)); // 0 kg = poids du corps

const Round = ({ label, onClick, children }) => (
  <button type="button" aria-label={label} onClick={onClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fill-hi text-white active:opacity-50">
    {children}
  </button>
);

/** Deux boutons ronds pour le pouce ; le chiffre au centre ouvre le pavé numérique pour les grands sauts. */
export default function Stepper({ label, value, onChange, step, min = 0, decimal = false, className = '' }) {
  const [text, setText] = useState(null); // non-null pendant la frappe
  const commit = (n) => onChange(Math.max(min, round(n)));

  return (
    <div className={`flex h-[68px] min-w-0 items-center gap-1 rounded-2xl bg-fill px-2 ${className}`}>
      <Round label={`${label} moins ${fmt(step)}`} onClick={() => commit(value - step)}>
        <Minus className="h-5 w-5" />
      </Round>
      <label className="flex min-w-0 flex-1 flex-col items-center">
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
          className="w-full min-w-0 bg-transparent text-center font-num text-[28px] font-bold leading-none tabular-nums outline-none"
        />
        <span className="mt-1 text-[12px] font-medium text-muted">{label}</span>
      </label>
      <Round label={`${label} plus ${fmt(step)}`} onClick={() => commit(value + step)}>
        <Plus className="h-5 w-5" />
      </Round>
    </div>
  );
}
