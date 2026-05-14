---
title: Inventario tecnico
sidebar_position: 3
---

# Inventario tecnico

Fotografia dello stato del codice della repo `hcaire` (ex `hcaire-blog`). Sostituisce la vecchia "scope B": tutto è in scope.

## 1. Monorepo

```
hcaire/
├── package.json          # workspace root: npm workspaces (server, client, local)
├── CLAUDE.md             # convenzioni per Claude Code
├── FEATURES.md           # tracker FEAT-001..N
├── README.md
├── server/               # Express + MongoDB + Telegram bot + Redis subscribers
├── client/               # React + Vite + Tailwind + MUI + Clerk
├── local/                # worker portatile per Cowork CLI e seed
└── scripts/              # script PowerShell/MJS di manutenzione (sync-pipeline, heal, seed, repair)
```

Script root:

| Comando | Cosa fa |
|---------|---------|
| `npm install` | Installa tutti i workspace |
| `npm run dev` | Avvia server + client + local in parallelo (concurrently) |
| `npm run build` | Build server + client |
| `npm run sync-pipeline` | Sincronizza artefatti pipeline (`scripts/sync-pipeline.mjs`) |
| `npm run seed:archivio` | Seed temi archivio (`scripts/seed-archivio.mjs`) |
| `npm run heal:archivio-bridge` | Ripara inconsistenze bridge archivio (`scripts/heal-archivio-bridge.mjs`) |
| `npm test` | Test (pipeline-config, pipeline-mapper, step-enablement) |

## 2. Server (`server/`)

**Stack**: Express 4.18, Mongoose 8.1, Clerk (`@clerk/express` 2.1, `@clerk/backend` 3.2), Telegraf 4.16, ioredis 5.10, AWS SDK S3 (Cloudflare R2), AJV 8.20, jsonwebtoken 9 (legacy), multer 2.1, gray-matter, github-slugger, mime-types. Porta dev `3018`.

**Entry**: `src/index.ts` — carica `.env` da `loadEnv.ts` (deve essere il primissimo import), monta Clerk middleware globale, monta webhook routes PRIMA di `express.json()`, monta le 23 route group su `/api/*`, avvia bot Telegram + subscribers Redis post DB-connect, espone `/health`.

### 2.1 Controllers (`src/controllers/`)

| File | Responsabilità |
|------|----------------|
| `authController.ts` | Login/logout JWT legacy (deprecato) |
| `contentController.ts` | CRUD `Content`, listing paginato con filtro `isPublished`, gating `accessType` su `getBySlug`, import via API key |
| `bartlebyController.ts` | Knowledge base queries (concept nodes, domain areas, foundation documents, skills, output docs/templates), submission trace |
| `pipelineController.ts` | Index pipeline (ricerche F2 + temi F3), `step-config` filtrato per fase, esecuzione step (run/cancel/verify/skip/reset), CRUD input esterni, flusso decisione umana (incluso bridge F2→F3 tema→ambiti), streaming SSE log |
| `lettureController.ts` | CRUD `Opera` + orchestrazione `steps[]` |
| `archivioTemiController.ts` | CRUD temi archivio D5 (modello `Tema`) |
| `articleRequestController.ts` | CRUD `ArticleRequest` (tracce articoli Telegram) |
| `hcaireController.ts` | Sezioni HCAIRE (`SiteContent` slug-based con fallback FS) |
| `metodoController.ts` | Sezioni Metodo (idem) |
| `sviluppoBambinoController.ts` | Sezioni Sviluppo Bambino (idem) |
| `siteConfigController.ts` | CRUD `SiteConfig` (singleton) |
| `siteContentController.ts` | CRUD `SiteContent` (split public/admin) |
| `pluginsController.ts` | CRUD `Plugin` |
| `skillsController.ts` | CRUD `Skill` (legacy non-Bartleby) |
| `jobDefinitionsController.ts` | CRUD `JobDefinition` |
| `jobRequestsController.ts` | CRUD `JobRequest` |
| `subscriptionController.ts` | Status piano + webhook Lemon Squeezy (HMAC) |

Più `assiChaptersAdminController` e `catalogAdminService` distribuiti in `services/` + handler nelle route corrispondenti.

### 2.2 Routes (`src/routes/`)

23 file. Tutti montati in `src/index.ts` sotto `/api/*` (eccetto `webhooks.ts` montata pre-json):

| Route | Mount | Auth |
|-------|-------|------|
| `content.ts` | `/api/contents` | GET pubblico (con gate `accessType` per signed-in); modifie admin; `POST /import` API key |
| `nav.ts` | `/api/navigation` | GET pubblico; modifie admin |
| `auth.ts` | `/api/login`, `/api/logout` | JWT legacy (deprecato) |
| `subscriptions.ts` | `/api/subscriptions` | `GET /status` Clerk; webhook secret |
| `articleRequests.ts` | `/api/article-requests` | POST pubblico (form), admin GET/DELETE |
| `pipeline.ts` | `/api/pipeline` | GET pubblico (in lettura); modifie admin |
| `letture.ts` | `/api/letture` | GET pubblico; admin orchestrazione su `/api/admin/letture` |
| `assi.ts` | `/api/assi` | admin |
| `assiChapters.ts` | `/api/admin/assi-chapters` | admin |
| `bartleby.ts` | `/api/bartleby` | GET pubblico KB; POST trace API key o admin |
| `hcaire.ts` | `/api/hcaire` | GET pubblico; modifie admin |
| `metodo.ts` | `/api/metodo` | idem |
| `sviluppoBambino.ts` | `/api/sviluppo-bambino` | idem |
| `catalogAuthors.ts` | `/api/admin/catalog/authors` (+ pubblico) | GET pubblico; modifie admin (upload R2) |
| `catalogBooks.ts` | `/api/admin/catalog/books` (+ pubblico) | idem |
| `siteContent.ts` | `/api/site-content` (pubblico) + admin router | split |
| `siteConfig.ts` | `/api/site-config` | GET pubblico; modifie admin |
| `jobDefinitions.ts` | `/api/admin/job-definitions` | admin |
| `jobRequests.ts` | `/api/admin/job-requests` | admin |
| `skills.ts` | `/api/admin/skills` | admin |
| `plugins.ts` | `/api/admin/plugins` | admin |
| `webhooks.ts` | `/webhooks/*` (raw body) | HMAC header |
| `archivioTemi.ts` | `/api/archivio/temi` | GET pubblico; modifie admin |

### 2.3 Models (`src/models/`)

23 file. Pattern Mongoose con `timestamps: true`, collection name esplicito, lean su read pesanti, hot-reload safe (`mongoose.models[name] ?? define`).

**Contenuto pubblico**: `Content`, `Navigation`.

**Account & abbonamenti**: `UserSubscription` (piani `abbonato` / `bartleby` / `bartleby_plus`).

**Assi & catalogo**: `AssiChapter` (source-of-truth con `axis_slug`, `chapter_number`, body markdown con `{{ref:rN}}`, `references[]`, `footnotes[]`, `sections[]`, `_revision_count`), `AsseStrutturale`, `AssiRebuildExecution`, `Author`, `Book`.

**Pipeline F2/F3**: `PipelineContext` (`context_type: 'ricerca'|'tema'`, `step_states`, `pending_decision`, `tema_ambiti`), `PipelineStepExecution`, `PipelineExternalInput`, `Tema` (archivio D5).

**Letture**: `Opera` (con `steps[]` embedded).

**Bartleby** (in `models/bartleby/`): `ConceptNode`, `DomainArea`, `FoundationDocument`, `AreaSheet`, `Skill`, `InputTrace`, `OutputDocument`, `OutputTemplate`, bridge tables (`FoundationDocumentNode`, `AreaSheetNode`, `SkillNode`, `SkillArea`).

**Admin/jobs**: `SiteConfig` (`status: 'test'|'production'`, `maintenanceMode`), `SiteContent` (slug-based), `WorkflowLog`, `Skill` (legacy), `Plugin`, `JobDefinition`, `JobRequest`, `ArticleRequest`.

### 2.4 Services (`src/services/`)

**Pipeline**: `pipelineService`, `pipelineMappers`, `pipelineEventSubscriber` (Redis sub `STEP_EXECUTION_COMPLETE` + watchdog `PIPELINE_DEFAULT_TIMEOUT_MS`), `stepConfigService`, `stepEnablement`.

**Event bus**: `messageBus`, `assiMessageBus`, `lettureMessageBus`, `assiEventSubscriber`, `lettureEventSubscriber`, `workflowLogger`.

**Catalogo & contenuti**: `catalogService` (slugify, validate, upload/delete R2), `assiChaptersService`, `lettureSchemaValidator` (AJV), `staticContentReader` (fallback FS).

**Storage / integrazioni**: `r2.ts` (S3 client Cloudflare R2), `telegramBot.ts` (Telegraf listener + pattern `genera articoli`, spawn Claude CLI in cwd Cowork).

### 2.5 Middleware (`src/middleware/`)

- `auth.ts` — JWT legacy (`authenticateToken`).
- `clerkAuth.ts` — `authenticateClerk`, `optionalClerkAuth`, `requireAdmin`, `checkIsAdmin` (verifica `publicMetadata.role === 'admin'`).
- `apiKeyAuth.ts` — Bearer vs `COWORK_API_KEY` (per `/api/contents/import` e Bartleby traces).

### 2.6 Config & shared

- `src/config/db.ts` — connessione MongoDB (DB `hcaire_db`).
- `src/config/redis.ts` — singleton ioredis lazy.
- `src/loadEnv.ts` — caricamento `.env` (deve essere primo).
- `src/shared/types/` — tipi condivisi server/client (`jobs.d.ts`, `assi.d.ts`).

### 2.7 Data & scripts

- `src/data/bartleby/seed/` — JSON seed knowledge base.
- `src/data/bartleby/simulations/` — markdown simulazioni.
- `src/scripts/` — script TS (`seedBartleby`, `migrateAssiChaptersToMongo`, `exportAssiChapterToMd`, `convertAssiToJson`, `mergeRevisions`, `fixImgExtensions`, `buildAssiArchivio`, `assiStrutturaliInventory`, `testR2Upload`).

## 3. Client (`client/`)

**Stack**: React 18, React Router 6.21, Vite 8, Tailwind 3.4, MUI 5.15, Clerk React 5.61, TanStack React Query 5, react-markdown 9 + rehype/remark plugins (raw, slug, autolink-headings, gfm, footnotes). Deploy Cloudflare Pages via Wrangler.

**Entry**: `src/main.tsx` → `src/App.tsx`. Albero: `ClerkProvider` → `ThemeProvider` (MUI) → `QueryClientProvider` → `BrowserRouter` → `SiteConfigProvider` → `SiteContentProvider` → `SubscriptionProvider`.

### 3.1 Pages (`src/pages/`)

75 file totali, distribuiti in cartelle per sezione (`anthropos/`, `archivio/`, `assi-strutturali/`, `bartleby/`, `corso-fase1/`, `corso-fase2/`, `corso-fase3/`, `hcaire/`, `letture/`, `metodo/`, `sviluppo-bambino/`, e top-level: `Home`, `About`, `BlogPost`, `Pricing`, `Account`, `Progetti`, `NotFound`, `WorkInProgress`, `WorkflowLog`, e tutte le `Admin*`).

Lazy-loaded: `AdminDashboard`, tutte le altre `Admin*`, `WorkflowLog`, `WorkInProgress`, le pagine `CorsoFase{1,2,3}`, `KnowledgeBase`, `LettureCriticheLanding`, `LettureLanding`, `LetturaDetail`.

### 3.2 Components (`src/components/`)

~67 file. Famiglie:

- **Layout/nav**: `Navigation`, `Header`, `Footer`, `AdminLayout`, `Breadcrumb`, `PrevNext`, `UserNav`, `AgenticLabel`.
- **Rendering**: `MarkdownRenderer`, `StructuredChapterRenderer`, `TableOfContents`, `StubNotice`.
- **Nav modulari per sezione**: `AssiStrutturaliNav`, `MetodoNav`, `LaboratorioNav`, `SviluppoBambinoNav`, `SviluppoBambinoInterlocuzioniNav`, `SviluppoBambinoMetodoNav`, `SviluppoBambinoPipelineNav`, `SviluppoBambinoProduzioniNav`.
- **Admin**: `admin/CatalogPicker`, `admin/QuickCreateCatalogItem`, `admin/ChapterRefsPanel`.
- **Bartleby**: `bartleby/BartlebyNav`, `bartleby/BartlebyNotifier` (Redis subscriber FE-side via SSE), `bartleby/ProvenancePanel`, `bartleby/TraceForm`.
- **Pipeline orchestrazione** (`pipeline/orchestration/`): `OrchestrationPanel`, `StepList`, `StepRow`, `StepStatusBadge`, `ExecutionLogViewer`, `ExecutionOutputViewer`, `ExternalInputForm`, `HumanDecisionDialog`, `VerificationPanel`, `PendingDecisionBanner`.
- **Pipeline viewer**: `pipeline/output-viewers/{F2OutputViewer, F3OutputViewer, viewerPrimitives}`, `pipeline/ProcessNarrative`, `pipeline/CorrectionsLog`, `pipeline/DeviceLineage`, `pipeline/GuidaPipelinePanel`.
- **Corsi didattica**: `corso-fase1/{Sidebar, SlideRenderer, AnnotatedScene}`, `corso-fase2/{Sidebar, SlideRenderer, CEBuilder, ComparisonPanel, ExpandableCards, FlipCards, GuardrailBadge, InteractiveMatrix, NodeRelationsGraph, PipelineAnimator, ProgressiveReveal, TemplateTable, ChipAccordion}`, `corso-fase3/{Sidebar, SlideRenderer, DecisionCycle, F3Builder}`.
- **Letture**: `letture/{LettureOutputModal, LettureOutputViewer}`.

### 3.3 Services (`src/services/`)

16 file. Wrapper su `apiClient.ts` (Bearer Clerk JWT):

`contentService`, `subscriptionService`, `siteConfigService`, `siteContentService`, `staticContentService`, `bartlebyService`, `catalogAdminService`, `assiAdminService`, `assiChaptersAdminService`, `lettureService`, `pipelineService` (read), `pipelineOrchestratorService` (write), `jobsService`, `articleRequestService`, `archivioTemiService`.

### 3.4 Hooks (`src/hooks/`)

`useSubscription`, `useFetchNavigation`, `useFetchContent`, `useIsAdmin`, `usePipelineOrchestration` (state machine step), `useExecutionLogs` (SSE EventSource).

### 3.5 Context (`src/context/`)

`SubscriptionContext`, `SiteConfigContext`, `SiteContentContext` — caricano dati globali da rispettivi servizi.

### 3.6 Types (`src/types/`)

`content`, `navigation`, `pipeline` (RicercaIndexEntry, TemaIndexEntry, ExternalInput, StepSkipped, DispositivoSorgente, StructuralReference, ReadingFocus, AccessPoint, InterpretiveWarning, ObservabilityRequirement, NonClassifiabilityRule), `bartleby`, `letture`, `assiChapter`, `catalog`, `tema`, `staticContent`, `articleRequest`, `assiAdmin`.

### 3.7 Data statici

`src/data/corso-fase{1,2,3}/modules/` — JSON moduli didattica. `src/data/theme-discovery-v1.json` — configurazione discovery temi.

### 3.8 Utils

`src/utils/constants.ts` — `API_URL` da `VITE_API_URL`, `APP_NAME`, `APP_NAME_LABEL`.

## 4. Local worker (`local/`)

Runtime `tsx` (watch in dev). Scopo: ponte verso Cowork CLI (locale, vincolo strutturale) e seed/repair su DB. Vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md).

Scripts:

| Script | Cosa fa |
|--------|---------|
| `seed:test-ricerca` | Seed di una ricerca F2 di test |
| `backfill:outputs` | Backfill output di step già eseguiti |
| `inherit:f2-steps` | Propaga step F2 a temi figli |
| `test:assi-rebuild` | Trigger rebuild assi |

## 5. Servizi esterni

| Servizio | Uso | Variabili env |
|----------|-----|---------------|
| **MongoDB Atlas** (cluster `cluster0.y3qtgdm.mongodb.net`) | DB `hcaire_db` | `MONGODB_PASSWORD`, `MONGODB_URL` |
| **Clerk** | Auth + ruoli (`publicMetadata.role='admin'`) | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` |
| **Redis Cloud** | Pub/sub per pipeline, assi, letture, bartleby | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| **Cloudflare R2** | Storage immagini autori/libri | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL` |
| **Lemon Squeezy** | Abbonamenti + webhook HMAC | `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, `LEMONSQUEEZY_VARIANT_ABBONATO`, `LEMONSQUEEZY_VARIANT_BARTLEBY`, `LEMONSQUEEZY_VARIANT_BARTLEBY_PLUS` |
| **Telegram** | Bot listener trace articoli + comandi `genera` | `TELEGRAM_TOKEN`, `TELEGRAM_ID` |
| **Cowork CLI** | Generazione/pubblicazione articoli e step pesanti (locale) | `COWORK_API_KEY`, `COWORK_PROJECT_PATH`, `COWORK_FILE_ARTICOLO` |
| **Cloudflare Pages** (FE) | Hosting client via Wrangler | — |
| **Railway** (BE) | Hosting server Express | — |

## 6. Variabili d'ambiente (server)

```
NODE_ENV=development
PORT=3018
CORS_ORIGIN=http://localhost:5173
CONTENT_BASE_PATH=<path-fuori-repo-per-fallback-markdown>

MONGODB_PASSWORD=...
MONGODB_URL=mongodb+srv://stfnbssl_db_user:{password}@cluster0.y3qtgdm.mongodb.net/?appName=Cluster0

CLERK_SECRET_KEY=...
CLERK_PUBLISHABLE_KEY=...

REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...

R2_ACCOUNT_ID=...
R2_BUCKET=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=...

LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_VARIANT_ABBONATO=...
LEMONSQUEEZY_VARIANT_BARTLEBY=...
LEMONSQUEEZY_VARIANT_BARTLEBY_PLUS=...

TELEGRAM_TOKEN=...
TELEGRAM_ID=...

COWORK_API_KEY=...
COWORK_PROJECT_PATH=...
COWORK_FILE_ARTICOLO=...

JWT_SECRET=...                          # legacy, deprecato
PIPELINE_DEFAULT_TIMEOUT_MS=600000      # opzionale
PIPELINE_WATCHDOG_INTERVAL_MS=600000    # opzionale
```

## 7. Variabili d'ambiente (client)

```
VITE_API_URL=http://localhost:3018/api
VITE_APP_NAME=HCAIRE
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## 8. Versioni e tooling

- Node ≥ 18 (testato Node 24, npm 11)
- TypeScript ~5.6 lato docs, server stack
- Build server: `tsc` → `dist/`
- Build client: `vite build` (deploy via `wrangler deploy`)

## 9. Stato note

- **JWT legacy** (`server/src/middleware/auth.ts`, `routes/auth.ts`) è dead code. Candidato alla rimozione.
- **`CLAUDE.md` di `hcaire`** può andare stale: prevale lo stato del codice descritto qui.
- **Bartleby** è ora in scope (era escluso nella vecchia documentazione).
