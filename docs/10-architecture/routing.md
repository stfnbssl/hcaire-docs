---
title: Routing
sidebar_position: 6
---

# Routing

Mappa completa delle rotte applicative, lato frontend e lato backend. Questa pagina è una vista *di superficie*: per la logica di ciascun dominio si rimanda alle Schede modulo (`docs/20-modules/`, in costruzione).

## 1. Convenzioni

- **Frontend**: React Router 6 con `BrowserRouter`. Tutte le route sono dichiarate in `client/src/App.tsx` dentro un singolo `<Routes>`.
- **Backend**: Express 4. Mount centralizzato in `server/src/index.ts` con prefissi `/api/...` per le rotte applicative e `/webhooks/...` per i webhook esterni.
- **Admin**:
  - FE: tutte sotto `/admin/*`, gating con `<AdminRoute>`.
  - BE: tutte sotto `/api/admin/*`, gating con `requireAdmin`.
- **Lingue**: oggi nessun prefisso lingua nelle URL. La lingua è gestita dal context `SiteContentContext` (vedi [Stato applicativo](./stato-applicativo.md)).

## 2. Rotte frontend

### Core

| Path | Componente | Note |
|------|------------|------|
| `/` | `Home` | Landing |
| `/about` | `About` | |
| `/blog/:slug` | `BlogPost` | Articolo singolo, paywall a livello articolo |
| `/pricing` | `Pricing` | |
| `/account` | `Account` | Profilo + abbonamento |
| `/progetti` | `Progetti` | |
| `*` | `NotFound` | Catch-all 404 |

### Bartleby (fuori scope B, listato per completezza)

| Path | Componente |
|------|------------|
| `/bartleby` | `BartlebyLanding` |
| `/bartleby/console` | `BartlebyHome` |
| `/bartleby/knowledge-base[/:section[/:itemId]]` | `KnowledgeBase` (lazy) |
| `/bartleby/outputs[/:id]` | `OutputList`, `OutputDetail` |

### HCAIRE

| Path | Componente |
|------|------------|
| `/hcaire` | `HcaireLanding` |
| `/hcaire/protocolli` | `HcaireProtocolliLanding` |
| `/hcaire/protocolli/:slug` | `HcaireProtocolPage` |
| `/hcaire/:section` | `HcairePage` |
| `/hcaire/ia-centrata-sull-umano` | **Redirect** → `/hcaire/manifesto` |

### Letture critiche

| Path | Componente |
|------|------------|
| `/letture` | `LettureCriticheLanding` (lazy) |
| `/letture/elenco` | `LettureLanding` (lazy) |
| `/letture/:slug` | `LetturaDetail` (lazy) |

### Sviluppo Bambino

Sotto-aree principali (vedi `App.tsx` per la lista completa):

| Path | Funzione |
|------|----------|
| `/sviluppo-bambino` | Landing |
| `/sviluppo-bambino/finalita` | |
| `/sviluppo-bambino/metodo[/...]` | Landing + introduzione, fasi, ricerca scientifica, rapporto con IA |
| `/sviluppo-bambino/concetti`, `/nota-metodologica`, `/riflessioni` | Pagine narrative |
| `/sviluppo-bambino/interlocuzioni[/discipline[/:disciplinaSlug]]` | Verticale interdisciplinare |
| `/sviluppo-bambino/produzioni` | Landing produzioni |
| `/sviluppo-bambino/produzioni/temi` | Catalogo temi candidati |
| `/sviluppo-bambino/produzioni/pipeline` | Mappa pipeline |
| `/sviluppo-bambino/produzioni/pipeline/nuova-ricerca` | Form nuova ricerca |
| `/sviluppo-bambino/produzioni/pipeline/ricerche/:ricercaId` | Overview ricerca |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId[/dispositivo\|/stress-test]` | Vista tema |
| `/sviluppo-bambino/modello[/:asseSlug]` | Modello + asse overview |
| `/sviluppo-bambino/presentazione` | Presentazione corsi (lazy) |
| `/sviluppo-bambino/fondazione-ontologica[/:moduleId[/:slideId]]` | Corso F1 (lazy) |
| `/sviluppo-bambino/traduzione-interdisciplinare[/:moduleId[/:slideId]]` | Corso F2 (lazy) |
| `/sviluppo-bambino/strumenti-operativi-contestualizzati[/:moduleId[/:slideId]]` | Corso F3 (lazy, fuori scope B) |

### Assi strutturali (sezione top-level)

| Path | Componente |
|------|------------|
| `/assi-strutturali` | `SviluppoBambinoAssiLanding` |
| `/assi-strutturali/capitoli` | `SviluppoBambinoAssi` |
| `/assi-strutturali/:asseSlug` | `SviluppoBambinoAsseChapters` |
| `/assi-strutturali/:asseSlug/:chapterSlug` | `SviluppoBambinoChapter` |

### Redirect storici da `/sviluppo-bambino/assi/*`

| Path | Destinazione |
|------|--------------|
| `/sviluppo-bambino/assi` | `/assi-strutturali` |
| `/sviluppo-bambino/assi/capitoli` | `/assi-strutturali/capitoli` |
| `/sviluppo-bambino/assi/:asseSlug` | `/assi-strutturali/:asseSlug` (via `RedirectAsseChapters`, propaga il param) |
| `/sviluppo-bambino/assi/:asseSlug/:chapterSlug` | `/assi-strutturali/:asseSlug/:chapterSlug` (via `RedirectAsseChapter`) |

### Admin (gating `<AdminRoute>`)

| Path | Componente | Lazy |
|------|------------|------|
| `/admin` | `AdminDashboard` | sì |
| `/admin/workflow` | `WorkflowLog` | sì |
| `/admin/requests` | `AdminRequests` | sì |
| `/admin/letture` | `AdminLetture` | sì |
| `/admin/letture/nuova` | `AdminLetturaNuova` | sì |
| `/admin/letture/:slug` | `AdminLetturaDetail` | sì |
| `/admin/site-config` | `AdminSiteConfig` | sì |
| `/admin/testi` | `AdminSiteContent` | sì |

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
app.use('/api/sviluppo-bambino', sviluppoBambinoRoutes)
app.use('/api/pipeline',         pipelineRoutes)
app.use('/api/letture',          lettureRoutes)
app.use('/api/admin/letture',    lettureAdminRouter)
app.use('/api/site-content',     siteContentPublicRouter)
app.use('/api/admin/site-content', siteContentAdminRouter)
app.use('/api',                  authRoutes)   // legacy, dead — vedi Autenticazione §6
```

### Vista per dominio

| Dominio | Endpoint principali | Auth |
|---------|----------------------|------|
| Health | `GET /health` | — |
| Webhooks | `POST /webhooks/lemonsqueezy` | HMAC SHA256 |
| Contenuti | `GET/POST/PUT/DELETE /api/contents`, `GET /api/contents/admin`, `POST /api/contents/import` | Public + `optionalClerkAuth` + `requireAdmin` + `authenticateApiKey` (per `/import`) |
| Navigation | `GET /api/navigation` | Public |
| Article requests | `GET/POST /api/article-requests` | Public (POST), admin (GET) |
| Subscriptions | `GET /api/subscriptions/status` | `requireAuth` |
| Site config | `GET /api/site-config`, `PUT /api/site-config` | Public (GET), admin (PUT) |
| Site content | `GET /api/site-content`, `GET/PUT /api/admin/site-content` | Public + admin |
| HCAIRE | `GET /api/hcaire/`, `/api/hcaire/:section`, `/api/hcaire/:section/:subsection` | Public |
| Sviluppo Bambino | ~22 endpoint `GET /api/sviluppo-bambino/*` | Public |
| Letture (public) | `GET /api/letture/*` | Public |
| Letture (admin) | `GET/POST/PATCH/DELETE /api/admin/letture/*`, `POST /api/admin/letture/:slug/steps/:step_id/run` | `requireAdmin` |
| Pipeline | `GET /api/pipeline/*` (più endpoint, vedi `routes/pipeline.ts`) | Mix |
| Auth (legacy) | `POST /api/login`, `POST /api/logout` | dead code |

Vedi [Mappa moduli](../00-overview/mappa-moduli.md#mappa-moduli--pagine--endpoint) per la tabella di abbinamento moduli FE ↔ endpoint BE.

## 4. Regole pratiche per nuove rotte

- **Pubbliche read-only**: niente middleware. Se serve sapere l'utente per personalizzare la response, usa `optionalClerkAuth`.
- **Pubbliche con scrittura limitata** (es. form): usa rate limiting esterno (Cloudflare) — oggi non c'è middleware Express dedicato.
- **Solo loggati**: `authenticateClerk` (= `requireAuth()`) all'inizio del router.
- **Solo admin**: monta sotto `/api/admin/*` e applica `[authenticateClerk, requireAdmin]`.
- **Webhook con firma**: monta **prima** di `express.json()` con un proprio raccoglitore di raw body.
- **Automazione esterna**: `authenticateApiKey` con `COWORK_API_KEY`.
