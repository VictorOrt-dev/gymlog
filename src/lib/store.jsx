import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_REST, initialState, seedProfile, uid } from './defaults';

const K_DATA = 'gymlog:data';
const K_SESSIONS = 'gymlog:sessions'; // l'historique grossit : clé séparée, réécrite seulement quand il change

// Point d'entrée unique pour faire évoluer le schéma sans casser les données existantes.
const migrate = (s) => s;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(K_DATA));
    if (data) return migrate({ ...data, sessions: JSON.parse(localStorage.getItem(K_SESSIONS)) ?? [] });
  } catch (e) {
    console.error('GymLog : lecture du stockage impossible', e);
  }
  return initialState();
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const savedSessions = useRef(state.sessions);
  const current = useRef(state);

  useEffect(() => {
    current.current = state;
    const { sessions, ...data } = state;
    try {
      localStorage.setItem(K_DATA, JSON.stringify(data));
      if (sessions !== savedSessions.current) {
        localStorage.setItem(K_SESSIONS, JSON.stringify(sessions));
        savedSessions.current = sessions;
      }
    } catch (e) {
      console.error('GymLog : écriture impossible (stockage plein ?)', e);
    }
  }, [state]);

  const actions = useMemo(() => {
    const set = setState;
    const forProfile = (key, fn) => set((s) => ({ ...s, [key]: { ...s[key], [s.profileId]: fn(s[key][s.profileId], s) } }));

    return {
      set,

      /** Modifie la séance en cours du profil actif. Retourner null la supprime. */
      setDraft: (fn) =>
        set((s) => {
          const drafts = { ...s.drafts };
          const next = fn(drafts[s.profileId]);
          if (next) drafts[s.profileId] = next;
          else delete drafts[s.profileId];
          return { ...s, drafts };
        }),

      startSession: (templateId) =>
        forProfile('drafts', (_, s) => {
          const tpl = s.templates.find((t) => t.id === templateId);
          const known = new Set(s.exercises.map((e) => e.id));
          return {
            id: uid(),
            profileId: s.profileId,
            templateId: tpl?.id ?? null,
            name: tpl?.name || 'Séance libre',
            startedAt: Date.now(),
            items: (tpl?.exerciseIds ?? []).filter((id) => known.has(id)).map((exerciseId) => ({ exerciseId, sets: [] })),
          };
        }),

      /** Archive la séance en cours (exercices vides retirés). Séance vide = abandonnée. */
      finishSession: () =>
        set((s) => {
          const d = s.drafts[s.profileId];
          if (!d) return s;
          const drafts = { ...s.drafts };
          delete drafts[s.profileId];
          const items = d.items.filter((it) => it.sets.length);
          const sessions = items.length ? [...s.sessions, { ...d, items, endedAt: Date.now() }] : s.sessions;
          return { ...s, drafts, sessions };
        }),

      addExercise: (name) => {
        const id = uid();
        set((s) => ({ ...s, exercises: [...s.exercises, { id, name, inc: 2.5, rest: DEFAULT_REST }] }));
        return id;
      },
      setExerciseRest: (id, rest) =>
        set((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, rest } : e)) })),

      saveTemplate: (tpl) =>
        set((s) => ({
          ...s,
          templates: s.templates.some((t) => t.id === tpl.id)
            ? s.templates.map((t) => (t.id === tpl.id ? tpl : t))
            : [...s.templates, tpl],
        })),
      deleteTemplate: (id) =>
        set((s) => ({
          ...s,
          templates: s.templates.filter((t) => t.id !== id),
          plans: Object.fromEntries(Object.entries(s.plans).map(([p, plan]) => [p, plan.map((x) => (x === id ? null : x))])),
        })),
      setPlanDay: (day, templateId) =>
        forProfile('plans', (plan = Array(7).fill(null)) => plan.map((x, i) => (i === day ? templateId : x))),

      addProfile: (name) =>
        set((s) => {
          const { profile, templates, plan } = seedProfile(name);
          return {
            ...s,
            profileId: profile.id,
            profiles: [...s.profiles, profile],
            templates: [...s.templates, ...templates],
            plans: { ...s.plans, [profile.id]: plan },
          };
        }),
      switchProfile: (id) => set((s) => ({ ...s, profileId: id })),

      exportData: () => {
        const blob = new Blob([JSON.stringify(current.current)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `gymlog-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        set((s) => ({ ...s, lastExport: Date.now() }));
      },
      replaceAll: (data) => set(migrate(data)),
    };
  }, []);

  return <Ctx.Provider value={{ state, ...actions }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
