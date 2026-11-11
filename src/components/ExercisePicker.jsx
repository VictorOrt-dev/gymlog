import { useState } from 'react';
import { useStore } from '../lib/store';
import { norm } from '../lib/training';
import { Plus, Search } from './Icons';

/** Plein écran, recherche en haut (le clavier ne cache rien). Le nom existe → on le prend, sinon → créé. */
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
    <div className="fixed inset-0 z-[60] flex animate-sheet flex-col bg-black">
      <form onSubmit={submit} className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))]">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-fill px-3">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher ou créer"
            enterKeyHint="done"
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
          />
        </label>
        <button type="button" onClick={close} className="text-[17px] text-pink active:opacity-50">
          Annuler
        </button>
      </form>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-10">
        {nq && !exact && (
          <button onClick={() => pick(addExercise(q.trim()))} className="mb-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
            <Plus className="h-5 w-5" /> Créer « {q.trim()} »
          </button>
        )}
        {exact && exclude.includes(exact.id) && <p className="px-4 pb-3 text-[15px] text-muted">« {exact.name} » est déjà dans la liste.</p>}
        {list.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-card">
            {list.map((e) => (
              <button key={e.id} onClick={() => pick(e.id)} className="sep flex h-12 w-full items-center px-4 text-left text-[17px] active:bg-fill">
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
