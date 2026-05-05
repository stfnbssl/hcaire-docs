---
slug: /
title: Benvenuto
sidebar_position: 0
---

# Documentazione tecnica HCAIRE

Questa è la documentazione tecnica del monorepo **`hcaire-blog`**: un'app React/Vite + Express/MongoDB per la pubblicazione di contenuti, gestione admin, e verticali tematici.

## Come è organizzata

| Sezione | Contenuto |
|---|---|
| **Panoramica** | Cos'è l'applicazione, mappa moduli, glossario, inventario tecnico |
| **Architettura** | Stack, frontend, backend, database, autenticazione, routing, deployment |
| **Moduli** | Una scheda per ciascun modulo del core (autenticazione, contenuti, navigation, admin CMS, account, letture, hcaire, sviluppo-bambino) |
| **API** | Endpoint REST del server Express |
| **Reference** | Documentazione automatica TypeDoc/OpenAPI/Storybook (futuro) |

## Scope di questa documentazione

Documentiamo lo **scope B (core stabile)**: blog, admin CMS, autenticazione, navigation, markdown, account, letture, hcaire, sviluppo-bambino con produzioni.

**Fuori scope**: Bartleby (sub-app separata, ha già il proprio CLAUDE.md) e Corso Fase 3 (in lavorazione, da documentare quando converge).

## Repository

- **App**: `C:\my\projects\hcaire-blog\`
- **Docs (questo repo)**: `C:\my\projects\hcaire-docs\`

I due repo sono **paralleli e indipendenti**. Gli artefatti generati automaticamente (TypeDoc, OpenAPI) verranno sincronizzati tramite script dedicati nelle fasi successive.
