import { useMemo, useRef, useState } from 'react';
import { uid } from '../lib/defaults';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import Sheet from './Sheet';
import TemplateEditor from './TemplateEditor';
import { Check, Play } from './Icons';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const startOfDay = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));

function useWeek(sessions) {
  return useMemo(() => {
    const today = startOfDay(Date.now());
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return DAYS.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const end = new Date(date);
      end.setDate(date.getDate() + 1);
      const done = sessions.find((s) => s.startedAt >= +date && s.startedAt < +end);
      return { i, label, date, done, isToday: +date === +today, isPast: date < today };
    });
  }, [sessions]);
}

const Avatar = ({ name, className = '' }) => (
  <span className={`grid h-8 w-8 place-items-center rounded-full bg-acid font-black text-black ${className}`}>{(name || '?')[0].toUpperCase()}</span>
);

export default function Home({ onOpenSession }) {
  const { state, startSession, setPlanDay, switchProfile, addProfile, saveTemplate, exportData, replaceAll } = useStore();
  const pid = state.profileId;
  const profile = state.profiles.find((p) => p.id === pid) ?? state.profiles[0];
  const draft = state.drafts[pid];
  const templates = state.templates.filter((t) => t.profileId === pid);
  const tplById = Object.fromEntries(templates.map((t) => [t.id, t]));
  const exName = Object.fromEntries(state.exercises.map((e) => [e.id, e.name]));
  const plan = state.plans[pid] ?? Array(7).fill(null);
  const mine = useMemo(() => state.sessions.filter((s) => s.profileId === pid), [state.sessions, pid]);
  const week = useWeek(mine);

  const [editPlan, setEditPlan] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const fileRef = useRef(null);

  const today = week.find((d) => d.isToday);
  const todayTpl = tplById[plan[today.i]];
  const doneCount = week.filter((d) => d.done).length;
  const plannedCount = plan.filter((x) => tplById[x]).length;
  const preview = (t) => t.exerciseIds.map((id) => exName[id]).filter(Boolean).join(' · ');
  const setCount = (s) => s.items.reduce((n, it) => n + it.sets.length, 0);

  const start = (templateId) => {
    startSession(templateId);
    onOpenSession();
  };
  const cycleDay = (i) => {
    const options = [null, ...templates.map((t) => t.id)];
    setPlanDay(i, options[(options.indexOf(plan[i]) + 1) % options.length]);
  };
  const newTemplate = () => {
    const t = { id: uid(), profileId: pid, name: 'Nouvelle séance', exerciseIds: [] };
    saveTemplate(t);
    setEditingId(t.id);
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.sessions) || !Array.isArray(data.profiles)) throw new Error('format');
      if (confirm(`Remplacer les données de ce téléphone par cette sauvegarde (${data.sessions.length} séances) ?`)) replaceAll(data);
    } catch {
      alert('Fichier de sauvegarde invalide.');
    }
  };

  const exportStale = mine.length >= 3 && (!state.lastExport || Date.now() - state.lastExport > 14 * 864e5);

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">
          GYM<span className="text-acid">LOG</span>
        </h1>
        <button onClick={() => setProfilesOpen(true)} className="flex h-11 items-center gap-2 rounded-full bg-zinc-900 pl-1.5 pr-4 ring-1 ring-zinc-800 active:bg-zinc-800">
          <Avatar name={profile.name} />
          <span className="max-w-32 truncate font-bold">{profile.name}</span>
        </button>
      </header>

      {/* Le bouton principal : ce qu'il faut faire MAINTENANT */}
      {draft ? (
        <button onClick={onOpenSession} className="mt-3 w-full rounded-3xl bg-acid p-5 text-left text-black active:scale-[.99]">
          <div className="text-xs font-black uppercase tracking-widest opacity-60">Séance en cours</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate text-3xl font-black">{draft.name}</span>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black text-acid">
              <Play />
            </span>
          </div>
          <div className="mt-1 text-sm font-bold opacity-60">
            {setCount(draft)} séries · démarrée à {new Date(draft.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </button>
      ) : todayTpl && !today.done ? (
        <button onClick={() => start(todayTpl.id)} className="mt-3 w-full rounded-3xl bg-acid p-5 text-left text-black active:scale-[.99]">
          <div className="text-xs font-black uppercase tracking-widest opacity-60">Aujourd'hui</div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="truncate text-3xl font-black">{todayTpl.name || 'Séance'}</span>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black text-acid">
              <Play />
            </span>
          </div>
          <div className="mt-1 line-clamp-1 text-sm font-semibold opacity-60">{preview(todayTpl) || 'Aucun exercice'}</div>
        </button>
      ) : (
        <div className="mt-3 rounded-3xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <div className="eyebrow">Aujourd'hui</div>
          <div className="mt-1 text-2xl font-black">{today.done ? 'Séance faite. Propre.' : 'Repos.'}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {today.done ? 'Mange, dors, reviens plus fort.' : 'Le muscle se construit pendant la récup. Envie quand même ? Choisis une séance plus bas.'}
          </div>
        </div>
      )}

      {/* Semaine : fréquence et jours off d'un coup d'œil */}
      <section className="mt-7">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="eyebrow">
            Semaine{' '}
            <span className="ml-1 text-sm tracking-normal text-zinc-100 tabular-nums">
              {doneCount}/{plannedCount}
            </span>
          </h2>
          <button onClick={() => setEditPlan(!editPlan)} className="-my-2 px-2 py-2 text-sm font-bold text-acid">
            {editPlan ? 'OK' : 'Modifier'}
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const tpl = tplById[plan[d.i]];
            const missed = d.isPast && tpl && !d.done;
            const Tag = editPlan ? 'button' : 'div';
            return (
              <Tag
                key={d.i}
                {...(editPlan && { onClick: () => cycleDay(d.i), type: 'button' })}
                className={`relative flex h-20 flex-col items-center justify-center rounded-2xl ${
                  d.done ? 'bg-acid text-black' : tpl ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900/60 text-zinc-600'
                } ${d.isToday ? 'ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950' : ''} ${editPlan ? 'outline-2 outline-offset-1 outline-dashed outline-zinc-600' : ''}`}
              >
                <span className="text-[11px] font-bold opacity-60">{d.label}</span>
                <span className="text-lg font-black leading-none tabular-nums">{d.date.getDate()}</span>
                <span className="mt-1 w-full truncate px-0.5 text-center text-[10px] font-black uppercase">{d.done ? d.done.name : tpl ? tpl.name : 'off'}</span>
                {missed && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-400" />}
              </Tag>
            );
          })}
        </div>
        {editPlan && <p className="mt-2 text-xs text-zinc-500">Touche un jour pour alterner entre tes séances et repos.</p>}
      </section>

      {/* Séances types */}
      <section className="mt-7">
        <h2 className="eyebrow mb-2">Séances types</h2>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-2xl bg-zinc-900 p-2 pl-4 ring-1 ring-zinc-800">
              <button onClick={() => setEditingId(t.id)} className="min-w-0 flex-1 py-1.5 text-left">
                <div className="truncate text-lg font-black">{t.name || 'Sans nom'}</div>
                <div className="truncate text-sm text-zinc-500">{preview(t) || 'Touche pour ajouter des exercices'}</div>
              </button>
              <button
                onClick={() => start(t.id)}
                disabled={!!draft}
                aria-label={`Démarrer ${t.name}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-zinc-800 text-acid active:bg-zinc-700 disabled:opacity-25"
              >
                <Play />
              </button>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={newTemplate} className="h-12 rounded-2xl border border-dashed border-zinc-700 text-sm font-bold text-zinc-300 active:bg-zinc-900">
              + Séance type
            </button>
            <button
              onClick={() => start(null)}
              disabled={!!draft}
              className="h-12 rounded-2xl border border-dashed border-zinc-700 text-sm font-bold text-zinc-300 active:bg-zinc-900 disabled:opacity-25"
            >
              Séance libre
            </button>
          </div>
        </div>
      </section>

      {mine.length > 0 && (
        <section className="mt-7">
          <h2 className="eyebrow mb-2">Historique</h2>
          <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-2xl bg-zinc-900/60 ring-1 ring-zinc-900">
            {mine
              .slice(-5)
              .reverse()
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">
                    <b className="font-black">{s.name}</b> <span className="text-zinc-500">{ago(s.startedAt)}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {setCount(s)} séries · {Math.round((s.endedAt - s.startedAt) / 60e3)} min
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Sauvegarde : le localStorage, ça s'efface. 1 tap pour ne jamais perdre 6 mois de progression. */}
      <section className="mt-7 rounded-2xl p-4 ring-1 ring-zinc-900">
        <h2 className="eyebrow">Sauvegarde</h2>
        <p className={`mt-1 text-xs ${exportStale ? 'text-orange-400' : 'text-zinc-500'}`}>
          {state.lastExport ? `Dernier export ${ago(state.lastExport)}.` : 'Jamais exporté.'} Tes données vivent sur ce téléphone uniquement.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={exportData} className="h-11 rounded-xl bg-zinc-800 text-sm font-bold active:bg-zinc-700">
            Exporter
          </button>
          <button onClick={() => fileRef.current?.click()} className="h-11 rounded-xl bg-zinc-800 text-sm font-bold active:bg-zinc-700">
            Importer
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
        </div>
      </section>

      <Sheet open={profilesOpen} onClose={() => setProfilesOpen(false)} title="Qui s'entraîne ?">
        <div className="space-y-1">
          {state.profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                switchProfile(p.id);
                setProfilesOpen(false);
              }}
              className="flex h-14 w-full items-center gap-3 rounded-xl px-3 active:bg-zinc-800"
            >
              <Avatar name={p.name} />
              <span className="flex-1 truncate text-left text-lg font-bold">{p.name}</span>
              {state.drafts[p.id] && <span className="text-xs font-bold text-acid">en séance</span>}
              {p.id === pid && <Check className="h-6 w-6 text-acid" />}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            addProfile(newName.trim());
            setNewName('');
            setProfilesOpen(false);
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Prénom d'un pote"
            className="h-12 min-w-0 flex-1 rounded-xl bg-zinc-800 px-4 text-base outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-acid"
          />
          <button className="h-12 rounded-xl bg-acid px-5 font-black text-black">Ajouter</button>
        </form>
      </Sheet>

      <TemplateEditor template={templates.find((t) => t.id === editingId)} onClose={() => setEditingId(null)} />
    </div>
  );
}
