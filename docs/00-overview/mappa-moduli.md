---
title: Mappa dei moduli
sidebar_position: 2
---

# Mappa dei moduli

Vista logica delle aree dell'app e delle loro dipendenze. Tutto è in scope.

```mermaid
flowchart LR
  classDef core fill:#dbeafe,stroke:#1e40af,color:#1e3a8a
  classDef vertical fill:#fef3c7,stroke:#a16207,color:#713f12
  classDef admin fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d
  classDef external fill:#f3f4f6,stroke:#6b7280,color:#374151

  subgraph CORE["Core trasversale"]
    Auth["Autenticazione<br/>(Clerk)"]:::core
    Nav["Navigation"]:::core
    Markdown["Markdown rendering"]:::core
    SiteCfg["SiteConfig / SiteContent"]:::core
    Account["Account utente"]:::core
    Pricing["Pricing"]:::core
    Subs["Subscriptions<br/>(Lemon Squeezy)"]:::core
  end

  subgraph CONTENT["Contenuti pubblici"]
    Blog["Blog / CMS<br/>(/blog/:slug)"]:::vertical
    HCAIRE["HCAIRE laboratorio<br/>(/hcaire/*)"]:::vertical
    Metodo["Metodo<br/>(/metodo/*, didattica F1/F2/F3)"]:::vertical
    SBNar["Sviluppo Bambino — narrativa<br/>(/sviluppo-bambino/*)"]:::vertical
    Assi["Assi strutturali<br/>(/assi-strutturali/*)"]:::vertical
    Letture["Letture critiche<br/>(/letture/*)"]:::vertical
    Bartleby["Bartleby<br/>(/bartleby/*)"]:::vertical
    Anthropos["Anthropos<br/>(/anthropos)"]:::vertical
  end

  subgraph PIPELINE["Orchestrazione"]
    SBProd["SB Produzioni<br/>pipeline F2/F3"]:::vertical
    LettPip["Letture pipeline<br/>(10 step)"]:::vertical
    Cowork["Local — ponte Cowork"]:::vertical
  end

  subgraph ADMIN["Admin CMS"]
    AdminDash["Dashboard"]:::admin
    AdminLet["Letture"]:::admin
    AdminCfg["Site Config / Content"]:::admin
    AdminReq["Article Requests"]:::admin
    Workflow["Workflow Log"]:::admin
    AdminAssi["Assi + rebuild"]:::admin
    AdminCat["Catalogo<br/>(autori, libri)"]:::admin
    AdminArch["Archivio Temi (D5)"]:::admin
    AdminJobs["Jobs / Skills / Plugins"]:::admin
  end

  subgraph EXT["Servizi esterni"]
    Mongo[("MongoDB Atlas")]:::external
    Redis[("Redis Cloud<br/>pub/sub")]:::external
    Clerk2["Clerk"]:::external
    LS["Lemon Squeezy"]:::external
    Telegram["Telegram Bot"]:::external
    R2[("Cloudflare R2")]:::external
    CFPages["Cloudflare Pages"]:::external
    Railway["Railway"]:::external
  end

  Auth --> Clerk2
  Subs --> LS
  Account --> Auth
  Pricing --> LS
  Blog --> Mongo
  HCAIRE --> Mongo
  Metodo --> Mongo
  SBNar --> Mongo
  Assi --> Mongo
  Letture --> Mongo
  Bartleby --> Mongo
  AdminCat --> R2
  AdminArch --> Mongo
  AdminJobs --> Mongo

  SBProd --> Mongo
  SBProd --> Redis
  LettPip --> Redis
  Bartleby --> Redis
  AdminReq --> Telegram
  AdminReq --> Cowork
  Cowork --> Telegram

  Workflow --> Mongo
  Workflow --> Redis
```

## Mappa moduli ↔ pagine ↔ endpoint

| Modulo | Pagine FE | Endpoint server |
|--------|-----------|-----------------|
| **Blog / CMS** | `/`, `/blog/:slug`, `/about` | `GET/POST/PUT/DELETE /api/contents`, `GET /api/admin/contents`, `POST /api/contents/import` |
| **Navigation** | (componente globale) | `GET /api/navigation`, modifie admin |
| **Account** | `/account` | `GET /api/subscriptions/status` |
| **Pricing** | `/pricing` | (statico + Lemon Squeezy checkout) |
| **Subscriptions** | (componente) | `GET /api/subscriptions/status`, `POST /webhooks/lemonsqueezy` |
| **SiteConfig / SiteContent** | `/admin/site-config`, `/admin/testi` | `GET /api/site-config`, `GET /api/site-content`, modifie admin |
| **HCAIRE laboratorio** | `/hcaire`, `/hcaire/protocolli`, `/hcaire/protocolli/:slug`, `/hcaire/:section` | `GET /api/hcaire/*` |
| **Metodo** | `/metodo`, `/metodo/introduzione`, `/metodo/fasi`, `/metodo/fasi/:slug`, `/metodo/ricerca-scientifica`, `/metodo/rapporto-con-ia`, `/metodo/didattica/*` | `GET /api/metodo/*` |
| **Sviluppo Bambino — narrativa** | `/sviluppo-bambino`, `/sviluppo-bambino/finalita`, `/sviluppo-bambino/concetti`, `/sviluppo-bambino/nota-metodologica`, `/sviluppo-bambino/riflessioni`, `/sviluppo-bambino/interlocuzioni/*`, `/sviluppo-bambino/modello/*` | `GET /api/sviluppo-bambino/*` |
| **Sviluppo Bambino — Produzioni (pipeline F2/F3)** | `/sviluppo-bambino/produzioni*` (landing, temi, pipeline map, ricerche, temi/device, stress-test) | `GET /api/pipeline/*`, `POST /api/pipeline/executions`, `POST /api/pipeline/external-inputs`, `POST /api/pipeline/decisions` |
| **Assi strutturali** | `/assi-strutturali`, `/assi-strutturali/capitoli`, `/assi-strutturali/bibliografia`, `/assi-strutturali/:asseSlug`, `/assi-strutturali/:asseSlug/:chapterSlug` | `GET /api/assi`, `GET /api/admin/assi-chapters/*`, modifie admin |
| **Letture critiche** | `/letture`, `/letture/elenco`, `/letture/:slug`, `/admin/letture/*` | `GET /api/letture/*`, `POST /api/admin/letture/:slug/steps/:step_id/run` |
| **Bartleby** | `/bartleby`, `/bartleby/console`, `/bartleby/knowledge-base/*`, `/bartleby/outputs`, `/bartleby/outputs/:id` | `GET /api/bartleby/*`, `POST /api/bartleby/output-documents`, `POST /api/bartleby/traces` |
| **Anthropos** | `/anthropos` | (statico) |
| **Archivio Temi (D5)** | `/archivio/temi`, `/archivio/temi/nuovo`, `/archivio/temi/:id` | `GET/POST/PATCH/DELETE /api/archivio/temi` |
| **Catalogo (autori/libri)** | `/admin/catalogo`, (uso pubblico in Bibliografia) | `GET/POST/PATCH/DELETE /api/admin/catalog/{authors,books}` |
| **Article Requests + Telegram/Cowork** | `/admin/requests` | `GET/POST /api/article-requests`, listener Telegram + Cowork CLI |
| **Workflow Log** | `/admin/workflow` | (lettura `WorkflowLog`) |
| **Skills / Plugins / Jobs** | `/admin/skills`, `/admin/plugins`, `/admin/job-definitions`, `/admin/jobs` | `GET/POST/PUT/DELETE /api/admin/{skills,plugins,job-definitions,job-requests}` |

Per il dettaglio di rotte ed entrypoint vedi:

- [Routing](../10-architecture/routing.md) per la mappa completa FE + BE
- [Inventario tecnico](./inventario.md) per controller, model e service per modulo
