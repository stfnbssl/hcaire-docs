---
title: Admin CMS
sidebar_position: 6
---

# Modulo Admin CMS

Scheda funzionale dell'**area amministrativa** sotto `/admin/*`. Tutte le pagine sono gated da `<AdminRoute>` lato FE e `requireAdmin` lato BE. Per la primitiva di gating vedi [Autenticazione](./autenticazione.md).

## 1. Scopo

Centralizzare in un layout unico (`<AdminLayout>`) tutte le operazioni admin: gestione contenuti, configurazione sito, testi editabili, richieste articolo, workflow log, letture critiche, capitoli degli assi, catalogo bibliografico, job orchestration, archivio temi, servizi.

## 2. Pagine

| Path | Componente | Cosa fa |
|------|------------|---------|
| `/admin` | `AdminDashboard` | CRUD articoli blog + import Cowork |
| `/admin/workflow` | `WorkflowLog` | Log eventi workflow (article + Bartleby + pipeline) |
| `/admin/requests` | `AdminRequests` | Tracce articoli Telegram (`ArticleRequest`) |
| `/admin/site-config` | `AdminSiteConfig` | Toggle test/production, maintenance mode |
| `/admin/testi` | `AdminSiteContent` | Editor `SiteContent` slug-based (footer, disclaimer, sezioni narrative) |
| `/admin/servizi` | `AdminServices` | Dashboard servizi backend (health, stats) |
| `/admin/letture[/nuova\|/:slug]` | `AdminLetture*` | CRUD opere + run step pipeline |
| `/admin/assi` | `AdminAssi` | Gestione assi strutturali (metadati) |
| `/admin/assi/rebuild` | `AdminAssiRebuild` | Trigger rebuild assi da archivio FS |
| `/admin/assi/capitoli` | `AdminAssiChapters` | Lista capitoli con filtri per asse |
| `/admin/assi/capitoli/:axisSlug/:slug` | `AdminAssiChapterEdit` | Editor capitolo (body, references, footnotes, sections) |
| `/admin/catalogo` | `AdminCatalogo` | CRUD autori/libri + upload immagini R2 |
| `/admin/skills` | `AdminSkills` | CRUD `Skill` (legacy non-Bartleby) |
| `/admin/plugins` | `AdminPlugins` | CRUD `Plugin` di orchestrazione |
| `/admin/job-definitions` | `AdminJobDefinitions` | CRUD definizioni di job |
| `/admin/jobs` | `AdminJobs` | CRUD richieste di job |

Tutte lazy-loaded in `App.tsx` (vedi [Frontend](../10-architecture/frontend.md)).

Anche `/archivio/temi*` è di fatto admin (gated): vedi [Archivio Temi](./archivio-temi.md).

## 3. AdminDashboard (`/admin`)

Tabella articoli blog con CRUD completo.

### Componenti

- Tabella MUI con colonne: Titolo, Slug, Categoria, Accesso (chip Free/Plus), Stato (chip Pubblicato/Bozza), Data, Azioni.
- Azioni per riga: Visualizza (`/blog/:slug`), Modifica, Elimina (con dialog conferma).
- Bottoni in alto: "Carica articolo" (import Cowork), "+ Nuovo articolo".
- Dialog `ContentForm` per crea/modifica: slug, titolo, descrizione, contenuto markdown (10 righe), categoria, tags (CSV), autore, `isPublished`, `accessType`.

### Import Cowork

Cowork produce articoli come cartella con due file:

```
cartella-articolo/
├── articolo.md          # corpo markdown
└── metadata.json        # { slug, titolo, descrizione, categoria, tags }
```

Click "Carica articolo" → `window.showDirectoryPicker()` (File System Access API). L'app legge i due file e apre il form precompilato con `isPublished: false` (parte come bozza).

**Fallback Firefox** (no FSA): due `<input type="file">` in sequenza per `articolo.md` e `metadata.json`.

Pattern fully automatic alternativo: Cowork chiama `POST /api/contents/import` con `COWORK_API_KEY`. Vedi [Modulo Contenuti](./contenuti.md) e [Integrazione Telegram + Cowork](./integrazione-telegram-cowork.md).

### Endpoint usati

- `GET /api/admin/contents` (lista, anche bozze)
- `POST /api/contents` (crea, admin)
- `PUT /api/contents/:id` (aggiorna, admin)
- `DELETE /api/contents/:id` (elimina, admin)

## 4. WorkflowLog (`/admin/workflow`)

Visualizza il log degli eventi di tutti i workflow di generazione contenuti.

### Modello `WorkflowLog`

```ts
{
  workflow_type:    'article' | 'bartleby' | 'pipeline' | 'letture';
  resourceId:       ObjectId | string;   // articleRequestId, traceId, executionId
  testoPreview:     string;              // primi N char
  step:             string;              // es. 'redis_published', 'coworker_started', 'article_published'
  actor:            string;              // 'server' | 'local' | 'worker' | 'webhook'
  message:          string;
  status:           'pending'|'processing'|'done'|'error';
  createdAt:        Date;
}
```

Indici per `resourceId`, `(workflow_type, createdAt desc)`, `createdAt desc`.

Endpoint: `GET /api/article-requests/logs` (admin) per il log articoli; query simili per altri tipi.

## 5. AdminRequests (`/admin/requests`)

Tabella delle `ArticleRequest`: tracce dal bot Telegram in attesa di Cowork.

Endpoint:

- `GET /api/article-requests` (admin) — lista
- `POST /api/article-requests/:id/log` (API key) — usato dal worker per log

Vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md) e [Integrazione Telegram + Cowork](./integrazione-telegram-cowork.md).

## 6. AdminSiteConfig (`/admin/site-config`)

Toggle `status: 'test' | 'production'` + `maintenanceMode`.

- **`test`** (default): paywall come banner ma contenuto sempre leggibile, sezioni `Abbonamento` su `/account` nascoste, CTA "Abbonati" nascosti.
- **`production`**: paywall pieno, tutti i CTA Lemon Squeezy attivi.
- **`maintenanceMode`**: banner globale + eventuale lock dei verticali.

Schema `SiteConfig`:

```ts
{
  status: 'test' | 'production';
  siteTitle: string;
  siteUrl: string;
  maintenanceMode: boolean;
  updatedBy: string;   // clerkUserId
  createdAt, updatedAt
}
```

Collection: `site_config` (singleton).

Endpoint:

- `GET /api/site-config` (pubblico, letto al boot da `SiteConfigProvider`)
- `PUT /api/site-config` (admin)

## 7. AdminSiteContent (`/admin/testi`)

Editor delle pagine slug-based `SiteContent` (footer, disclaimer, cookies, intro sezioni narrative).

Schema:

```ts
{
  slug: string;        // unique
  title: string;
  body: string;        // markdown
  namespace?: string;  // es. 'footer', 'disclaimer', 'metodo', 'hcaire'
  updatedBy: string;
  createdAt, updatedAt
}
```

Endpoint pubblico vs admin:

- `GET /api/site-content` (pubblico, paginato + filtri)
- `GET /api/admin/site-content` (admin, lista completa)
- `POST /api/admin/site-content` (crea)
- `PUT /api/admin/site-content/:slug` (aggiorna)
- `DELETE /api/admin/site-content/:slug` (rimuove)

Vedi anche [Modulo SiteConfig + SiteContent](./site-config-content.md).

## 8. AdminServices (`/admin/servizi`)

Dashboard di salute dei servizi backend: stato connessione DB, Redis, Telegram bot, ultimo evento workflow, conteggi rapidi (articoli, traces, execution pipeline aperte). Utilizzo: monitoraggio operativo.

## 9. AdminLetture (`/admin/letture[/...]`)

Vedi [Modulo Letture critiche](./letture.md). Include:

- Lista opere (`/admin/letture`)
- Form nuova opera (`/admin/letture/nuova`)
- Editor opera con pipeline step (`/admin/letture/:slug`): per ogni step, bottoni run/cancel/reset + log streaming.

## 10. AdminAssi* (`/admin/assi[/...]`)

Vedi [Modulo Assi strutturali](./assi-strutturali.md). Include:

- `AdminAssi` — metadati per asse
- `AdminAssiRebuild` — trigger rebuild dell'archivio FS in MongoDB
- `AdminAssiChapters` — lista capitoli con filtri (axis, status)
- `AdminAssiChapterEdit` — editor capitolo (body markdown, references[], footnotes[], sections[]) con preview e validazione `{{ref:rN}}`

## 11. AdminCatalogo (`/admin/catalogo`)

Vedi [Modulo Catalogo](./catalogo.md). CRUD autori/libri con:

- Upload immagine (autori) / cover (libri) su Cloudflare R2 via multer.
- Validazione mime/size lato server.
- Cache-busting URL pubblico.

## 12. AdminSkills / Plugins / JobDefinitions / Jobs

Vedi [Jobs, Skills, Plugins](./jobs-skills-plugins.md).

- `AdminSkills` — CRUD `Skill` (legacy, non Bartleby).
- `AdminPlugins` — CRUD `Plugin`.
- `AdminJobDefinitions` — CRUD `JobDefinition` (`research`/`write`/`research-and-write`).
- `AdminJobs` — CRUD `JobRequest` con stato e risultato.

## 13. Flussi cross-modulo

### 13.1 Import Cowork via dashboard

```
Admin click "Carica articolo"
  ↓ showDirectoryPicker() o fallback double input
  ↓ leggi articolo.md + metadata.json
  ↓ openCreateWithData({ ...meta, contenuto, isPublished: false })
  ↓ ContentForm precompilato → revisiona → Salva
  ↓ POST /api/contents (Clerk admin)
```

### 13.2 Spegnere il paywall in modalità test

```
Admin → /admin/site-config → toggle 'test' → Salva
  ↓ PUT /api/site-config
SiteConfigProvider non aggiorna real-time: serve refresh manuale
  ↓ a reload: paywall sobrio + corpo leggibile, CTA "Abbonati" nascosti
```

## 14. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `routes/content.ts` + `controllers/contentController.ts` | CRUD articoli |
| `routes/articleRequests.ts` + `controllers/articleRequestController.ts` | Article requests + logs |
| `routes/siteConfig.ts` + `controllers/siteConfigController.ts` | GET/PUT singleton |
| `routes/siteContent.ts` + `controllers/siteContentController.ts` | Public + admin CRUD |
| `routes/letture.ts` + `controllers/lettureController.ts` | CRUD opere + step run |
| `routes/assi.ts`, `assiChapters.ts` + service | Capitoli assi |
| `routes/catalogAuthors.ts`, `catalogBooks.ts` + `catalogService` | Catalogo + R2 |
| `routes/{skills,plugins,jobDefinitions,jobRequests}.ts` + controllers | Job orchestration |
| Modelli: `SiteConfig`, `SiteContent`, `ArticleRequest`, `WorkflowLog`, `AssiChapter`, `Author`, `Book`, `Skill`, `Plugin`, `JobDefinition`, `JobRequest` | |

### Frontend

| File | Ruolo |
|------|-------|
| `components/AdminLayout.tsx` | Layout pagine admin |
| `pages/Admin*.tsx` (15+ pagine) | Tutte le pagine admin |
| `components/admin/{CatalogPicker, QuickCreateCatalogItem, ChapterRefsPanel}.tsx` | Componenti riutilizzati |

## 15. Criticità note

- **Refresh manuale dopo `site-config`**: per vedere il toggle applicato serve ricaricare. Migliorabile esponendo `refresh()` del context.
- **Workflow log non filtrabile**: tabella piatta, debug a vista.
- **Niente bulk action** su articoli/capitoli.
- **`requireAdmin` chatty**: chiamata Clerk per ogni request admin (vedi [Autenticazione](./autenticazione.md)).
- **Import Cowork richiede Chromium**: Firefox usa il fallback meno fluido.

## 16. Test

Nessun test automatico dedicato. Verifiche manuali:

- Navigare a `/admin/*` come non-admin → messaggio "Accesso riservato".
- Toggle `test/production` → ricaricare → banner paywall cambia.
- Editor `SiteContent`: modifica una slug → reload → stringa aggiornata.
- Import articolo Cowork sia con FSA (Chrome) sia con fallback (Firefox).
- Rebuild assi: trigger da `/admin/assi/rebuild` e verifica `assiRebuildExecutions`.
