export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const VERSION = 3;
export const DEFAULT_REST = 120;
export const CUSTOM_GROUP = 'Mes exercices';

// Groupe musculaire → [nom, pas de charge en kg, repos en secondes]
// Polyarticulaires lourds : 3 min. Isolation : 1 min 30. Abdos et petits muscles : 1 min.
const LIBRARY = {
  Pectoraux: [
    ['Développé couché', 2.5, 180],
    ['Développé couché haltères', 2, 150],
    ['Développé incliné barre', 2.5, 150],
    ['Développé incliné haltères', 2, 150],
    ['Développé décliné', 2.5, 150],
    ['Développé couché Smith', 2.5, 150],
    ['Développé couché machine', 5, 120],
    ['Développé incliné machine', 5, 120],
    ['Dips', 2.5, 120],
    ['Pompes', 2.5, 90],
    ['Écarté haltères', 2, 90],
    ['Écarté poulie', 2.5, 90],
    ['Écarté poulie basse', 2.5, 90],
    ['Pec deck', 5, 90],
    ['Pull-over haltère', 2, 90],
  ],
  Dos: [
    ['Tractions', 2.5, 150],
    ['Tractions supination', 2.5, 150],
    ['Tractions prise neutre', 2.5, 150],
    ['Tirage vertical', 5, 120],
    ['Tirage vertical prise serrée', 5, 120],
    ['Tirage horizontal poulie', 5, 120],
    ['Rowing barre', 2.5, 150],
    ['Rowing haltère', 2, 120],
    ['Rowing T-bar', 2.5, 150],
    ['Rowing machine', 5, 120],
    ['Rowing buste appuyé', 2, 120],
    ['Pull-over poulie', 2.5, 90],
    ['Soulevé de terre', 2.5, 180],
    ['Shrug haltères', 2, 90],
    ['Shrug barre', 2.5, 90],
    ['Extension lombaires', 2.5, 90],
  ],
  Épaules: [
    ['Développé militaire', 2.5, 150],
    ['Développé haltères assis', 2, 120],
    ['Développé épaules machine', 5, 120],
    ['Arnold press', 2, 120],
    ['Élévations latérales', 2, 90],
    ['Élévations latérales poulie', 2.5, 90],
    ['Élévations latérales machine', 5, 90],
    ['Élévations frontales', 2, 90],
    ['Oiseau haltères', 2, 90],
    ['Reverse pec deck', 5, 90],
    ['Face pull', 2.5, 90],
    ['Rowing menton', 2.5, 90],
  ],
  Biceps: [
    ['Curl barre', 2.5, 90],
    ['Curl barre EZ', 2.5, 90],
    ['Curl haltères', 2, 90],
    ['Curl marteau', 2, 90],
    ['Curl incliné haltères', 2, 90],
    ['Curl pupitre', 2.5, 90],
    ['Curl poulie', 2.5, 90],
    ['Curl concentré', 2, 90],
  ],
  Triceps: [
    ['Extension triceps poulie', 2.5, 90],
    ['Extension triceps corde', 2.5, 90],
    ['Extension triceps au-dessus de la tête', 2.5, 90],
    ['Barre au front', 2.5, 90],
    ['Extension nuque haltère', 2, 90],
    ['Développé couché prise serrée', 2.5, 150],
    ['Kickback haltère', 2, 90],
    ['Dips banc', 2.5, 90],
  ],
  'Avant-bras': [
    ['Curl poignets', 2, 60],
    ['Curl inversé', 2.5, 60],
  ],
  Quadriceps: [
    ['Squat', 2.5, 180],
    ['Front squat', 2.5, 180],
    ['Squat Smith', 2.5, 150],
    ['Squat goblet', 2, 120],
    ['Hack squat', 5, 150],
    ['Presse à cuisses', 5, 150],
    ['Fentes haltères', 2, 120],
    ['Fentes marchées', 2, 120],
    ['Fentes bulgares', 2, 120],
    ['Step-up', 2, 90],
    ['Leg extension', 5, 90],
  ],
  'Ischios & fessiers': [
    ['Soulevé de terre roumain', 2.5, 150],
    ['Soulevé de terre jambes tendues', 2.5, 150],
    ['Soulevé de terre sumo', 2.5, 180],
    ['Good morning', 2.5, 120],
    ['Hip thrust', 5, 120],
    ['Pont fessier', 5, 90],
    ['Leg curl', 5, 90],
    ['Leg curl assis', 5, 90],
    ['Abduction machine', 5, 60],
    ['Adduction machine', 5, 60],
    ['Kickback fessier poulie', 2.5, 60],
  ],
  Mollets: [
    ['Mollets debout', 5, 90],
    ['Mollets assis', 5, 90],
    ['Mollets à la presse', 5, 90],
  ],
  Abdos: [
    ['Crunch', 2.5, 60],
    ['Crunch poulie', 2.5, 60],
    ['Relevé de jambes suspendu', 2.5, 60],
    ['Roue abdominale', 2.5, 60],
    ['Russian twist', 2, 60],
  ],
};

export const GROUPS = Object.keys(LIBRARY);

/**
 * Fourchette de reps par défaut, déduite du type d'exercice (via son temps de repos) :
 * gros polyarticulaires lourds 5–8, polyarticulaires 6–10, accessoires 8–12, isolation 10–15, abdos 12–20.
 */
export const defaultRange = (rest) => (rest >= 180 ? [5, 8] : rest >= 150 ? [6, 10] : rest >= 120 ? [8, 12] : rest >= 90 ? [10, 15] : rest > 0 ? [12, 20] : [8, 12]);
export const RANGES = [[3, 5], [5, 8], [6, 10], [8, 12], [10, 15], [12, 20]];

export const libraryExercises = () =>
  Object.entries(LIBRARY).flatMap(([group, list]) => list.map(([name, inc, rest]) => ({ id: slug(name), name, group, inc, rest, range: defaultRange(rest) })));

/** Modèles prêts à l'emploi : on les ajoute à ses séances, puis on les modifie comme on veut. */
export const MODELS = [
  ['Upper', ['Développé couché', 'Rowing barre', 'Développé militaire', 'Tirage vertical', 'Curl haltères', 'Extension triceps corde']],
  ['Lower', ['Squat', 'Soulevé de terre roumain', 'Fentes bulgares', 'Leg curl assis', 'Leg extension', 'Mollets debout']],
  ['Full body', ['Squat', 'Développé couché', 'Rowing barre', 'Développé militaire', 'Soulevé de terre roumain', 'Crunch poulie']],
  ['Push', ['Développé couché', 'Développé incliné haltères', 'Développé militaire', 'Élévations latérales', 'Extension triceps poulie']],
  ['Pull', ['Tractions', 'Rowing barre', 'Rowing haltère', 'Face pull', 'Curl barre']],
  ['Legs', ['Squat', 'Soulevé de terre roumain', 'Presse à cuisses', 'Leg curl', 'Mollets debout']],
  ['Bras', ['Curl barre EZ', 'Barre au front', 'Curl incliné haltères', 'Extension triceps corde', 'Curl marteau', 'Kickback haltère']],
];

export function templateFromModel(profileId, name) {
  const model = MODELS.find(([n]) => n === name);
  return { id: uid(), profileId, name, exerciseIds: (model?.[1] ?? []).map(slug) };
}

const DEFAULT_TEMPLATES = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full body'];
// Lundi → dimanche : index dans DEFAULT_TEMPLATES, null = repos. 3 séances, jamais deux jours d'affilée.
const WEEK = [0, null, 1, null, 2, null, null];

export function seedProfile(name) {
  const profile = { id: uid(), name };
  const templates = DEFAULT_TEMPLATES.map((n) => templateFromModel(profile.id, n));
  const plan = WEEK.map((i) => (i == null ? null : templates[i].id));
  return { profile, templates, plan };
}

export function initialState() {
  const { profile, templates, plan } = seedProfile('Moi');
  return {
    v: VERSION,
    profileId: profile.id,
    profiles: [profile],
    exercises: libraryExercises(),
    templates,
    plans: { [profile.id]: plan },
    drafts: {}, // séance en cours, par profil : survit au verrouillage / rechargement
    notes: {}, // { [profileId]: { [exerciseId]: "Siège cran 4" } }
    lastExport: null,
    sessions: [],
  };
}

/** Fait évoluer des données anciennes (ou une sauvegarde importée) sans rien perdre, étape par étape. */
export function migrate(input) {
  let s = input;
  if ((s.v ?? 1) < 2) {
    // v1 → v2 : bibliothèque complète classée par muscle + séances Upper / Lower / Full body
    const lib = libraryExercises();
    const libById = new Map(lib.map((e) => [e.id, e]));
    const have = new Set(s.exercises.map((e) => e.id));
    const exercises = [
      ...s.exercises.map((e) => ({ ...e, group: libById.get(e.id)?.group ?? e.group ?? CUSTOM_GROUP })),
      ...lib.filter((e) => !have.has(e.id)),
    ];
    const templates = [...s.templates];
    for (const p of s.profiles) {
      for (const name of ['Upper', 'Lower', 'Full body']) {
        if (!templates.some((t) => t.profileId === p.id && t.name === name)) templates.push(templateFromModel(p.id, name));
      }
    }
    s = { ...s, v: 2, exercises, templates };
  }
  if (s.v < 3) {
    // v2 → v3 : fourchette de reps par exercice + notes par profil
    s = { ...s, v: 3, notes: s.notes ?? {}, exercises: s.exercises.map((e) => ({ ...e, range: e.range ?? defaultRange(e.group === CUSTOM_GROUP ? 0 : e.rest) })) };
  }
  return s;
}
