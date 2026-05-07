---
title: Sviluppo Bambino — narrativa
sidebar_label: Narrativa
sidebar_position: 2
---

# Modulo Sviluppo Bambino — narrativa

Scheda funzionale dell'**impalcatura narrativa del verticale Sviluppo Bambino**: pagine espositive del metodo, modello, fasi, interlocuzioni, riflessioni. Tutte le sotto-aree **non** legate alla pipeline di produzione (per quelle vedi [Produzioni](./produzioni.md)) e **non** ai corsi (vedi [Corsi F1/F2](./corsi-f1-f2.md)).

> Gli **assi strutturali**, originariamente sotto-area di Sviluppo Bambino, sono stati elevati a **sezione principale del sito** (route `/assi-strutturali/*`) perché trattano lo sviluppo umano in generale, di cui lo sviluppo del bambino è solo uno dei domini. Vedi [Assi strutturali](../assi-strutturali.md) per la scheda dedicata.

## 1. Scopo

Esporre al lettore pubblico la teoria, il metodo e il modello del verticale "Sviluppo Bambino" attraverso una struttura ricca di sotto-pagine, in gran parte alimentate da markdown statico (analogo a [HCAIRE](../hcaire.md)).

## 2. Aree narrative

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/sviluppo-bambino` | (statica + cards) |
| Finalità | `/sviluppo-bambino/finalita` | `GET /api/sviluppo-bambino/finalita` |
| Metodo (landing) | `/sviluppo-bambino/metodo` | `GET /api/sviluppo-bambino/metodo` |
| Metodo — introduzione | `/sviluppo-bambino/metodo/introduzione` | `GET /api/sviluppo-bambino/metodo/introduzione` |
| Metodo — fasi (index) | `/sviluppo-bambino/metodo/fasi` | `GET /api/sviluppo-bambino/metodo/fasi` |
| Metodo — fase singola | `/sviluppo-bambino/metodo/fasi/:faseSlug` | `GET /api/sviluppo-bambino/metodo/fasi/:faseSlug` |
| Metodo — ricerca scientifica | `/sviluppo-bambino/metodo/ricerca-scientifica` | `GET /api/sviluppo-bambino/metodo/ricerca-scientifica` |
| Metodo — rapporto con IA | `/sviluppo-bambino/metodo/rapporto-con-ia` | `GET /api/sviluppo-bambino/metodo/rapporto-con-ia` |
| Concetti | `/sviluppo-bambino/concetti` | `GET /api/sviluppo-bambino/concetti` |
| Nota metodologica | `/sviluppo-bambino/nota-metodologica` | `GET /api/sviluppo-bambino/nota-metodologica` |
| Modello | `/sviluppo-bambino/modello` | `GET /api/sviluppo-bambino/modello` |
| Modello — asse overview | `/sviluppo-bambino/modello/:asseSlug` | `GET /api/sviluppo-bambino/modello/:asseSlug` |
| Riflessioni | `/sviluppo-bambino/riflessioni` | `GET /api/sviluppo-bambino/riflessioni` |
| Interlocuzioni (landing) | `/sviluppo-bambino/interlocuzioni` | `GET /api/sviluppo-bambino/interlocuzioni` |
| Interlocuzioni — disciplina | `/sviluppo-bambino/interlocuzioni/discipline/:disciplinaSlug` | `GET /api/sviluppo-bambino/interlocuzioni/:disciplinaSlug` |

Gli **assi strutturali** (`/assi-strutturali/*`) sono ora una **sezione principale del sito** e hanno una scheda dedicata: vedi [Assi strutturali](../assi-strutturali.md).

## 3. Sorgenti dati

Tutte le pagine narrative leggono markdown da **`CONTENT_BASE_PATH`** via `staticContentReader`:

```
$CONTENT_BASE_PATH/
└── (cartelle markdown gestite fuori repo,
   indicizzate dai metodi del controller sviluppoBambinoController.ts)
```

L'assenza di `CONTENT_BASE_PATH` o di file specifici si traduce in `<StubNotice>` lato FE (vedi modulo [HCAIRE §3](../hcaire.md#3-sorgenti-dati)).

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/sviluppoBambino.ts` | 22 rotte mounted su `/api/sviluppo-bambino` |
| `server/src/controllers/sviluppoBambinoController.ts` | Un metodo per area: `getFinalita`, `getMetodo`, `getFase`, `getModello`, `getAsseChapters`, `getChapter`, ... |
| `server/src/services/staticContentReader.ts` | Condiviso con HCAIRE |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/sviluppo-bambino/SviluppoBambinoLanding.tsx` | Hub principale del verticale |
| `pages/sviluppo-bambino/SviluppoBambinoFinalitaLanding.tsx` | Finalità |
| `pages/sviluppo-bambino/SviluppoBambinoMetodoLanding.tsx` | Metodo (landing) |
| `pages/sviluppo-bambino/SviluppoBambinoMetodoPage.tsx` | Pagine di metodo (introduzione, ricerca-scientifica, rapporto-con-ia) |
| `pages/sviluppo-bambino/SviluppoBambinoMetodoFasiIndex.tsx` | Index fasi |
| `pages/sviluppo-bambino/SviluppoBambinoMetodoFasePage.tsx` | Singola fase |
| `pages/sviluppo-bambino/SviluppoBambinoModello.tsx` | Modello (panoramica del progetto) |
| `pages/sviluppo-bambino/SviluppoBambinoAsseOverview.tsx` | Sintesi asse del progetto (sotto `/sviluppo-bambino/modello/:asseSlug`) |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniLanding.tsx` | Landing interlocuzioni |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniDisciplineIndex.tsx` | Index discipline |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniDisciplinaPage.tsx` | Singola disciplina |
| `pages/sviluppo-bambino/SviluppoBambinoPage.tsx` | Pagina generica (concetti, nota-metodologica, riflessioni — passano qui) |
| `components/SviluppoBambinoNav.tsx` | Sotto-nav verticale |
| `components/SviluppoBambinoMetodoNav.tsx` | Sotto-nav metodo |
| `components/SviluppoBambinoInterlocuzioniNav.tsx` | Sotto-nav interlocuzioni |

I file delle pagine assi (4 componenti React + nav) vivono ora in `pages/assi-strutturali/` (vedi [scheda dedicata](../assi-strutturali.md)).

## 5. Pattern ricorrente

Quasi tutte le pagine seguono lo stesso schema:

```
useEffect → fetch /api/sviluppo-bambino/<area>
  ↓
loading | error | data
  ↓
data?.isEmpty
  → <StubNotice />
  ↓ altrimenti
<MarkdownRenderer content={data.content} />
+ <AgenticLabel />
```

Le sotto-nav (`SviluppoBambinoNav`, `SviluppoBambinoMetodoNav`, ecc.) sono renderizzate al di sopra del contenuto in modo coerente.

## 6. Sezioni speciali

### 6.1 Modello — sintesi degli assi

`/sviluppo-bambino/modello` espone la panoramica del modello del progetto. Per ciascuno dei 6 assi strutturali (`asse-1-ontologico-fenomenologico`, `asse-2-affettivo-morale`, `asse-3-normativo-educativo`, `asse-4-separazione-limite`, `asse-5-desiderio`, `asse-6-storico-culturale`) `/sviluppo-bambino/modello/:asseSlug` mostra una **sintesi dell'asse** scritta dal punto di vista del progetto.

I **capitoli completi** degli assi non vivono più qui: sono nella sezione principale [Assi strutturali](../assi-strutturali.md) (route `/assi-strutturali/:asseSlug/:chapterSlug`). I capitoli sono letti via `readChaptersInDir` ordinati per frontmatter `chapter` o `order` (vedi `staticContentReader.ts`).

### 6.2 Interlocuzioni

Sotto-area che presenta il dialogo del metodo con altre discipline (psicologia, neuroscienze, sociologia, ecc.). Una pagina per disciplina, gestita come content statico.

### 6.3 Fasi

Tre fasi del metodo:

- **F1** — Fondazione ontologica.
- **F2** — Traduzione interdisciplinare.
- **F3** — Strumenti operativi contestualizzati (in lavorazione, fuori scope B).

Le pagine narrative `/sviluppo-bambino/metodo/fasi/:faseSlug` espongono la teoria di ciascuna fase. I corsi (slide React) sono in `corso-fase1/`, `corso-fase2/` e documentati nella scheda [Corsi F1/F2](./corsi-f1-f2.md).

## 7. Dipendenze

- **`CONTENT_BASE_PATH`**: come per HCAIRE, vincolo strutturale.
- **`MarkdownRenderer`**: rendering condiviso.
- **`StubNotice`**: placeholder per pagine vuote.
- **Sotto-nav**: 4 componenti dedicati per le diverse macro-aree.

## 8. Sotto-aree non incluse

Per chiarezza:

- **Pipeline produzioni** (`/sviluppo-bambino/produzioni/*`): vedi modulo [Produzioni](./produzioni.md). È l'unica sotto-area con stato runtime e Cowork bridge.
- **Corsi F1/F2** (`/sviluppo-bambino/fondazione-ontologica/*`, `/traduzione-interdisciplinare/*`): vedi [Corsi F1/F2](./corsi-f1-f2.md). Slide React, niente backend.
- **Corso F3** (`/sviluppo-bambino/strumenti-operativi-contestualizzati/*`): in lavorazione, **fuori scope B**.

## 9. Criticità note

- **Scopo del modulo è quasi solo `read markdown → render`**: il vero contenuto vive fuori repo. La struttura del modulo è quindi fragile rispetto a errori del filesystem o dell'env.
- **Niente caching**: ogni richiesta legge dal disco. Per traffico basso ok, ma vulnerabile a improvvisi picchi.
- **22 rotte mappano 22 metodi controller** (`getFinalita`, `getMetodo`, ecc.) molti dei quali fanno la stessa cosa con path diversi. Una refactor a una rotta `*` con resolver del path potrebbe ridurre la duplicazione (e si potrebbe anche unificare con HCAIRE che ha lo stesso pattern).
- **Slug `:faseSlug`, `:asseSlug`, `:chapterSlug`, `:disciplinaSlug`** non validati lato server: una richiesta con slug malformato cade su 404 dal `staticContentReader` ma prima passa per `getXxx` che fa pattern join e legge dal filesystem.
- **Niente full-text search**: per cercare un termine bisogna conoscere già la sezione.

## 10. Test

Niente test automatici. Verifiche manuali:

- Caricamento delle pagine narrative principali con `CONTENT_BASE_PATH` corretto.
- Comportamento con env mancante: tutte mostrano StubNotice senza errori.
