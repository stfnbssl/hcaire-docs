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
hcaire-blog/                  hcaire-docs/                 build/
├── server/src/      ─────►   typedoc                ──►   /typedoc/  (HTML statico)
│
└── (note di dominio)         openapi.yaml           ──►   /api-reference/  (Redoc)
                              ↓
                              docs/30-api/*.md       ──►   pagine dock
```

Le pagine MDX sotto `docs/30-api/` raccontano **il perché** e **come usare** ciascun artefatto. La generazione vera e propria è orchestrata dallo script `scripts/sync-docs.mjs` (vedi [TypeDoc — Sync](./typedoc.md#sync)).

## Convenzioni

- **OpenAPI** copre solo gli endpoint **stabili** dell'API REST. Endpoint dei verticali narrativi (HCAIRE, Sviluppo Bambino) e di pipeline interna (`/api/pipeline/*`, `/api/admin/letture/*/run`) vivono nei rispettivi moduli (vedi `docs/20-modules/`) perché il loro contratto è in evoluzione.
- **TypeDoc** copre solo `server/`. `client/` è escluso perché molte API sono "private" del SPA e l'utilità di documentarle è bassa. `local/` è coperto solo per i constants/handler della pipeline.
- **Storybook**, se mai introdotto, coprirà `client/src/components/` esclusi quelli di `corso-fase*` (slide didattiche, non componenti riutilizzabili).
