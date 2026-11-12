import { useRef, useState } from 'react';
import { parseBackup } from '../lib/backup';
import { planFromChoice } from '../lib/defaults';
import { useStore } from '../lib/store';
import { Check } from './Icons';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const Label = ({ children }) => <h2 className="mb-2 mt-8 px-1 text-[15px] font-semibold text-muted">{children}</h2>;

/**
 * Premier lancement, un seul écran, 20 secondes : prénom, jours, séances gardées.
 * Les séances non gardées disparaissent : l'accueil ne montre que ce que tu fais vraiment.
 */
export default function Onboarding() {
  const { state, completeOnboarding, replaceAll } = useStore();
  const pid = state.profileId;
  const templates = state.templates.filter((t) => t.profileId === pid);
  const exName = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const [name, setName] = useState('');
  const [days, setDays] = useState([0, 2, 4]);
  const [keep, setKeep] = useState(() => templates.slice(0, 3).map((t) => t.id));
  const fileRef = useRef(null);

  const order = templates.filter((t) => keep.includes(t.id));
  const plan = planFromChoice(days, order.map((t) => t.id));
  const nameOf = Object.fromEntries(templates.map((t) => [t.id, t.name]));
  const week = plan.flatMap((id, d) => (id ? [`${SHORT[d]} ${nameOf[id]}`] : []));
  const toggle = (list, x) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const res = parseBackup(await file.text().catch(() => ''));
    if (!res.ok) return alert(`Import refusé : ${res.error}`);
    replaceAll({ ...res.data, onboarded: true });
  };

  return (
    <div className="min-h-dvh bg-black">
      <main className="mx-auto max-w-md px-4 pb-44 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.5rem))]">
        <svg viewBox="0 0 512 512" className="h-14 w-14 animate-pop" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="#1c1c1e" />
          <g fill="#ff3b80">
            <rect x="132" y="240" width="248" height="32" rx="10" />
            <rect x="148" y="150" width="44" height="212" rx="14" />
            <rect x="320" y="150" width="44" height="212" rx="14" />
            <rect x="96" y="186" width="40" height="140" rx="12" />
            <rect x="376" y="186" width="40" height="140" rx="12" />
          </g>
        </svg>
        <h1 className="mt-5 text-[34px] font-bold leading-tight tracking-tight">Bienvenue</h1>
        <p className="mt-1 text-[17px] text-muted">Trois réponses, et c’est parti.</p>

        <Label>Ton prénom</Label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Prénom"
          aria-label="Ton prénom"
          autoComplete="given-name"
          enterKeyHint="done"
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="h-12 w-full rounded-xl bg-card px-4 text-[17px] outline-none placeholder:text-muted focus:ring-1 focus:ring-pink"
        />

        <Label>Tes jours d’entraînement</Label>
        <div className="grid grid-cols-7 gap-1 rounded-2xl bg-card px-1 py-2 max-[359px]:-mx-2.5 max-[359px]:gap-0 max-[359px]:px-0">
          {DAYS.map((d, i) => {
            const on = days.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[i]}
                onClick={() => setDays(toggle(days, i))}
                className="flex h-12 items-center justify-center"
              >
                <span className={`grid h-11 w-11 place-items-center rounded-full text-[15px] font-semibold transition-colors ${on ? 'bg-pink text-white' : 'bg-fill text-muted'}`}>{d}</span>
              </button>
            );
          })}
        </div>

        <Label>Les séances que tu gardes</Label>
        <div className="overflow-hidden rounded-2xl bg-card">
          {templates.map((t) => {
            const on = keep.includes(t.id);
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => setKeep(toggle(keep, t.id))} className="sep flex min-h-14 w-full items-center gap-3 py-2.5 pl-4 pr-4 text-left active:bg-fill">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold">{t.name}</span>
                  <span className="block truncate text-[13px] text-muted">{t.exerciseIds.map((id) => exName[id]).filter(Boolean).join(' · ')}</span>
                </span>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${on ? 'bg-pink text-white' : 'ring-[1.5px] ring-inset ring-faint'}`}>{on && <Check className="h-4 w-4" strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-4 text-[13px] leading-snug text-muted">Tout reste modifiable ensuite : exercices, jours, nouvelles séances.</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-[0.5px] border-line/70 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3">
          <p className="mb-2 truncate text-center text-[13px] text-muted" aria-live="polite">
            {!keep.length ? 'Garde au moins une séance' : week.length ? `Ta semaine : ${week.join(' · ')}` : 'Aucun jour fixe : tu lances quand tu veux'}
          </p>
          <button
            disabled={!keep.length}
            onClick={() => completeOnboarding({ name, days, keep })}
            className="h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            C’est parti
          </button>
          <button onClick={() => fileRef.current?.click()} className="mt-1 h-11 w-full text-[15px] text-pink active:opacity-50">
            J’ai déjà une sauvegarde
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={restore} />
        </div>
      </div>
    </div>
  );
}
