import { useState } from 'react';
import { useStore } from '../lib/store';
import ExercisePicker from './ExercisePicker';
import Sheet from './Sheet';
import { Close, Plus, Up } from './Icons';

/** Éditer une séance type : renommer, ajouter, remonter, retirer. Chaque changement est enregistré direct. */
export default function TemplateEditor({ template, onClose }) {
  const { state, saveTemplate, deleteTemplate } = useStore();
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!template) return null;

  const names = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const ids = template.exerciseIds;
  const update = (patch) => saveTemplate({ ...template, ...patch });
  const moveUp = (i) => {
    const next = [...ids];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    update({ exerciseIds: next });
  };
  const iconBtn = 'grid h-10 w-10 place-items-center rounded-full text-muted active:bg-fill-hi';

  return (
    <>
      <Sheet open onClose={onClose}>
        <input
          value={template.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Nom de la séance"
          aria-label="Nom de la séance"
          className="w-full bg-transparent text-[28px] font-bold tracking-tight outline-none placeholder:text-faint"
        />
        <p className="mb-4 text-[15px] text-muted">
          {ids.length} exercice{ids.length > 1 ? 's' : ''}
        </p>
        <div className="overflow-hidden rounded-2xl bg-fill">
          {ids.map((id, i) => (
            <div key={id} className="sep flex h-12 items-center gap-1 pl-4 pr-1">
              <span className="w-6 font-num text-[13px] tabular-nums text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[17px]">{names[id] ?? '—'}</span>
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
        <button onClick={onClose} className="mt-6 h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
          Terminé
        </button>
        <button
          onClick={() => (confirmDelete ? (deleteTemplate(template.id), onClose()) : setConfirmDelete(true))}
          className="mt-1 h-12 w-full text-[17px] text-pink active:opacity-50"
        >
          {confirmDelete ? 'Toucher encore pour supprimer' : 'Supprimer la séance'}
        </button>
      </Sheet>
      <ExercisePicker open={picking} onClose={() => setPicking(false)} exclude={ids} onPick={(id) => update({ exerciseIds: [...ids, id] })} />
    </>
  );
}
