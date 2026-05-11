---
title: Assi strutturali
sidebar_position: 9
---

# Modulo Assi strutturali

Scheda funzionale del verticale **Assi strutturali**: sei dimensioni costitutive dell'esperienza umana in sviluppo (44 capitoli totali). È una **sezione principale del sito** — non più sotto-area di Sviluppo Bambino — perché tratta lo sviluppo umano in generale, di cui lo sviluppo del bambino è un dominio di applicazione (storicamente il primo, non l'unico).

## 1. Scopo

Esporre l'architettura concettuale dei sei assi strutturali e renderne accessibili i 44 capitoli tematici come riferimento condiviso tra discipline (filosofia, psicologia, pedagogia, clinica). Dal **2026-05-09** il modulo ha una **rappresentazione interna ibrida**: i capitoli sono ancora redatti in markdown, ma vengono convertiti in **JSON strutturato** consumato a runtime; questo abilita interrogazione cross-capitolo dei riferimenti bibliografici (autori e libri citati) e una pagina **Bibliografia** auto-generata.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/assi-strutturali` | (statica + cards) |
| Indice capitoli (vista globale) | `/assi-strutturali/capitoli` | `GET /api/sviluppo-bambino/assi` |
| **Bibliografia (autori + libri)** | `/assi-strutturali/bibliografia` | `GET /api/sviluppo-bambino/assi/citazioni` + `/catalogo/authors` + `/catalogo/books` |
| Capitoli per asse | `/assi-strutturali/:asseSlug` | `GET /api/sviluppo-bambino/assi/:asseSlug` |
| Singolo capitolo | `/assi-strutturali/:asseSlug/:chapterSlug` | `GET /api/sviluppo-bambino/assi/:asseSlug/:chapterSlug` |

> **Nota su API path**: gli endpoint BE sono ancora esposti sotto `/api/sviluppo-bambino/assi/*`. È una conseguenza dell'archiviazione interna (i contenuti vivono in `server/content/progetti/sviluppo bambino/assi strutturali/...`): gli assi sono **nati** nel progetto Sviluppo Bambino e mantenerli lì sul filesystem è coerente con la storia editoriale. Il rename strutturale del 2026-05-07 ha riguardato il frontend (URL pubblici e nomi componenti), non il backend.

## 3. Sorgenti dati: pipeline a tre livelli

Dal 2026-05-09 i contenuti vivono in **tre forme parallele** sotto `$CONTENT_BASE_PATH/progetti/sviluppo bambino/`:

```
assi strutturali/
├── normalized/                          ← (1) sorgente editoriale
│   ├── Asse 1 - Ontologico - fenomenologico/
│   │   ├── Capitolo 1 - ....md
│   │   └── ...
│   └── ...                              (5 cartelle, 44 .md totali)
│
├── json/                                ← (2) derivato runtime, generato via script
│   ├── Asse 1 - Ontologico - fenomenologico/
│   │   ├── Capitolo 1 - ....json        (ChapterDocument: body+references+footnotes)
│   │   └── ...
│   └── ...
│
catalogo/                                ← (3) derivato dal catalogo rilevanza
├── authors.json                         (AuthorsFile: 46 autori)
└── books.json                           (BooksFile: 67 libri)
```

**Direzione del flusso editoriale (per ora)**:
1. Si edita il `.md` sotto `normalized/` (è ancora la sorgente di verità)
2. `npm run assi:convert -- --write` rigenera i `.json` in `json/`
3. `npm run catalogo:build` rigenera `catalogo/` da `client/public/data/sviluppo-bambino-rilevanza-giorno-1.json`
4. Il backend serve direttamente dai JSON; il `.md` non viene parsato a runtime

> **Nota transitoria**: il file `client/public/data/sviluppo-bambino-rilevanza-giorno-1.json` è ancora la sorgente del catalogo. La direzione si invertirà quando ci sarà un editor admin o una migrazione su MongoDB: i nuovi `authors.json`/`books.json` diventeranno autoritativi e il rilevanza JSON verrà rimosso. Vedi [pipeline editoriale](./assi-strutturali-pipeline.md).

## 4. Schema dati (tipi condivisi server/client)

Tipi condivisi tra server e client:

```ts
// Catalogo
interface Author {
  id: string;            // slug, es. "maurice-merleau-ponty"
  nome: string;          // "Maurice Merleau-Ponty"
  image: string;         // "/assets/autori/maurice-merleau-ponty.jpg"
  rilevanza: string;     // testo lungo sulla rilevanza nel progetto
  birthYear?: number; deathYear?: number;
}

interface Book {
  id: string;            // "merleau-ponty-fenomenologia-della-percezione"
  titolo: string;        // "Fenomenologia della percezione"
  cover: string;         // path immagine copertina
  rilevanza: string;
  authorIds?: string[]; anno?: number; titoloOriginale?: string;
}

// Capitolo
interface Reference {
  id: string;            // "r1", "r2" — ordine di apparizione
  footnoteId: string;    // "fn-1"
  authorIds: string[];   // 0..N autori citati
  bookIds: string[];     // 0..N libri citati
}

interface Footnote {
  id: string;            // "fn-1"
  num: string;           // "1" — numero originale del marker [^N]
  text: string;          // markdown della nota
}

interface ChapterDocument {
  frontmatter: ChapterFrontmatter;
  /** markdown del capitolo con token {{ref:rN}} al posto di [^N]<img>... */
  body: string;
  references: Reference[];
  footnotes: Footnote[];
  _meta?: { generatedAt: string; sourceFile: string };
}

// Indice citazioni (aggregato)
interface CitationsIndex {
  authors: Record<string, ChapterRef[]>;  // id autore → capitoli che lo citano
  books: Record<string, ChapterRef[]>;
  _meta: { generatedAt: string; totalChapters: number };
}
```

**Esempio body convertito** (estratto Asse 5 Cap 2):

```markdown
... non arbitrario{{ref:r1}}.

Nel *Simposio{{ref:r2}}* e nel *Fedro*, l'érōs è definito come mancanza...
```

con `references[0] = { id: "r1", footnoteId: "fn-1", authorIds: ["alasdair-macintyre"], bookIds: ["macintyre-dopo-la-virtu"] }` e relative `footnotes[]`.

## 5. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/sviluppoBambino.ts` | Route `/assi`, `/assi/citazioni`, `/assi/:asseSlug`, `/assi/:asseSlug/:chapterSlug`, `/catalogo/authors`, `/catalogo/books` (mounted su `/api/sviluppo-bambino`) |
| `server/src/controllers/sviluppoBambinoController.ts` | `getAssiIndex`, `getAsseChapters`, `getChapter` (legge dai `.json`, non più dal `.md`), `getCitations`, `getCatalogoAuthors`, `getCatalogoBooks` |
| `server/src/services/staticContentReader.ts` | `readChaptersInDir` — usato ancora da `getAssiIndex`/`getAsseChapters` per l'INDICE (dai `.md`); il singolo capitolo è servito dai JSON |
| `server/src/scripts/*` | Pipeline editoriale: vedi [pagina dedicata](./assi-strutturali-pipeline.md) |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/assi-strutturali/AssiStrutturaliLanding.tsx` | Landing `/assi-strutturali` — hero, intro, 6 cards asse |
| `pages/assi-strutturali/AssiStrutturaliCapitoli.tsx` | Indice globale `/assi-strutturali/capitoli` |
| `pages/assi-strutturali/AsseChapters.tsx` | Capitoli di un asse specifico |
| `pages/assi-strutturali/Chapter.tsx` | Singolo capitolo: fetch parallelo (chapter + autori + libri + citazioni) |
| `pages/assi-strutturali/Bibliografia.tsx` | **Nuova** pagina `/assi-strutturali/bibliografia`: tab autori/libri, filtro testuale, sort frequenza/alfabetico, drawer di dettaglio con rilevanza + capitoli citanti |
| `components/StructuredChapterRenderer.tsx` | **Nuovo** renderer del capitolo: passa il `body` a `react-markdown` + `rehype-raw`, intercetta i token `{{ref:rN}}` (resi come `<span data-ref>`) e li sostituisce con un `ReferenceMarker` (img portrait + cover + superscript con il numero originale). Sezione "Note" in fondo. Pannello rilevanza con sezione "altri capitoli che lo citano" se `citations` è disponibile |
| `components/MarkdownRenderer.tsx` | Renderer **generico** semplificato: niente più gestione rilevanza inline, resta per le altre 20+ pagine del sito (`BlogPost`, `About`, `hcaire`, narrativa SB, bartleby, ecc.) |
| `components/AssiStrutturaliNav.tsx` | Sotto-nav (Panoramica · Capitoli · Bibliografia) |

## 6. Pattern ricorrente

### Singolo capitolo

```
useEffect → fetch parallelo:
  GET /api/sviluppo-bambino/assi/:asseSlug/:chapterSlug   → ChapterDocument
  GET /api/sviluppo-bambino/catalogo/authors              → AuthorsFile
  GET /api/sviluppo-bambino/catalogo/books                → BooksFile
  GET /api/sviluppo-bambino/assi/citazioni                → CitationsIndex
  ↓
loading | error | data
  ↓
<StructuredChapterRenderer doc authors books citations />
+ <PrevNext>
```

Il `ChapterPage` mostra anche la chrome (breadcrumb, header con titolo, link "tutti i capitoli di `{asse}`") e, in fondo, `<TableOfContents>` laterale.

### Bibliografia

Stesso fetch parallelo (autori + libri + citazioni). La pagina cross-referenzia: per ogni voce del catalogo, il `CitationsIndex` dice quanti capitoli la citano e dove. Il drawer di dettaglio mostra la `rilevanza` + l'elenco capitoli linkato.

## 7. Bibliografia e citazioni

Endpoint chiave: `GET /api/sviluppo-bambino/assi/citazioni`. Aggrega in tempo (deterministico, niente caching) leggendo tutti i 44 file JSON e collezionando per ogni `Reference.authorIds`/`bookIds` il riferimento sintetico al capitolo. Output:

```json
{
  "authors": {
    "maurice-merleau-ponty": [ {asseSlug, asseTitle, asseNumber, chapterSlug, chapterTitle, chapterNumber}, ... ],
    ...
  },
  "books": { ... },
  "_meta": { "generatedAt": "...", "totalChapters": 44 }
}
```

Numeri attuali (post-migrazione): **34 autori distinti** citati e **42 libri distinti** su 44 capitoli, top 5 autori per frequenza: Merleau-Ponty 23, Charles Taylor 7, Husserl 5, Arendt 5, Gadamer 4.

Il pannello rilevanza dei capitoli usa lo stesso indice per mostrare "altri capitoli che lo citano" (escluso il corrente) come lista di link.

## 8. I sei assi

| Slug | Titolo | Sottotitolo | N° capitoli |
|---|---|---|---|
| `asse-1-ontologico-fenomenologico` | Ontologico–fenomenologico | Il soggetto prima di ogni funzione | 8 |
| `asse-2-affettivo-morale` | Affettivo–morale | Come l'altro diventa interiormente vincolante | 8 |
| `asse-3-normativo-educativo` | Normativo–educativo | Orientare senza imporre, giudicare senza arbitrio | 6 |
| `asse-4-separazione-limite` | Separazione e Limite | L'incontro con ciò che resiste | 8 |
| `asse-5-desiderio` | Desiderio | L'orientamento che sopravvive al limite | 7 |
| `asse-6-storico-culturale` | Storico–culturale | Il mondo come mediazione strutturale | 7 |

Totale: 44 capitoli (oltre 327 mila caratteri di elaborazione teorica).

L'architettura è **logica, non cronologica**: ogni asse presuppone il precedente. Per la sintesi del singolo asse vista dal punto di vista del progetto Sviluppo Bambino, esiste anche `/sviluppo-bambino/modello/:asseSlug` (gestita da `SviluppoBambinoAsseOverview` — vedi [narrativa SB §6.1](./sviluppo-bambino/narrativa.md#61-modello--sintesi-degli-assi)).

## 9. Storia

- **Pre-2026-05-07**: la sezione viveva come sotto-area di Sviluppo Bambino, sotto `pages/sviluppo-bambino/SviluppoBambinoAssi*.tsx`. URL pubblico già `/assi-strutturali/*`.
- **2026-05-07** (rename strutturale): elevata a sezione principale. I 4 file frontend spostati in `pages/assi-strutturali/` con `git mv` (storia git preservata) e rinominati senza prefisso `SviluppoBambino`. Aggiunta in landing una frase che chiarisce: lo sviluppo del bambino resta il caso d'uso più articolato, ma la portata degli assi riguarda l'intero sviluppo umano.
- **2026-05-07** (cleanup): rimossi i redirect legacy `/sviluppo-bambino/assi/*` → `/assi-strutturali/*`. Il sito è in fase iniziale, niente bookmark esterni da preservare.
- **2026-05-09** (migrazione JSON ibrido): i `<img class="ref-portrait|ref-cover">` inline nei `.md` (verbosi, illeggibili da editare, impossibili da interrogare) sono stati estratti in `references[]` strutturate dentro un `ChapterDocument` JSON, con il body markdown che usa token `{{ref:rN}}` come placeholder. Aggiunti 6 script ts-node per pipeline editoriale (vedi [pipeline](./assi-strutturali-pipeline.md)). Endpoint server riallineato: `/assi/:asseSlug/:chapterSlug` ora restituisce `ChapterDocument` invece di `{frontmatter, content, isEmpty}`. Nuovi endpoint `/assi/citazioni`, `/catalogo/authors`, `/catalogo/books`. Nuovo `StructuredChapterRenderer` (rimpiazza l'uso di `MarkdownRenderer` per i capitoli; quest'ultimo continua a vivere per le 20+ altre pagine). Nuova pagina **Bibliografia** con tab autori/libri, filtro, sort, drawer di dettaglio. Pannello rilevanza dei capitoli ora include "altri capitoli che lo citano". Catalogo cresciuto a 46 autori + 67 libri (aggiunte voci Spinoza, Hegel + 4 libri durante il primo lotto di revisioni Google Docs).

## 10. Dipendenze

- **`CONTENT_BASE_PATH`**: vincolo strutturale (vedi [Inventario §7](../00-overview/inventario.md)).
- **Componenti condivisi**: `MarkdownRenderer` (per il body delle note dentro `StructuredChapterRenderer`), `Breadcrumb`, `PrevNext`, `TableOfContents`, `StubNotice`, `AgenticLabel`, `Navigation` (top-level).
- **`AssiStrutturaliNav`**: sotto-nav dedicata, già al livello giusto in `components/`.
- **Tipi condivisi**: definiti in due copie sincronizzate (`server/src/shared/types/assi.d.ts` per il server, `client/src/shared/types/assi.d.ts` per il client). Server importa via path relativo `'../shared/types/assi'`, client via alias `'@shared/types/assi'`. La duplicazione è una scelta deliberata: server e client sono deployati su hosting separati che non vedono nessuna cartella al di fuori della propria radice.
- **`@tanstack/react-query`**: NON usato qui. Le pagine fanno `Promise.all` di fetch nativi con `useState/useEffect`, allineandosi al pattern delle altre aree narrative.

## 11. Criticità note e debiti

- **Catalogo derivato**: oggi `authors.json` e `books.json` sotto `server/content/.../catalogo/` sono **derivati** (script `catalogo:build`) dal `client/public/data/sviluppo-bambino-rilevanza-giorno-1.json`. Doppia sorgente fino all'introduzione di un editor admin o di una migrazione su MongoDB.
- **Asset placeholder**: le voci catalogo che non hanno ancora il file immagine in `/assets/autori/` o `/assets/libri/` ricevono dal builder un path senza estensione (`/assets/autori/<id>`); il browser mostra "broken image" ma il click handler funziona comunque (apre il pannello rilevanza). Resta il debito di caricare le immagini mancanti (10 autori + 2 libri al 2026-05-09; per la lista, output di `npm run catalogo:build`). Il fix è incrementale: caricare il `.jpg`, lanciare `npm run catalogo:build && npm run assi:fix-img-ext && npm run assi:convert -- --write`.
- **Slug non validato lato server**: `:asseSlug` e `:chapterSlug` cadono su 404 ma prima passano per il controller che fa join e legge dal filesystem.
- **Niente caching**: ogni richiesta `/assi/citazioni` rilegge i 44 JSON. Costo accettabile in dev/produzione attuale (44 file totalmente \<1MB), eventuale memoization in-memory facile da introdurre se cresce.
- **Niente full-text search** sul corpo dei capitoli.
- **API path disallineata dall'URL pubblico**: il backend serve da `/api/sviluppo-bambino/assi/*` mentre il frontend usa `/assi-strutturali/*`. Refactor possibile (spostare i contenuti in `server/content/assi-strutturali/`) ma non necessario per il funzionamento; il `staticContentService.ts` gestisce il mapping in modo trasparente.
- **OpenAPI non aggiornato**: `static/openapi.yaml` non documenta gli endpoint assi (né i vecchi né i nuovi). Da aggiungere quando si fa il prossimo passaggio sull'OpenAPI.
- **Grafo di citazioni**: feature derivata pianificata e poi accantonata (overhead di una libreria di viz, valore non bloccante). Riprendibile se diventa rilevante.

## 12. Test

Niente test automatici. Verifiche manuali:

- Caricamento delle 5 viste con `CONTENT_BASE_PATH` corretto e con env mancante.
- `tsc --noEmit` come verifica di non-regressione (utilizzato dopo i refactor 2026-05-07 e 2026-05-09).
- Smoke test API: `GET /api/sviluppo-bambino/assi/:asseSlug/:chapterSlug`, `/citazioni`, `/catalogo/{authors,books}` rispondono 200; il vecchio path `/structured` (transitorio in Fase 3) deve restituire 404.
