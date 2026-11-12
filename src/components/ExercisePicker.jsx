import { useMemo, useState } from 'react';
import { CUSTOM_GROUP, GROUPS } from '../lib/defaults';
import { useStore } from '../lib/store';
import { norm } from '../lib/training';
import { Plus, Search } from './Icons';

const Section = ({ title, items, onPick }) =>
  items.length > 0 && (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-1.5 px-4 text-[13px] font-semibold text-muted">{title}</h3>
      <div className="overflow-hidden rounded-2xl bg-card">
        {items.map((e) => (
          <button key={e.id} onClick={() => onPick(e.id)} className="sep flex h-12 w-full items-center px-4 text-left text-[17px] active:bg-fill">
            <span className="truncate">{e.name}</span>
          </button>
        ))}
      </div>
    </section>
  );

/**
 * Plein écran, recherche en haut (le clavier ne cache rien).
 * Sans recherche : récents, puis classement par muscle. Tape un nom : il existe → on le prend, sinon → créé.
 */
export default function ExercisePicker({ open, onClose, onPick, exclude = [] }) {
  const { state, addExercise } = useStore();
  const [q, setQ] = useState('');

  const available = useMemo(() => state.exercises.filter((e) => !exclude.includes(e.id)), [state.exercises, exclude]);
  const recent = useMemo(() => {
    const ids = [];
    const mine = state.sessions.filter((s) => s.profileId === state.profileId);
    for (let i = mine.length - 1; i >= 0 && ids.length < 6; i--) {
      for (const it of mine[i].items) if (!ids.includes(it.exerciseId) && !exclude.includes(it.exerciseId)) ids.push(it.exerciseId);
    }
    const byId = Object.fromEntries(state.exercises.map((e) => [e.id, e]));
    return ids.slice(0, 6).map((id) => byId[id]).filter(Boolean);
  }, [state.sessions, state.profileId, state.exercises, exclude]);

  if (!open) return null;

  const nq = norm(q);
  const exact = state.exercises.find((e) => norm(e.name) === nq);
  const results = nq ? available.filter((e) => norm(e.name).includes(nq)).sort((a, b) => a.name.localeCompare(b.name, 'fr')) : [];

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
            placeholder="Rechercher un exercice"
            enterKeyHint="done"
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted"
          />
        </label>
        <button type="button" onClick={close} className="h-11 px-1 text-[17px] text-pink active:opacity-50">
          Annuler
        </button>
      </form>

      <div className="mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-10">
        {nq ? (
          <>
            {!exact && (
              <button onClick={() => pick(addExercise(q.trim()))} className="mb-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
                <Plus className="h-5 w-5" /> Créer « {q.trim()} »
              </button>
            )}
            {exact && exclude.includes(exact.id) && <p className="px-4 pb-3 text-[15px] text-muted">« {exact.name} » est déjà dans la liste.</p>}
            <Section title={`${results.length} résultat${results.length > 1 ? 's' : ''}`} items={results} onPick={pick} />
          </>
        ) : (
          <>
            <Section title="Récents" items={recent} onPick={pick} />
            <Section title={CUSTOM_GROUP} items={available.filter((e) => (e.group ?? CUSTOM_GROUP) === CUSTOM_GROUP)} onPick={pick} />
            {GROUPS.map((g) => (
              <Section key={g} title={g} items={available.filter((e) => e.group === g)} onPick={pick} />
            ))}
            <p className="mt-5 px-4 text-[13px] text-muted">Il te manque un exercice ? Tape son nom en haut pour le créer.</p>
          </>
        )}
      </div>
    </div>
  );
}
