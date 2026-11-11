import { useState } from 'react';
import { useStore } from '../lib/store';
import { norm } from '../lib/training';
import { Plus } from './Icons';

/** Plein écran, champ en haut (le clavier ne cache rien). Tape un nom : il existe → on le prend, sinon → créé. */
export default function ExercisePicker({ open, onClose, onPick, exclude = [] }) {
  const { state, addExercise } = useStore();
  const [q, setQ] = useState('');
  if (!open) return null;

  const nq = norm(q);
  const exact = state.exercises.find((e) => norm(e.name) === nq);
  const list = state.exercises
    .filter((e) => !exclude.includes(e.id) && norm(e.name).includes(nq))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const close = () => {
    setQ('');
    onClose();
  };
  const pick = (id) => {
    onPick(id);
    close();
  };
  const submit = (e) => {
    e.preventDefault();
    if (!nq) return;
    if (!exact) pick(addExercise(q.trim()));
    else if (!exclude.includes(exact.id)) pick(exact.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex animate-sheet flex-col bg-zinc-950">
      <form onSubmit={submit} className="mx-auto flex w-full max-w-md items-center gap-2 border-b border-zinc-900 p-3 pt-[max(.75rem,env(safe-area-inset-top))]">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher ou créer un exercice"
          enterKeyHint="done"
          className="h-12 min-w-0 flex-1 rounded-xl bg-zinc-900 px-4 text-base outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-acid"
        />
        <button type="button" onClick={close} className="h-12 px-3 font-semibold text-zinc-400">
          Fermer
        </button>
      </form>
      <div className="mx-auto w-full max-w-md flex-1 space-y-1 overflow-y-auto p-3">
        {nq && !exact && (
          <button onClick={() => pick(addExercise(q.trim()))} className="flex h-14 w-full items-center gap-2 rounded-xl bg-acid px-4 text-left font-bold text-black">
            <Plus className="h-5 w-5" /> Créer « {q.trim()} »
          </button>
        )}
        {list.map((e) => (
          <button key={e.id} onClick={() => pick(e.id)} className="flex h-12 w-full items-center rounded-xl px-4 text-left font-medium active:bg-zinc-800">
            {e.name}
          </button>
        ))}
        {exact && exclude.includes(exact.id) && <p className="px-4 py-3 text-sm text-zinc-500">« {exact.name} » est déjà dans la liste.</p>}
      </div>
    </div>
  );
}
