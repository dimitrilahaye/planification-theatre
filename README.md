# Planification théâtre

Application web pour organiser les représentations théâtrales de plusieurs classes (CP, CE1, CE2…) et générer un planning qui permet aux parents d’assister à la représentation de **tous leurs enfants** sans chevauchement.

**[Voir l'application en ligne](https://dimitrilahaye.github.io/planification-theatre/)**

## Fonctionnalités

- **Classes** : créer des classes (niveau, instituteur, liste d’élèves). Import possible au format texte (une ou plusieurs classes séparées par `---`).
- **Vagues** : chaque classe est organisée en 4 vagues (A, B, C, D), à des créneaux horaires configurables. L’application attribue automatiquement une vague à chaque élève en évitant les conflits pour les fratries.
- **Fratries** : propositions par nom de famille (ex. Dupont / Dupont Aignan) et création manuelle en sélectionnant les enfants dans un quadrillage par classe. Les fratries enregistrées sont prises en compte dans le planning.
- **Horaires** : configuration des créneaux par vague (time pickers), puis génération du planning par classe avec rappel des fratries et surlignage au survol.

## Stack

- **HTML, CSS, JavaScript** (vanilla)
- **Vite** (build et dev uniquement)
- **localStorage** pour la persistance (aucune base de données)

## Installation

```bash
npm install
```

## Lancer en dev

```bash
npm run dev
```

L’app est servie sur **http://localhost:3765/**.

## Build

```bash
npm run build
```

Les fichiers de production sont dans `dist/`.

## Déploiement (GitHub Pages)

Le dépôt contient une GitHub Action (`.github/workflows/deploy-pages.yml`) qui :

- se déclenche à chaque push sur `main` (ou manuellement) ;
- build le projet et déploie le contenu de `dist/` sur GitHub Pages.

**À faire côté repo** : dans **Settings → Pages**, choisir **GitHub Actions** comme source.

Le site est accessible à : **https://dimitrilahaye.github.io/planification-theatre/**

## Structure du projet

```
├── index.html
├── src/
│   ├── main.js       # Rendu des vues (Classes, Fratries, Horaires)
│   ├── store.js      # État global + localStorage
│   ├── data-model.js # Modèle (classes, élèves, parse import)
│   ├── scheduler.js  # Attribution des vagues (sans conflit fratries)
│   └── style.css
├── .github/workflows/
│   └── deploy-pages.yml
└── package.json
```

## Format d’import (classes)

Exemple pour une classe :

```
niveau: CP
instituteur: Carine Dupont
Élèves:
- Dupont Joséphine
- Martin Lucas
```

Plusieurs classes : séparer chaque bloc par `---` sur une ligne.

## Licence

Projet personnel / usage libre.
