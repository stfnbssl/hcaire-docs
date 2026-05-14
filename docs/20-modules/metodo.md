---
title: Metodo
sidebar_position: 10
---

# Modulo Metodo

Scheda funzionale della sezione **Metodo**, promossa a sezione di primo livello (`/metodo/*`). Era originariamente sotto Sviluppo Bambino; oggi è un verticale autonomo perché il metodo non riguarda solo lo sviluppo del bambino (che ne è un dominio di applicazione).

## 1. Scopo

Esporre teoria, fasi, ricerca scientifica, rapporto con IA e **didattica** (corsi F1/F2/F3 in formato slide React) del metodo configurazionale. Pagine narrative con contenuto da MongoDB + corso slide statico bundlato nel client.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/metodo` | `GET /api/metodo` |
| Introduzione | `/metodo/introduzione` | `GET /api/metodo/introduzione` |
| Fasi (index) | `/metodo/fasi` | `GET /api/metodo/fasi` |
| Fase singola | `/metodo/fasi/:faseSlug` | `GET /api/metodo/fasi/:faseSlug` |
| Ricerca scientifica | `/metodo/ricerca-scientifica` | `GET /api/metodo/ricerca-scientifica` |
| Rapporto con IA | `/metodo/rapporto-con-ia` | `GET /api/metodo/rapporto-con-ia` |
| Didattica (landing) | `/metodo/didattica` | (statica) |
| Corso F1 | `/metodo/didattica/fondazione-ontologica[/:moduleId[/:slideId]]` | (client-only) |
| Corso F2 | `/metodo/didattica/traduzione-interdisciplinare[/:moduleId[/:slideId]]` | (client-only) |
| Corso F3 | `/metodo/didattica/strumenti-operativi-contestualizzati[/:moduleId[/:slideId]]` | (client-only) |

Per i corsi vedi [Corsi didattica F1/F2/F3](./sviluppo-bambino/corsi.md). Redirect legacy da `/sviluppo-bambino/metodo*` e `/sviluppo-bambino/{fondazione,traduzione,strumenti}.../...` → `/metodo/...` attivi in `App.tsx`.

## 3. Sorgenti dati

**Sorgente primaria — MongoDB `SiteContent`** con `namespace='metodo'` (slug `metodo/index`, `metodo/introduzione`, `metodo/fasi`, `metodo/fasi/:slug`, `metodo/ricerca-scientifica`, `metodo/rapporto-con-ia`). Vedi [Modulo SiteConfig + SiteContent](./site-config-content.md).

**Fallback FS** (se DB vuoto): markdown sotto `CONTENT_BASE_PATH/metodo/` via `staticContentReader.ts`.

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/metodo.ts` | Route mounted su `/api/metodo` |
| `server/src/controllers/metodoController.ts` | `getMetodoIndex`, `getMetodoSection`, `getMetodoFasi`, `getMetodoFase` |
| `server/src/services/staticContentReader.ts` | Fallback FS condiviso con HCAIRE |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/metodo/MetodoLanding.tsx` | Landing `/metodo` |
| `pages/metodo/MetodoPage.tsx` | Singola pagina (introduzione, ricerca-scientifica, rapporto-con-ia) |
| `pages/metodo/MetodoFasiIndex.tsx` | Index fasi |
| `pages/metodo/MetodoFasePage.tsx` | Singola fase |
| `pages/metodo/DidatticaLanding.tsx` | Landing didattica con i 3 corsi |
| `components/MetodoNav.tsx` | Sotto-nav del verticale (Landing / Introduzione / Fasi / Ricerca scientifica / Rapporto con IA / Didattica) |
| `services/staticContentService.ts` | Wrapper fetch (`metodoApi`) |

## 5. Pattern ricorrente

Identico a HCAIRE / Sviluppo Bambino narrativa:

```
useEffect → fetch /api/metodo/<area>
  ↓
loading | error | data
  ↓
data?.isEmpty
  → <StubNotice />
  ↓ altrimenti
<MarkdownRenderer content={data.content} />
+ <AgenticLabel />
```

## 6. Fasi

Tre fasi del metodo:

- **F1 — Fondazione ontologica**: assumere ipotesi minimali sul soggetto in sviluppo prima di qualsiasi misura/test.
- **F2 — Traduzione interdisciplinare**: tradurre osservazioni e linguaggi tra discipline in una grammatica condivisa (Concept Embedding).
- **F3 — Strumenti operativi contestualizzati**: costruire micro-dispositivi di campo a partire dai temi maturati in F2.

Le pagine `/metodo/fasi/:faseSlug` espongono la teoria. La parte didattica (corsi slide React) è in `/metodo/didattica/...`.

## 7. Dipendenze

- **MongoDB** (`SiteContent`): source-of-truth.
- **`CONTENT_BASE_PATH`** (opzionale): fallback FS.
- **`MarkdownRenderer`**, **`StubNotice`**, **`AgenticLabel`**: condivisi.
- **`MetodoNav`**: sotto-navigazione dedicata.
- **Modulo [Corsi didattica](./sviluppo-bambino/corsi.md)** per le slide React.

## 8. Criticità note

- **Slug derivati**: cambiare il titolo di una fase nel DB cambia la URL se lo slug è generato dal titolo. Convenzione: usare slug stabile, non derivarlo a runtime.
- **Niente caching**: ogni richiesta legge da Mongo (e/o FS).
- **Routing duplicato `/sviluppo-bambino/metodo*`**: i redirect coprono i path noti ma URL inattesi possono cadere su `NotFound`. Per cleanup completo, rimuovere i redirect dopo un periodo di grazia.

## 9. Test

Niente test automatici. Verifiche manuali:

- Caricamento delle 6 viste con DB popolato.
- Comportamento con DB vuoto + `CONTENT_BASE_PATH` mancante: tutte StubNotice senza errori.
- Redirect legacy `/sviluppo-bambino/metodo*` → `/metodo*` funzionante.
- Editor `/admin/testi`: modifica slug `metodo/introduzione` → reload pubblico → contenuto aggiornato.
