import { useEffect, useState } from 'react';
import History from './components/History';
import Progress from './components/Progress';
import SessionLogger from './components/SessionLogger';
import TabBar from './components/TabBar';
import Templates from './components/Templates';
import { ToastProvider, useToast } from './components/Toast';
import Today from './components/Today';
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

function Shell() {
  const { state } = useStore();
  const notify = useToast();
  const hasDraft = !!state.drafts[state.profileId];
  const [inSession, setInSession] = useState(hasDraft); // une séance en cours ? on y retourne direct
  const [tab, setTab] = useState('today');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession, tab]);

  if (hasDraft && inSession) {
    return (
      <SessionLogger
        onExit={() => setInSession(false)}
        onFinished={({ sets, ups }) => {
          setInSession(false);
          setTab('today');
          notify(sets ? `Séance enregistrée · ${sets} série${sets > 1 ? 's' : ''}${ups ? ` · ${ups} ▲` : ''}` : 'Séance vide abandonnée');
        }}
      />
    );
  }

  const openSession = () => setInSession(true);
  return (
    <>
      {tab === 'today' && <Today onOpenSession={openSession} goTo={setTab} />}
      {tab === 'templates' && <Templates onOpenSession={openSession} />}
      {tab === 'history' && <History />}
      {tab === 'progress' && <Progress />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  );
}
