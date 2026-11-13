import { useEffect, useState } from 'react';
import { Close } from './Icons';

const CHECK_EVERY = 30 * 60e3; // toutes les 30 min tant que l'app est à l'écran
const scriptOf = (html) => html.match(/src="(\.\/assets\/index-[^"]+\.js)"/)?.[1];

/**
 * « Nouvelle version disponible · Recharger ».
 * Utile sur iPhone : une app laissée en arrière-plan reprend sans se recharger, donc sans voir la mise à jour.
 * Détection : le fichier principal de chaque version a un nom unique ; s'il diffère de celui en ligne, une version est prête.
 * Vérifié au retour dans l'app, puis toutes les 30 min. Rien d'automatique : on recharge quand on veut (données sauvegardées à chaque tap).
 */
export default function UpdatePill({ hidden }) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const current = document.querySelector('script[type="module"][src*="assets/index-"]')?.getAttribute('src');
    if (!current) return; // en développement : pas de version construite
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== 'visible' || navigator.onLine === false) return;
      try {
        const res = await fetch(`./?maj=${Date.now()}`, { cache: 'no-store' });
        const latest = res.ok ? scriptOf(await res.text()) : null;
        if (!stop && latest && latest !== current) setReady(true);
      } catch {
        /* hors ligne : on réessaiera */
      }
    };
    const first = setTimeout(check, 3000); // après le démarrage, pour ne pas le ralentir
    const timer = setInterval(check, CHECK_EVERY);
    document.addEventListener('visibilitychange', check);
    return () => {
      stop = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  if (!ready || dismissed || hidden) return null;
  return (
    <div role="status" className="fixed inset-x-4 top-[max(.5rem,env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md animate-sheet items-center gap-1.5 rounded-2xl bg-card py-1.5 pl-4 pr-1.5 shadow-[0_10px_40px_rgba(0,0,0,.6)] ring-[0.5px] ring-line">
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[15px] font-semibold">Mise à jour</span>
        <span className="block truncate text-[13px] text-muted">rien n’est perdu</span>
      </span>
      <button onClick={() => window.location.reload()} className="h-11 shrink-0 rounded-full bg-pink px-3.5 text-[15px] font-semibold text-white active:opacity-80">
        Recharger
      </button>
      <button onClick={() => setDismissed(true)} aria-label="Plus tard" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted active:bg-fill">
        <Close className="h-5 w-5" />
      </button>
    </div>
  );
}
