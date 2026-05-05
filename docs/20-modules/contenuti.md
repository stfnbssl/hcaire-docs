---
title: Contenuti (blog/CMS)
sidebar_position: 2
---

# Modulo Contenuti

Scheda funzionale del **CMS articoli del blog**: il cuore editoriale dell'app, con paywall a livello articolo e endpoint dedicato per pubblicazioni automatizzate da Cowork.

## 1. Scopo

- Pubblicare articoli markdown indicizzati per slug, accessibili da `/blog/:slug`.
- Listare gli articoli più recenti in home + paginazione.
- Discriminare contenuti **free** (sempre leggibili) da **plus** (paywall).
- Esporre un endpoint di import dedicato per la pubblicazione programmatica da parte di Cowork (vedi [Local — ponte Cowork §2.1](../10-architecture/local-cowork-bridge.md#21-generazione-articoli-del-blog)).

## 2. Responsabilità

- CRUD articoli (admin).
- Lettura paginata articoli pubblicati (pubblico).
- Paywall: in modalità `live` blocca i `plus` agli utenti non abbonati restituendo un *teaser*; in modalità `test` ritorna sempre il contenuto completo con flag `locked: true` per il banner UI.
- Logging eventi `article_published` su `WorkflowLog` quando l'articolo arriva da Cowork (pattern `articleRequestId` nel body).
- Validazione dell'unicità dello slug (vincolo Mongo `unique` + gestione del code 11000).

## 3. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/Content.ts` | Schema Mongoose, collection `hcaire-content` |
| `server/src/routes/content.ts` | 7 rotte mounted su `/api/contents` |
| `server/src/controllers/contentController.ts` | `getAllContents`, `getContentBySlug`, `getAllContentsAdmin`, `createContent`, `updateContent`, `deleteContent` |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/pages/Home.tsx` | Lista paginata articoli pubblicati |
| `client/src/pages/BlogPost.tsx` | Vista singolo articolo + banner paywall |
| `client/src/pages/AdminDashboard.tsx` | CRUD admin |
| `client/src/services/contentService.ts` | Wrapper fetch (5 metodi) |
| `client/src/hooks/useFetchContent.ts` | Hook fetch per slug + token Clerk |
| `client/src/components/MarkdownRenderer.tsx` | Rendering markdown |
| `client/src/types/content.ts` | Tipi `Content`, `ContentFormData`, `PaginatedResponse` |

## 4. Rotte

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET`  | `/api/contents` | pubblica | Lista paginata articoli pubblicati (sort: `isPinned` desc, `createdAt` desc), proietta senza il campo `contenuto` |
| `GET`  | `/api/contents/admin` | `requireAdmin` | Lista tutti gli articoli (anche bozze), full payload |
| `GET`  | `/api/contents/:slug` | `optionalClerkAuth` | Singolo articolo, applica paywall |
| `POST` | `/api/contents` | `requireAdmin` | Crea articolo |
| `POST` | `/api/contents/import` | `authenticateApiKey` (Cowork) | Crea articolo + log workflow se `articleRequestId` |
| `PUT`  | `/api/contents/:id` | `requireAdmin` | Aggiorna |
| `DELETE` | `/api/contents/:id` | `requireAdmin` | Elimina |

⚠️ Convenzione di route order: `/admin` è dichiarato **prima** di `/:slug` per evitare che Express interpreti "admin" come slug.

## 5. Componenti UI

### Lettore

- **Home (`/`)**: cards con titolo, descrizione, autore, data, categoria, tags, badge `Plus` per i `plus`. Paginazione client-side via query string.
- **BlogPost (`/blog/:slug`)**: header (categoria, data, autore, titolo, descrizione, tags) + corpo markdown.
  - Se `locked === true` e `isTestMode`: banner grigio sobrio "Per abbonati — anteprima contenuto (modalità test)" + corpo visibile.
  - Se `locked === true` e non `isTestMode`: banner ambra con CTA `/pricing` + corpo nascosto.
  - Altrimenti: solo corpo.

### Admin

- **AdminDashboard**: tabella articoli, modali di creazione/modifica con form completo (slug, titolo, descrizione, contenuto markdown, autore, categoria, tags, `isPublished`, `isPinned`, `accessType`).

## 6. Flussi

### 6.1 Lettura articolo plus

```
GET /api/contents/articolo-plus
  ↓
optionalClerkAuth → req.clerkUserId = userId | undefined
  ↓
Content.findOne(...)
  ↓
content.accessType === 'plus' ?
  ↓ sì
SiteConfig.findOne() → status === 'test' ?
  ↓ sì → ritorna contenuto + locked: true
  ↓ no
hasAccess = isAdmin(req.clerkUserId) || subscription.status ∈ {active, on_trial}
  ↓ no → ritorna teaser (contenuto: "") + locked: true
  ↓ sì → ritorna contenuto pieno
```

Nota: lato lettore, il `locked: true` in test-mode è il segnale per mostrare il banner sobrio anche se il contenuto è leggibile (utile per il proprietario per testare l'esperienza paywall senza piano attivo).

### 6.2 Creazione manuale (admin)

1. Admin apre la dashboard → modale "Nuovo articolo".
2. FE chiama `POST /api/contents` con `Authorization: Bearer <token>`.
3. BE valida (`requireAdmin`), crea il documento, ritorna 201.
4. Su slug duplicato: 400 con messaggio "Slug già esistente".

### 6.3 Pubblicazione automatica (Cowork)

1. Telegram bot accumula `ArticleRequest` con `status: 'pending'`.
2. Comando "genera e pubblica" → publish `article:new` su Redis.
3. `local/coworker.ts` spawna Cowork (Claude Code CLI) con prompt + tracce.
4. Cowork compone l'articolo e chiama `POST /api/contents/import` con header `Authorization: Bearer <COWORK_API_KEY>` e body che include `articleRequestId`.
5. `createContent` salva l'articolo e logga `article_published` su `WorkflowLog`, marcando `ArticleRequest.status: 'done'`.

Vedi anche la [scheda Subscriptions](./subscriptions.md) per il gating, e [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md) per il flusso Telegram → Cowork.

## 7. Dati

### Schema `Content`

```ts
{
  slug: string;               // unique, required
  titolo: string;             // required
  descrizione: string;        // default ''
  contenuto: string;          // markdown, default ''
  autore: string;             // default 'admin'
  categoria: string;          // default 'general'
  tags: string[];
  isPublished: boolean;       // default true
  isPinned: boolean;          // default false
  accessType: 'free' | 'plus'; // default 'free'
  createdAt, updatedAt        // timestamps automatici
}
```

Collection: `hcaire-content`. Indice unico su `slug`.

### Modalità test vs production

Letta da `SiteConfig.findOne()` ad ogni richiesta a `/api/contents/:slug` (no caching). Vedi modulo [Admin CMS — site-config](./admin-cms.md).

## 8. Dipendenze

- **`UserSubscription`**: per derivare `hasAccess` sui `plus`.
- **`SiteConfig`**: per la modalità test/production.
- **Clerk** (`checkIsAdmin`): per il bypass admin sul paywall.
- **`workflowLogger`**: per loggare l'evento `article_published` quando arriva da Cowork.
- **`react-markdown`**: rendering lato lettore (vedi [Architettura → Frontend §8](../10-architecture/frontend.md#8-markdown-rendering)).

## 9. Criticità note

- **Paywall server-side per ogni request**: ogni `GET /api/contents/:slug` plus fa fino a 3 query (`Content.findOne` + `SiteConfig.findOne` + `UserSubscription.findOne` + `checkIsAdmin` Clerk). Mitigabile con caching del `SiteConfig` (cambia raramente) e del `role` Clerk.
- **`/admin` e `/:slug` collisione**: il route order è critico. Aggiungere nuove route statiche sotto `/api/contents/...` richiede attenzione.
- **`update` non valida i campi**: `Content.findByIdAndUpdate(..., req.body, ...)` accetta qualsiasi campo. Mitigabile con `runValidators: true` (già presente) ma servirebbe un sanitization layer per impedire campi extra.
- **Nessun versionamento**: l'update sovrascrive. Per articoli importanti non c'è cronologia.
- **Rendering `rehype-raw`**: il MarkdownRenderer accetta HTML inline. Vettore XSS potenziale se i contenuti vengono editati da non-admin (oggi il rischio è basso perché solo admin/Cowork possono pubblicare).

## 10. Test

Nessun test automatico dedicato. Test manuali ricorrenti:

- Smoke: `GET /api/contents` con paginazione.
- Paywall: utente anonimo, free, plus, admin → response attese.
- Test mode: stesso articolo `plus` deve ritornare contenuto completo + `locked: true`.
- Import: `POST /api/contents/import` con API key valida/invalida.
