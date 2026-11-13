export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const VERSION = 5;
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
 * Muscles secondaires (comptés pour ½ série dans le volume hebdomadaire).
 * Clé = nom de l'exercice. Les exercices d'isolation n'en ont pas.
 */
const PUSH = ['Triceps', 'Épaules'];
const ROW = ['Biceps'];
const SECONDARY = {
  'Développé couché': PUSH, 'Développé couché haltères': PUSH, 'Développé incliné barre': PUSH, 'Développé incliné haltères': PUSH,
  'Développé décliné': PUSH, 'Développé couché Smith': PUSH, 'Développé couché machine': PUSH, 'Développé incliné machine': PUSH,
  Dips: PUSH, Pompes: PUSH,
  Tractions: ROW, 'Tractions supination': ROW, 'Tractions prise neutre': ROW, 'Tirage vertical': ROW, 'Tirage vertical prise serrée': ROW,
  'Tirage horizontal poulie': ROW, 'Rowing barre': ROW, 'Rowing haltère': ROW, 'Rowing T-bar': ROW, 'Rowing machine': ROW, 'Rowing buste appuyé': ROW,
  'Soulevé de terre': ['Ischios & fessiers', 'Avant-bras'],
  'Développé militaire': ['Triceps'], 'Développé haltères assis': ['Triceps'], 'Développé épaules machine': ['Triceps'], 'Arnold press': ['Triceps'],
  'Face pull': ['Dos'], 'Oiseau haltères': ['Dos'], 'Reverse pec deck': ['Dos'], 'Rowing menton': ['Dos'],
  'Curl marteau': ['Avant-bras'], 'Curl inversé': ['Biceps'],
  'Développé couché prise serrée': ['Pectoraux', 'Épaules'], 'Dips banc': ['Pectoraux'],
  Squat: ['Ischios & fessiers'], 'Front squat': ['Ischios & fessiers'], 'Squat Smith': ['Ischios & fessiers'], 'Squat goblet': ['Ischios & fessiers'],
  'Hack squat': ['Ischios & fessiers'], 'Presse à cuisses': ['Ischios & fessiers'], 'Fentes haltères': ['Ischios & fessiers'],
  'Fentes marchées': ['Ischios & fessiers'], 'Fentes bulgares': ['Ischios & fessiers'], 'Step-up': ['Ischios & fessiers'],
  'Soulevé de terre roumain': ['Dos'], 'Soulevé de terre jambes tendues': ['Dos'], 'Soulevé de terre sumo': ['Quadriceps', 'Dos'], 'Good morning': ['Dos'],
};

/**
 * Fourchette de reps par défaut, déduite du type d'exercice (via son temps de repos) :
 * gros polyarticulaires lourds 5–8, polyarticulaires 6–10, accessoires 8–12, isolation 10–15, abdos 12–20.
 */
// Isolation (repos 90 s) : 8–12, comme les accessoires — 8 reps lourdes proches de l'échec construisent aussi bien le muscle.
export const defaultRange = (rest) => (rest >= 180 ? [5, 8] : rest >= 150 ? [6, 10] : rest >= 90 ? [8, 12] : rest > 0 ? [12, 20] : [8, 12]);
export const RANGES = [[3, 5], [5, 8], [6, 10], [8, 12], [10, 15], [12, 20]];

export const libraryExercises = () =>
  Object.entries(LIBRARY).flatMap(([group, list]) => list.map(([name, inc, rest]) => ({ id: slug(name), name, group, sec: SECONDARY[name] ?? [], inc, rest, range: defaultRange(rest) })));

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
  return { id: uid(), profileId, name, exerciseIds: (model?.[1] ?? []).map(slug), supersets: [] };
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

/**
 * Planning issu du premier lancement : les séances gardées, distribuées dans l'ordre sur les jours choisis
 * (3 jours + Push/Pull/Legs → L Push, M Pull, V Legs ; 4 jours + Upper/Lower → U L U L).
 */
/** Un nom d'exercice valable : non vide, et pas déjà porté par un autre exercice (accents et majuscules ignorés). → message ou null */
export function exerciseNameError(exercises, id, rawName) {
  const name = rawName.trim();
  if (!name) return 'Donne un nom à l’exercice.';
  const n = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const twin = exercises.find((e) => e.id !== id && e.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === n);
  return twin ? `« ${twin.name} » existe déjà.` : null;
}

export function planFromChoice(days, templateIds) {
  const plan = Array(7).fill(null);
  if (!templateIds.length) return plan;
  [...days].sort((a, b) => a - b).forEach((d, k) => (plan[d] = templateIds[k % templateIds.length]));
  return plan;
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
    deload: {}, // { [profileId]: date de fin de la semaine de décharge }
    lastExport: null,
    onboarded: false, // premier lancement : prénom, jours, séances gardées
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
  if (s.v < 4) {
    // v3 → v4 : muscles secondaires (volume hebdo), supersets mémorisés dans les séances types, décharge
    const secById = new Map(libraryExercises().map((e) => [e.id, e.sec]));
    s = {
      ...s,
      v: 4,
      deload: s.deload ?? {},
      exercises: s.exercises.map((e) => ({ ...e, sec: e.sec ?? secById.get(e.id) ?? [] })),
      templates: s.templates.map((t) => ({ ...t, supersets: t.supersets ?? [] })),
    };
  }
  if (s.v < 5) {
    // v4 → v5 : fourchette par défaut des isolations 10–15 → 8–12. Seuls les exercices de la bibliothèque encore
    // sur l'ancien réglage par défaut changent ; historique, notes, séances, planning : rien d'autre n'est touché.
    const isolation = new Set(Object.values(LIBRARY).flat().filter(([, , rest]) => rest >= 90 && rest < 120).map(([name]) => slug(name)));
    s = {
      ...s,
      v: 5,
      exercises: s.exercises.map((e) => (isolation.has(e.id) && e.range?.[0] === 10 && e.range?.[1] === 15 ? { ...e, range: [8, 12] } : e)),
    };
  }
  // Données existantes sans le drapeau : l'app était déjà utilisée, pas d'écran de bienvenue.
  if (s.onboarded == null) s = { ...s, onboarded: true };
  return s;
}
