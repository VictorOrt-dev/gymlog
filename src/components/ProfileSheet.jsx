import { useRef, useState } from 'react';
import { parseBackup } from '../lib/backup';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import Sheet from './Sheet';
import { Check } from './Icons';
import { Avatar } from './ui';

/** Sauvegarde à refaire : des séances depuis le dernier export, et plus d'une semaine (ou jamais, dès 3 séances). */
export const isExportStale = (state) => {
  const since = state.sessions.filter((s) => s.startedAt > (state.lastExport ?? 0)).length;
  if (!state.lastExport) return state.sessions.length >= 3;
  return since > 0 && Date.now() - state.lastExport > 7 * 864e5;
};

/** Profils (les potes) + sauvegarde des données : tout ce qui concerne « le compte », derrière l'avatar. */
export default function ProfileSheet({ open, onClose }) {
  const { state, switchProfile, addProfile, exportData, replaceAll } = useStore();
  const [newName, setNewName] = useState('');
  const fileRef = useRef(null);
  const stale = isExportStale(state);

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // Validation complète AVANT d'injecter : un fichier abîmé ne peut pas corrompre les données du téléphone.
    const res = parseBackup(await file.text().catch(() => ''));
    if (!res.ok) return alert(`Import refusé : ${res.error}\nTes données actuelles n’ont pas été modifiées.`);
    const { sessions, profiles } = res.data;
    if (confirm(`Remplacer les données de ce téléphone par cette sauvegarde ?\n${profiles.length} profil${profiles.length > 1 ? 's' : ''} · ${sessions.length} séance${sessions.length > 1 ? 's' : ''}`)) {
      replaceAll(res.data);
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Qui s’entraîne ?">
      <div className="overflow-hidden rounded-2xl bg-fill">
        {state.profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              switchProfile(p.id);
              onClose();
            }}
            className="sep flex h-14 w-full items-center gap-3 px-4 active:bg-fill-hi"
          >
            <Avatar name={p.name} className="h-8 w-8 bg-seg text-[15px]" />
            <span className="flex-1 truncate text-left text-[17px]">{p.name}</span>
            {state.drafts[p.id] && <span className="text-[13px] text-muted">En séance</span>}
            {p.id === state.profileId && <Check className="h-5 w-5 text-pink" strokeWidth={3} />}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          addProfile(newName.trim());
          setNewName('');
          onClose();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Prénom d’un pote"
          className="h-12 min-w-0 flex-1 rounded-xl bg-fill px-4 text-[17px] outline-none placeholder:text-muted"
        />
        <button className="h-12 rounded-full bg-pink px-5 text-[17px] font-semibold text-white active:opacity-80">Ajouter</button>
      </form>

      <h3 className="mb-2 mt-7 px-1 text-[20px] font-bold tracking-tight">Mes données</h3>
      <div className="overflow-hidden rounded-2xl bg-fill">
        <button onClick={exportData} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Exporter une sauvegarde
        </button>
        <button onClick={() => fileRef.current?.click()} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Importer une sauvegarde
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </div>
      <p className={`mt-2 px-4 text-[13px] ${stale ? 'text-pink' : 'text-muted'}`}>
        Tes données restent sur ce téléphone. {state.lastExport ? `Dernier export : ${ago(state.lastExport)}.` : 'Jamais exportées.'}
      </p>
    </Sheet>
  );
}
