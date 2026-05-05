---
title: Mappa dei moduli
sidebar_position: 2
---

# Mappa dei moduli

Vista logica delle aree dell'app e delle loro dipendenze. **Scope B**: i moduli grigi sono fuori scope (vedi nota in fondo).

```mermaid
flowchart LR
  classDef core fill:#dbeafe,stroke:#1e40af,color:#1e3a8a
  classDef vertical fill:#fef3c7,stroke:#a16207,color:#713f12
  classDef admin fill:#fee2e2,stroke:#b91c1c,color:#7f1d1d
  classDef external fill:#f3f4f6,stroke:#6b7280,color:#374151
  classDef oos fill:#e5e7eb,stroke:#9ca3af,color:#6b7280,stroke-dasharray: 5 5

  subgraph CORE["Core blog"]
    Blog["Blog/CMS<br/>(Home, BlogPost, paywall)"]:::core
    Auth["Autenticazione<br/>(Clerk)"]:::core
    Nav["Navigation"]:::core
    Markdown["Markdown rendering"]:::core
    Account["Account utente<br/>(Clerk + Subscription)"]:::core
    Pricing["Pricing"]:::core
  end

  subgraph VERT["Verticali tematici"]
    HCAIRE["HCAIRE<br/>(manifesto, protocolli)"]:::vertical
    Letture["Letture critiche"]:::vertical
    SB["Sviluppo Bambino<br/>(metodo, fasi, modello, interlocuzioni)"]:::vertical
    SBProd["SB / Produzioni<br/>(pipeline F2/F3)"]:::vertical
  end

  subgraph ADMIN["Admin CMS"]
    AdminDash["Dashboard"]:::admin
    AdminLetture["Letture"]:::admin
    AdminSiteConfig["Site Config"]:::admin
    AdminSiteContent["Site Content"]:::admin
    AdminRequests["Article Requests"]:::admin
    Workflow["Workflow Log"]:::admin
  end

  subgraph EXT["Servizi esterni"]
    Mongo[("MongoDB Atlas")]:::external
    Redis[("Redis Cloud<br/>pub/sub")]:::external
    Clerk2["Clerk"]:::external
    LS["Lemon Squeezy<br/>(billing + webhook)"]:::external
    Telegram["Telegram Bot"]:::external
    CF["Cloudflare<br/>(deploy FE)"]:::external
  end

  subgraph OOS["Fuori scope (B)"]
    Bartleby["Bartleby<br/>(sub-app)"]:::oos
    CF3["Corso Fase 3<br/>(WIP)"]:::oos
  end

  Blog --> Auth
  Blog --> Mongo
  Account --> Auth
  Account --> LS
  Pricing --> LS
  HCAIRE --> Markdown
  Letture --> Mongo
  Letture --> Redis
  SB --> Markdown
  SBProd --> Mongo
  AdminDash --> Auth
  AdminDash --> Mongo
  Workflow --> Redis
  AdminDash --> Telegram
```

## Mappa moduli ↔ pagine ↔ endpoint

| Modulo | Pagine FE | Endpoint server |
|--------|-----------|-----------------|
| **Blog/CMS** | `/`, `/blog/:slug`, `/about` | `GET/POST/PUT/DELETE /api/contents`, `GET /api/contents/admin`, `POST /api/contents/import` |
| **Navigation** | (componente globale) | `GET /api/navigation` |
| **Account** | `/account` | `GET /api/subscriptions/me` (e webhook LS) |
| **Pricing** | `/pricing` | (statico) |
| **Article Requests** | `/admin/requests` | `GET/POST /api/article-requests` |
| **Site Config** | `/admin/site-config` | `GET/PUT /api/site-config` |
| **Site Content** | `/admin/testi` | `GET /api/site-content`, `GET/PUT /api/admin/site-content` |
| **HCAIRE** | `/hcaire`, `/hcaire/protocolli`, `/hcaire/protocolli/:slug`, `/hcaire/:section` | `GET /api/hcaire/`, `/api/hcaire/:section`, `/api/hcaire/:section/:subsection` |
| **Letture** | `/letture`, `/letture/elenco`, `/letture/:slug`, `/admin/letture/*` | `GET /api/letture/*`, `GET/POST/PATCH/DELETE /api/admin/letture/*`, `POST /api/admin/letture/:slug/steps/:step_id/run` |
| **Sviluppo Bambino — narrativa** | `/sviluppo-bambino/*` (≈18 route: finalita, metodo, fasi, concetti, modello, assi, interlocuzioni, riflessioni…) | `GET /api/sviluppo-bambino/*` (≈22 endpoint specchio) |
| **Sviluppo Bambino — Produzioni** | `/sviluppo-bambino/produzioni*` (landing, temi, pipeline map, dispositivo, stress test) | `GET /api/pipeline/*` + file statici sotto `/pipeline/` (vedi modulo) |
| **Assi strutturali (top-level)** | `/assi-strutturali*` | come SB narrativa (assi) |
| **Workflow Log** | `/admin/workflow` | (Redis-driven, `WorkflowLog` model) |

## Fuori scope (per questa fase di documentazione)

- **Bartleby** (`/bartleby/*`, `/api/bartleby/*`, modelli sotto `server/src/models/bartleby/`) — sub-app separata che ha già il proprio `CLAUDE_bartleby.md`. Sarà documentata in un capitolo dedicato successivo.
- **Corso Fase 3** (`/sviluppo-bambino/strumenti-operativi-contestualizzati/*`) — in lavorazione (file untracked m02–m08). Sarà documentato quando converge.

I corsi **F1** (fondazione ontologica) e **F2** (traduzione interdisciplinare) sono inclusi nello scope perché stabili.
