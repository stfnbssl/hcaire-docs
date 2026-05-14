---
title: Routing
sidebar_position: 6
---

# Routing

Mappa completa delle rotte applicative, lato frontend e lato backend. Vista *di superficie*: per la logica dei domini, vedi le schede in `docs/20-modules/`.

## 1. Convenzioni

- **Frontend**: React Router 6 con `BrowserRouter`. Tutte le route in `client/src/App.tsx` dentro un singolo `<Routes>`.
- **Backend**: Express 4. Mount centralizzato in `server/src/index.ts` con prefissi `/api/...` per le rotte applicative e `/webhooks/...` per i webhook esterni.
- **Admin**:
  - FE: tutte sotto `/admin/*`, gating con `<AdminRoute>`.
  - BE: tutte sotto `/api/admin/*`, gating con `requireAdmin`.
- **Lingue**: nessun prefisso lingua nelle URL. La lingua è gestita dal context `SiteContentContext`.

## 2. Rotte frontend

### Core pubbliche

| Path | Componente | Note |
|------|------------|------|
| `/` | `Home` | Landing |
| `/about` | `About` | |
| `/blog/:slug` | `BlogPost` | Articolo singolo, paywall a livello articolo |
| `/pricing` | `Pricing` | |
| `/account` | `Account` | Profilo + abbonamento |
| `/progetti` | `Progetti` | Landing dei progetti |
| `*` | `NotFound` | Catch-all 404 |

### HCAIRE laboratorio

| Path | Componente |
|------|------------|
| `/hcaire` | `HcaireLanding` |
| `/hcaire/protocolli` | `HcaireProtocolliLanding` |
| `/hcaire/protocolli/:slug` | `HcaireProtocolPage` |
| `/hcaire/:section` | `HcairePage` |
| `/hcaire/ia-centrata-sull-umano` | **Redirect** → `/hcaire/manifesto` |

### Metodo (sezione promossa a top-level)

| Path | Componente |
|------|------------|
| `/metodo` | `MetodoLanding` |
| `/metodo/introduzione` | `MetodoPage` |
| `/metodo/fasi` | `MetodoFasiIndex` |
| `/metodo/fasi/:faseSlug` | `MetodoFasePage` |
| `/metodo/ricerca-scientifica`, `/metodo/rapporto-con-ia` | `MetodoPage` |
| `/metodo/didattica` | `DidatticaLanding` (lazy) |
| `/metodo/didattica/fondazione-ontologica[/:moduleId[/:slideId]]` | `CorsoFase1Page` (lazy) |
| `/metodo/didattica/traduzione-interdisciplinare[/:moduleId[/:slideId]]` | `CorsoFase2Page` (lazy) |
| `/metodo/didattica/strumenti-operativi-contestualizzati[/:moduleId[/:slideId]]` | `CorsoFase3Page` (lazy) |

Redirect legacy (path SB→Metodo):

- `/sviluppo-bambino/metodo*` → `/metodo*`
- `/sviluppo-bambino/fondazione-ontologica/*` → `/metodo/didattica/fondazione-ontologica/*`
- `/sviluppo-bambino/traduzione-interdisciplinare/*` → `/metodo/didattica/traduzione-interdisciplinare/*`
- `/sviluppo-bambino/strumenti-operativi-contestualizzati/*` → `/metodo/didattica/strumenti-operativi-contestualizzati/*`
- `/sviluppo-bambino/presentazione` → `/metodo/didattica`

### Sviluppo Bambino

| Path | Funzione |
|------|----------|
| `/sviluppo-bambino` | Landing |
| `/sviluppo-bambino/finalita` | `SviluppoBambinoFinalitaLanding` |
| `/sviluppo-bambino/concetti`, `/nota-metodologica`, `/riflessioni` | `SviluppoBambinoPage` |
| `/sviluppo-bambino/interlocuzioni[/discipline[/:disciplinaSlug]]` | `SviluppoBambinoInterlocuzioniLanding` / Index / DisciplinaPage |
| `/sviluppo-bambino/modello[/:asseSlug]` | `SviluppoBambinoModello` + `AsseOverview` |
| `/sviluppo-bambino/produzioni` | `ProduzioniLanding` |
| `/sviluppo-bambino/produzioni/temi` | `ProduzioniTemiPage` |
| `/sviluppo-bambino/produzioni/pipeline` | `PipelineMap` |
| `/sviluppo-bambino/produzioni/pipeline/nuova-ricerca` | `PipelineNuovaRicerca` |
| `/sviluppo-bambino/produzioni/pipeline/ricerche/:ricercaId` | `PipelineRicercaOverview` |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId` | `PipelineDeviceOverview` |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/dispositivo` | `PipelineDeviceViewer` |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/stress-test` | `PipelineStressTest` |

### Assi strutturali (top-level)

| Path | Componente |
|------|------------|
| `/assi-strutturali` | `AssiStrutturaliLanding` |
| `/assi-strutturali/capitoli` | `AssiStrutturaliCapitoli` |
| `/assi-strutturali/bibliografia` | `BibliografiaPage` |
| `/assi-strutturali/:asseSlug` | `AsseChaptersPage` |
| `/assi-strutturali/:asseSlug/:chapterSlug` | `ChapterPage` |

### Letture critiche

| Path | Componente |
|------|------------|
| `/letture` | `LettureCriticheLanding` (lazy) |
| `/letture/elenco` | `LettureLanding` (lazy) |
| `/letture/:slug` | `LetturaDetail` (lazy) |

### Bartleby

| Path | Componente |
|------|------------|
| `/bartleby` | `BartlebyLanding` |
| `/bartleby/console` | `BartlebyHome` |
| `/bartleby/knowledge-base[/:section[/:itemId]]` | `KnowledgeBase` (lazy) |
| `/bartleby/outputs[/:id]` | `OutputList`, `OutputDetail` |

### Anthropos

| Path | Componente |
|------|------------|
| `/anthropos` | `AnthroposLanding` |

### Archivio Temi (admin)

| Path | Componente |
|------|------------|
| `/archivio/temi` | `ArchivioTemiIndexPage` (lazy) |
| `/archivio/temi/nuovo` | `ArchivioTemaFormPage` (lazy) |
| `/archivio/temi/:temaId` | `ArchivioTemaFormPage` (lazy, edit) |

### Admin (gating `<AdminRoute>`, tutte lazy)

| Path | Componente |
|------|------------|
| `/admin` | `AdminDashboard` |
| `/admin/workflow` | `WorkflowLog` |
| `/admin/requests` | `AdminRequests` |
| `/admin/letture` | `AdminLetture` |
| `/admin/letture/nuova` | `AdminLetturaNuova` |
| `/admin/letture/:slug` | `AdminLetturaDetail` |
| `/admin/site-config` | `AdminSiteConfig` |
| `/admin/testi` | `AdminSiteContent` |
| `/admin/servizi` | `AdminServices` |
| `/admin/skills` | `AdminSkills` |
| `/admin/plugins` | `AdminPlugins` |
| `/admin/job-definitions` | `AdminJobDefinitions` |
| `/admin/jobs` | `AdminJobs` |
| `/admin/assi` | `AdminAssi` |
| `/admin/assi/rebuild` | `AdminAssiRebuild` |
| `/admin/assi/capitoli` | `AdminAssiChapters` |
| `/admin/assi/capitoli/:axisSlug/:slug` | `AdminAssiChapterEdit` |
| `/admin/catalogo` | `AdminCatalogo` |

## 3. Rotte backend

Mount in `server/src/index.ts` (ordine d'esecuzione):

```ts
app.get('/health', ...)
app.use(cors(...))
app.use('/webhooks', webhookRoutes)         // PRIMA di express.json
app.use(clerkMiddleware())                  // popola sessione
app.use(express.json({ limit: '10mb' }))

app.use('/api/contents',         contentRoutes)
app.use('/api/navigation',       navRoutes)
app.use('/api/article-requests', articleRequestRoutes)
app.use('/api/subscriptions',    subscriptionRoutes)
app.use('/api/site-config',      siteConfigRoutes)
app.use('/api/bartleby',         bartlebyRoutes)
app.use('/api/hcaire',           hcaireRoutes)
app.use('/api/metodo',           metodoRoutes)
app.use('/api/sviluppo-bambino', sviluppoBambinoRoutes)
app.use('/api/pipeline',         pipelineRoutes)
app.use('/api/letture',          lettureRoutes)
app.use('/api/admin/letture',    lettureAdminRouter)
app.use('/api/site-content',     siteContentPublicRouter)
app.use('/api/admin/site-content', siteContentAdminRouter)
app.use('/api/assi',             assiRoutes)
app.use('/api/admin/assi-chapters', assiChaptersRoutes)
app.use('/api/admin/catalog/authors', catalogAuthorsRoutes)
app.use('/api/admin/catalog/books',   catalogBooksRoutes)
app.use('/api/archivio/temi',    archivioTemiRoutes)
app.use('/api/admin/skills',     skillsRoutes)
app.use('/api/admin/plugins',    pluginsRoutes)
app.use('/api/admin/job-definitions', jobDefinitionsRoutes)
app.use('/api/admin/job-requests', jobRequestsRoutes)
app.use('/api',                  authRoutes)   // legacy, dead
```

### Vista sintetica per dominio

| Dominio | Endpoint principali | Auth |
|---------|----------------------|------|
| Health | `GET /health` | — |
| Webhooks | `POST /webhooks/lemonsqueezy` | HMAC SHA256 |
| Contenuti | `GET/POST/PUT/DELETE /api/contents`, `GET /api/admin/contents`, `POST /api/contents/import` | Public + `optionalClerkAuth` + `requireAdmin` + API key (`/import`) |
| Navigation | `GET /api/navigation` + admin modifie | Public + admin |
| Article requests | `GET/POST/DELETE /api/article-requests` | Public POST, admin GET/DELETE |
| Subscriptions | `GET /api/subscriptions/status` | `requireAuth` |
| Site config | `GET/PUT /api/site-config` | Public GET, admin PUT |
| Site content | `GET /api/site-content`, `GET/PUT /api/admin/site-content` | Public + admin |
| HCAIRE | `GET /api/hcaire/*` | Public |
| Metodo | `GET /api/metodo/*` | Public |
| Sviluppo Bambino | `GET /api/sviluppo-bambino/*` (~25 endpoint) | Public |
| Letture (public) | `GET /api/letture/*` | Public |
| Letture (admin) | `GET/POST/PATCH/DELETE /api/admin/letture/*`, `POST /api/admin/letture/:slug/steps/:step_id/run` | `requireAdmin` |
| Pipeline | `GET /api/pipeline/*`, `POST /api/pipeline/executions`, `POST /api/pipeline/external-inputs`, `POST /api/pipeline/decisions` | Mix |
| Assi | `GET /api/assi`, `GET/PATCH /api/admin/assi-chapters/*`, `POST /api/admin/assi-chapters/export-all` | Public read assi; admin chapters |
| Catalogo | `GET/POST/PATCH/DELETE /api/admin/catalog/{authors,books}` | Public read; admin modifie |
| Bartleby | `GET /api/bartleby/*`, `POST /api/bartleby/{output-documents,traces}` | Public read; admin/API key write |
| Archivio Temi | `GET/POST/PATCH/DELETE /api/archivio/temi` | Public read; admin write |
| Skills / Plugins / Jobs | `GET/POST/PUT/DELETE /api/admin/{skills,plugins,job-definitions,job-requests}` | admin |
| Auth (legacy) | `POST /api/login`, `POST /api/logout` | dead code |

Vedi [Mappa moduli](../00-overview/mappa-moduli.md#mappa-moduli--pagine--endpoint) per l'abbinamento moduli ↔ endpoint.

## 4. Regole pratiche per nuove rotte

- **Pubbliche read-only**: niente middleware. Per personalizzare in base utente, usa `optionalClerkAuth`.
- **Pubbliche con scrittura limitata** (es. form): rate limiting esterno (Cloudflare). Niente middleware Express dedicato.
- **Solo loggati**: `authenticateClerk` (= `requireAuth()`).
- **Solo admin**: monta sotto `/api/admin/*` con `[authenticateClerk, requireAdmin]`.
- **Webhook con firma**: monta **prima** di `express.json()` con raccoglitore raw body.
- **Automazione esterna**: `authenticateApiKey` con `COWORK_API_KEY`.
