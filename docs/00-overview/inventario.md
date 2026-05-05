---
title: Inventario tecnico
sidebar_position: 3
---

# Inventario tecnico

Inventario "fotografico" dello stato del codice al **2026-05-05**, inteso come materiale di partenza per Architettura e Schede modulo. Non è documentazione narrativa: è una lista.

## 1. Monorepo

```
hcaire-blog/
├── package.json            # workspaces: server, client, local
├── server/                 # Express + Mongoose + Clerk
├── client/                 # React + Vite + MUI + Tailwind
├── local/                  # sidecar tsx watch (worker)
├── content/                # markdown statico letto dal server
├── scripts/                # script .mjs (sync-pipeline, seed, repair)
└── docs/                   # (svuotata, contenuti migrati in hcaire-docs)
```

Tre workspaces npm definiti in `package.json` root. `npm run dev` lancia i tre processi in parallelo via `concurrently`.

## 2. Server (`server/`)

**Stack**: Express 4, Mongoose 8, Clerk Express, dotenv, ioredis, telegraf, ajv (JSON Schema), gray-matter (frontmatter markdown), jsonwebtoken (legacy).

**Entry point**: `server/src/index.ts` — porta `3018` (override via `PORT`).

### Routes (`server/src/routes/`)

| File | Mount | Note |
|------|-------|------|
| `content.ts` | `/api/contents` | CRUD articoli + `/import` (api-key auth) |
| `nav.ts` | `/api/navigation` | Menu dinamico |
| `auth.ts` | `/api` | Endpoint legacy login (probabile da rimuovere) |
| `articleRequests.ts` | `/api/article-requests` | Form richieste articolo |
| `webhooks.ts` | `/webhooks` | **Prima** di `express.json()` (raw body) |
| `subscriptions.ts` | `/api/subscriptions` | Stato abbonamento utente |
| `siteConfig.ts` | `/api/site-config` | Config visuale del sito |
| `siteContent.ts` | `/api/site-content`, `/api/admin/site-content` | Testi UI editabili |
| `bartleby.ts` | `/api/bartleby` | (fuori scope B) |
| `hcaire.ts` | `/api/hcaire` | Lettura contenuti HCAIRE da `content/` |
| `sviluppoBambino.ts` | `/api/sviluppo-bambino` | 22 endpoint sui contenuti narrativi del verticale |
| `pipeline.ts` | `/api/pipeline` | Endpoint pipeline produzioni |
| `letture.ts` | `/api/letture`, `/api/admin/letture` | Public + admin (con step run) |

### Models (`server/src/models/`)

| File | Collection | Note |
|------|------------|------|
| `Content.ts` | `hcaire-content` | Articoli blog. `accessType: 'free' \| 'plus'` |
| `Navigation.ts` | navigation | Menu dinamico |
| `ArticleRequest.ts` | article-requests | Richieste articolo |
| `Opera.ts` | opere | Letture critiche |
| `SiteConfig.ts` | site-config | Configurazione UI |
| `SiteContent.ts` | site-content | Testi UI |
| `UserSubscription.ts` | user-subscriptions | Stato abbonamento |
| `WorkflowLog.ts` | workflow-log | Log eventi pipeline/letture |
| `PipelineContext.ts` | pipeline-context | Contesto esecuzioni |
| `PipelineExternalInput.ts` | pipeline-external-input | Input esterni |
| `PipelineStepExecution.ts` | pipeline-step-execution | Esecuzioni di step |
| `bartleby/` | (vari) | Fuori scope B |

### Controllers / services / middleware

- **Controllers**: 11 controller, uno per dominio.
- **Services**: `messageBus.ts` (Redis), `pipelineEventSubscriber.ts` + `pipelineService.ts` + `pipelineMappers.ts` + `stepConfigService.ts` + `stepEnablement.ts`, `lettureMessageBus.ts` + `lettureEventSubscriber.ts` + `lettureSchemaValidator.ts`, `staticContentReader.ts`, `telegramBot.ts`, `workflowLogger.ts`. Tests in `services/__tests__/`.
- **Middleware**: `clerkAuth.ts` (attuale: `authenticateClerk`, `requireAdmin`, `optionalClerkAuth`), `apiKeyAuth.ts`, `auth.ts` (legacy JWT — stato d'uso da chiarire).

### Servizi di background (avviati in `index.ts` dopo `connectDB()`)

- `startTelegramBot()` — bot Telegraf
- `startPipelineEventSubscriber()` + `startPipelineWatchdog()` — Redis subscriber + timeout monitor
- `startLettureEventSubscriber()` + `startLettureWatchdog()` — idem per letture

## 3. Client (`client/`)

**Stack**: React 18, React Router 6, MUI 5, Tailwind 3, react-markdown 9 (con remark-gfm, remark-footnotes, rehype-raw), Clerk React, Vite 8, Wrangler (deploy Cloudflare).

**Entry**: `client/src/main.tsx` → `App.tsx` (BrowserRouter + ClerkProvider + tre context provider: SiteConfig, SiteContent, Subscription).

### Pagine (`client/src/pages/`)

| Folder/file | Area |
|-------------|------|
| `Home.tsx`, `About.tsx`, `BlogPost.tsx`, `NotFound.tsx`, `Pricing.tsx`, `Account.tsx`, `Progetti.tsx`, `WorkInProgress.tsx`, `WorkflowLog.tsx` | Core blog + utility |
| `AdminDashboard.tsx`, `AdminRequests.tsx`, `AdminLetture.tsx`, `AdminLetturaNuova.tsx`, `AdminLetturaDetail.tsx`, `AdminSiteConfig.tsx`, `AdminSiteContent.tsx` | Admin CMS |
| `letture/*` | Letture critiche (pubblico) |
| `hcaire/*` | Verticale HCAIRE |
| `sviluppo-bambino/*` | Verticale SB (≈22 pagine narrativo + pipeline + corsi F1/F2/F3) |
| `bartleby/*` | Fuori scope B |

### Routing FE (estratto da `App.tsx`)

Vedi `App.tsx` per la lista completa. Punti notevoli:
- `AdminRoute` wrapper — controlla `useUser()` Clerk e `publicMetadata.role === 'admin'`
- Lazy loading per Admin*, KnowledgeBase, Letture, Corsi F1/F2/F3, Presentazione
- Redirect storici da `/sviluppo-bambino/assi/*` a `/assi-strutturali/*`
- Redirect storico da `/hcaire/ia-centrata-sull-umano` a `/hcaire/manifesto`

### Servizi e contesti

- `services/` — fetch verso `VITE_API_URL`
- `context/` — `SubscriptionContext`, `SiteConfigContext`, `SiteContentContext`
- `hooks/`, `types/`, `data/`, `utils/`, `styles/`

## 4. Local worker (`local/`)

Sidecar Node con `tsx watch`, dipende solo da `ioredis` + `mongoose`.

```
local/src/
├── index.ts
├── coworker.ts
├── bartlebyWorker.ts
├── pipeline/
└── scripts/  (seed/backfill/inherit)
```

Probabilmente subscriber Redis che esegue lavoro pesante (esecuzione step, processing) lato server. **Da approfondire in Fase 2**.

## 5. Static content (`server/content/`)

Markdown con frontmatter, base path overridabile via `CONTENT_BASE_PATH`. Letto da `staticContentReader.ts` con `gray-matter`.

```
server/content/
├── bartleby/
├── hcaire/
└── progetti/
```

Il verticale **HCAIRE** e **Sviluppo Bambino** legge contenuti da una cartella esterna alla repo, impostata via `CONTENT_BASE_PATH`. Sulla macchina di sviluppo principale punta a `C:/Users/nnmrd/Documents/Claude/Projects/HCAIRE Site/sezioni/`. **Per replicare l'app su un'altra macchina serve trasferire anche quella cartella** (non è in git).

## 6. Static pipeline data (`client/public/pipeline/`)

Artefatti JSON della pipeline produzioni (F2/F3), prodotti fuori dal sito e sincronizzati da `scripts/sync-pipeline.mjs`. Vedi modulo [Produzioni](../20-modules/sviluppo-bambino/produzioni.md).

## 7. Variabili d'ambiente

### `server/.env`

| Variabile | Tipo | Note |
|-----------|------|------|
| `NODE_ENV` | string | |
| `PORT` | number | default `3018` |
| `CONTENT_BASE_PATH` | path | default `<project-root>/server/content/` |
| `MONGODB_URL`, `MONGODB_PASSWORD` | string | MongoDB Atlas Cluster0 |
| `JWT_SECRET` | string | **legacy** — verificare se ancora usato |
| `CORS_ORIGIN` | url | default `http://localhost:5173` |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | string | Clerk |
| `TELEGRAM_TOKEN`, `TELEGRAM_ID` | string | Telegram bot |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | string/number | Redis Cloud GCP eu-west3 |
| `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Billing |
| `LEMONSQUEEZY_VARIANT_ABBONATO`, `LEMONSQUEEZY_VARIANT_BARTLEBY`, `LEMONSQUEEZY_VARIANT_BARTLEBY_PLUS` | string | Variant id per piano |
| `PIPELINE_DEFAULT_TIMEOUT_MS` | number | default `300000` |
| `PIPELINE_WATCHDOG_INTERVAL_MS` | number | default `300000` |

### `client/.env`

| Variabile | Note |
|-----------|------|
| `VITE_API_URL` | default `http://localhost:3018/api` |
| `VITE_APP_NAME` | branding |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk |

## 8. Script npm

### Root (`hcaire-blog/package.json`)

| Script | Cosa fa |
|--------|---------|
| `dev` | `concurrently` server + client + local |
| `build` | Build server + client + local |
| `sync-pipeline` | `node scripts/sync-pipeline.mjs` — sincronizza artefatti pipeline da cartella locale dello sviluppatore |
| `test:pipeline-config`, `test:pipeline-mapper`, `test:pipeline-enablement` | Test Node native (`node --test`) |
| `test` | Esegue i tre test sopra |

### Server

`dev` (nodemon ts-node), `build` (tsc), `start` (node dist), `seed:bartleby`.

### Client

`dev` (vite), `build` (tsc + vite build), `preview` (build + wrangler dev), `type-check`, `deploy` (build + wrangler deploy).

### Local

`dev` (tsx watch), `start` (tsx), `build` (tsc), `seed:test-ricerca`, `backfill:outputs`, `inherit:f2-steps`.

## 9. Punti oscuri / da chiarire in Fase 2

- Stato d'uso effettivo di `server/src/middleware/auth.ts` (legacy JWT) e `server/src/routes/auth.ts` — sembrano residui.
- Architettura del worker `local/`: cosa subscribe, cosa pubblica, come si coordina con il server Express.
- Schema effettivo dei messaggi Redis (eventi pipeline/letture).
- Contratti dei file JSON degli step della pipeline (oggi solo TypeScript interface lato lettura, niente JSON Schema esplicito — vedi §8.2 di [Produzioni](../20-modules/sviluppo-bambino/produzioni.md)).

## 10. Esplicitamente fuori scope di questa documentazione

- `pages/bartleby/*`, `routes/bartleby.ts`, `controllers/bartlebyController.ts`, `models/bartleby/`, `services/seedBartleby.ts`, `local/src/bartlebyWorker.ts` — sub-app Bartleby (capitolo separato in futuro).
- `pages/sviluppo-bambino/corso-fase3/*` e `components/corso-fase3/*` (file `m02..m08` untracked) — Corso F3 in lavorazione.
