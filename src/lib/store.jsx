import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { serializeBackup } from './backup';
import { applySupersets } from './session';
import { norm } from './training';
import { CUSTOM_GROUP, DEFAULT_REST, initialState, migrate, templateFromModel, uid } from './defaults';

const K_DATA = 'gymlog:data';
const K_SESSIONS = 'gymlog:sessions'; // l'historique grossit : clé séparée, réécrite seulement quand il change

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
  const [storageError, setStorageError] = useState(null); // 'quota' | 'unavailable' | null
  const savedSessions = useRef(state.sessions);
  const current = useRef(state);

  // Chaque changement est écrit tout de suite. Si l'écriture échoue (stockage plein, navigation privée),
  // on ne se tait pas : storageError déclenche une alerte visible avec un bouton d'export.
  useEffect(() => {
    current.current = state;
    const { sessions, ...data } = state;
    try {
      localStorage.setItem(K_DATA, JSON.stringify(data));
      if (sessions !== savedSessions.current) {
        localStorage.setItem(K_SESSIONS, JSON.stringify(sessions));
        savedSessions.current = sessions;
      }
      setStorageError(null);
    } catch (e) {
      const quota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014;
      console.error('GymLog : écriture impossible', e);
      setStorageError(quota ? 'quota' : 'unavailable');
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
            form: 'ok', // forme du jour : 'low' | 'ok' | 'high'
            items: applySupersets(
              (tpl?.exerciseIds ?? []).filter((id) => known.has(id)).map((exerciseId) => ({ exerciseId, sets: [] })),
              tpl?.supersets,
            ),
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
        set((s) => ({ ...s, exercises: [...s.exercises, { id, name, group: CUSTOM_GROUP, inc: 2.5, rest: DEFAULT_REST, range: [8, 12] }] }));
        return id;
      },
      setExerciseRest: (id, rest) =>
        set((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, rest } : e)) })),

      setExerciseRange: (id, range) =>
        set((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, range } : e)) })),
      /** Note persistante par exercice ET par profil (chacun ses réglages de machine). */
      setNote: (exerciseId, text) =>
        set((s) => {
          const mine = { ...(s.notes?.[s.profileId] ?? {}) };
          if (text.trim()) mine[exerciseId] = text.trim();
          else delete mine[exerciseId];
          return { ...s, notes: { ...s.notes, [s.profileId]: mine } };
        }),

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
      /** Annule une suppression : remet la séance type à sa place et dans le planning. */
      restoreTemplate: ({ tpl, index, refs }) =>
        set((s) => {
          const templates = [...s.templates];
          templates.splice(Math.min(index, templates.length), 0, tpl);
          const plans = { ...s.plans };
          for (const [pid, day] of refs) plans[pid] = (plans[pid] ?? Array(7).fill(null)).map((x, i) => (i === day && x == null ? tpl.id : x));
          return { ...s, templates, plans };
        }),
      addTemplateFromModel: (name) => {
        const id = uid();
        set((s) => ({ ...s, templates: [...s.templates, { ...templateFromModel(s.profileId, name), id }] }));
        return id;
      },
      setPlanDay: (day, templateId) =>
        forProfile('plans', (plan = Array(7).fill(null)) => plan.map((x, i) => (i === day ? templateId : x))),

      /** Remplace une séance terminée (correction a posteriori). Tout ce qui en dérive se recalcule seul. */
      saveSession: (session) => set((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === session.id ? session : x)) })),
      deleteSession: (id) => set((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) })),
      restoreSession: (session) =>
        set((s) => ({ ...s, sessions: [...s.sessions, session].sort((a, b) => a.startedAt - b.startedAt) })),

      /** L'app est personnelle (une personne par téléphone) : seul le prénom se règle. */
      renameProfile: (name) => set((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.profileId ? { ...p, name } : p)) })),
      /** Poids de corps (kg) et sexe ('h' | 'f') : uniquement pour situer sa force (repères ramenés au poids). */
      setProfileInfo: (patch) => set((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === s.profileId ? { ...p, ...patch } : p)) })),

      /**
       * Sauvegarde en 1 tap : le menu « Partager » du téléphone (iCloud Drive, Google Drive, AirDrop, WhatsApp…).
       * À défaut (ordinateur), téléchargement du fichier. → true si la sauvegarde est partie.
       */
      exportData: async () => {
        const name = `gymlog-${new Date().toISOString().slice(0, 10)}.json`;
        const file = new File([serializeBackup(current.current)], name, { type: 'application/json' });
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Sauvegarde GymLog' });
          } else {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = name;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          }
          set((s) => ({ ...s, lastExport: Date.now() }));
          return true;
        } catch {
          return false; // partage annulé par l'utilisateur
        }
      },

      /** Semaine de décharge du profil actif : jusqu'à `until` (timestamp), ou null pour l'arrêter. */
      setDeload: (until) => set((s) => ({ ...s, deload: { ...s.deload, [s.profileId]: until } })),
      /** Les supersets faits en séance sont mémorisés dans la séance type : la prochaine fois, ils sont déjà liés. */
      rememberSupersets: (templateId, pairs) =>
        set((s) => ({ ...s, templates: s.templates.map((t) => (t.id === templateId ? { ...t, supersets: pairs } : t)) })),
      setExerciseGroup: (id, group) => set((s) => ({ ...s, exercises: s.exercises.map((e) => (e.id === id ? { ...e, group, sec: [] } : e)) })),

      /**
       * Ajoute une séance reçue par lien (déjà validée par decodeTemplate) aux séances du profil actif.
       * Les exercices inconnus sont créés ; un exercice qui existe déjà sous le même nom est réutilisé.
       */
      importSharedTemplate: (data) => {
        const id = uid();
        set((s) => {
          const exercises = [...s.exercises];
          const map = {};
          for (const e of data.exercises) {
            const same = exercises.find((x) => x.id === e.id) ?? exercises.find((x) => norm(x.name) === norm(e.name));
            if (same) map[e.id] = same.id;
            else {
              const nid = exercises.some((x) => x.id === e.id) ? uid() : e.id;
              exercises.push({ id: nid, name: e.name, group: e.group ?? CUSTOM_GROUP, sec: e.sec, inc: e.inc, rest: e.rest, range: e.range });
              map[e.id] = nid;
            }
          }
          const tpl = {
            id,
            profileId: s.profileId,
            name: data.name,
            exerciseIds: [...new Set(data.exercises.map((e) => map[e.id]))],
            supersets: data.supersets.map(([a, b]) => [map[a], map[b]]),
          };
          return { ...s, exercises, templates: [...s.templates, tpl] };
        });
        return id;
      },
      /** `data` doit venir de parseBackup (validé + migré). */
      replaceAll: (data) => set(data),
    };
  }, []);

  return <Ctx.Provider value={{ state, storageError, ...actions }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
