---
title: API e tooling
sidebar_position: 1
slug: /api/index
---

# API e tooling

Questa area raccoglie i riferimenti **generati** o **semi-generati** per integrare il sistema:

| Sezione | Cosa contiene | Stato |
|---------|---------------|-------|
| [OpenAPI](./openapi.md) | Specifica REST 3.1, hand-written, navigabile in `/api-reference/` | implementato (subset core) |
| [TypeDoc](./typedoc.md) | API reference TypeScript del server, generato automaticamente | implementato (sync via script) |
| [Storybook](./storybook.md) | Galleria componenti React | proposto, non implementato |

## Pipeline di generazione

```
hcaire/                       hcaire-docs/                 build/
├── server/src/      ─────►   typedoc                ──►   /typedoc/  (HTML statico)
│
└── (note di dominio)         openapi.yaml           ──►   /api-reference/  (Redoc)
                              ↓
                              docs/30-api/*.md       ──►   pagine dock
```

Le pagine MDX sotto `docs/30-api/` raccontano **il perché** e **come usare** ciascun artefatto. La generazione è orchestrata dallo script `scripts/sync-docs.mjs` (vedi [TypeDoc — Sync](./typedoc.md#sync)).

## Convenzioni

- **OpenAPI** copre il subset stabile dell'API REST (contenuti pubblici, navigazione, subscriptions, site-config/content, letture, webhook). Per gli endpoint dei verticali narrativi (HCAIRE, Metodo, Sviluppo Bambino), della pipeline interna (`/api/pipeline/*`) e di Bartleby, il contratto vive nei rispettivi moduli (`docs/20-modules/`) perché in evoluzione.
- **TypeDoc** copre solo `server/`. `client/` è escluso perché molte API sono "private" del SPA. `local/` non è coperto direttamente da TypeDoc (vedi il modulo [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md)).
- **Storybook**, se mai introdotto, coprirà `client/src/components/` esclusi quelli di `corso-fase{1,2,3}/` (slide didattiche, non componenti riutilizzabili).
