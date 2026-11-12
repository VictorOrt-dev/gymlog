import { useEffect, useState } from 'react';
import Home from './components/Home';
import ProgressTab from './components/ProgressTab';
import TabBar from './components/TabBar';
import SessionLogger from './components/SessionLogger';
import SessionSummary from './components/SessionSummary';
import SharedTemplate from './components/SharedTemplate';
import StorageAlert from './components/StorageAlert';
import { ToastProvider, useToast } from './components/Toast';
import { StoreProvider, useStore } from './lib/store';

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <StorageAlert />
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}

/** Deux onglets (Entraînement, Progrès) ; la séance en cours prend tout l'écran. */
function Shell() {
  const { state, switchProfile } = useStore();
  const notify = useToast();
  const hasDraft = !!state.drafts[state.profileId];
  const [inSession, setInSession] = useState(hasDraft); // une séance en cours ? on y retourne direct
  const [tab, setTab] = useState('train');
  const [summary, setSummary] = useState(null); // récapitulatif de fin de séance affiché

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession, tab]);

  const finished = ({ summary: s, athlete, multi }) => {
    // Binôme : si un pote a encore une séance en cours, on bascule sur la sienne au lieu de quitter.
    const mate = state.profiles.find((p) => p.id !== state.profileId && state.drafts[p.id]);
    if (mate) switchProfile(mate.id);
    else {
      setInSession(false);
      setTab('train');
    }
    if (!s) return notify('Séance vide abandonnée');
    setSummary({ summary: s, athlete: multi ? athlete : null, next: mate?.name ?? null });
  };

  return (
    <>
      {hasDraft && inSession ? (
        <SessionLogger
          key={state.profileId} // chaque athlète a ses cartes, son chrono, son exercice ouvert
          onExit={() => setInSession(false)}
          onFinished={finished}
        />
      ) : (
        <>
          {tab === 'train' ? <Home onOpenSession={() => setInSession(true)} /> : <ProgressTab />}
          <TabBar tab={tab} onChange={setTab} />
        </>
      )}
      <SessionSummary data={summary} onClose={() => setSummary(null)} />
      <SharedTemplate />
    </>
  );
}
