# GymLog

Le carnet de muscu qui ne te ralentit pas. Pensé pour la salle : mains pleines de magnésie, cardio haut, 90 secondes de repos.

![GymLog](docs/preview.png)

**Un seul écran, pas d'onglets.** De haut en bas, par ordre d'usage :

1. **La séance du jour** en un bouton (« Commencer Pull »), ou « Reprendre » si une séance est en cours.
2. **Ta semaine** : séances faites, prévues, jours de repos. « Modifier » pour changer le planning.
3. **Ta progression** : une carte par exercice avec sa **force** (1RM estimé de ta meilleure série) et sa mini-courbe. **Touche une carte** pour la vue dédiée : courbe semaine après semaine (glisse le doigt pour lire chaque séance), bascule vers le **tonnage effectif**, records, et chaque séance consultable.
4. **Tes séances** (Push, Pull, Legs, Upper, Lower, Full body…) : ▶ pour démarrer, toucher pour modifier, **glisser vers la gauche pour supprimer** (avec « Annuler »). « Créer une séance » : vide ou depuis un modèle.

Pendant la séance, tout est sur la carte de l'exercice :

- **La semaine dernière, côte à côte** : chaque série de travail en face de la même série de la dernière fois (poids × reps · RIR). La ligne « À battre » montre exactement quoi dépasser.
- **Double progression par fourchette** (ex. 8–12, réglable en un tap) : on monte les reps jusqu'en haut de la fourchette sur toutes les séries, puis on charge et on repart du bas. L'objectif du jour est pré-rempli.
- **Échauffements** : un tap sur « Échauffement », la montée est proposée (50 % × 10, 70 % × 5, 85 % × 3). Ils sont notés mais exclus de « À battre », des records et des courbes.
- **Note par exercice** (« banc cran 3, prise 2 doigts »), gardée d'une séance à l'autre, propre à chaque profil.
- **Alerte de stagnation** : si la force ne progresse plus depuis 3 séances, un conseil discret (séance allégée ou variante).
- **Jauge de tonnage effectif** (séries RIR ≤ 3) jusqu'au total de la dernière fois.
- **Records en direct** : dès qu'une série bat ton meilleur 1RM estimé ou ton record à ce nombre de reps, la ligne s'illumine (« Nouveau record »), et le bouton l'annonce avant même de valider (« ★ Record »).
- **Le repos démarre tout seul** à chaque série validée : durée mémorisée par exercice, 60 s seulement après un échauffement. À la fin, l'écran entier clignote en rose (visible à 2 mètres), avec bip et vibration.
- **Pensé pour le pouce** : toutes les cibles font au moins 44 px, la mise en page s'adapte jusqu'à l'iPhone SE, Valider reste toujours au-dessus du chrono, et chaque série validée s'allume brièvement.

**À la fin, un récapitulatif** : durée, séries de travail, records battus, tonnage effectif, et chaque exercice comparé à ta dernière séance du même type.

**Une erreur de saisie ?** Dans le détail d'une séance passée, touche une série pour corriger sa charge, ses reps ou son RIR, la supprimer ou la passer en échauffement (avec « Annuler »). Objectifs, records et courbes se recalculent aussitôt.

**En binôme**, une barre d'avatars sous l'en-tête de la séance : un tap et tu passes sur la séance de ton pote (son exercice ouvert, ses charges, son chrono), un tap et tu reviens. « + Pote » l'ajoute en pleine séance avec les mêmes exercices. Quand tu termines, l'app bascule sur sa séance s'il n'a pas fini.

**Imprévus à la salle** : le bouton « ⋯ » d'un exercice permet de le **monter / descendre**, de le **remplacer** si la machine est prise (les séries déjà faites restent sur l'original, le remplaçant s'insère juste après) ou de le retirer.

Et aussi : **plusieurs profils** pour les potes, sauvegarde à chaque tap (avec alerte immédiate si le stockage sature), écran qui reste allumé pendant la séance, fonctionne hors-ligne, export/import JSON (derrière l'avatar).

## Démarrer

```bash
npm install
npm run dev
```

Ouvre l'URL « Network » affichée sur ton téléphone (même Wi-Fi).
En `http://` sur le réseau local, l'écran qui reste allumé et le hors-ligne sont désactivés : ils exigent HTTPS, donc GitHub Pages.

## Tests

```bash
npm test
```

63 tests unitaires (Vitest) couvrent la logique critique : 1RM ajusté au RIR, double progression par fourchette, échauffements, stagnation, migration des données, validation des sauvegardes, binôme, réordonner / remplacer, records, récapitulatif, correction des séances passées. Ils tournent sur GitHub à chaque push : **si un test échoue, rien n'est mis en ligne.**

## Mettre en ligne (GitHub Pages)

1. Pousse le repo sur GitHub (branche `main`).
2. Settings → Pages → Source : **GitHub Actions**.
3. Chaque push sur `main` redéploie (`.github/workflows/deploy.yml`).

Sur le téléphone, ouvre l'URL puis **Partager → Sur l'écran d'accueil** (iOS) ou **Installer l'application** (Android).
Fais-le : sur iOS, Safari peut effacer les données d'un site non ouvert pendant 7 jours. Une app installée sur l'écran d'accueil n'est pas concernée.

## Structure

```
src/
├─ App.jsx                  onglets Entraînement / Progrès ⇄ séance en cours
├─ lib/
│  ├─ store.jsx             état global + persistance localStorage (2 clés)
│  ├─ defaults.js           91 exercices par muscle, modèles, migration des données
│  ├─ training.js           la logique de coach : 1RM × RIR, fourchettes, échauffements, stagnation
│  ├─ session.js            binôme, réordonner, remplacer, corriger une séance (logique pure, testée)
│  ├─ summary.js            récapitulatif de fin de séance
│  ├─ backup.js             export signé + import validé champ par champ
│  └─ hooks.js              timer de repos, wake lock, horloge
├─ components/
   ├─ Home.jsx              onglet Entraînement (séance du jour, semaine, séances)
   ├─ ProgressTab.jsx       onglet Progrès
   ├─ SessionLogger.jsx     ★ la séance en cours (95 % du temps)
   ├─ ExerciseCard.jsx      ★ saisie + semaine dernière côte à côte + jauge de tonnage
   ├─ ProgressSection.jsx   une carte de force par exercice, cliquable
   ├─ ProgressDetail.jsx    vue dédiée : courbe, force / tonnage effectif, records
   ├─ Charts.jsx            graphiques SVG faits main (aucune librairie)
   ├─ SwipeRow.jsx          glisser pour supprimer
   ├─ ExercisePicker · TemplateEditor · SessionDetail · ProfileSheet
   └─ RestTimer · Stepper · Toast · Sheet · StorageAlert · ui · Icons
tests/                       Vitest : training, migrate, backup, session, records
```

## Les indicateurs (pas de piège du tonnage brut)

Le tonnage brut ment : 10 séries bâclées à 40 kg « battent » 3 vraies séries lourdes. L'app suit donc :

- **La force** (indicateur principal) : ta meilleure série de travail, convertie en **1RM estimé** (Epley sur reps + RIR : 80 × 8 avec 3 reps en réserve compte plus que 80 × 8 à l'échec). Elle ne monte que si tu deviens plus fort.
- **Le tonnage effectif** : poids × reps des **seules séries de travail (RIR ≤ 3)**. Les séries trop faciles ne gonflent pas le chiffre.

Au poids du corps (tractions, dips à vide), on suit les reps.

## La règle de progression

Elle est dans `src/lib/training.js`, fonction `target()`. Double progression par fourchette (exemple 8–12) :

| Dernière fois (séries de travail)       | Objectif du jour                     |
| --------------------------------------- | ------------------------------------ |
| Toutes les séries au haut (12)          | + 1 cran de charge, retour à 8 reps  |
| Pas encore toutes en haut               | même charge, + 1 rep (max 12)        |
| Sous le bas de la fourchette (< 8)      | même charge, viser 8                 |

Fourchettes par défaut : 5–8 sur les gros polyarticulaires, 6–10 sur les polyarticulaires, 8–12 en accessoire, 10–15 en isolation, 12–20 pour les abdos.

Les flèches ▲ = ▼ comparent avec le 1RM estimé sur reps + RIR. Ainsi, 82,5 × 6 et 80 × 8 se jugent sur la même échelle.
