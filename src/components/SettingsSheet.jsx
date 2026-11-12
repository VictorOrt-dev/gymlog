import { useRef } from 'react';
import { parseBackup } from '../lib/backup';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import Sheet from './Sheet';
import { useToast } from './Toast';

/** Sauvegarde à refaire : des séances depuis le dernier export, et plus d'une semaine (ou jamais, dès 3 séances). */
export const isExportStale = (state) => {
  const since = state.sessions.filter((s) => s.startedAt > (state.lastExport ?? 0)).length;
  if (!state.lastExport) return state.sessions.length >= 3;
  return since > 0 && Date.now() - state.lastExport > 7 * 864e5;
};

/** Réglages, derrière l'avatar : ton prénom et tes données (l'app est personnelle, une personne par téléphone). */
export default function SettingsSheet({ open, onClose }) {
  const { state, renameProfile, exportData, replaceAll } = useStore();
  const notify = useToast();
  const fileRef = useRef(null);
  const stale = isExportStale(state);
  const profile = state.profiles.find((p) => p.id === state.profileId) ?? state.profiles[0];

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Validation complète AVANT d'injecter : un fichier abîmé ne peut pas corrompre les données du téléphone.
    const res = parseBackup(await file.text().catch(() => ''));
    if (!res.ok) return alert(`Import refusé : ${res.error}\nTes données actuelles n’ont pas été modifiées.`);
    const n = res.data.sessions.length;
    if (confirm(`Remplacer les données de ce téléphone par cette sauvegarde ?\n${n} séance${n > 1 ? 's' : ''}`)) {
      replaceAll(res.data);
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Réglages">
      <label className="block">
        <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Ton prénom</span>
        <input
          defaultValue={profile.name}
          key={profile.id}
          maxLength={30}
          onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== profile.name && renameProfile(e.target.value.trim())}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          enterKeyHint="done"
          className="h-12 w-full rounded-xl bg-fill px-4 text-[17px] outline-none focus:ring-1 focus:ring-pink"
        />
      </label>

      <h3 className="mb-2 mt-7 px-1 text-[20px] font-bold tracking-tight">Mes données</h3>
      <div className="overflow-hidden rounded-2xl bg-fill">
        <button onClick={async () => (await exportData()) && notify('Sauvegarde envoyée')} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Sauvegarder (iCloud, Drive, AirDrop…)
        </button>
        <button onClick={() => fileRef.current?.click()} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Restaurer une sauvegarde
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </div>
      <p className={`mt-2 px-4 text-[13px] ${stale ? 'text-pink' : 'text-muted'}`}>
        Tes données restent sur ce téléphone. {state.lastExport ? `Dernière sauvegarde : ${ago(state.lastExport)}.` : 'Jamais sauvegardées.'}
      </p>
    </Sheet>
  );
}
