---
title: Admin CMS
sidebar_position: 6
---

# Modulo Admin CMS

Scheda funzionale dell'**area amministrativa** sotto `/admin/*`. Cinque pagine, tutte gated da `<AdminRoute>` lato FE e `requireAdmin` lato BE. Per la primitiva di gating si rimanda al modulo [Autenticazione](./autenticazione.md).

## 1. Scopo

Permettere all'admin di:

- Gestire gli articoli del blog (CRUD).
- Configurare la modalità del sito (`test` / `production`).
- Editare i testi UI internazionalizzati (overlay sui default JSON bundled).
- Vedere le richieste articolo arrivate da Telegram.
- Consultare il log di workflow degli articoli e di Bartleby.
- Importare articoli prodotti da Cowork (cartella locale → form).

## 2. Responsabilità

- Centralizzare in un unico layout (`<AdminLayout>`) le operazioni admin.
- Riutilizzare i moduli funzionali esistenti ([Contenuti](./contenuti.md), [Letture](./letture.md), ecc.) tramite endpoint dedicati `/api/admin/*` o policy `requireAdmin`.
- Gestire l'import di artefatti Cowork via File System Access API (Chrome/Edge) con fallback double-input per Firefox.

## 3. Pagine

| Path | Componente | File |
|------|------------|------|
| `/admin` | `AdminDashboard` | `pages/AdminDashboard.tsx` |
| `/admin/workflow` | `WorkflowLog` | `pages/WorkflowLog.tsx` |
| `/admin/requests` | `AdminRequests` | `pages/AdminRequests.tsx` |
| `/admin/site-config` | `AdminSiteConfig` | `pages/AdminSiteConfig.tsx` |
| `/admin/testi` | `AdminSiteContent` | `pages/AdminSiteContent.tsx` |
| `/admin/letture/*` | `AdminLetture` + figli | vedi modulo [Letture](./letture.md) |

Tutte sono import lazy in `App.tsx` (vedi [Architettura → Frontend §4](../10-architecture/frontend.md#4-lazy-loading)).

## 4. AdminDashboard (`/admin`)

Tabella articoli del CMS con CRUD completo.

### Componenti

- Tabella MUI con colonne: Titolo, Slug, Categoria, Accesso (chip Free/Plus), Stato (chip Pubblicato/Bozza), Data, Azioni.
- Azioni per riga: Visualizza (link a `/blog/:slug`), Modifica, Elimina (con dialog di conferma).
- Bottoni in alto: "Carica articolo" (import Cowork), "+ Nuovo articolo".
- Dialog `ContentForm` per crea/modifica con campi: slug (required), titolo (required), descrizione, contenuto markdown (10 righe), categoria, tags (comma-separated), autore, isPublished, accessType.

### Import Cowork

Cowork produce articoli come cartella con due file:

```
cartella-articolo/
├── articolo.md          # corpo markdown
└── metadata.json        # { slug, titolo, descrizione, categoria, tags }
```

Click "Carica articolo" → `window.showDirectoryPicker()` (File System Access API): l'admin sceglie la cartella → l'app legge i due file → apre il `ContentForm` precompilato con `isPublished: false` (parte come bozza, da revisionare prima della pubblicazione).

**Fallback Firefox** (no FSA): due `<input type="file">` nascosti chiedono in sequenza `articolo.md` → `metadata.json`. Stesso risultato.

Se `metadata.json` manca o è invalido: si apre il form con il solo `contenuto`, l'admin compila a mano.

### Endpoint usati

- `GET /api/contents/admin` (lista completa, anche bozze)
- `POST /api/contents` (crea)
- `PUT /api/contents/:id` (aggiorna)
- `DELETE /api/contents/:id` (elimina)

Vedi modulo [Contenuti](./contenuti.md) per i dettagli.

## 5. WorkflowLog (`/admin/workflow`)

Visualizza il log eventi di tutti i workflow di generazione contenuti (article + bartleby).

### Modello `WorkflowLog`

```ts
{
  workflow_type:    'article' | 'bartleby';
  articleRequestId?: ObjectId;       // article workflow
  traceId?:          string;          // bartleby workflow
  testoPreview:      string;          // primi 80 char del testo
  step:              string;          // es. 'redis_published', 'coworker_started', 'article_published'
  actor:             string;          // 'server' | 'local' | 'worker'
  message:           string;
  requestStatus:     string;          // 'pending'|'processing'|'done'|'error'
  createdAt:         Date;
}
```

Indici: `articleRequestId`, `traceId`, `(workflow_type, createdAt desc)`, `createdAt desc`.

Endpoint: `GET /api/article-requests/logs` (admin).

## 6. AdminRequests (`/admin/requests`)

Tabella delle `ArticleRequest`: tracce articolo arrivate dal bot Telegram, in attesa di essere processate da Cowork.

### Endpoint

- `GET /api/article-requests` (admin) — lista
- `POST /api/article-requests/:id/log` (api-key) — usato dal worker per appendere log

Vedi [Local — ponte Cowork §2.1](../10-architecture/local-cowork-bridge.md#21-generazione-articoli-del-blog) per il flusso.

## 7. AdminSiteConfig (`/admin/site-config`)

Singolo toggle `status: 'test' | 'production'`. Comporta:

- **`test`** (default): paywall visibile come banner ma contenuto sempre leggibile (ottimo per testare la UX paywall senza piano attivo). Sezione "Abbonamento" su `/account` nascosta. Bottoni "Abbonati" nascosti.
- **`production`**: paywall pieno. Tutti i CTA Lemon Squeezy attivi.

### Schema `SiteConfig`

```ts
{
  status: 'test' | 'production';   // default 'test'
  updatedBy: string;               // clerkUserId di chi ha modificato
  createdAt, updatedAt
}
```

Collection: `site-config`. C'è **un solo documento** per istanza app (read da `SiteConfig.findOne()`).

### Endpoint

- `GET /api/site-config` (pubblico) — letto al boot da `SiteConfigProvider`
- `PUT /api/site-config` (admin) — aggiorna lo status

## 8. AdminSiteContent (`/admin/testi`)

Editor delle stringhe UI internazionalizzate. Le stringhe vivono in due luoghi:

- **Default bundled**: `client/public/locales/{lang}/common.json`. File JSON statici nel bundle.
- **Overlay DB**: collection `site-content`, modificabile dall'admin per sovrascrivere senza redeploy.

Lookup lato FE (`SiteContentContext.t(key)`):

```
1. cerca in overrides[lang][key]
2. se assente, cerca in defaults[key]
3. fallback: stringa passata come secondo arg, o la chiave stessa
```

### Schema `SiteContent`

```ts
{
  key:          string;         // unique
  namespace:    string;         // default 'common'
  type:         'plain' | 'markdown';
  description?: string;
  translations: Map<lang, string>;   // { it: '...', en: '...' }
  updatedBy:    string;
  createdAt, updatedAt
}
```

Collection: `site-content`. Indice unico su `key`, indice su `namespace`.

### Endpoint

- `GET /api/site-content` (pubblico) — overlay per il context
- `GET /api/admin/site-content` (admin) — lista completa per editor
- `POST /api/admin/site-content` (admin) — crea key
- `PUT /api/admin/site-content/:key` (admin) — aggiorna
- `DELETE /api/admin/site-content/:key` (admin) — rimuove
- `POST /api/admin/site-content/sync` (admin) — sincronizza dai default JSON bundled (popola le key mancanti)

L'`AdminSiteContent` mostra tabella + dialog edit per riga + bottone "Sincronizza dai default".

## 9. Flussi cross-modulo

### 9.1 Importa articolo da Cowork

```
Admin click "Carica articolo"
  ↓
showDirectoryPicker() oppure fallback double input
  ↓
read articolo.md + metadata.json
  ↓
openCreateWithData({ ...meta, contenuto, isPublished: false })
  ↓
ContentForm pre-popolato → admin revisiona → Salva
  ↓
POST /api/contents (auth Clerk admin)
```

Pattern alternativo (fully automatic): Cowork stesso chiama `POST /api/contents/import` con API key — vedi [Contenuti §6.3](./contenuti.md#63-pubblicazione-automatica-cowork).

### 9.2 Spegnere il paywall in modalità test

```
Admin → /admin/site-config → toggle to 'test' → Salva
  ↓ PUT /api/site-config
SiteConfigProvider non aggiorna in real-time: serve un refresh manuale (F5) o
chiamata refresh() dal context (oggi non esposta come trigger UI globale).
  ↓
A reload: contenuti plus mostrano banner sobrio + corpo leggibile,
"Abbonati" CTA nascosti, sezione abbonamento su /account nascosta.
```

## 10. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `routes/content.ts` + `controllers/contentController.ts` | CRUD articoli (vedi [Contenuti](./contenuti.md)) |
| `routes/articleRequests.ts` + `controllers/articleRequestController.ts` | Liste richieste + logs |
| `routes/siteConfig.ts` + `controllers/siteConfigController.ts` | GET/PUT site-config |
| `routes/siteContent.ts` + `controllers/siteContentController.ts` | Public + admin CRUD testi |
| `models/SiteConfig.ts`, `SiteContent.ts`, `ArticleRequest.ts`, `WorkflowLog.ts` | Schemi |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/components/AdminLayout.tsx` | Layout pagine admin |
| `pages/AdminDashboard.tsx` | CRUD articoli |
| `pages/WorkflowLog.tsx` | Log eventi |
| `pages/AdminRequests.tsx` | Lista ArticleRequest |
| `pages/AdminSiteConfig.tsx` | Toggle test/production |
| `pages/AdminSiteContent.tsx` | Editor i18n |

## 11. Criticità note

- **Refresh manuale dopo cambio site-config**: l'admin deve ricaricare la pagina per vedere il cambio applicato globalmente. Migliorabile esponendo `refresh()` del `SiteConfigContext`.
- **Niente diff editor / preview** per il markdown su `AdminSiteContent` (solo TextField). Per stringhe `markdown` lunghe è scomodo.
- **Workflow log non filtrabile**: oggi è una tabella piatta. Per debug di un singolo articolo serve scorrere a mano.
- **Niente bulk action** sugli articoli (import multiplo, pubblicazione multipla, ecc.).
- **Import Cowork richiede browser Chromium**: Firefox usa il fallback two-step. Compatibile ma più macchinoso.

## 12. Test

Nessun test automatico. Verifiche manuali:

- Navigare a `/admin/*` come non-admin → messaggio "Accesso riservato".
- Toggle `test`/`production` ricaricando: banner paywall cambia.
- Editor site-content: modifica una key → reload → la stringa nuova appare.
- Import articolo Cowork sia con FSA (Chrome) sia col fallback (Firefox).
