import { useEffect, useState } from 'react';
import Home from './components/Home';
import Onboarding from './components/Onboarding';
import ProgressTab from './components/ProgressTab';
import TabBar from './components/TabBar';
import UpdatePill from './components/UpdatePill';
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
  const { state } = useStore();
  const notify = useToast();
  const hasDraft = !!state.drafts[state.profileId];
  const [inSession, setInSession] = useState(hasDraft); // une séance en cours ? on y retourne direct
  const [tab, setTab] = useState('train');
  const [summary, setSummary] = useState(null); // récapitulatif de fin de séance affiché

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession, tab]);

  const finished = ({ summary: s, sessionId }) => {
    setInSession(false);
    setTab('train');
    if (!s) return notify('Séance vide abandonnée');
    setSummary({ summary: s, sessionId });
  };

  if (!state.onboarded) return <Onboarding />; // premier lancement : un seul écran, puis l'app

  return (
    <>
      {hasDraft && inSession ? (
        <SessionLogger
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
      <UpdatePill hidden={(hasDraft && inSession) || !!summary} />{/* jamais en pleine séance ni sur le récap */}
      <SharedTemplate />
    </>
  );
}
