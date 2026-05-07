---
title: Assi strutturali
sidebar_position: 9
---

# Modulo Assi strutturali

Scheda funzionale del verticale **Assi strutturali**: sei dimensioni costitutive dell'esperienza umana in sviluppo (44 capitoli totali). È una **sezione principale del sito** — non più sotto-area di Sviluppo Bambino — perché tratta lo sviluppo umano in generale, di cui lo sviluppo del bambino è un dominio di applicazione (storicamente il primo, non l'unico).

## 1. Scopo

Esporre l'architettura concettuale dei sei assi strutturali e renderne accessibili i 44 capitoli tematici come riferimento condiviso tra discipline (filosofia, psicologia, pedagogia, clinica). Il contenuto è **markdown statico** letto dal filesystem del server tramite `staticContentReader`.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/assi-strutturali` | (statica + cards) |
| Indice capitoli (vista globale) | `/assi-strutturali/capitoli` | `GET /api/sviluppo-bambino/assi` |
| Capitoli per asse | `/assi-strutturali/:asseSlug` | `GET /api/sviluppo-bambino/assi/:asseSlug` |
| Singolo capitolo | `/assi-strutturali/:asseSlug/:chapterSlug` | `GET /api/sviluppo-bambino/assi/:asseSlug/:chapterSlug` |

> **Nota su API path**: gli endpoint BE sono ancora esposti sotto `/api/sviluppo-bambino/assi/*`. È una conseguenza dell'archiviazione interna (i contenuti vivono in `server/content/progetti/sviluppo bambino/assi strutturali/...`): gli assi sono **nati** nel progetto Sviluppo Bambino e mantenerli lì sul filesystem è coerente con la storia editoriale. Il rename strutturale del 2026-05-07 ha riguardato il frontend (URL pubblici e nomi componenti), non il backend.

## 3. Sorgenti dati

I capitoli sono letti via `readChaptersInDir` ordinati per frontmatter `chapter` o `order`. La cartella sorgente vive sotto `CONTENT_BASE_PATH`:

```
$CONTENT_BASE_PATH/progetti/sviluppo bambino/assi strutturali/
├── asse-1-ontologico-fenomenologico/
│   ├── 01-corporeita.md
│   ├── 02-temporalita-vissuta.md
│   └── ...
├── asse-2-affettivo-morale/
├── asse-3-normativo-educativo/
├── asse-4-separazione-limite/
├── asse-5-desiderio/
└── asse-6-storico-culturale/
```

L'assenza di `CONTENT_BASE_PATH` o di file specifici si traduce in `<StubNotice>` lato FE.

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/sviluppoBambino.ts` | Route `/assi`, `/assi/:asseSlug`, `/assi/:asseSlug/:chapterSlug` (mounted su `/api/sviluppo-bambino`) |
| `server/src/controllers/sviluppoBambinoController.ts` | `getAssiIndex`, `getAsseChapters`, `getChapter` |
| `server/src/services/staticContentReader.ts` | `readChaptersInDir`, condiviso con HCAIRE e narrativa SB |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/assi-strutturali/AssiStrutturaliLanding.tsx` | Landing `/assi-strutturali` — hero, intro, 6 cards asse |
| `pages/assi-strutturali/AssiStrutturaliCapitoli.tsx` | Indice globale `/assi-strutturali/capitoli` — tutti gli assi con i loro capitoli |
| `pages/assi-strutturali/AsseChapters.tsx` (export `AsseChaptersPage`) | Capitoli di un asse specifico |
| `pages/assi-strutturali/Chapter.tsx` (export `ChapterPage`) | Singolo capitolo con TableOfContents + PrevNext |
| `components/AssiStrutturaliNav.tsx` | Sotto-nav (Panoramica / Capitoli) |

I componenti dei capitoli usano i primitivi condivisi del repo (`MarkdownRenderer`, `Breadcrumb`, `PrevNext`, `TableOfContents`, `StubNotice`, `AgenticLabel`).

## 5. Pattern ricorrente

Le pagine seguono lo stesso schema delle altre aree narrative:

```
useEffect → fetch /api/sviluppo-bambino/assi[...]
  ↓
loading | error | data
  ↓
data?.isEmpty
  → <StubNotice />
  ↓ altrimenti
<MarkdownRenderer content={data.content} />
+ <AgenticLabel />
```

Il `Chapter` aggiunge `TableOfContents` (laterale) e `PrevNext` (in fondo) per la navigazione tra capitoli adiacenti.

## 6. I sei assi

| Slug | Titolo | Sottotitolo | N° capitoli |
|---|---|---|---|
| `asse-1-ontologico-fenomenologico` | Ontologico–fenomenologico | Il soggetto prima di ogni funzione | 8 |
| `asse-2-affettivo-morale` | Affettivo–morale | Come l'altro diventa interiormente vincolante | 8 |
| `asse-3-normativo-educativo` | Normativo–educativo | Orientare senza imporre, giudicare senza arbitrio | 6 |
| `asse-4-separazione-limite` | Separazione e Limite | L'incontro con ciò che resiste | 8 |
| `asse-5-desiderio` | Desiderio | L'orientamento che sopravvive al limite | 7 |
| `asse-6-storico-culturale` | Storico–culturale | Il mondo come mediazione strutturale | 7 |

Totale: 44 capitoli (oltre 300 mila caratteri di elaborazione teorica).

L'architettura è **logica, non cronologica**: ogni asse presuppone il precedente. Per la sintesi del singolo asse vista dal punto di vista del progetto Sviluppo Bambino, esiste anche `/sviluppo-bambino/modello/:asseSlug` (gestita da `SviluppoBambinoAsseOverview` — vedi [narrativa SB §6.1](./sviluppo-bambino/narrativa.md#61-modello--sintesi-degli-assi)).

## 7. Storia

- **Pre-2026-05-07**: la sezione viveva come sotto-area di Sviluppo Bambino, sotto `pages/sviluppo-bambino/SviluppoBambinoAssi*.tsx`. URL pubblico già `/assi-strutturali/*`.
- **2026-05-07** (rename strutturale): elevata a sezione principale. I 4 file frontend spostati in `pages/assi-strutturali/` con `git mv` (storia git preservata) e rinominati senza prefisso `SviluppoBambino`. Frasi della landing che parlavano genericamente di "bambino" sostituite con "essere umano in sviluppo" / "soggetto in sviluppo" dove non specifico al dominio infantile. Aggiunta in landing una frase che chiarisce: lo sviluppo del bambino resta il caso d'uso più articolato, ma la portata degli assi riguarda l'intero sviluppo umano.
- **2026-05-07** (cleanup): rimossi i redirect legacy `/sviluppo-bambino/assi/*` → `/assi-strutturali/*` (4 route + 2 helper component). Il sito è in fase iniziale, niente bookmark esterni da preservare.

## 8. Dipendenze

- **`CONTENT_BASE_PATH`**: vincolo strutturale (vedi [Inventario §7](../00-overview/inventario.md)).
- **Componenti condivisi**: `MarkdownRenderer`, `Breadcrumb`, `PrevNext`, `TableOfContents`, `StubNotice`, `AgenticLabel`, `Navigation` (top-level).
- **`AssiStrutturaliNav`**: sotto-nav dedicata, già al livello giusto in `components/`.

## 9. Criticità note

- **Slug non validato lato server**: `:asseSlug` e `:chapterSlug` cadono su 404 dal `staticContentReader` ma prima passano per i metodi controller che fanno join e leggono dal filesystem.
- **Niente caching**: ogni richiesta legge dal disco.
- **Niente full-text search**: per cercare un termine bisogna conoscere già asse + capitolo.
- **API path disallineata dall'URL pubblico**: il backend serve da `/api/sviluppo-bambino/assi/*` mentre il frontend usa `/assi-strutturali/*`. Refactor possibile (spostare i contenuti in `server/content/assi-strutturali/`) ma non necessario per il funzionamento; il `staticContentService.ts:51-54` gestisce il mapping in modo trasparente.

## 10. Test

Niente test automatici. Verifiche manuali:

- Caricamento delle 4 viste con `CONTENT_BASE_PATH` corretto e con env mancante (StubNotice).
- `tsc --noEmit` come verifica di non-regressione dopo il rename strutturale del 2026-05-07.
