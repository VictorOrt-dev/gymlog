import { useState } from 'react';
import { moveSessionToDay } from '../lib/session';
import { sessionKcal } from '../lib/stats';
import { useStore } from '../lib/store';
import { drawSummary } from '../lib/summaryImage';
import { fmtInt, fmtSet } from '../lib/training';
import DayPicker from './DayPicker';
import { Check } from './Icons';
import { useToast } from './Toast';

const fmtDay = (ts) => new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const Tile = ({ label, value, accent }) => (
  <div className={`rounded-2xl px-3.5 py-3 ${accent ? 'bg-pink text-white' : 'bg-card'}`}>
    <div className="font-num text-[24px] font-bold leading-tight">{value}</div>
    <div className={`mt-0.5 text-[13px] ${accent ? 'text-white/90' : 'text-muted'}`}>{label}</div>
  </div>
);

const Change = ({ pct }) =>
  pct == null ? null : (
    <span className="font-num text-[15px] font-semibold">
      <span className={pct > 0 ? 'text-pink' : 'text-muted'}>{pct > 0 ? '▲' : pct < 0 ? '▼' : '='}</span> {pct > 0 ? '+' : ''}
      {pct} %
    </span>
  );

/**
 * Écran de fin de séance : le moment où l'on mesure ce qu'on vient de faire.
 * Durée, séries, records battus, tonnage effectif, et chaque exercice comparé à la dernière séance du même type.
 */
export default function SessionSummary({ data, onClose }) {
  const { state, saveSession } = useStore();
  const notify = useToast();
  const [sharing, setSharing] = useState(false);
  if (!data) return null;
  const session = state.sessions.find((x) => x.id === data.sessionId);
  const bw = state.profiles.find((p) => p.id === state.profileId)?.bw;
  const energy = session ? sessionKcal(session, bw) : null;
  const names = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const { summary: s } = data;

  return (
    <div role="dialog" aria-modal="true" aria-label="Récapitulatif de la séance" className="fixed inset-0 z-[70] flex animate-sheet flex-col overflow-y-auto overscroll-contain bg-black">
      <div className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-pink text-white animate-pop">
          <Check className="h-8 w-8" strokeWidth={3} />
        </div>
        <p className="mt-4 text-[15px] font-medium text-muted">Séance terminée</p>
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{s.name}</h1>
        {s.records > 0 && (
          <p className="mt-1 text-[17px] font-semibold text-pink">
            {s.records} nouveau{s.records > 1 ? 'x' : ''} record{s.records > 1 ? 's' : ''} ★
          </p>
        )}

        {/* Oubliée hier ? On la range au bon jour : régularité, repos et objectifs restent justes */}
        {session && (
          <div className="mt-4">
            <p className="mb-1.5 px-1 text-[13px] font-medium text-muted">Jour de la séance</p>
            <DayPicker
              value={session.startedAt}
              onChange={(day) => {
                const moved = moveSessionToDay(session, day);
                if (moved === session) return;
                saveSession(moved);
                notify(`Séance rangée au ${new Date(moved.startedAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })}`, () => saveSession(session));
              }}
            />
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Tile label={energy ? `Durée · ≈ ${energy.kcal} kcal` : 'Durée'} value={`${s.minutes} min`} />
          <Tile label="Séries de travail" value={s.sets} />
          <Tile label={s.records > 1 ? 'Records battus' : 'Record battu'} value={s.records} accent={s.records > 0} />
          <div className="rounded-2xl bg-card px-3.5 py-3">
            <div className="font-num text-[24px] font-bold leading-tight">
              {fmtInt(s.kg)} <span className="text-[15px] text-muted">kg</span>
            </div>
            <div className="mt-0.5 text-[13px] text-muted">Tonnage effectif</div>
            {s.kgChange != null && (
              <div className="mt-0.5 text-[13px]">
                <Change pct={s.kgChange} />
              </div>
            )}
          </div>
        </div>

        {energy && (
          <p className="mt-2 px-1 text-[13px] leading-snug text-muted">
            ≈ {energy.kcal} kcal actives : estimation d’après la durée, ton effort et {energy.assumedBw ? 'un poids de 75 kg (indique le tien dans Réglages pour l’affiner)' : 'ton poids de corps'}. Ordre de grandeur, ±30 %.
          </p>
        )}

        <h2 className="mb-2 mt-8 px-1 text-[20px] font-bold tracking-tight">Exercice par exercice</h2>
        <p className="mb-2 px-1 text-[13px] text-muted">
          {s.previousAt ? `Comparé à ta séance ${s.name} du ${fmtDay(s.previousAt)}` : 'Première séance de ce type : tes références sont posées.'}
        </p>
        <div className="overflow-hidden rounded-2xl bg-card">
          {s.exercises.map((e) => (
            <div key={e.exerciseId} className="sep flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold">{names[e.exerciseId] ?? 'Exercice supprimé'}</div>
                <div className="truncate text-[15px] text-muted">
                  {e.best ? (
                    <>
                      <span className="font-num text-white">{fmtSet(e.best)}</span>
                      {e.prevBest ? <> · avant {fmtSet(e.prevBest)}</> : ' · 1re fois'}
                    </>
                  ) : (
                    'Échauffement seulement'
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                {e.records > 0 ? <span className="rounded-full bg-pink px-2.5 py-1 text-[13px] font-bold text-white">Record</span> : <Change pct={e.change} />}
                <div className="mt-0.5 text-[13px] text-muted">
                  {e.sets} série{e.sets > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 mx-auto w-full max-w-md border-t-[0.5px] border-line/70 bg-black/90 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <button onClick={onClose} className="h-14 w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
          Terminé
        </button>
        <button
          disabled={sharing}
          onClick={async () => {
            // Le récap en image, envoyée aux potes par le menu « Partager » (ou téléchargée sur ordinateur)
            setSharing(true);
            try {
              const blob = await drawSummary(document.createElement('canvas'), data, names);
              const file = new File([blob], `gymlog-${s.name}.png`, { type: 'image/png' });
              if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Séance ${s.name}` });
              else {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(file);
                a.download = file.name;
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
              }
            } catch {
              /* partage annulé */
            } finally {
              setSharing(false);
            }
          }}
          className="mt-1 h-12 w-full text-[17px] text-pink active:opacity-50 disabled:opacity-40"
        >
          Partager le récap
        </button>
      </div>
    </div>
  );
}
