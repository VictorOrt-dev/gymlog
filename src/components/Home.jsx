import { useMemo, useRef, useState } from 'react';
import { uid } from '../lib/defaults';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import Sheet from './Sheet';
import TemplateEditor from './TemplateEditor';
import { Check, Play, Plus } from './Icons';

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

const Avatar = ({ name, className = 'h-9 w-9 bg-fill-hi text-[15px]' }) => (
  <span className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}>{(name || '?')[0].toUpperCase()}</span>
);

const PrimaryButton = ({ onClick, children }) => (
  <button onClick={onClick} className="mt-5 h-[52px] w-full rounded-full bg-pink text-[17px] font-semibold text-white active:opacity-80">
    {children}
  </button>
);

/** Section façon Réglages iOS : titre, carte groupée, note en dessous. */
const Group = ({ title, action, footer, footerClass = 'text-muted', children }) => (
  <section className="mt-9">
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
      {action}
    </div>
    <div className="overflow-hidden rounded-2xl bg-card">{children}</div>
    {footer && <p className={`mt-2 px-4 text-[13px] ${footerClass}`}>{footer}</p>}
  </section>
);

const PlayButton = ({ label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink/15 text-pink active:opacity-60 disabled:opacity-30"
  >
    <Play className="h-4 w-4 translate-x-px" />
  </button>
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
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

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
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* Grand titre façon iOS */}
      <header className="flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-muted first-letter:uppercase">{dateLabel}</p>
          <h1 className="text-[34px] font-bold leading-tight tracking-tight">Aujourd'hui</h1>
        </div>
        <button onClick={() => setProfilesOpen(true)} aria-label={`Profil : ${profile.name}`} className="mb-1.5 active:opacity-60">
          <Avatar name={profile.name} className="h-10 w-10 bg-fill-hi text-[17px]" />
        </button>
      </header>

      {/* Une carte, une action. */}
      <div className="mt-5 rounded-3xl bg-card p-5">
        {draft ? (
          <>
            <p className="text-[13px] font-semibold text-pink">En cours</p>
            <p className="mt-1 truncate text-[28px] font-bold leading-tight tracking-tight">{draft.name}</p>
            <p className="mt-1 text-[15px] text-muted">
              {setCount(draft)} séries · depuis {new Date(draft.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <PrimaryButton onClick={onOpenSession}>Reprendre</PrimaryButton>
          </>
        ) : todayTpl && !today.done ? (
          <>
            <p className="text-[13px] font-semibold text-muted">Au programme</p>
            <p className="mt-1 truncate text-[28px] font-bold leading-tight tracking-tight">{todayTpl.name || 'Séance'}</p>
            <p className="mt-1 line-clamp-2 text-[15px] text-muted">{preview(todayTpl) || 'Aucun exercice pour l’instant'}</p>
            <PrimaryButton onClick={() => start(todayTpl.id)}>Commencer</PrimaryButton>
          </>
        ) : today.done ? (
          <>
            <p className="text-[13px] font-semibold text-pink">Terminé</p>
            <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight">Séance faite</p>
            <p className="mt-1 text-[15px] text-muted">Mange, dors, reviens plus fort.</p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-muted">Au programme</p>
            <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight">Repos</p>
            <p className="mt-1 text-[15px] text-muted">La récupération fait partie du programme. Envie quand même ? Choisis une séance plus bas.</p>
          </>
        )}
      </div>

      {/* Semaine : fréquence et jours off d'un coup d'œil */}
      <Group
        title="Cette semaine"
        action={
          <button onClick={() => setEditPlan(!editPlan)} className="text-[17px] text-pink active:opacity-50">
            {editPlan ? 'OK' : 'Modifier'}
          </button>
        }
        footer={editPlan ? 'Touche un jour pour changer de séance ou passer en repos.' : `${doneCount} séance${doneCount > 1 ? 's' : ''} sur ${plannedCount} cette semaine`}
      >
        <div className="grid grid-cols-7 px-1 py-4">
          {week.map((d) => {
            const tpl = tplById[plan[d.i]];
            const Tag = editPlan ? 'button' : 'div';
            const name = d.done?.name ?? tpl?.name ?? '';
            return (
              <Tag key={d.i} {...(editPlan && { onClick: () => cycleDay(d.i), type: 'button' })} className="flex min-w-0 flex-col items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${d.isToday ? 'text-pink' : 'text-muted'}`}>{d.label}</span>
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full font-num text-[15px] font-semibold tabular-nums ${
                    d.done ? 'bg-pink text-white' : tpl ? `bg-fill text-white ${d.isPast ? 'opacity-40' : ''}` : 'text-faint'
                  } ${d.isToday && !d.done ? 'ring-2 ring-pink' : ''} ${editPlan ? 'outline-1 outline-offset-2 outline-dashed outline-muted' : ''}`}
                >
                  {d.done ? <Check className="h-5 w-5" strokeWidth={3} /> : d.date.getDate()}
                </span>
                <span className={`h-3.5 w-full truncate px-0.5 text-center text-[11px] font-medium ${d.done ? 'text-pink' : 'text-muted'}`}>{name}</span>
              </Tag>
            );
          })}
        </div>
      </Group>

      {/* Séances types */}
      <Group title="Mes séances">
        {templates.map((t) => (
          <div key={t.id} className="sep flex items-center gap-3 pr-3">
            <button onClick={() => setEditingId(t.id)} className="min-w-0 flex-1 py-3 pl-4 text-left active:opacity-60">
              <div className="truncate text-[17px] font-semibold">{t.name || 'Sans nom'}</div>
              <div className="truncate text-[15px] text-muted">{preview(t) || 'Touche pour ajouter des exercices'}</div>
            </button>
            <PlayButton label={`Démarrer ${t.name}`} onClick={() => start(t.id)} disabled={!!draft} />
          </div>
        ))}
        <div className="sep flex items-center gap-3 pr-3">
          <div className="min-w-0 flex-1 py-3 pl-4">
            <div className="text-[17px] font-semibold">Séance libre</div>
            <div className="text-[15px] text-muted">Ajoute les exercices au fil de l’eau</div>
          </div>
          <PlayButton label="Démarrer une séance libre" onClick={() => start(null)} disabled={!!draft} />
        </div>
        <button onClick={newTemplate} className="sep flex h-12 w-full items-center gap-2 px-4 text-[17px] text-pink active:opacity-50">
          <Plus className="h-5 w-5" /> Nouvelle séance type
        </button>
      </Group>

      {mine.length > 0 && (
        <Group title="Historique">
          {mine
            .slice(-5)
            .reverse()
            .map((s) => (
              <div key={s.id} className="sep flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-semibold">{s.name}</div>
                  <div className="text-[15px] text-muted first-letter:uppercase">{ago(s.startedAt)}</div>
                </div>
                <div className="shrink-0 text-right font-num text-[15px] tabular-nums text-muted">
                  {setCount(s)} séries
                  <br />
                  {Math.round((s.endedAt - s.startedAt) / 60e3)} min
                </div>
              </div>
            ))}
        </Group>
      )}

      {/* Sauvegarde : le localStorage, ça s'efface. 1 tap pour ne jamais perdre des mois de progression. */}
      <Group
        title="Mes données"
        footer={`Elles restent sur ce téléphone. ${state.lastExport ? `Dernier export : ${ago(state.lastExport)}.` : 'Jamais exportées.'}`}
        footerClass={exportStale ? 'text-pink' : 'text-muted'}
      >
        <button onClick={exportData} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Exporter une sauvegarde
        </button>
        <button onClick={() => fileRef.current?.click()} className="sep flex h-12 w-full items-center px-4 text-[17px] text-pink active:opacity-50">
          Importer une sauvegarde
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
      </Group>

      <Sheet open={profilesOpen} onClose={() => setProfilesOpen(false)} title="Qui s’entraîne ?">
        <div className="overflow-hidden rounded-2xl bg-fill">
          {state.profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                switchProfile(p.id);
                setProfilesOpen(false);
              }}
              className="sep flex h-14 w-full items-center gap-3 px-4 active:bg-fill-hi"
            >
              <Avatar name={p.name} className="h-8 w-8 bg-seg text-[15px]" />
              <span className="flex-1 truncate text-left text-[17px]">{p.name}</span>
              {state.drafts[p.id] && <span className="text-[13px] text-muted">En séance</span>}
              {p.id === pid && <Check className="h-5 w-5 text-pink" strokeWidth={3} />}
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
          className="mt-4 flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Prénom d’un pote"
            className="h-12 min-w-0 flex-1 rounded-xl bg-fill px-4 text-[17px] outline-none placeholder:text-muted"
          />
          <button className="h-12 rounded-full bg-pink px-5 text-[17px] font-semibold text-white active:opacity-80">Ajouter</button>
        </form>
      </Sheet>

      <TemplateEditor template={templates.find((t) => t.id === editingId)} onClose={() => setEditingId(null)} />
    </div>
  );
}
