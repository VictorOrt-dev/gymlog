const DAY = 864e5;
const startOfDay = (ts) => new Date(ts).setHours(0, 0, 0, 0);
const iso = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Le jour d'une séance : « Aujourd'hui », « Hier », ou n'importe quel jour passé (calendrier natif du téléphone).
 * Aucune librairie : un <input type="date"> invisible pose le sélecteur natif sur le 3e segment.
 */
export default function DayPicker({ value, onChange, className = '' }) {
  const today = startOfDay(Date.now());
  const day = startOfDay(value);
  const which = day === today ? 'today' : day === today - DAY ? 'yesterday' : 'other';
  const otherLabel = which === 'other' ? new Date(value).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Autre jour';
  const seg = (on) => `relative flex h-11 items-center justify-center rounded-[10px] text-[15px] font-semibold ${on ? 'bg-seg text-white' : 'text-muted'}`;
  return (
    <div className={`grid grid-cols-3 gap-0.5 rounded-xl bg-fill p-0.5 ${className}`} role="radiogroup" aria-label="Jour de la séance">
      <button type="button" role="radio" aria-checked={which === 'today'} onClick={() => onChange(today)} className={seg(which === 'today')}>
        Aujourd’hui
      </button>
      <button type="button" role="radio" aria-checked={which === 'yesterday'} onClick={() => onChange(today - DAY)} className={seg(which === 'yesterday')}>
        Hier
      </button>
      <label className={seg(which === 'other')}>
        <span className="truncate px-1 first-letter:uppercase">{otherLabel}</span>
        <input
          type="date"
          aria-label="Choisir un autre jour"
          max={iso(today)}
          value={iso(value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          onChange={(e) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split('-').map(Number);
            const ts = new Date(y, m - 1, d).getTime();
            if (ts <= today) onChange(ts);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
