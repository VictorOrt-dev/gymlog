import { useMemo, useState } from 'react';
import { MODELS, uid } from '../lib/defaults';
import { useStore } from '../lib/store';
import ProfileSheet, { isExportStale } from './ProfileSheet';
import SessionDetail from './SessionDetail';
import Sheet from './Sheet';
import SwipeRow from './SwipeRow';
import TemplateEditor from './TemplateEditor';
import { useToast } from './Toast';
import { Check, Plus } from './Icons';
import { Avatar, Group, LargeTitle, Page, PlayButton, PrimaryButton } from './ui';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
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

/**
 * Onglet « Entraînement » : tout ce qu'on fait à la salle.
 * De haut en bas, par fréquence d'usage : la séance du jour → la semaine → mes séances.
 */
export default function Home({ onOpenSession }) {
  const { state, startSession, setPlanDay, saveTemplate, deleteTemplate, restoreTemplate, addTemplateFromModel } = useStore();
  const notify = useToast();
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
  const [planDay, setPlanDayOpen] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const today = week.find((d) => d.isToday);
  const todayTpl = tplById[plan[today.i]];
  const doneCount = week.filter((d) => d.done).length;
  const plannedCount = plan.filter((x) => tplById[x]).length;
  const preview = (ids) => ids.map((id) => exName[id]).filter(Boolean).join(' · ');
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const start = (templateId) => {
    startSession(templateId);
    onOpenSession();
  };
  const createFrom = (model) => {
    let id;
    if (model) id = addTemplateFromModel(model);
    else {
      id = uid();
      saveTemplate({ id, profileId: pid, name: 'Nouvelle séance', exerciseIds: [] });
    }
    setCreating(false);
    setEditingId(id);
  };
  const remove = (t) => {
    const index = state.templates.findIndex((x) => x.id === t.id);
    const refs = Object.entries(state.plans).flatMap(([p, pl]) => pl.flatMap((x, day) => (x === t.id ? [[p, day]] : [])));
    deleteTemplate(t.id);
    notify(`« ${t.name || 'Séance'} » supprimée`, () => restoreTemplate({ tpl: t, index, refs }));
  };

  return (
    <Page>
      <LargeTitle
        title="Aujourd'hui"
        subtitle={dateLabel}
        right={
          <button onClick={() => setProfilesOpen(true)} aria-label={`Profil : ${profile.name}`} className="relative mb-1 active:opacity-60">
            <Avatar name={profile.name} className="h-11 w-11 bg-fill-hi text-[17px]" />
            {isExportStale(state) && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-pink ring-2 ring-black" />}
          </button>
        }
      />

      {/* 1. Une carte, une action */}
      <div className="mt-5 rounded-3xl bg-card p-5">
        {draft ? (
          <>
            <p className="text-[13px] font-semibold text-pink">En cours</p>
            <p className="mt-1 truncate text-[28px] font-bold leading-tight tracking-tight">{draft.name}</p>
            <p className="mt-1 text-[15px] text-muted">
              {draft.items.reduce((n, it) => n + it.sets.filter((x) => !x.wu).length, 0)} séries · depuis{' '}
              {new Date(draft.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <PrimaryButton onClick={onOpenSession}>Reprendre</PrimaryButton>
          </>
        ) : todayTpl && !today.done ? (
          <>
            <p className="text-[13px] font-semibold text-muted">Au programme</p>
            <p className="mt-1 truncate text-[28px] font-bold leading-tight tracking-tight">{todayTpl.name || 'Séance'}</p>
            <p className="mt-1 line-clamp-2 text-[15px] text-muted">{preview(todayTpl.exerciseIds) || 'Aucun exercice pour l’instant'}</p>
            <PrimaryButton onClick={() => start(todayTpl.id)}>Commencer</PrimaryButton>
          </>
        ) : (
          <>
            <p className={`text-[13px] font-semibold ${today.done ? 'text-pink' : 'text-muted'}`}>{today.done ? 'Terminé' : 'Au programme'}</p>
            <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight">{today.done ? 'Séance faite' : 'Repos'}</p>
            <p className="mt-1 text-[15px] text-muted">
              {today.done ? 'Mange, dors, reviens plus fort.' : 'La récupération fait partie du programme. Envie quand même ? Choisis une séance plus bas.'}
            </p>
          </>
        )}
      </div>

      {/* 2. La semaine : fréquence et jours off d'un coup d'œil */}
      <Group
        title="Cette semaine"
        action={
          <button onClick={() => setEditPlan(!editPlan)} className="-my-3 h-11 px-1 text-[17px] text-pink active:opacity-50">
            {editPlan ? 'OK' : 'Modifier'}
          </button>
        }
        footer={editPlan ? 'Touche un jour pour choisir sa séance ou le passer en repos.' : `${doneCount} séance${doneCount > 1 ? 's' : ''} sur ${plannedCount} cette semaine`}
      >
        <div className="grid grid-cols-7 px-1 py-4">
          {week.map((d) => {
            const tpl = tplById[plan[d.i]];
            const tap = editPlan ? () => setPlanDayOpen(d.i) : d.done ? () => setDetailId(d.done.id) : null;
            const Tag = tap ? 'button' : 'div';
            return (
              <Tag key={d.i} {...(tap && { onClick: tap, type: 'button' })} className="flex min-w-0 flex-col items-center gap-1.5">
                <span className={`text-[13px] font-semibold ${d.isToday ? 'text-pink' : 'text-muted'}`}>{d.label}</span>
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full font-num text-[15px] font-semibold tabular-nums ${
                    d.done ? 'bg-pink text-white' : tpl ? `bg-fill text-white ${d.isPast ? 'opacity-40' : ''}` : 'text-faint'
                  } ${d.isToday && !d.done ? 'ring-2 ring-pink' : ''} ${editPlan ? 'outline-1 outline-offset-2 outline-dashed outline-muted' : ''}`}
                >
                  {d.done ? <Check className="h-5 w-5" strokeWidth={3} /> : d.date.getDate()}
                </span>
                <span className={`h-3.5 w-full truncate px-0.5 text-center text-[11px] font-medium ${d.done ? 'text-pink' : 'text-muted'}`}>
                  {d.done?.name ?? tpl?.name ?? ''}
                </span>
              </Tag>
            );
          })}
        </div>
      </Group>

      {/* 3. Mes séances : démarrer, modifier, glisser pour supprimer */}
      <Group
        title="Mes séances"
        footer={templates.length ? 'Touche une séance pour la modifier. Glisse-la vers la gauche pour la supprimer.' : null}
      >
        {templates.map((t) => (
          <SwipeRow key={t.id} className="sep" onDelete={() => remove(t)}>
            <div className="flex items-center gap-3 pr-3">
              <button onClick={() => setEditingId(t.id)} className="min-w-0 flex-1 py-3 pl-4 text-left">
                <div className="truncate text-[17px] font-semibold">{t.name || 'Sans nom'}</div>
                <div className="truncate text-[15px] text-muted">
                  {t.exerciseIds.length ? `${t.exerciseIds.length} exercices · ${preview(t.exerciseIds)}` : 'Touche pour ajouter des exercices'}
                </div>
              </button>
              <PlayButton label={`Démarrer ${t.name}`} onClick={() => start(t.id)} disabled={!!draft} />
            </div>
          </SwipeRow>
        ))}
        <div className="sep flex items-center gap-3 pr-3">
          <div className="min-w-0 flex-1 py-3 pl-4">
            <div className="text-[17px] font-semibold">Séance libre</div>
            <div className="truncate text-[15px] text-muted">Sans programme, ajoute les exercices au fil de l’eau</div>
          </div>
          <PlayButton label="Démarrer une séance libre" onClick={() => start(null)} disabled={!!draft} />
        </div>
        <button onClick={() => setCreating(true)} className="sep flex h-12 w-full items-center gap-2 px-4 text-[17px] text-pink active:opacity-50">
          <Plus className="h-5 w-5" /> Créer une séance
        </button>
      </Group>

      {/* Feuilles et vues détaillées */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouvelle séance">
        <div className="overflow-hidden rounded-2xl bg-fill">
          <button onClick={() => createFrom(null)} className="sep flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fill-hi">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink text-white">
              <Plus className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] font-semibold">Séance vide</span>
              <span className="block text-[15px] text-muted">Tu choisis tes exercices</span>
            </span>
          </button>
        </div>
        <h3 className="mb-2 mt-6 px-1 text-[15px] font-semibold text-muted">Ou pars d’un modèle, modifiable ensuite</h3>
        <div className="overflow-hidden rounded-2xl bg-fill">
          {MODELS.map(([name, exercises]) => (
            <button key={name} onClick={() => createFrom(name)} className="sep flex w-full flex-col px-4 py-3 text-left active:bg-fill-hi">
              <span className="text-[17px] font-semibold">{name}</span>
              <span className="truncate text-[15px] text-muted">{exercises.join(' · ')}</span>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={planDay != null} onClose={() => setPlanDayOpen(null)} title={planDay != null ? DAY_NAMES[planDay] : ''}>
        {planDay != null && (
          <div className="overflow-hidden rounded-2xl bg-fill">
            {[null, ...templates.map((t) => t.id)].map((id) => {
              const current = tplById[plan[planDay]] ? plan[planDay] : null;
              return (
                <button
                  key={id ?? 'rest'}
                  onClick={() => {
                    setPlanDay(planDay, id);
                    setPlanDayOpen(null);
                  }}
                  className="sep flex h-12 w-full items-center justify-between px-4 text-[17px] active:bg-fill-hi"
                >
                  <span className={id ? '' : 'text-muted'}>{id ? tplById[id].name || 'Sans nom' : 'Repos'}</span>
                  {current === id && <Check className="h-5 w-5 text-pink" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        )}
      </Sheet>

      <TemplateEditor template={templates.find((t) => t.id === editingId)} onClose={() => setEditingId(null)} />
      <SessionDetail session={mine.find((s) => s.id === detailId)} onClose={() => setDetailId(null)} />
      <ProfileSheet open={profilesOpen} onClose={() => setProfilesOpen(false)} />
    </Page>
  );
}
