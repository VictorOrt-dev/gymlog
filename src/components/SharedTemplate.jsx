import { useEffect, useState } from 'react';
import { decodeTemplate, readSharedCode } from '../lib/share';
import { useStore } from '../lib/store';
import Sheet from './Sheet';
import { useToast } from './Toast';

/**
 * Séance reçue par lien (#seance=…) : on la montre, on l'ajoute en un tap, et on nettoie l'URL.
 * Le contenu est validé avant tout affichage ou injection.
 */
export default function SharedTemplate() {
  const { state, importSharedTemplate } = useStore();
  const notify = useToast();
  const [shared, setShared] = useState(null); // { ok, data } | { ok: false, error }

  useEffect(() => {
    const read = () => {
      const code = readSharedCode(window.location.hash);
      if (!code) return;
      setShared(decodeTemplate(code));
      history.replaceState(null, '', window.location.pathname + window.location.search); // le lien ne se ré-importe pas
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  if (!shared) return null;
  const close = () => setShared(null);
  const known = new Set(state.exercises.map((e) => e.id));

  return (
    <Sheet open onClose={close} title={shared.ok ? 'Séance reçue' : 'Lien invalide'}>
      {shared.ok ? (
        <>
          <p className="text-[28px] font-bold leading-tight tracking-tight">{shared.data.name}</p>
          <p className="mb-4 text-[15px] text-muted">
            {shared.data.exercises.length} exercice{shared.data.exercises.length > 1 ? 's' : ''}
            {shared.data.supersets.length ? ` · ${shared.data.supersets.length} superset${shared.data.supersets.length > 1 ? 's' : ''}` : ''}
          </p>
          <div className="overflow-hidden rounded-2xl bg-fill">
            {shared.data.exercises.map((e) => (
              <div key={e.id} className="sep flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-[17px]">{e.name}</span>
                <span className="shrink-0 font-num text-[13px] text-muted">
                  {e.range[0]}–{e.range[1]} reps{!known.has(e.id) ? ' · nouveau' : ''}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              importSharedTemplate(shared.data);
              notify(`« ${shared.data.name} » ajoutée à tes séances`);
              close();
            }}
            className="mt-5 h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80"
          >
            Ajouter à mes séances
          </button>
          <button onClick={close} className="mt-1 h-11 w-full text-[17px] text-pink active:opacity-50">
            Ignorer
          </button>
        </>
      ) : (
        <>
          <p className="text-[15px] text-muted">{shared.error} Demande à ton pote de te renvoyer le lien.</p>
          <button onClick={close} className="mt-5 h-12 w-full rounded-full bg-fill text-[17px] font-semibold active:bg-fill-hi">
            OK
          </button>
        </>
      )}
    </Sheet>
  );
}
