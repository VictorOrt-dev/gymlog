import { useEffect, useState } from 'react';
import { editSessionSet, moveSessionToDay } from '../lib/session';
import { useStore } from '../lib/store';
import { fmtInt, fmtSet, rirText, tonnage, work } from '../lib/training';
import DayPicker from './DayPicker';
import Sheet from './Sheet';
import Stepper from './Stepper';
import { useToast } from './Toast';
import { Stat } from './ui';

export const sessionStats = (s) => {
  const sets = s.items.reduce((n, it) => n + work(it.sets).length, 0); // échauffements exclus
  const volume = s.items.reduce((v, it) => v + tonnage(work(it.sets)), 0);
  const minutes = Math.max(1, Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60e3));
  return { sets, volume, minutes };
};

const RIRS = [0, 1, 2, 3, 4];

/** Éditeur d'une série passée, déplié sous la ligne touchée : charge, reps, RIR, échauffement. */
function SetEditor({ value, inc, onSave, onDelete, onCancel }) {
  const [v, setV] = useState({ ...value, rir: value.rir ?? 2, kind: value.wu ? 'wu' : value.t === 'drop' ? 'drop' : 'work' });
  return (
    <div className="@container border-t-[0.5px] border-line bg-fill-hi/40 px-3 pb-3 pt-3">
      <div className="flex flex-col gap-2 @[20rem]:flex-row">
        <Stepper label="kg" value={v.w} step={inc} decimal onChange={(w) => setV((x) => ({ ...x, w }))} className="bg-card @[20rem]:flex-[1.2]" />
        <Stepper label="reps" value={v.r} step={1} min={1} onChange={(r) => setV((x) => ({ ...x, r }))} className="bg-card @[20rem]:flex-1" />
      </div>
      {v.kind !== 'wu' && (
        <div className="mt-2 grid grid-cols-5 gap-0.5 rounded-xl bg-card p-0.5" role="radiogroup" aria-label="Reps en réserve (RIR)">
          {RIRS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={v.rir === r}
              onClick={() => setV((x) => ({ ...x, rir: r }))}
              className={`h-11 rounded-[10px] font-num text-[15px] font-semibold ${v.rir === r ? 'bg-seg text-white' : 'text-muted'}`}
            >
              {r === 4 ? '4+' : r}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-0.5 rounded-xl bg-card p-0.5" role="radiogroup" aria-label="Type de série">
        {[
          ['work', 'Travail'],
          ['wu', 'Échauffement'],
          ['drop', 'Drop set'],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={v.kind === k}
            onClick={() => setV((x) => ({ ...x, kind: k }))}
            className={`h-11 rounded-[10px] text-[13px] font-semibold ${v.kind === k ? 'bg-seg text-white' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSave({ w: v.w, r: v.r, rir: v.kind === 'wu' ? null : v.rir, wu: v.kind === 'wu', t: v.kind === 'drop' ? 'drop' : null })}
        className="mt-3 h-12 w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80"
      >
        Enregistrer la correction
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={onDelete} className="h-11 rounded-full bg-card text-[15px] font-medium text-pink active:opacity-60">
          Supprimer la série
        </button>
        <button type="button" onClick={onCancel} className="h-11 rounded-full bg-card text-[15px] font-medium active:opacity-60">
          Annuler
        </button>
      </div>
    </div>
  );
}

/**
 * Une séance passée : chaque exercice, chaque série — et chacune se corrige d'un tap.
 * Objectifs, records et courbes dérivent tous de l'historique : ils se recalculent d'eux-mêmes.
 */
export default function SessionDetail({ session, onClose, onDelete }) {
  const { state, saveSession, deleteSession, restoreSession } = useStore();
  const notify = useToast();
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(null); // [indexExercice, indexSérie]

  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);

  useEffect(() => setEditing(null), [session?.id]);

  if (!session) return null;

  const byId = Object.fromEntries(state.exercises.map((e) => [e.id, e]));
  const { sets, volume, minutes } = sessionStats(session);
  const when = new Date(session.startedAt);

  const apply = (i, j, patch) => {
    const before = session;
    const next = editSessionSet(session, i, j, patch);
    setEditing(null);
    if (next) {
      saveSession(next);
      notify(patch ? 'Série corrigée' : 'Série supprimée', () => saveSession(before));
    } else {
      // Dernière série supprimée : la séance entière disparaît (annulable).
      deleteSession(session.id);
      onClose();
      notify('Séance supprimée', () => restoreSession(before));
    }
  };

  return (
    <Sheet open onClose={onClose}>
      <p className="text-[15px] font-medium text-muted first-letter:uppercase">
        {when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
        {when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <h2 className="text-[28px] font-bold leading-tight tracking-tight">{session.name}</h2>

      <DayPicker
        className="mt-4"
        value={session.startedAt}
        onChange={(day) => {
          const moved = moveSessionToDay(session, day);
          if (moved === session) return;
          saveSession(moved);
          notify('Date changée', () => saveSession(session));
        }}
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Durée" value={`${minutes} min`} />
        <Stat label="Séries" value={sets} />
        <Stat label="Tonnage" value={volume ? `${fmtInt(volume)} kg` : '—'} />
      </div>

      <p className="mt-4 px-1 text-[13px] text-muted">Une erreur de saisie ? Touche la série pour la corriger : objectifs, records et courbes suivent.</p>

      <div className="mt-2 space-y-3">
        {session.items.map((it, i) => {
          let n = 0;
          return (
            <div key={it.exerciseId} className="overflow-hidden rounded-2xl bg-fill">
              <div className="px-4 pb-1.5 pt-3 text-[17px] font-semibold">{byId[it.exerciseId]?.name ?? 'Exercice supprimé'}</div>
              {it.sets.map((x, j) => {
                const open = editing?.[0] === i && editing?.[1] === j;
                return (
                  <div key={`${j}-${x.w}-${x.r}-${x.rir}-${!!x.wu}`} className="sep">
                    <button
                      type="button"
                      onClick={() => setEditing(open ? null : [i, j])}
                      aria-expanded={open}
                      className={`flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-fill-hi ${x.wu ? 'text-muted' : ''} ${open ? 'bg-fill-hi/40' : ''}`}
                    >
                      <span className="w-5 font-num text-[13px] tabular-nums text-muted">{x.wu ? 'É' : x.t === 'drop' ? 'D' : ++n}</span>
                      <span className={`flex-1 font-num tabular-nums ${x.wu ? 'text-[15px]' : 'text-[17px] font-semibold'}`}>{fmtSet(x)}</span>
                      {x.wu ? <span className="text-[13px]">Échauffement</span> : x.t === 'drop' ? <span className="text-[13px] text-muted">Drop set</span> : x.rir != null && <span className="text-[13px] text-muted">{rirText(x.rir)}</span>}
                      <span className="text-[13px] text-pink">{open ? 'Fermer' : 'Corriger'}</span>
                    </button>
                    {open && (
                      <SetEditor
                        value={x}
                        inc={byId[it.exerciseId]?.inc ?? 2.5}
                        onSave={(patch) => apply(i, j, patch)}
                        onDelete={() => apply(i, j, null)}
                        onCancel={() => setEditing(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
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
