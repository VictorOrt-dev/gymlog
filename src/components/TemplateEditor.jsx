import { useEffect, useState } from 'react';
import { encodeTemplate, templateLink } from '../lib/share';
import { useStore } from '../lib/store';
import { useToast } from './Toast';
import ExercisePicker from './ExercisePicker';
import ExerciseSettings from './ExerciseSettings';
import Sheet from './Sheet';
import { ChevronRight, Close, Pencil, Plus, Up } from './Icons';

/** Éditer une séance type : renommer, ajouter, remonter, retirer. Chaque changement est enregistré direct. */
export default function TemplateEditor({ template, isNew = false, onClose }) {
  const { state, saveTemplate, deleteTemplate, renameTemplate } = useStore();
  const notify = useToast();
  const [picking, setPicking] = useState(false);
  const [settingsOf, setSettingsOf] = useState(null); // exercice dont on règle le nom, la fourchette, la note
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(template?.name ?? '');
  useEffect(() => setName(template?.name ?? ''), [template?.id, template?.name]);
  if (!template) return null;
  // Enregistré à chaque frappe (fermer la feuille ne perd rien) ; un nom vidé reprend l'ancien en quittant le champ.
  const typeName = (v) => {
    setName(v);
    if (v.trim()) renameTemplate(template.id, v);
  };

  const names = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const ids = template.exerciseIds;
  const update = (patch) => saveTemplate({ ...template, ...patch });
  const moveUp = (i) => {
    const next = [...ids];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    update({ exerciseIds: next });
  };
  const iconBtn = 'grid h-11 w-11 place-items-center rounded-full text-muted active:bg-fill-hi';

  return (
    <>
      <Sheet open onClose={onClose}>
        {/* Le nom se voit modifiable : un champ, un crayon. */}
        <label className="flex items-center gap-2 rounded-xl bg-fill pl-4 pr-3.5 focus-within:ring-1 focus-within:ring-pink">
          <input
            value={name}
            onChange={(e) => typeName(e.target.value)}
            onBlur={() => !name.trim() && setName(template.name)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onFocus={(e) => isNew && e.currentTarget.select()} // séance neuve : on tape, « Nouvelle séance » disparaît
            autoFocus={isNew}
            maxLength={40}
            enterKeyHint="done"
            placeholder="Nom de la séance"
            aria-label="Nom de la séance"
            className="h-14 min-w-0 flex-1 bg-transparent text-[24px] font-bold tracking-tight outline-none placeholder:text-faint"
          />
          <Pencil className="h-5 w-5 shrink-0 text-muted" />
        </label>
        <p className="mb-4 mt-2 px-1 text-[15px] text-muted">
          {ids.length} exercice{ids.length > 1 ? 's' : ''}
        </p>
        <div className="overflow-hidden rounded-2xl bg-fill">
          {ids.map((id, i) => (
            <div key={id} className="sep flex h-12 items-center gap-1 pr-1">
              <button onClick={() => setSettingsOf(id)} aria-label={`Modifier ${names[id] ?? 'l’exercice'} : nom, fourchette, note`} className="flex h-12 min-w-0 flex-1 items-center gap-1 pl-4 text-left active:opacity-60">
                <span className="w-6 shrink-0 font-num text-[13px] tabular-nums text-muted">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[17px]">{names[id] ?? '—'}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-faint" />
              </button>
              {i > 0 && (
                <button onClick={() => moveUp(i)} aria-label="Monter" className={iconBtn}>
                  <Up className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => update({ exerciseIds: ids.filter((x) => x !== id) })} aria-label="Retirer" className={iconBtn}>
                <Close className="h-5 w-5" />
              </button>
            </div>
          ))}
          <button onClick={() => setPicking(true)} className="sep flex h-12 w-full items-center gap-2 px-4 text-[17px] text-pink active:opacity-50">
            <Plus className="h-5 w-5" /> Ajouter un exercice
          </button>
        </div>
        {ids.length > 0 && <p className="mt-2 px-4 text-[13px] text-muted">Touche un exercice pour le renommer, régler sa fourchette ou sa note.</p>}
        <button onClick={onClose} className="mt-6 h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
          Terminé
        </button>
        {ids.length > 0 && (
          <button
            onClick={async () => {
              const byId = Object.fromEntries(state.exercises.map((e) => [e.id, e]));
              const url = templateLink(window.location.href, encodeTemplate(template, byId));
              try {
                if (navigator.share) await navigator.share({ title: `Séance ${template.name}`, text: `Ma séance « ${template.name} » sur GymLog :`, url });
                else {
                  await navigator.clipboard.writeText(url);
                  notify('Lien copié : envoie-le à ton pote');
                }
              } catch {
                /* partage annulé */
              }
            }}
            className="mt-2 h-12 w-full rounded-full bg-fill text-[17px] font-semibold active:bg-fill-hi"
          >
            Envoyer à un pote
          </button>
        )}
        <button
          onClick={() => (confirmDelete ? (deleteTemplate(template.id), onClose()) : setConfirmDelete(true))}
          className="mt-1 h-12 w-full text-[17px] text-pink active:opacity-50"
        >
          {confirmDelete ? 'Toucher encore pour supprimer' : 'Supprimer la séance'}
        </button>
      </Sheet>
      <Sheet open={settingsOf != null} onClose={() => setSettingsOf(null)} title={names[settingsOf] ?? ''}>
        {settingsOf != null && <ExerciseSettings exerciseId={settingsOf} />}
        <button onClick={() => setSettingsOf(null)} className="h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
          OK
        </button>
      </Sheet>

      <ExercisePicker open={picking} onClose={() => setPicking(false)} exclude={ids} onPick={(id) => update({ exerciseIds: [...ids, id] })} />
    </>
  );
}
