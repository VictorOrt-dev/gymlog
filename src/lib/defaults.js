export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// [nom, pas de charge en kg, repos en secondes]
// Polyarticulaires lourds : 3 min. Isolation : 1 min 30. Pas de débat.
const LIBRARY = [
  ['Développé couché', 2.5, 180],
  ['Développé incliné haltères', 2, 150],
  ['Développé militaire', 2.5, 150],
  ['Dips', 2.5, 120],
  ['Écarté poulie', 2.5, 90],
  ['Élévations latérales', 2, 90],
  ['Extension triceps poulie', 2.5, 90],
  ['Tractions', 2.5, 150],
  ['Rowing barre', 2.5, 150],
  ['Rowing haltère', 2, 120],
  ['Tirage vertical', 5, 120],
  ['Face pull', 2.5, 90],
  ['Curl barre', 2.5, 90],
  ['Curl marteau', 2, 90],
  ['Squat', 2.5, 180],
  ['Soulevé de terre', 2.5, 180],
  ['Soulevé de terre roumain', 2.5, 150],
  ['Presse à cuisses', 5, 150],
  ['Fentes bulgares', 2, 120],
  ['Hip thrust', 5, 120],
  ['Leg curl', 5, 90],
  ['Leg extension', 5, 90],
  ['Mollets debout', 5, 90],
];

const PROGRAM = [
  ['Push', ['Développé couché', 'Développé incliné haltères', 'Développé militaire', 'Élévations latérales', 'Extension triceps poulie']],
  ['Pull', ['Tractions', 'Rowing barre', 'Rowing haltère', 'Face pull', 'Curl barre']],
  ['Legs', ['Squat', 'Soulevé de terre roumain', 'Presse à cuisses', 'Leg curl', 'Mollets debout']],
];

// Lundi → dimanche : index dans PROGRAM, null = repos. 3 séances, jamais deux jours d'affilée.
const WEEK = [0, null, 1, null, 2, null, null];

export const DEFAULT_REST = 120;

export function seedProfile(name) {
  const profile = { id: uid(), name };
  const templates = PROGRAM.map(([tname, names]) => ({
    id: uid(),
    profileId: profile.id,
    name: tname,
    exerciseIds: names.map(slug),
  }));
  const plan = WEEK.map((i) => (i == null ? null : templates[i].id));
  return { profile, templates, plan };
}

export function initialState() {
  const { profile, templates, plan } = seedProfile('Moi');
  return {
    v: 1,
    profileId: profile.id,
    profiles: [profile],
    exercises: LIBRARY.map(([name, inc, rest]) => ({ id: slug(name), name, inc, rest })),
    templates,
    plans: { [profile.id]: plan },
    drafts: {}, // séance en cours, par profil : survit au verrouillage / rechargement
    lastExport: null,
    sessions: [],
  };
}
