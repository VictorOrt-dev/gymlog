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
  const { state, renameProfile, setProfileInfo, exportData, replaceAll } = useStore();
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

      {/* Pour situer ta force (Progrès) : rien d'autre n'en dépend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Poids de corps</span>
          <span className="relative block">
            <input
              key={`bw-${profile.id}`}
              defaultValue={profile.bw ?? ''}
              inputMode="decimal"
              placeholder="—"
              aria-label="Poids de corps en kilos"
              onBlur={(e) => {
                const v = parseFloat(e.target.value.replace(',', '.'));
                const bw = v >= 25 && v <= 350 ? Math.round(v * 10) / 10 : null;
                if (bw !== (profile.bw ?? null)) setProfileInfo({ bw });
                e.target.value = bw ?? '';
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              enterKeyHint="done"
              className="h-12 w-full rounded-xl bg-fill pl-4 pr-10 font-num text-[17px] outline-none placeholder:text-muted focus:ring-1 focus:ring-pink"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[15px] text-muted">kg</span>
          </span>
        </label>
        <div>
          <span className="mb-1.5 block px-1 text-[13px] font-medium text-muted">Repères de force</span>
          <div className="grid h-12 grid-cols-2 gap-0.5 rounded-xl bg-fill p-0.5" role="radiogroup" aria-label="Repères de force">
            {[
              ['h', 'Homme'],
              ['f', 'Femme'],
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={(profile.sex ?? 'h') === k}
                onClick={() => setProfileInfo({ sex: k })}
                className={`rounded-[10px] text-[15px] font-semibold ${(profile.sex ?? 'h') === k ? 'bg-seg text-white' : 'text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 px-4 text-[13px] text-muted">Seulement pour situer ta force dans Progrès.</p>

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
      <p className="mt-6 text-center text-[13px] text-muted">
        Version du {new Date(__BUILD__).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à{' '}
        {new Date(__BUILD__).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </Sheet>
  );
}
