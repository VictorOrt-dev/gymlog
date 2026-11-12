import { useLayoutEffect, useRef } from 'react';
import { useStore } from '../lib/store';

const COPY = {
  quota: ['Stockage plein', 'Tes séries ne sont plus enregistrées. Exporte une sauvegarde.'],
  unavailable: ['Enregistrement bloqué', 'Navigation privée ? Exporte une sauvegarde avant de fermer.'],
};

/**
 * Alerte collée en haut de l'écran tant que l'écriture échoue : aucune perte silencieuse.
 * L'export marche toujours (les données sont en mémoire). Sa hauteur est publiée dans --banner-h
 * pour que les barres collantes se placent dessous.
 */
export default function StorageAlert() {
  const { storageError, exportData } = useStore();
  const ref = useRef(null);

  useLayoutEffect(() => {
    const h = storageError && ref.current ? ref.current.offsetHeight : 0;
    const prev = parseFloat(document.documentElement.style.getPropertyValue('--banner-h')) || 0;
    document.documentElement.style.setProperty('--banner-h', `${h}px`);
    // L'alerte s'insère en haut : on compense le décalage pour que rien ne glisse sous le chrono.
    if (h !== prev) window.scrollBy(0, h - prev);
  }, [storageError]);

  if (!storageError) return null;
  const [title, text] = COPY[storageError];

  return (
    <div ref={ref} role="alert" className="sticky top-0 z-[65] bg-black px-3 pb-2 pt-[max(.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-pink py-2 pl-4 pr-2 text-white shadow-[0_10px_40px_rgba(255,59,128,.35)]">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{title}</p>
          <p className="text-[13px] leading-snug text-white/90">{text}</p>
        </div>
        <button onClick={exportData} className="h-11 shrink-0 rounded-full bg-white px-4 text-[15px] font-semibold text-pink active:opacity-80">
          Exporter
        </button>
      </div>
    </div>
  );
}
