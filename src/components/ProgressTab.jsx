import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import ProgressDetail from './ProgressDetail';
import ProgressSection from './ProgressSection';
import SessionDetail, { sessionStats } from './SessionDetail';
import { useToast } from './Toast';
import { ChevronRight } from './Icons';
import { Group, LargeTitle, Page } from './ui';

/** Onglet « Progrès » : la force de chaque exercice, puis les dernières séances. On le regarde après, pas pendant. */
export default function ProgressTab() {
  const { state, deleteSession, restoreSession } = useStore();
  const notify = useToast();
  const [progressOf, setProgressOf] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === state.profileId), [state.sessions, state.profileId]);
  const recent = mine.slice(-5).reverse();

  const remove = (s) => {
    deleteSession(s.id);
    setDetailId(null);
    notify(`Séance « ${s.name} » supprimée`, () => restoreSession(s));
  };

  return (
    <Page>
      <LargeTitle title="Progrès" subtitle={mine.length ? `${mine.length} séance${mine.length > 1 ? 's' : ''} enregistrée${mine.length > 1 ? 's' : ''}` : null} />
      <ProgressSection onOpen={setProgressOf} />

      {recent.length > 0 && (
        <Group title="Dernières séances" footer="Touche une séance pour revoir chaque série. L’historique complet d’un exercice est dans sa carte.">
          {recent.map((s) => {
            const { sets, minutes } = sessionStats(s);
            return (
              <button key={s.id} onClick={() => setDetailId(s.id)} className="sep flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left active:bg-fill">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">{s.name}</div>
                  <div className="text-[15px] text-muted first-letter:uppercase">
                    {ago(s.startedAt)} · {minutes} min
                  </div>
                </div>
                <span className="shrink-0 font-num text-[15px] text-muted">{sets} séries</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
              </button>
            );
          })}
        </Group>
      )}

      <ProgressDetail exerciseId={progressOf} onClose={() => setProgressOf(null)} />
      <SessionDetail session={mine.find((s) => s.id === detailId)} onClose={() => setDetailId(null)} onDelete={() => remove(mine.find((s) => s.id === detailId))} />
    </Page>
  );
}
