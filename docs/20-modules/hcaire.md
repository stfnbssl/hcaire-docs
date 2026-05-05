---
title: Verticale HCAIRE
sidebar_position: 7
---

# Modulo HCAIRE

Scheda funzionale del **verticale HCAIRE** (Human-Centred AI Research and Education): la sezione "Laboratorio" del sito, dedicata alla narrativa del progetto, al manifesto, al metodo, ai protocolli. Tutto il contenuto è **markdown statico** letto dal filesystem del server tramite `staticContentReader`.

## 1. Scopo

Esporre al lettore pubblico:

- Una **landing** del laboratorio (`/hcaire`).
- Un set di **sezioni narrative** indicizzate dall'index principale (manifesto, metodo, progetti, ambiente editoriale, ecc.).
- Una sotto-sezione **Protocolli** (`/hcaire/protocolli/*`).

Sono pagine statiche dal punto di vista funzionale (no interazione utente, no scrittura), ma il loro **contenuto** è editabile fuori repo via `CONTENT_BASE_PATH`.

## 2. Responsabilità

- Risolvere la URL `/hcaire/...` in un file markdown del filesystem.
- Parsare il frontmatter YAML (gray-matter) ed esporre `content` + `frontmatter` come JSON.
- Spezzare l'index principale per `## H2` per generare le sotto-sezioni.
- Servire fallback (`section/index.md`) per landing di sotto-sezione.

## 3. Sorgenti dati

Tutto vive sotto **`CONTENT_BASE_PATH`** (env, default `server/content/`):

```
$CONTENT_BASE_PATH/
└── hcaire/
    ├── index.md              # contiene H2 → sezioni dinamiche
    ├── manifesto.md
    ├── metodo.md
    ├── ia-centrata-sull-umano.md
    ├── agentic-shift.md
    ├── ambiente-editoriale.md
    ├── ambiente-aperto.md
    ├── bartleby-preview.md
    └── protocolli/
        ├── index.md
        └── <slug>.md          # un file per protocollo
```

⚠️ Su un'installazione con `CONTENT_BASE_PATH` mancante (es. su Railway senza la cartella montata) le rotte `/api/hcaire/*` rispondono con `isEmpty: true` e il FE mostra `<StubNotice>`. Vedi [Architettura → Deployment §3](../10-architecture/deployment.md#3-backend--railway).

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/routes/hcaire.ts` | 3 rotte mounted su `/api/hcaire` |
| `server/src/controllers/hcaireController.ts` | `getHcaireIndex`, `getHcaireSection`, `getHcaireSubsection` |
| `server/src/services/staticContentReader.ts` | `readMarkdownFile`, `splitByH1`/`splitByH2`, `listMdFiles`, `readChaptersInDir` |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/pages/hcaire/HcaireLanding.tsx` | Landing `/hcaire` |
| `client/src/pages/hcaire/HcairePage.tsx` | Singola sezione `/hcaire/:section` |
| `client/src/pages/hcaire/HcaireProtocolliLanding.tsx` | Lista protocolli |
| `client/src/pages/hcaire/HcaireProtocolPage.tsx` | Singolo protocollo |
| `client/src/services/staticContentService.ts` | `hcaireApi.{getIndex,getSection,getSubsection}` |
| `client/src/types/staticContent.ts` | `HcaireSection` |
| `client/src/components/LaboratorioNav.tsx` | Sotto-nav del verticale |

## 5. Rotte

### Backend

| Verb | Path | Funzione |
|------|------|----------|
| `GET` | `/api/hcaire/` | Indice: array di sezioni da `index.md` (split H2) + raw `fullContent` |
| `GET` | `/api/hcaire/:section` | Risoluzione sezione (vedi §6.2) |
| `GET` | `/api/hcaire/:section/:subsection` | File `hcaire/:section/:subsection.md` |

Tutte pubbliche.

### Frontend

| Path | Componente |
|------|------------|
| `/hcaire` | `HcaireLanding` |
| `/hcaire/protocolli` | `HcaireProtocolliLanding` |
| `/hcaire/protocolli/:slug` | `HcaireProtocolPage` |
| `/hcaire/:section` | `HcairePage` |
| `/hcaire/ia-centrata-sull-umano` | **Redirect** → `/hcaire/manifesto` |

## 6. Flussi

### 6.1 Lista sezioni

```
GET /api/hcaire
  ↓
readMarkdownFile('hcaire/index.md')
  ↓
splitByH2(content) → array di { rawHeading, title, content }
  ↓
mappa title → slug:
  - lookup hardcoded SECTION_SLUGS (es. "Bartleby" → "bartleby-preview")
  - fallback: title.toLowerCase().replace(/\s+/g, '-')
  ↓
ritorna { sections, fullContent }
```

### 6.2 Risoluzione sezione singola

`/api/hcaire/:section` segue tre tentativi in ordine:

```
1. Sezione H2 dentro index.md con quel slug?
   → ritorna { slug, title, content } estratto

2. File standalone hcaire/<section>.md ?
   → ritorna { slug, title, content, frontmatter }

3. Landing di sotto-sezione hcaire/<section>/index.md ?
   → ritorna { slug, title, content, frontmatter }

4. altrimenti 404
```

Questa cascata permette di:

- Avere sezioni "leggere" definite solo come capitolo dell'index (es. "ambiente-aperto").
- Promuovere una sezione a **standalone** (es. "manifesto" che è migrato dall'index a `hcaire/manifesto.md` con commento esplicito nel codice).
- Avere **sotto-aree** con landing dedicata (`hcaire/<sezione>/index.md`).

### 6.3 Sotto-sezione

`/api/hcaire/:section/:subsection` legge solo `hcaire/<section>/<subsection>.md`. Niente fallback. 404 se mancante.

## 7. Componenti UI

### `HcairePage`

Compone:

- `LaboratorioNav` (sotto-nav del verticale).
- Breadcrumb (`Home → Laboratorio → :section`).
- Titolo (etichetta da `SECTION_LABELS` hardcoded, fallback a `data.title`).
- Loader / errore / `<StubNotice>` se `isEmpty`.
- `<MarkdownRenderer>` + `<AgenticLabel>` per il corpo.
- `<TableOfContents>` lato destro (sticky).
- Caso speciale per `section === 'progetti'`: card promozionale verso "Sviluppo bambino" sotto il contenuto.

### `HcaireLanding` / `HcaireProtocolliLanding`

Pattern simile: caricano l'index, mostrano lista delle sezioni con titolo + estratto + link.

### `HcaireProtocolPage`

Identico a `HcairePage` ma scolpito sulla sotto-sezione `protocolli/<slug>.md`.

## 8. Dipendenze

- **`CONTENT_BASE_PATH`**: cartella esterna alla repo, va trasferita o sincronizzata sul server (Railway).
- **`gray-matter`**: parsing YAML frontmatter.
- **`MarkdownRenderer`**: rendering lato FE (vedi [Architettura → Frontend §8](../10-architecture/frontend.md#8-markdown-rendering)).
- **`StubNotice`**: placeholder per pagine vuote / mancanti.
- **`LaboratorioNav`**: sotto-navigazione comune al verticale.

## 9. Criticità note

- **`SECTION_SLUGS` e `SECTION_LABELS` hardcoded**: ogni sezione nuova nell'index richiede una riga in entrambe le mappe. Codice e contenuto vivono in repo separati (codice) e fuori repo (contenuto): facile dimenticarsene.
- **`CONTENT_BASE_PATH` su Railway**: senza la cartella montata, tutte le pagine HCAIRE mostrano `<StubNotice>`. Da decidere strategia (vedi [Deployment §3](../10-architecture/deployment.md#3-backend--railway)).
- **Cache** assente: ogni richiesta legge il file dal disco. Per traffico basso non è un problema, ma se il sito cresce conviene aggiungere un layer (LRU + invalidate su `fs.watchFile`).
- **Nessuna pre-validation** del frontmatter: errori YAML fanno crashare `gray-matter` e ritornano 500.
- **Slug derivati da titolo**: cambiare il titolo di un H2 nell'index cambia la URL della sezione. Migliore convenzione: includere lo slug come riga nascosta (`<!-- slug: ... -->`) o come frontmatter di un file standalone.

## 10. Test

Nessun test automatico dedicato. Verifiche manuali:

- `/hcaire` carica correttamente su filesystem completo.
- `/hcaire/manifesto` (standalone) e `/hcaire/ambiente-aperto` (sezione H2 di index.md) entrambe risolvibili.
- `/hcaire/foo` con `foo` inesistente → 404 lato API → FE mostra StubNotice.
- Redirect `/hcaire/ia-centrata-sull-umano` → `/hcaire/manifesto`.
- Su `CONTENT_BASE_PATH` mancante: tutte le pagine mostrano StubNotice senza errori HTTP.
