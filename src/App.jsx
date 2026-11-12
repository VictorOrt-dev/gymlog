import { useEffect, useState } from 'react';
import Home from './components/Home';
import ProgressTab from './components/ProgressTab';
import TabBar from './components/TabBar';
import SessionLogger from './components/SessionLogger';
import { ToastProvider, useToast } from './components/Toast';
import { StoreProvider, useStore } from './lib/store';

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession, tab]);

  if (hasDraft && inSession) {
    return (
      <SessionLogger
        onExit={() => setInSession(false)}
        onFinished={({ sets, records }) => {
          setInSession(false);
          setTab('train');
          if (!sets) return notify('Séance vide abandonnée');
          notify(records ? `Bravo · ${records} record${records > 1 ? 's' : ''} de force ▲` : `Séance enregistrée · ${sets} série${sets > 1 ? 's' : ''}`);
        }}
      />
    );
  }

  return (
    <>
      {tab === 'train' ? <Home onOpenSession={() => setInSession(true)} /> : <ProgressTab />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}
