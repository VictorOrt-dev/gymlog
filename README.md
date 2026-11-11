# GymLog

Le carnet de muscu qui ne te ralentit pas. Pensé pour la salle : mains pleines de magnésie, cardio haut, 90 secondes de repos.

![GymLog](docs/preview.png)

**Un seul écran, pas d'onglets.** De haut en bas, par ordre d'usage :

1. **La séance du jour** en un bouton (« Commencer Pull »), ou « Reprendre » si une séance est en cours.
2. **Ta semaine** : séances faites, prévues, jours de repos. « Modifier » pour changer le planning.
3. **Ta progression** : le tonnage de chaque séance et de tes exercices principaux, en mini-graphiques. **Touche une carte** pour ouvrir le détail : tonnage séance par séance (touche une colonne pour la lire), records, et la liste de toutes tes séances, chacune consultable.
4. **Tes séances** (Push, Pull, Legs, Upper, Lower, Full body…) : ▶ pour démarrer, toucher pour modifier, **glisser vers la gauche pour supprimer** (avec « Annuler »). « Créer une séance » : vide ou depuis un modèle.

Pendant la séance, tout est sur la carte de l'exercice :

- **La semaine dernière, côte à côte** : chaque série d'aujourd'hui en face de la même série de la dernière fois (poids × reps · RIR). La ligne « À battre » montre exactement quoi dépasser.
- **Jauge de tonnage** : elle se remplit série après série jusqu'au total de la dernière fois (« 580 / 1 120 kg »).
- **Objectif pré-rempli** depuis ta dernière perf et ton RIR : séance faite comme prévu = un seul tap sur Valider.
- **Le repos démarre tout seul** à chaque série validée. Bip et vibration à la fin, durée mémorisée par exercice.
- **91 exercices** rangés par muscle ; tu crées les tiens en tapant leur nom.

À la fin : « Bravo · 4 230 kg soulevés · ▲ +6 % » (comparé à ta dernière séance du même type).

Et aussi : **plusieurs profils** pour les potes, sauvegarde à chaque tap, écran qui reste allumé pendant la séance, fonctionne hors-ligne, export/import JSON (derrière l'avatar).

## Démarrer

```bash
npm install
npm run dev
```

Ouvre l'URL « Network » affichée sur ton téléphone (même Wi-Fi).
En `http://` sur le réseau local, l'écran qui reste allumé et le hors-ligne sont désactivés : ils exigent HTTPS, donc GitHub Pages.

## Mettre en ligne (GitHub Pages)

1. Pousse le repo sur GitHub (branche `main`).
2. Settings → Pages → Source : **GitHub Actions**.
3. Chaque push sur `main` redéploie (`.github/workflows/deploy.yml`).

Sur le téléphone, ouvre l'URL puis **Partager → Sur l'écran d'accueil** (iOS) ou **Installer l'application** (Android).
Fais-le : sur iOS, Safari peut effacer les données d'un site non ouvert pendant 7 jours. Une app installée sur l'écran d'accueil n'est pas concernée.

## Structure

```
src/
├─ App.jsx                  deux écrans : accueil ⇄ séance en cours
├─ lib/
│  ├─ store.jsx             état global + persistance localStorage (2 clés)
│  ├─ defaults.js           91 exercices par muscle, modèles, migration des données
│  ├─ training.js           la logique de coach : dernière perf, objectif, tonnage, ▲/▼
│  └─ hooks.js              timer de repos, wake lock, horloge
└─ components/
   ├─ Home.jsx              ★ l'écran principal (séance du jour, semaine, progression, séances)
   ├─ SessionLogger.jsx     ★ la séance en cours (95 % du temps)
   ├─ ExerciseCard.jsx      ★ saisie + semaine dernière côte à côte + jauge de tonnage
   ├─ ProgressSection.jsx   cartes de tonnage cliquables
   ├─ TonnageDetail.jsx     vue détaillée : colonnes, records, séance par séance
   ├─ Charts.jsx            graphiques SVG faits main (aucune librairie)
   ├─ SwipeRow.jsx          glisser pour supprimer
   ├─ ExercisePicker · TemplateEditor · SessionDetail · ProfileSheet
   └─ RestTimer · Stepper · Toast · Sheet · ui · Icons
```

## Le tonnage

**Tonnage = poids × reps, additionné sur toutes les séries.** C'est ton travail total : s'il monte de semaine en semaine, tu progresses. Au poids du corps (tractions, dips à vide), l'app compte les reps.

Un tonnage se compare à une séance du même type : un Push à un Push, jamais à un Legs.

## La règle de progression

Elle est dans `src/lib/training.js`, fonction `target()` :

| Dernière fois                    | Objectif du jour      |
| -------------------------------- | --------------------- |
| RIR ≥ 2 sur **toutes** les séries | + 1 cran de charge    |
| RIR 1 au pire                    | même charge, + 1 rep  |
| RIR 0 (échec)                    | on égale, proprement  |

Les flèches ▲ = ▼ comparent avec le 1RM estimé (Epley). Ainsi, 82,5 × 6 et 80 × 8 se jugent sur la même échelle.
