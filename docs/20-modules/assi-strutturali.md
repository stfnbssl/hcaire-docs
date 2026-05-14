---
title: Assi strutturali
sidebar_position: 9
---

# Modulo Assi strutturali

Scheda funzionale del verticale **Assi strutturali**: sei dimensioni costitutive dell'esperienza umana in sviluppo (~44 capitoli totali). È una **sezione principale del sito** — non più sotto-area di Sviluppo Bambino — perché tratta lo sviluppo umano in generale, di cui lo sviluppo del bambino è un dominio di applicazione (storicamente il primo, non l'unico).

## 1. Scopo

Esporre l'architettura concettuale dei sei assi strutturali e renderne accessibili i ~44 capitoli tematici come riferimento condiviso tra discipline (filosofia, psicologia, pedagogia, clinica). I capitoli vivono in **MongoDB** (collection `assi_chapters`) come source-of-truth, editabili dall'admin tramite editor dedicato. La migrazione dal vecchio archivio FS è stata completata.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/assi-strutturali` | (statica + cards) |
| Indice capitoli (vista globale) | `/assi-strutturali/capitoli` | `GET /api/assi` |
| Bibliografia | `/assi-strutturali/bibliografia` | `GET /api/admin/catalog/{authors,books}` (read pubblico) |
| Capitoli per asse | `/assi-strutturali/:asseSlug` | `GET /api/assi?axis=:asseSlug` |
| Singolo capitolo | `/assi-strutturali/:asseSlug/:chapterSlug` | `GET /api/admin/assi-chapters/:axis/:slug` (read) |

## 3. Sorgenti dati

### Sorgente primaria — MongoDB `AssiChapter`

Schema:

```ts
{
  axis_slug:        string;          // 'asse-1-ontologico-fenomenologico', ...
  axis_folder:      string;          // nome cartella legacy archivio FS
  axis_number:      1 | 2 | 3 | 4 | 5 | 6;
  slug:             string;          // slug capitolo
  chapter_number:   number;
  title:            string;
  body:             string;          // markdown con {{ref:rN}} placeholders
  references:       Array<{ id: 'rN', authorId?, bookId?, citation: string }>;
  footnotes:        Array<{ id: string, text: string }>;
  sections:         Array<{ heading: string, slug: string }>;   // estratte dal body
  prev_slug:        string | null;
  next_slug:        string | null;
  is_published:     boolean;
  source_filename:  string;          // file .md originale
  _last_imported:   Date;
  _last_edited:     Date;
  _last_edited_by:  string;          // clerkUserId
  _revision_count:  number;
  createdAt, updatedAt
}
```

Collection: `assi_chapters`. Indici: `(axis_slug, chapter_number)`, unique `(axis_slug, slug)`.

### Archivio FS (legacy / rebuild source)

L'archivio FS originale resta come **sorgente di rebuild** triggerabile dall'admin: `POST /api/admin/assi-chapters/rebuild` riprocessa i file in `$CONTENT_BASE_PATH/progetti/sviluppo bambino/assi strutturali/<axis_folder>/*.md` e li reinserisce in Mongo (con merge intelligente dei conflitti tramite `mergeRevisions.ts`).

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/AssiChapter.ts` | Schema Mongoose principale |
| `server/src/models/AsseStrutturale.ts` | Metadati per asse (label, titolo, sottotitolo, ordine) |
| `server/src/models/AssiRebuildExecution.ts` | Log delle execution di rebuild |
| `server/src/routes/assi.ts` | `/api/assi` (pubblico read) |
| `server/src/routes/assiChapters.ts` | `/api/admin/assi-chapters` (admin CRUD + export-all) |
| `server/src/services/assiChaptersService.ts` | Update body con validazione `{{ref:rN}}`, sync sections |
| `server/src/services/assiEventSubscriber.ts` | Subscriber Redis `hcaire:assi:rebuild:events` |
| `server/src/services/assiMessageBus.ts` | Bus pub/sub per rebuild |
| `server/src/scripts/migrateAssiChaptersToMongo.ts` | Migrazione iniziale FS → Mongo |
| `server/src/scripts/exportAssiChapterToMd.ts` | Export reverse (Mongo → `.md` normalized) |
| `server/src/scripts/mergeRevisions.ts` | Merge revisioni in rebuild |
| `server/src/scripts/convertAssiToJson.ts` | Conversione `.md` → JSON intermedio |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/assi-strutturali/AssiStrutturaliLanding.tsx` | Landing (hero + 6 cards asse) |
| `pages/assi-strutturali/AssiStrutturaliCapitoli.tsx` | Indice globale |
| `pages/assi-strutturali/Bibliografia.tsx` | Bibliografia dal catalogo (autori + libri) |
| `pages/assi-strutturali/AsseChapters.tsx` | Capitoli di un asse |
| `pages/assi-strutturali/Chapter.tsx` | Singolo capitolo con `StructuredChapterRenderer` + `TableOfContents` + `PrevNext` |
| `pages/AdminAssi.tsx`, `AdminAssiChapters.tsx`, `AdminAssiChapterEdit.tsx`, `AdminAssiRebuild.tsx` | Admin |
| `components/AssiStrutturaliNav.tsx` | Sotto-nav |
| `components/StructuredChapterRenderer.tsx` | Renderer markdown + `{{ref:rN}}` → references inline + footnotes section |
| `components/admin/ChapterRefsPanel.tsx` | Editor admin riferimenti capitolo |
| `services/assiAdminService.ts`, `assiChaptersAdminService.ts` | Wrapper fetch |
| `types/assiChapter.ts`, `assiAdmin.ts` | Tipi |

## 5. Endpoint

### Pubblici

| Verb | Path | Funzione |
|------|------|----------|
| `GET` | `/api/assi` | Lista capitoli pubblicati. Filtri: `axis`, `published_only` (default true). Output: lista compatta (titolo, slug, axis, chapter_number) |

### Admin

| Verb | Path | Funzione |
|------|------|----------|
| `GET` | `/api/admin/assi-chapters` | Lista filtrabile (per axis, status) |
| `GET` | `/api/admin/assi-chapters/:axis/:slug` | Dettaglio capitolo full |
| `PATCH` | `/api/admin/assi-chapters/:axis/:slug` | Update body/title/references/footnotes con validazione |
| `POST` | `/api/admin/assi-chapters` | Crea nuovo capitolo |
| `POST` | `/api/admin/assi-chapters/export-all` | Esporta tutti i capitoli a `.md` normalized (file system) |
| `POST` | `/api/admin/assi-chapters/rebuild` | Trigger rebuild da archivio FS via Redis (`hcaire:assi:rebuild:commands`) |

## 6. Pattern ricorrente per il lettore

```
GET /api/assi?axis=asse-1-ontologico-fenomenologico
  ↓ lista capitoli
GET /api/admin/assi-chapters/asse-1-.../slug-capitolo (read pubblico se published)
  ↓
StructuredChapterRenderer:
  - parsa body markdown
  - sostituisce {{ref:rN}} con anchor a references[rN]
  - estrae sections da H2/H3 per TableOfContents
  - renderizza footnotes alla fine
+ PrevNext con prev_slug/next_slug
```

## 7. I sei assi

| Slug | Titolo | Sottotitolo | N° capitoli |
|------|--------|-------------|-------------|
| `asse-1-ontologico-fenomenologico` | Ontologico–fenomenologico | Il soggetto prima di ogni funzione | 8 |
| `asse-2-affettivo-morale` | Affettivo–morale | Come l'altro diventa interiormente vincolante | 8 |
| `asse-3-normativo-educativo` | Normativo–educativo | Orientare senza imporre, giudicare senza arbitrio | 6 |
| `asse-4-separazione-limite` | Separazione e Limite | L'incontro con ciò che resiste | 8 |
| `asse-5-desiderio` | Desiderio | L'orientamento che sopravvive al limite | 7 |
| `asse-6-storico-culturale` | Storico–culturale | Il mondo come mediazione strutturale | 7 |

Totale ~44 capitoli. L'architettura è logica, non cronologica: ogni asse presuppone il precedente.

Per la sintesi vista dal punto di vista del progetto Sviluppo Bambino, esiste anche `/sviluppo-bambino/modello/:asseSlug` (`SviluppoBambinoAsseOverview`).

## 8. Bibliografia

`/assi-strutturali/bibliografia` è una pagina derivata: legge gli autori e i libri dal modulo [Catalogo](./catalogo.md) (`/api/admin/catalog/{authors,books}`, accessibili in lettura senza auth) e li mostra in formato bibliografico raggruppato. Le `references[]` dei capitoli puntano (via `authorId`/`bookId`) a queste entità.

## 9. Flusso admin: editare un capitolo

```
Admin → /admin/assi/capitoli → filtra per axis → click capitolo
  ↓ AdminAssiChapterEdit
  - modifica body markdown (con riferimenti {{ref:r1}}, {{ref:r2}}, ...)
  - aggiunge/rimuove references (ChapterRefsPanel)
  - aggiunge/rimuove footnotes
  ↓ Salva
  ↓ PATCH /api/admin/assi-chapters/:axis/:slug
  ↓ Server (assiChaptersService.updateChapter):
    - valida che ogni {{ref:rN}} abbia un'entry in references[]
    - rigenera sections[] da H2/H3 del body
    - update _last_edited, _last_edited_by, _revision_count++
  ↓ ritorna full chapter aggiornato + validation issues (se warning non-blocking)
```

## 10. Flusso admin: rebuild

```
Admin → /admin/assi/rebuild → click "Esegui rebuild"
  ↓ POST /api/admin/assi-chapters/rebuild
  ↓ insert AssiRebuildExecution { status: 'in_corso' }
  ↓ LPUSH hcaire:assi:rebuild:commands
  ↓ assiEventSubscriber consuma:
    - legge archivio FS
    - per ogni file .md: parse frontmatter + body
    - merge con capitolo esistente (mergeRevisions): se _revision_count > _last_imported, mantieni edits
    - upsert in assi_chapters
  ↓ PUBLISH hcaire:assi:rebuild:events progresso
  ↓ alla fine: update AssiRebuildExecution { status: 'completato', stats }
  ↓ FE polling vede il completamento
```

## 11. Dipendenze

- **MongoDB**: source-of-truth.
- **Redis**: bus per rebuild.
- **Catalogo** (autori/libri): bibliografia + references.
- **`CONTENT_BASE_PATH`** (opzionale): solo per rebuild, non per il runtime.
- **Componenti condivisi**: `MarkdownRenderer`, `StructuredChapterRenderer`, `Breadcrumb`, `PrevNext`, `TableOfContents`, `StubNotice`, `AgenticLabel`.

## 12. Criticità note

- **Validazione `{{ref:rN}}` solo lato server**: nell'editor FE non c'è preview live degli errori; vengono mostrati al salvataggio.
- **Merge revisioni in rebuild**: euristica basata su `_revision_count`. Su capitoli con molte modifiche manuali, un rebuild può sovrascrivere edits se l'autore dimentica di sincronizzare l'archivio FS prima.
- **Cache**: niente cache lato server. Per traffico alto valutare un layer Redis cache sui `GET /api/assi` (cambiamenti rari).
- **No full-text search**: ricerca per parola chiave non disponibile.

## 13. Test

Niente test automatici dedicati. Verifiche manuali:

- Caricamento delle 5 viste pubbliche.
- Editor capitolo: validazione `{{ref:rN}}` con references mancante → errore di salvataggio.
- Rebuild: esecuzione completa con archivio FS presente, verifica `assi_rebuild_executions`.
- Bibliografia: capitoli senza references → pagina pulita; con references → mostra autori+libri in elenco bibliografico.
