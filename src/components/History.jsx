import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import SessionDetail, { sessionStats } from './SessionDetail';
import SwipeRow from './SwipeRow';
import { useToast } from './Toast';
import { ChevronRight } from './Icons';
import { Group, LargeTitle, Page, Stat } from './ui';

const WEEKS = 5;

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
const weekTitle = (k, start) =>
  k === 0 ? 'Cette semaine' : k === 1 ? 'Semaine dernière' : `Semaine du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;

/** Onglet « Historique » : les 5 dernières semaines, séance par séance. */
export default function History() {
  const { state, deleteSession, restoreSession } = useStore();
  const notify = useToast();
  const [detailId, setDetailId] = useState(null);

  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === state.profileId), [state.sessions, state.profileId]);
  const weeks = useMemo(() => {
    const monday = mondayOf(Date.now());
    return Array.from({ length: WEEKS }, (_, k) => {
      const start = addDays(monday, -7 * k);
      const end = addDays(start, 7);
      const sessions = mine.filter((s) => s.startedAt >= +start && s.startedAt < +end).sort((a, b) => b.startedAt - a.startedAt);
      return { k, start, sessions, sets: sessions.reduce((n, s) => n + sessionStats(s).sets, 0) };
    });
  }, [mine]);

  const inRange = weeks.reduce((n, w) => n + w.sessions.length, 0);
  const older = mine.length - inRange;
  const perWeek = (inRange / WEEKS).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

  const remove = (s) => {
    deleteSession(s.id);
    setDetailId(null);
    notify(`Séance « ${s.name} » supprimée`, () => restoreSession(s));
  };

  return (
    <Page>
      <LargeTitle title="Historique" subtitle="5 dernières semaines" />

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Séances" value={inRange} />
        <Stat label="Par semaine" value={perWeek} />
        <Stat label="Séries" value={weeks.reduce((n, w) => n + w.sets, 0)} />
      </div>

      {weeks.map((w) => (
        <Group
          key={w.k}
          title={weekTitle(w.k, w.start)}
          className="mt-8"
          action={
            <span className="shrink-0 text-[15px] text-muted">
              {w.sessions.length} séance{w.sessions.length > 1 ? 's' : ''}
            </span>
          }
        >
          {w.sessions.map((s) => {
            const { sets, minutes } = sessionStats(s);
            const day = new Date(s.startedAt).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <SwipeRow key={s.id} className="sep" onDelete={() => remove(s)}>
                <button onClick={() => setDetailId(s.id)} className="flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[17px] font-semibold">{s.name}</div>
                    <div className="text-[15px] text-muted first-letter:uppercase">
                      {day} · {minutes} min
                    </div>
                  </div>
                  <span className="shrink-0 font-num text-[15px] text-muted">{sets} séries</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
                </button>
              </SwipeRow>
            );
          })}
          {!w.sessions.length && <p className="px-4 py-3 text-[15px] text-muted">{w.k === 0 ? 'Pas encore de séance cette semaine' : 'Aucune séance'}</p>}
        </Group>
      ))}

      <p className="mt-3 px-4 text-[13px] text-muted">
        Touche une séance pour revoir le détail. Glisse-la vers la gauche pour la supprimer.
        {older > 0 && ` ${older} séance${older > 1 ? 's' : ''} plus ancienne${older > 1 ? 's restent enregistrées' : ' reste enregistrée'} et compte${older > 1 ? 'nt' : ''} pour tes progrès.`}
      </p>

      <SessionDetail session={mine.find((s) => s.id === detailId)} onClose={() => setDetailId(null)} onDelete={() => remove(mine.find((s) => s.id === detailId))} />
    </Page>
  );
}
