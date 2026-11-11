import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { fmtInt, fmtSet, tonnage } from '../lib/training';
import Sheet from './Sheet';
import { Stat } from './ui';

export const sessionStats = (s) => {
  const sets = s.items.reduce((n, it) => n + it.sets.length, 0);
  const volume = s.items.reduce((v, it) => v + tonnage(it.sets), 0);
  const minutes = Math.max(1, Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60e3));
  return { sets, volume, minutes };
};

/** Une séance passée, en lecture seule : chaque exercice, chaque série. */
export default function SessionDetail({ session, onClose, onDelete }) {
  const { state } = useStore();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  if (!session) return null;

  const names = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const { sets, volume, minutes } = sessionStats(session);
  const when = new Date(session.startedAt);

  return (
    <Sheet open onClose={onClose}>
      <p className="text-[15px] font-medium text-muted first-letter:uppercase">
        {when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
        {when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <h2 className="text-[28px] font-bold leading-tight tracking-tight">{session.name}</h2>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Durée" value={`${minutes} min`} />
        <Stat label="Séries" value={sets} />
        <Stat label="Tonnage" value={volume ? `${fmtInt(volume)} kg` : '—'} />
      </div>

      <div className="mt-5 space-y-3">
        {session.items.map((it) => (
          <div key={it.exerciseId} className="overflow-hidden rounded-2xl bg-fill">
            <div className="px-4 pb-1.5 pt-3 text-[17px] font-semibold">{names[it.exerciseId] ?? 'Exercice supprimé'}</div>
            {it.sets.map((x, i) => (
              <div key={i} className="sep flex items-center gap-3 px-4 py-2.5">
                <span className="w-5 font-num text-[13px] tabular-nums text-muted">{i + 1}</span>
                <span className="flex-1 font-num text-[17px] font-semibold tabular-nums">{fmtSet(x)}</span>
                {x.rir != null && <span className="text-[13px] text-muted">RIR {x.rir >= 4 ? '4+' : x.rir}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {onDelete && (
        <button
          onClick={() => (confirming ? onDelete() : setConfirming(true))}
          className={`mt-5 h-12 w-full rounded-full text-[17px] ${confirming ? 'bg-pink font-semibold text-white' : 'text-pink active:opacity-50'}`}
        >
          {confirming ? 'Toucher encore pour supprimer' : 'Supprimer la séance'}
        </button>
      )}
    </Sheet>
  );
}
