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
- **Forme du jour** : « Fatigué / Normal / En forme », toujours visible en haut de la séance et modifiable à tout moment. Jour sans → objectifs à −5 % ; en forme → on charge un cran plus tôt.
- **Échauffements** : un tap sur « Échauffement », la montée est proposée (50 % × 10, 70 % × 5, 85 % × 3). Ils sont notés mais exclus de « À battre », des records et des courbes. 60 s de repos seulement.
- **Drop sets** : un tap sur « Drop set » après une série (−20 % pré-rempli). Comptés dans le volume, exclus des comparaisons et des records. Un RIR 0 s'affiche « Échec ».
- **Supersets** : « ⋯ » → « Superset avec… ». Après une série du premier exercice, la carte bascule seule sur le second, sans repos ; le repos part après le second. Mémorisé dans la séance type.
- **Ta courbe sans quitter la séance** : l'icône courbe sur l'exercice ouvert.
- **Note par exercice** (« banc cran 3, prise 2 doigts »), réglée dans « ⋯ », affichée sur la carte et gardée d'une séance à l'autre.
- **Alerte de stagnation** : si la force ne progresse plus depuis 3 séances, un conseil discret (séance allégée ou variante).
- **Records en direct** : dès qu'une série bat ton meilleur 1RM estimé ou ton record à ce nombre de reps, la ligne s'illumine (« Nouveau record »), et le bouton l'annonce avant même de valider (« ★ Record »).
- **Le repos démarre tout seul** à chaque série validée : durée mémorisée par exercice, 60 s seulement après un échauffement. Au repos, une seule pastille « Repos 2:00 » ; les autres durées s'ouvrent en la touchant. À la fin, l'écran entier clignote en rose (visible à 2 mètres), avec bip et vibration.
- **Pensé pour le pouce** : toutes les cibles font au moins 44 px, la mise en page s'adapte jusqu'à l'iPhone SE, Valider reste toujours au-dessus du chrono, et chaque série validée s'allume brièvement.

**À la fin, un récapitulatif** : durée, séries de travail, records battus, tonnage effectif, et chaque exercice comparé à ta dernière séance du même type. « Partager le récap » en fait une image à envoyer aux potes.

**Onglet Progrès**, dans l'ordre : force par exercice, **volume par muscle** sur la semaine (½ série pour les muscles secondaires, repère 10–20 séries), puis régularité (semaines d'affilée au rendez-vous) et proposition de **semaine de décharge** quand plusieurs exercices stagnent (−10 %, une série de moins), puis les dernières séances. Dans la vue d'un exercice : **records par reps**.

**Sauvegarde en 1 tap** : le menu « Partager » du téléphone (iCloud Drive, Google Drive, AirDrop…), avec un rappel sur l'accueil quand des séances ne sont pas à l'abri. **Envoyer une séance type à un pote** : un lien, sans serveur ; il l'ajoute en un tap.

**Une erreur de saisie ?** Dans le détail d'une séance passée, touche une série pour corriger sa charge, ses reps ou son RIR, la supprimer ou la passer en échauffement (avec « Annuler »). Objectifs, records et courbes se recalculent aussitôt.

**Le bouton « ⋯ » d'un exercice** regroupe ce qu'on règle rarement : sa **fourchette de reps**, sa **note** (réglage machine, prise), l'ordre (**monter / descendre**), **remplacer** si la machine est prise (les séries déjà faites restent sur l'original), **superset** avec l'exercice suivant, ou retirer.

Et aussi : sauvegarde à chaque tap (avec alerte immédiate si le stockage sature), écran qui reste allumé pendant la séance, fonctionne hors-ligne, export/import JSON (derrière l'avatar).

## Démarrer

```bash
npm install
npm run dev
```

Ouvre l'URL « Network » affichée sur ton téléphone (même Wi-Fi).
En `http://` sur le réseau local, l'écran qui reste allumé et le hors-ligne sont désactivés : ils exigent HTTPS, donc GitHub Pages.

## Tests

```bash
npm test          # 83 tests unitaires (Vitest)
npm run test:e2e  # 24 parcours dans un vrai navigateur (Playwright), en iPhone 13 et iPhone SE
```

Les tests unitaires couvrent la logique critique : 1RM ajusté au RIR, double progression par fourchette, forme du jour, décharge, échauffements, drop sets, supersets, records, volume par muscle, régularité, migration des données, sauvegardes, envoi de séance par lien.
Les parcours rejouent la salle : séance avec record et récapitulatif, forme du jour, drop set, superset, carte allégée (fourchette et note dans « ⋯ »), pastille de repos, correction d'une séance passée, volume, lien de séance, import corrompu, cibles tactiles.

Les deux tournent sur GitHub à chaque push : **si un seul test échoue, rien n'est mis en ligne.**

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
│  ├─ session.js            réordonner, remplacer, supersets, corriger une séance (logique pure, testée)
│  ├─ summary.js            récapitulatif de fin de séance (+ summaryImage.js : l'image partageable)
│  ├─ stats.js              volume par muscle, régularité, records par reps
│  ├─ share.js              envoyer une séance type par lien (encodage + validation)
│  ├─ backup.js             export signé + import validé champ par champ
│  └─ hooks.js              timer de repos, wake lock, horloge
├─ components/
   ├─ Home.jsx              onglet Entraînement (séance du jour, semaine, séances)
   ├─ ProgressTab.jsx       onglet Progrès
   ├─ SessionLogger.jsx     ★ la séance en cours (95 % du temps)
   ├─ ExerciseCard.jsx      ★ une carte d'exercice (+ exercise/ : tableau, saisie, échauffements & drop sets)
   ├─ ProgressSection.jsx   une carte de force par exercice, cliquable
   ├─ ProgressDetail.jsx    vue dédiée : courbe, force / tonnage effectif, records
   ├─ Charts.jsx            graphiques SVG faits main (aucune librairie)
   ├─ SwipeRow.jsx          glisser pour supprimer
   ├─ ExercisePicker · TemplateEditor · SessionDetail · SettingsSheet
   └─ RestTimer · Stepper · Toast · Sheet · StorageAlert · ui · Icons
tests/                       Vitest : training, migrate, backup, session, records, coach2
e2e/                         Playwright : parcours réels en format téléphone
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
