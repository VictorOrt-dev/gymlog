import { useEffect, useState } from 'react';
import Home from './components/Home';
import SessionLogger from './components/SessionLogger';
import { StoreProvider, useStore } from './lib/store';

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { state } = useStore();
  const hasDraft = !!state.drafts[state.profileId];
  const [inSession, setInSession] = useState(hasDraft); // une séance en cours ? on y retourne direct
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [inSession]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <>
      {hasDraft && inSession ? (
        <SessionLogger
          onExit={() => setInSession(false)}
          onFinished={({ sets, ups }) => {
            setInSession(false);
            setToast(sets ? `Séance enregistrée · ${sets} séries${ups ? ` · ${ups} en progrès ▲` : ''}` : 'Séance vide abandonnée');
          }}
        />
      ) : (
        <Home onOpenSession={() => setInSession(true)} />
      )}
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90%] animate-sheet rounded-full bg-zinc-100 px-5 py-3 text-sm font-black text-black shadow-2xl">
          {toast}
        </div>
      )}
    </>
  );
}
