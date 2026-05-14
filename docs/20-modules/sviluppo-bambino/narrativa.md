---
title: Sviluppo Bambino — narrativa
sidebar_label: Narrativa
sidebar_position: 2
---

# Modulo Sviluppo Bambino — narrativa

Scheda funzionale dell'**impalcatura narrativa del verticale Sviluppo Bambino**: pagine espositive di finalità, concetti, riflessioni, interlocuzioni con le discipline, modello (sintesi degli assi). Esclude **produzioni** ([scheda dedicata](./produzioni.md)) e **corsi didattica** ([Corsi](./corsi.md)).

> **Metodo** è stato promosso a sezione di primo livello: `/metodo/*` con didattica F1/F2/F3 dedicata. Vedi [Modulo Metodo](../metodo.md). I redirect legacy da `/sviluppo-bambino/metodo*` → `/metodo*` sono attivi.
>
> **Assi strutturali** sono anch'essi una sezione principale autonoma: `/assi-strutturali/*`. Vedi [Modulo Assi strutturali](../assi-strutturali.md). Sotto `/sviluppo-bambino/modello/:asseSlug` resta una *sintesi* dell'asse vista dal punto di vista del progetto.

## 1. Scopo

Esporre al lettore pubblico la teoria del verticale "Sviluppo Bambino": finalità, concetti chiave, nota metodologica, riflessioni, interlocuzioni con le altre discipline, modello (sintesi degli assi).

## 2. Aree narrative

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Landing | `/sviluppo-bambino` | (statica + cards) |
| Finalità | `/sviluppo-bambino/finalita` | `GET /api/sviluppo-bambino/finalita` |
| Concetti | `/sviluppo-bambino/concetti` | `GET /api/sviluppo-bambino/concetti` |
| Nota metodologica | `/sviluppo-bambino/nota-metodologica` | `GET /api/sviluppo-bambino/nota-metodologica` |
| Riflessioni | `/sviluppo-bambino/riflessioni` | `GET /api/sviluppo-bambino/riflessioni` |
| Modello — panoramica | `/sviluppo-bambino/modello` | `GET /api/sviluppo-bambino/modello` |
| Modello — sintesi asse | `/sviluppo-bambino/modello/:asseSlug` | `GET /api/sviluppo-bambino/modello/:asseSlug` |
| Interlocuzioni — landing | `/sviluppo-bambino/interlocuzioni` | `GET /api/sviluppo-bambino/interlocuzioni` |
| Interlocuzioni — discipline index | `/sviluppo-bambino/interlocuzioni/discipline` | `GET /api/sviluppo-bambino/interlocuzioni/discipline` |
| Interlocuzioni — disciplina | `/sviluppo-bambino/interlocuzioni/discipline/:disciplinaSlug` | `GET /api/sviluppo-bambino/interlocuzioni/:disciplinaSlug` |

## 3. Sorgenti dati

**Sorgente primaria — MongoDB `SiteContent`** con `namespace='sviluppo-bambino'` (slug `sviluppo-bambino/finalita`, `sviluppo-bambino/concetti`, ecc.). Editor in `/admin/testi`. Vedi [Modulo SiteConfig + SiteContent](../site-config-content.md).

**Fallback FS** (solo se DB vuoto): markdown sotto `CONTENT_BASE_PATH/progetti/sviluppo bambino/` via `staticContentReader.ts`.

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/sviluppoBambino.ts` | Rotte mounted su `/api/sviluppo-bambino` |
| `server/src/controllers/sviluppoBambinoController.ts` | Un metodo per area (`getFinalita`, `getModello`, `getInterlocuzioni`, ecc.) |
| `server/src/services/staticContentReader.ts` | Fallback FS condiviso |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/sviluppo-bambino/SviluppoBambinoLanding.tsx` | Hub principale del verticale |
| `pages/sviluppo-bambino/SviluppoBambinoFinalitaLanding.tsx` | Finalità |
| `pages/sviluppo-bambino/SviluppoBambinoPage.tsx` | Pagina generica (concetti, nota-metodologica, riflessioni) |
| `pages/sviluppo-bambino/SviluppoBambinoModello.tsx` | Modello (panoramica) |
| `pages/sviluppo-bambino/SviluppoBambinoAsseOverview.tsx` | Sintesi asse del progetto |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniLanding.tsx` | Landing interlocuzioni |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniDisciplineIndex.tsx` | Index discipline |
| `pages/sviluppo-bambino/SviluppoBambinoInterlocuzioniDisciplinaPage.tsx` | Singola disciplina |
| `components/SviluppoBambinoNav.tsx` | Sotto-nav verticale |
| `components/SviluppoBambinoInterlocuzioniNav.tsx` | Sotto-nav interlocuzioni |
| `services/staticContentService.ts` | Wrapper fetch condiviso |

## 5. Pattern ricorrente

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

Le sotto-nav (`SviluppoBambinoNav`, `SviluppoBambinoInterlocuzioniNav`) sono renderizzate al di sopra del contenuto.

## 6. Sezioni speciali

### 6.1 Modello — sintesi degli assi

`/sviluppo-bambino/modello` espone la panoramica del modello del progetto. Per ciascuno dei 6 assi strutturali, `/sviluppo-bambino/modello/:asseSlug` mostra una **sintesi dell'asse** scritta dal punto di vista del progetto. I capitoli completi vivono nella sezione principale [Assi strutturali](../assi-strutturali.md).

### 6.2 Interlocuzioni

Dialogo del metodo con altre discipline (filosofia, psicologia, neuroscienze, sociologia, pedagogia). Una pagina per disciplina, gestita come content statico/SiteContent.

## 7. Dipendenze

- **MongoDB** (`SiteContent`): source-of-truth.
- **`CONTENT_BASE_PATH`** (opzionale): fallback FS.
- **`MarkdownRenderer`**: rendering condiviso.
- **`StubNotice`**: placeholder per pagine vuote.
- **Sotto-nav modulari**: `SviluppoBambinoNav`, `SviluppoBambinoInterlocuzioniNav`.

## 8. Sotto-aree non incluse

- **Pipeline produzioni** (`/sviluppo-bambino/produzioni/*`): vedi [Produzioni](./produzioni.md).
- **Corsi didattica** (sotto `/metodo/didattica/*` dopo la promozione): vedi [Corsi](./corsi.md).
- **Metodo** (`/metodo/*`): sezione promossa a top-level, vedi [Metodo](../metodo.md).
- **Assi strutturali** (`/assi-strutturali/*`): sezione top-level, vedi [Assi strutturali](../assi-strutturali.md).

## 9. Criticità note

- **Logica `read markdown → render` ad alta densità di rotte**: ~10 metodi controller mappati 1:1 sulle URL. Una refactor a una rotta `*` con resolver di slug ridurrebbe la duplicazione (stesso pattern di HCAIRE/Metodo).
- **Niente caching**: ogni richiesta legge da Mongo (e/o filesystem).
- **Slug non validati lato server**: una richiesta con slug malformato cade su 404 del reader.
- **Niente full-text search**.

## 10. Test

Niente test automatici. Verifiche manuali:

- Caricamento delle pagine narrative principali con DB popolato e con DB vuoto + `CONTENT_BASE_PATH` mancante (tutte StubNotice senza errori).
- Editor `/admin/testi`: modifica slug `sviluppo-bambino/finalita` → reload pubblico → contenuto aggiornato.
