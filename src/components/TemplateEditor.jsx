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

  return (
    <>
      <Sheet open onClose={onClose}>
        <input
          value={template.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Nom de la séance"
          aria-label="Nom de la séance"
          className="mb-3 w-full rounded-xl bg-transparent py-1 text-2xl font-black outline-none placeholder:text-zinc-600"
        />
        <ul className="space-y-1">
          {ids.map((id, i) => (
            <li key={id} className="flex h-12 items-center gap-1 rounded-xl bg-zinc-800/60 pl-4 pr-1">
              <span className="w-5 text-xs font-bold tabular-nums text-zinc-500">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{names[id] ?? '—'}</span>
              {i > 0 && (
                <button onClick={() => moveUp(i)} aria-label="Monter" className="grid h-10 w-10 place-items-center rounded-lg text-zinc-400 active:bg-zinc-700">
                  <Up className="h-5 w-5" />
                </button>
              )}
              <button onClick={() => update({ exerciseIds: ids.filter((x) => x !== id) })} aria-label="Retirer" className="grid h-10 w-10 place-items-center rounded-lg text-zinc-400 active:bg-zinc-700">
                <Close className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setPicking(true)}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 font-bold text-zinc-300 active:bg-zinc-800"
        >
          <Plus className="h-5 w-5" /> Ajouter un exercice
        </button>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => (confirmDelete ? (deleteTemplate(template.id), onClose()) : setConfirmDelete(true))}
            className="h-12 rounded-xl bg-zinc-800 font-bold text-orange-400 active:bg-zinc-700"
          >
            {confirmDelete ? 'Sûr ? Supprimer' : 'Supprimer'}
          </button>
          <button onClick={onClose} className="h-12 rounded-xl bg-acid font-black text-black">
            OK
          </button>
        </div>
      </Sheet>
      <ExercisePicker open={picking} onClose={() => setPicking(false)} exclude={ids} onPick={(id) => update({ exerciseIds: [...ids, id] })} />
    </>
  );
}
