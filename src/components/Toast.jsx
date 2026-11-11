import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext(() => {});

/** Notifications en bas d'écran. Avec `undo`, un bouton « Annuler » reste 5 s : plus sûr qu'une confirmation. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((text, undo) => setToast({ id: Date.now(), text, undo }), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 5000 : 3500);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <Ctx.Provider value={notify}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
          className={`fixed inset-x-0 z-[70] mx-auto flex w-fit max-w-[92%] animate-sheet items-center gap-3 rounded-full bg-white py-3 pl-5 text-[15px] font-semibold text-black shadow-[0_10px_40px_rgba(0,0,0,.6)] ${toast.undo ? 'pr-2' : 'pr-5'}`}
        >
          <span className="min-w-0">{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
              className="shrink-0 rounded-full px-3 py-1 text-pink active:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
