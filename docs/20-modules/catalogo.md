---
title: Catalogo (autori e libri)
sidebar_position: 14
---

# Modulo Catalogo

Scheda funzionale del **catalogo bibliografico** (autori e libri). Source-of-truth degli oggetti referenziabili da `references[]` dei capitoli assi e da altri contenuti. Le immagini (foto autori, cover libri) sono su **Cloudflare R2**.

## 1. Scopo

- Gestire un'anagrafica autori (id, nome, anni di nascita/morte, immagine, rilevanza markdown).
- Gestire un'anagrafica libri (id, titolo, titolo originale, anno, cover, authorIds[], rilevanza markdown).
- Esporre lettura pubblica per la pagina `/assi-strutturali/bibliografia` e per i `references` dei capitoli.
- Permettere all'admin upload/replace/delete delle immagini su R2 con cache-busting.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Admin CRUD | `/admin/catalogo` | `GET/POST/PATCH/DELETE /api/admin/catalog/{authors,books}` |
| Bibliografia pubblica | `/assi-strutturali/bibliografia` | `GET /api/admin/catalog/{authors,books}` (read pubblico) |
| Picker dentro editor capitolo | (dentro `AdminAssiChapterEdit`) | come admin CRUD |

## 3. Modello dati

### `Author`

```ts
{
  id: string;             // slug, unique
  nome: string;
  birthYear?: number;
  deathYear?: number;
  image?: string;         // URL pubblica R2 (con cache-bust ?v=N)
  rilevanza: string;      // markdown
  createdAt, updatedAt
}
```

Collection: `authors`. Index unique su `id`.

### `Book`

```ts
{
  id: string;             // slug, unique
  titolo: string;
  titoloOriginale?: string;
  anno?: number;
  cover?: string;         // URL R2
  authorIds: string[];    // riferimenti Author.id
  rilevanza: string;      // markdown
  createdAt, updatedAt
}
```

Collection: `books`. Index unique su `id`.

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/Author.ts`, `Book.ts` | Schemi |
| `server/src/routes/catalogAuthors.ts`, `catalogBooks.ts` | Route mounted su `/api/admin/catalog/{authors,books}` (read pubblico + admin CRUD) |
| `server/src/services/catalogService.ts` | Slugify, validate (mime/size), uploadImage→R2, deleteImage→R2 |
| `server/src/services/r2.ts` | Client S3 Cloudflare R2 |
| `server/src/shared/types/assi.d.ts` | Tipi condivisi `Author`, `Book`, `CatalogMeta` |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/AdminCatalogo.tsx` (lazy) | CRUD UI |
| `pages/assi-strutturali/Bibliografia.tsx` | Bibliografia pubblica |
| `components/admin/CatalogPicker.tsx` | Picker autori/libri (usato in editor capitoli) |
| `components/admin/QuickCreateCatalogItem.tsx` | Form rapido autore/libro (dentro l'editor) |
| `services/catalogAdminService.ts` | Wrapper fetch + upload multipart |
| `types/catalog.ts` | Tipi |

## 5. Endpoint

### Autori

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET` | `/api/admin/catalog/authors` | public (read) | Lista autori |
| `GET` | `/api/admin/catalog/authors/:id` | public | Dettaglio |
| `POST` | `/api/admin/catalog/authors` | admin (multipart) | Crea autore + opzionale image upload |
| `PATCH` | `/api/admin/catalog/authors/:id` | admin (multipart) | Aggiorna + opzionale image replace |
| `DELETE` | `/api/admin/catalog/authors/:id` | admin | Elimina autore + delete image R2 |

### Libri

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET` | `/api/admin/catalog/books` | public | Lista libri |
| `GET` | `/api/admin/catalog/books/:id` | public | Dettaglio |
| `POST` | `/api/admin/catalog/books` | admin (multipart) | Crea libro + opzionale cover upload |
| `PATCH` | `/api/admin/catalog/books/:id` | admin (multipart) | Aggiorna + opzionale cover replace |
| `DELETE` | `/api/admin/catalog/books/:id` | admin | Elimina libro + delete cover R2 |

Note:

- Le rotte sono sotto `/admin/catalog/*` ma il GET è aperto per consentire alla bibliografia pubblica e ai capitoli pubblici di risolvere i riferimenti.
- Le POST/PATCH usano `multipart/form-data` per accettare l'eventuale file immagine via `multer`.

## 6. Upload immagini su R2

`catalogService.uploadImage(file, kind, id)`:

1. Valida `file.mimetype` (whitelist: jpg/png/webp).
2. Valida `file.size` (max 5 MB).
3. Calcola nome chiave R2: `<kind>/<id>.<ext>` (es. `authors/freud.webp`).
4. Upload via S3 client (`PutObjectCommand`).
5. Ritorna URL pubblica: `${R2_PUBLIC_BASE_URL}/<key>?v=<timestamp>` (cache-busting via query string).

`deleteImage(url)`:

1. Estrae la key dall'URL.
2. `DeleteObjectCommand` su R2.

L'URL salvato in Mongo include il `?v=` per evitare problemi di cache CDN dopo un replace.

## 7. Componenti UI

### `AdminCatalogo`

Layout a due tab (Autori / Libri):

- Tab Autori: tabella con immagine thumb, nome, anni, azioni (Edit, Delete). Bottone "+ Nuovo autore".
- Tab Libri: tabella con cover thumb, titolo, autori, anno, azioni. Bottone "+ Nuovo libro".

Dialog form per crea/edit con:

- Campi anagrafici.
- File input per immagine/cover con preview.
- Editor markdown `rilevanza`.
- Multi-select autori (solo per libri) via `CatalogPicker`.

### `CatalogPicker` (usato in `AdminAssiChapterEdit`)

Search + checkbox per selezionare uno o più autori / libri da inserire come `reference` di un capitolo. Espone "Crea nuovo" → `QuickCreateCatalogItem` modale.

### `Bibliografia` (pubblica)

Layout bibliografico raggruppato:

- Sezione "Autori" con lista alfabetica (foto, nome, anni, abstract di rilevanza).
- Sezione "Opere" con lista alfabetica per autore.
- Link interno: ogni autore → linka ai libri di quell'autore; ogni libro → linka ai capitoli che lo referenziano (se esposto).

## 8. Dipendenze

- **MongoDB** (`authors`, `books`).
- **Cloudflare R2** (`R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`).
- **`multer`** per upload multipart.
- **`@aws-sdk/client-s3`**.
- **`mime-types`**, **`github-slugger`**.

## 9. Test

Script di smoke: `npm run r2:test-upload` (in `server/`) — verifica connettività R2 con un upload di test.

Niente test automatici per il controller catalogo. Verifiche manuali:

- Upload immagine → URL accessibile.
- Replace immagine → vecchia eliminata, nuova accessibile, cache-bust valido.
- Delete autore → immagine R2 rimossa.
- Bibliografia pubblica: visualizzazione corretta + linking ai capitoli.

## 10. Criticità note

- **Endpoint sotto `/admin/...` ma con GET pubblico**: scelta deliberata per evitare un secondo controller di sola lettura. Verificare che il `requireAdmin` sia applicato solo ai metodi modificanti.
- **No CDN custom**: l'URL pubblico passa direttamente dal bucket R2. Aggiungere un CDN davanti per perf + caching control.
- **Cache-bust via querystring**: alcune CDN ignorano `?v=`. Per ora non è un problema (R2 endpoint accetta query string).
- **No bulk import**: ogni autore/libro va aggiunto a mano. Per import massivi servirebbe uno script.
