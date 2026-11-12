import { useMemo, useState } from 'react';
import { MODELS, uid } from '../lib/defaults';
import { nextPlanned, weekStreak } from '../lib/stats';
import { useStore } from '../lib/store';
import { ago } from '../lib/training';
import SettingsSheet, { isExportStale } from './SettingsSheet';
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
  const { state, startSession, setPlanDay, saveTemplate, deleteTemplate, restoreTemplate, addTemplateFromModel, exportData } = useStore();
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

  const [planDay, setPlanDayOpen] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const today = week.find((d) => d.isToday);
  const deloadActive = (state.deload?.[pid] ?? 0) > Date.now();
  const todayTpl = tplById[plan[today.i]];
  const doneCount = week.filter((d) => d.done).length;
  const plannedCount = plan.filter((x) => tplById[x]).length;
  const { streak } = weekStreak(mine, plannedCount || 3);
  const next = nextPlanned(plan, new Set(templates.map((t) => t.id)), today.i);
  const nextTpl = next && tplById[next.templateId];
  const nextWhen = next && (next.label === 'demain' ? 'Demain' : DAY_NAMES[next.day]);
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
          <button onClick={() => setProfilesOpen(true)} aria-label="Réglages et sauvegarde" className="relative mb-1 active:opacity-60">
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
        ) : today.done ? (
          <>
            <p className="text-[13px] font-semibold text-pink">Terminé</p>
            <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight">Séance faite</p>
            <p className="mt-1 text-[15px] text-muted">Mange, dors, reviens plus fort.</p>
            {nextTpl && (
              <p className="mt-3 border-t-[0.5px] border-line pt-3 text-[15px] text-muted">
                Prochaine séance : <span className="font-semibold text-white">{nextTpl.name || 'Séance'}</span> · {nextWhen}
              </p>
            )}
          </>
        ) : nextTpl ? (
          // Jour de repos : la prochaine séance en vue, et la liberté de l'avancer d'un tap
          <>
            <p className="text-[13px] font-semibold text-muted">Repos aujourd’hui · prochaine séance</p>
            <p className="mt-1 truncate text-[28px] font-bold leading-tight tracking-tight">
              {nextTpl.name || 'Séance'} <span className="text-muted">· {nextWhen}</span>
            </p>
            <p className="mt-1 line-clamp-2 text-[15px] text-muted">{preview(nextTpl.exerciseIds) || 'Aucun exercice pour l’instant'}</p>
            <PrimaryButton onClick={() => start(nextTpl.id)}>La faire maintenant</PrimaryButton>
          </>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-muted">Au programme</p>
            <p className="mt-1 text-[28px] font-bold leading-tight tracking-tight">Repos</p>
            <p className="mt-1 text-[15px] text-muted">La récupération fait partie du programme. Touche un jour de la semaine pour y placer une séance.</p>
          </>
        )}
      </div>

      {/* Sauvegarde : rappel quand des séances ne sont pas encore à l'abri (téléphone perdu = données perdues) */}
      {isExportStale(state) && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card py-3 pl-4 pr-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Mets tes séances à l’abri</p>
            <p className="text-[13px] text-muted">{state.lastExport ? `Dernière sauvegarde ${ago(state.lastExport)}` : 'Aucune sauvegarde pour l’instant'} · iCloud, Drive, AirDrop…</p>
          </div>
          <button
            onClick={async () => (await exportData()) && notify('Sauvegarde envoyée')}
            className="h-11 shrink-0 rounded-full bg-pink px-4 text-[15px] font-semibold text-white active:opacity-80"
          >
            Sauvegarder
          </button>
        </div>
      )}

      {/* 2. La semaine : fréquence et jours off d'un coup d'œil */}
      <Group
        title="Cette semaine"
        action={
          // Régularité : affichée seulement quand elle existe — jamais de « 0 » culpabilisant
          streak >= 1 && (
            <span className="rounded-full bg-pink/12 px-2.5 py-1 text-[13px] font-semibold text-pink" aria-label={`${streak} semaine${streak > 1 ? 's' : ''} d’affilée au rendez-vous`}>
              🔥 {streak} semaine{streak > 1 ? 's' : ''}
            </span>
          )
        }
        footer={`${doneCount} séance${doneCount > 1 ? 's' : ''} sur ${plannedCount}${deloadActive ? ' · semaine de décharge' : ''} · touche un jour pour changer sa séance`}
      >
        <div className="grid grid-cols-7 px-1 py-4">
          {week.map((d) => {
            const tpl = tplById[plan[d.i]];
            // Pas de mode « Modifier » : un tap sur un jour ouvre directement son choix de séance.
            return (
              <button key={d.i} type="button" onClick={() => setPlanDayOpen(d.i)} aria-label={`${DAY_NAMES[d.i]} : ${d.done ? `fait (${d.done.name})` : tpl ? tpl.name : 'repos'}`} className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl py-1 active:bg-fill">
                <span className={`text-[13px] font-semibold ${d.isToday ? 'text-pink' : 'text-muted'}`}>{d.label}</span>
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full font-num text-[15px] font-semibold tabular-nums ${
                    d.done ? 'bg-pink text-white' : tpl ? (d.isPast ? 'bg-fill text-muted line-through' : 'bg-fill text-white') : 'text-muted'
                  } ${d.isToday && !d.done ? 'ring-2 ring-pink' : ''}`}
                >
                  {d.done ? <Check className="h-5 w-5" strokeWidth={3} /> : d.date.getDate()}
                </span>
                <span className={`h-4 w-full truncate px-0.5 text-center text-[13px] font-medium leading-4 ${d.done ? 'text-pink' : 'text-muted'}`}>
                  {d.done?.name ?? tpl?.name ?? ''}
                </span>
              </button>
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
        <button onClick={() => setCreating(true)} className="sep flex h-12 w-full items-center gap-2 px-4 text-[17px] text-pink active:opacity-50">
          <Plus className="h-5 w-5" /> Nouvelle séance
        </button>
      </Group>

      {/* Feuilles et vues détaillées */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nouvelle séance">
        {/* Séance libre : tout de suite, sans rien préparer */}
        <button
          onClick={() => {
            setCreating(false);
            start(null);
          }}
          disabled={!!draft}
          className="mb-6 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-fill px-4 py-3 text-left active:bg-fill-hi disabled:opacity-40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink pl-0.5 text-[13px] text-white" aria-hidden="true">
            ▶
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold">Séance libre, maintenant</span>
            <span className="block text-[15px] text-muted">{draft ? 'Termine d’abord la séance en cours' : 'Sans programme, ajoute les exercices au fil de l’eau'}</span>
          </span>
        </button>
        <h3 className="mb-2 px-1 text-[15px] font-semibold text-muted">Ou crée une séance réutilisable</h3>
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
        {planDay != null && week[planDay].done && (
          <button
            onClick={() => {
              setDetailId(week[planDay].done.id);
              setPlanDayOpen(null);
            }}
            className="mb-4 flex h-14 w-full items-center gap-3 rounded-2xl bg-pink/12 px-4 text-left active:opacity-70"
          >
            <Check className="h-5 w-5 text-pink" strokeWidth={3} />
            <span className="min-w-0 flex-1 truncate text-[17px] font-semibold">Fait : {week[planDay].done.name}</span>
            <span className="text-[15px] text-pink">Voir</span>
          </button>
        )}
        {planDay != null && <p className="mb-2 px-1 text-[13px] font-medium text-muted">Séance prévue ce jour-là chaque semaine</p>}
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
      <SettingsSheet open={profilesOpen} onClose={() => setProfilesOpen(false)} />
    </Page>
  );
}
