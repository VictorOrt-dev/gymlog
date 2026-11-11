import { useEffect, useState } from 'react';
import Home from './components/Home';
import SessionLogger from './components/SessionLogger';
import { ToastProvider, useToast } from './components/Toast';
import { StoreProvider, useStore } from './lib/store';
import { fmtInt } from './lib/training';

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}

/** Deux écrans, pas d'onglets : l'accueil, et la séance en cours. */
function Shell() {
  const { state } = useStore();
  const notify = useToast();
  const hasDraft = !!state.drafts[state.profileId];
  const [inSession, setInSession] = useState(hasDraft); // une séance en cours ? on y retourne direct

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession]);

  if (hasDraft && inSession) {
    return (
      <SessionLogger
        onExit={() => setInSession(false)}
        onFinished={({ sets, kg, pct }) => {
          setInSession(false);
          if (!sets) return notify('Séance vide abandonnée');
          const change = pct == null ? '' : pct > 0 ? ` · ▲ +${pct} %` : pct < 0 ? ` · ▼ ${pct} %` : ' · =';
          notify(kg ? `Bravo · ${fmtInt(kg)} kg soulevés${change}` : `Séance enregistrée · ${sets} série${sets > 1 ? 's' : ''}`);
        }}
      />
    );
  }

  return <Home onOpenSession={() => setInSession(true)} />;
}
