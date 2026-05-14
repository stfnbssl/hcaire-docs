---
title: Documentazione tecnica HCAIRE
sidebar_position: 1
slug: /
---

# Documentazione tecnica HCAIRE

Benvenuto nella documentazione della webapp **HCAIRE** (`hcaire.ai`). Il codice vive in un monorepo `hcaire` con tre workspace (`server/`, `client/`, `local/`). Questo sito documenta:

- l'**architettura** (stack, deployment, routing, autenticazione, stato applicativo);
- i **moduli funzionali** (blog, account, sottoscrizioni, admin CMS, HCAIRE laboratorio, Metodo, Sviluppo Bambino, Letture critiche, Assi strutturali, Bartleby, Pipeline orchestrazione, integrazioni esterne);
- le **API e gli strumenti di riferimento** (OpenAPI, TypeDoc, proposta Storybook).

## Come è organizzata

| Sezione | Contenuto |
|---------|-----------|
| **Panoramica** (`00-overview/`) | Cos'è l'applicazione, inventario tecnico, mappa moduli, glossario, obiettivi funzionali |
| **Architettura** (`10-architecture/`) | Stack, frontend, backend, database, autenticazione, routing, stato applicativo, deployment, ponte locale Cowork |
| **Moduli** (`20-modules/`) | Una scheda per ogni modulo funzionale (con scopo, file, rotte, dati, criticità) |
| **API** (`30-api/`) | OpenAPI 3.1, TypeDoc, proposta Storybook |
| **Reference** (`40-reference/`) | Placeholder per riferimenti generati (link a Redoc, TypeDoc) |
| **TODO / proposte aperte** (`90-todo/`) | Decisioni non ancora prese (es. migrazioni MongoDB, refactor backend laboratorio) |

Il sidebar è auto-generato dalla struttura cartelle: l'ordine è guidato dai prefissi numerici e dai file `_category_.json`.

## Scope

La documentazione **copre tutta l'applicazione**. Niente parti escluse "per ora": Bartleby, Pipeline F2/F3, Metodo, Catalogo, Archivio Temi, Telegram/Cowork sono tutti in scope.

Restano fuori solo:

- documenti di prodotto / pitch deck (non tecnici);
- contenuti editoriali del blog e degli archivi (sono dati, non architettura).

## Repository

| Repo | Cosa contiene |
|------|---------------|
| **`hcaire`** (ex `hcaire-blog`) | Applicazione: server Express, client React, worker local |
| **`hcaire-docs`** (questo) | Documentazione Docusaurus |

I due repo sono **cartelle sorelle** sul disco. Lo script `npm run sync-docs` legge `../hcaire/server/src/` per generare il TypeDoc.

## Lingua

Tutto in italiano (`i18n.defaultLocale: 'it'`).
