# GymLog

Le carnet de muscu qui ne te ralentit pas. Pensé pour la salle : mains pleines de magnésie, cardio haut, 90 secondes de repos.

![GymLog](docs/preview.png)

Quatre onglets, comme une app iPhone :

- **Aujourd'hui** : la séance du jour en un bouton, ta semaine (faite / prévue / repos), ta dernière séance.
- **Séances** : tes séances (Push, Pull, Legs, Upper, Lower, Full body…), à créer et modifier comme tu veux. **Glisse une séance vers la gauche pour la supprimer**, avec « Annuler » pendant 5 s. Modèles prêts à ajouter en un tap.
- **Historique** : les 5 dernières semaines, séance par séance. Touche une séance pour revoir chaque série.
- **Progrès** : séries par semaine, puis la courbe de chaque exercice (force estimée, charge max, volume), tes records et le détail séance par séance.

Pendant la séance :

- **La dernière fois, série par série** : chaque série d'aujourd'hui est alignée avec la même série de la séance précédente. La ligne « À battre » montre le chiffre exact à dépasser.
- **Objectif pré-rempli** : poids et reps déjà calculés à partir de ta dernière séance et de ton RIR. Séance faite comme prévu = un seul tap sur Valider.
- **Le repos démarre tout seul** quand tu valides une série. Bip et vibration à la fin, durée mémorisée par exercice.
- **91 exercices** rangés par muscle, et tu crées les tiens en tapant leur nom.

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
├─ App.jsx                  onglets ⇄ séance en cours
├─ lib/
│  ├─ store.jsx             état global + persistance localStorage (2 clés)
│  ├─ defaults.js           91 exercices par muscle, modèles, migration des données
│  ├─ training.js           progression : dernière perf, objectif, ▲/▼, formats
│  └─ hooks.js              timer de repos, wake lock, horloge
└─ components/
   ├─ SessionLogger.jsx     ★ la vue de séance (95 % du temps)
   ├─ ExerciseCard.jsx      ★ saisie d'un exercice + comparaison série par série
   ├─ Today.jsx             onglet Aujourd'hui
   ├─ Templates.jsx         onglet Séances (+ TemplateEditor.jsx)
   ├─ History.jsx           onglet Historique (+ SessionDetail.jsx)
   ├─ Progress.jsx          onglet Progrès : graphiques en SVG, sans librairie
   ├─ SwipeRow.jsx          glisser pour supprimer
   ├─ ExercisePicker.jsx    chercher, parcourir par muscle, créer
   ├─ RestTimer · Stepper · TabBar · Toast · Sheet · ProfileSheet · ui · Icons
```

## La règle de progression

Elle est dans `src/lib/training.js`, fonction `target()` :

| Dernière fois                    | Objectif du jour      |
| -------------------------------- | --------------------- |
| RIR ≥ 2 sur **toutes** les séries | + 1 cran de charge    |
| RIR 1 au pire                    | même charge, + 1 rep  |
| RIR 0 (échec)                    | on égale, proprement  |

Les flèches ▲ = ▼ comparent avec le 1RM estimé (Epley). Ainsi, 82,5 × 6 et 80 × 8 se jugent sur la même échelle.
