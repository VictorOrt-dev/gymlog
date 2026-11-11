# GymLog

Le carnet de muscu qui ne te ralentit pas. Pensé pour la salle : mains pleines de magnésie, cardio haut, 90 secondes de repos.

![GymLog](docs/preview.png)

- **La dernière fois, série par série** : chaque série d'aujourd'hui est alignée avec la même série de la séance précédente. La ligne « À battre » montre le chiffre exact à dépasser.
- **Objectif pré-rempli** : poids et reps déjà calculés à partir de ta dernière séance et de ton RIR. Séance faite comme prévu = un seul tap sur Valider.
- **Le repos démarre tout seul** quand tu valides une série. Bip et vibration à la fin, durée mémorisée par exercice.
- **Semaine Push / Pull / Legs** (ou ce que tu veux) : jours d'entraînement, jours off et séances faites d'un coup d'œil.
- **Plusieurs profils** pour les potes, **exercices perso** créés en tapant leur nom.
- **Rien ne se perd** : sauvegarde à chaque tap, l'écran reste allumé pendant la séance, ça marche hors-ligne, export/import JSON.

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
├─ App.jsx                  écran Accueil ⇄ Séance, toast de fin
├─ lib/
│  ├─ store.jsx             état global + persistance localStorage (2 clés)
│  ├─ defaults.js           bibliothèque d'exercices, programme PPL de départ
│  ├─ training.js           progression : dernière perf, objectif, ▲/▼, formats
│  └─ hooks.js              timer de repos, wake lock, horloge
└─ components/
   ├─ SessionLogger.jsx     ★ la vue de séance (95 % du temps)
   ├─ ExerciseCard.jsx      ★ saisie d'un exercice + comparaison série par série
   ├─ Stepper.jsx           gros −/+ avec saisie clavier
   ├─ RestTimer.jsx         barre de repos fixée en bas
   ├─ ExercisePicker.jsx    chercher ou créer un exercice
   ├─ Home.jsx              aujourd'hui, semaine, séances types, historique, sauvegarde
   ├─ TemplateEditor.jsx    éditer une séance type
   ├─ Sheet.jsx · Icons.jsx
```

## La règle de progression

Elle est dans `src/lib/training.js`, fonction `target()` :

| Dernière fois                    | Objectif du jour      |
| -------------------------------- | --------------------- |
| RIR ≥ 2 sur **toutes** les séries | + 1 cran de charge    |
| RIR 1 au pire                    | même charge, + 1 rep  |
| RIR 0 (échec)                    | on égale, proprement  |

Les flèches ▲ = ▼ comparent avec le 1RM estimé (Epley). Ainsi, 82,5 × 6 et 80 × 8 se jugent sur la même échelle.
