---
title: Letture critiche
sidebar_position: 8
---

# Modulo Letture critiche

Scheda funzionale del **verticale Letture critiche**: una sezione del sito che ospita "letture" (opere — romanzi, saggi, film, ecc.) commentate, con una **pipeline editoriale a 10 step** che orchestra l'analisi e produce un articolo finale. È uno dei tre casi d'uso del [ponte Cowork](../10-architecture/local-cowork-bridge.md#22-letture-critiche).

## 1. Scopo

- Pubblicare letture critiche di opere selezionate (manualmente o per priorità).
- Per ogni opera, eseguire una pipeline a 10 step (4 di analisi + 6 editoriali) tramite Cowork.
- Esporre al pubblico le opere con `step_5d` completato (articolo finale pronto).
- Permettere all'admin di gestire tutto il ciclo dal sito.

## 2. Responsabilità

- Persistere `Opera` con stato pipeline embedded (10 step + log + output).
- Esporre lista pubblica filtrando per `pipeline.step_5d.stato === 'completato'`.
- Eseguire/cancellare step su comando admin via [bus Redis Letture](../10-architecture/local-cowork-bridge.md#22-letture-critiche).
- Aggregare lo stato globale dell'opera (`in_attesa`/`in_corso`/`completata`/`sospesa`) dai singoli step (`utils/lettureStato.ts`).

## 3. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/Opera.ts` | Schema con pipeline embedded, costanti step e tipologie |
| `server/src/routes/letture.ts` | Router pubblico + `lettureAdminRouter` |
| `server/src/controllers/lettureController.ts` | `listOperePubbliche`, `getOperaPubblica`, `listOpereAdmin`, `getOperaAdmin`, `createOpera`, `updateOpera`, `deleteOpera`, `runStep`, `getStep` |
| `server/src/services/lettureMessageBus.ts` | LPUSH commands + SUBSCRIBE events su `hcaire:letture:*` |
| `server/src/services/lettureEventSubscriber.ts` | Handler eventi `started/log/completed/failed/cancelled` + watchdog |
| `server/src/services/lettureSchemaValidator.ts` | Validazione output con AJV |
| `server/src/utils/lettureStato.ts` | `avanzamento`, `calcolaStato`, `isStepEnabled`, `LETTURE_PREREQUISITES`, `buildInvalidationUpdate` |
| `server/src/utils/lettureSteps.ts` | `outputDirFor`, `outputJsonPathFor`, `outputMdPathFor`, mappe filename |
| `server/src/utils/lettureSlug.ts` | `resolveUniqueSlug` |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/pages/letture/LettureCriticheLanding.tsx` | Landing pubblica `/letture` |
| `client/src/pages/letture/LettureLanding.tsx` | Lista articoli pubblicati `/letture/elenco` |
| `client/src/pages/letture/LetturaDetail.tsx` | Singola lettura `/letture/:slug` |
| `client/src/pages/AdminLetture.tsx` | Coda admin |
| `client/src/pages/AdminLetturaNuova.tsx` | Form creazione |
| `client/src/pages/AdminLetturaDetail.tsx` | Editor + esecuzione step |
| `client/src/components/letture/LettureOutputViewer.tsx` | Visualizzatore output JSON di uno step |
| `client/src/components/letture/LettureOutputModal.tsx` | Modale per output |
| `client/src/services/lettureService.ts` | Wrapper fetch |
| `client/src/hooks/useExecutionLogs.ts` | Hook per log streaming |

### Worker locale

| File | Ruolo |
|------|-------|
| `local/src/pipeline/LettureCommandHandler.ts` | BRPOP loop su `hcaire:letture:commands` |
| `local/src/pipeline/LetturePromptComposer.ts` | Composer del prompt da CLAUDE.md di pipeline-0/pipeline-1 |
| `local/src/pipeline/CoworkRunner.ts` | Spawn Claude Code (condiviso con Produzioni) |
| `local/src/pipeline/lettureConstants.ts` | Path filesystem letture, mappa step → cartella |

## 4. Modello dati

### `Opera`

```ts
{
  slug: string;                          // unique
  titolo: string;
  autore: string;
  anno: number | null;
  tipologia: 'romanzo' | 'racconto' | 'film' | 'opera teatrale' | 'saggio narrativo' | 'altro';
  lingua_originale: string | null;

  stato: 'in_attesa' | 'in_corso' | 'completata' | 'sospesa';
  priorita: number | null;               // 1-5
  note_di_ingresso: string;

  pipeline: {
    step_1, step_2, step_3, step_4: {
      stato: 'non_avviato' | 'in_coda' | 'in_esecuzione' | 'completato' | 'errore';
      completato_il, started_at: Date | null;
      output: any;                       // JSON dell'output Cowork
      errore: string | null;
      log_lines: { ts, text, level }[];
    },
    step_5a, step_5b, step_5c: { ...idem... },
    step_5d, step_5e, step_5f: {
      ...idem...,
      testo: string | null;              // markdown affiancato al JSON
    }
  },
  createdAt, updatedAt
}
```

Collection: `opere`. Indici:

- `slug` unico
- `(stato, priorita)` per la coda admin
- `(pipeline.step_5d.stato, pipeline.step_5d.completato_il desc)` per la lista pubblica

### Step pipeline (D6 — pipeline letture)

| Step | Etichetta | Cosa produce |
|------|-----------|--------------|
| `step_1` | Dossier contenutistico | JSON struttura opera |
| `step_2` | Lettura libera orientata | JSON osservazioni |
| `step_3` | Lettura strutturata per assi | JSON con dimensioni configurazionali (input: 6 file `asse_*.json` precompilati) |
| `step_4` | Saggio critico — revisione | JSON osservazioni critiche |
| `step_5a` | Selezione editoriale | JSON scelte |
| `step_5b` | Scaletta | JSON struttura articolo |
| `step_5c` | Stesura | JSON con bozza |
| `step_5d` | Revisione finale | JSON + **`articolo-finale.md`** ← pubblicato |
| `step_5e` | Resoconto processo | JSON + `resoconto-processo.md` |
| `step_5f` | Saggio integrato | JSON + `saggio-integrato.md` |

Step 1-4 sotto `<root>/<slug>/`, step 5a-5f sotto `<root>/<slug>/editorial/`.

I tre step `con testo` (5d, 5e, 5f) producono **anche** un markdown da pubblicare/scaricare.

## 5. Rotte

### Pubbliche

| Verb | Path | Funzione |
|------|------|----------|
| `GET` | `/api/letture` | Lista opere con `step_5d` completato (sort: `pubblicata_il` desc) |
| `GET` | `/api/letture/:slug` | Singola opera con `articolo-finale` |

### Admin

Mounted su `/api/admin/letture`, tutte gated da `requireAdmin`.

| Verb | Path | Funzione |
|------|------|----------|
| `GET`    | `/api/admin/letture` | Lista completa, ordinata per coda (`stato` + `priorita`) |
| `POST`   | `/api/admin/letture` | Crea opera (genera slug univoco) |
| `GET`    | `/api/admin/letture/:slug` | Dettaglio admin (full pipeline) |
| `PATCH`  | `/api/admin/letture/:slug` | Aggiorna metadati |
| `DELETE` | `/api/admin/letture/:slug` | Elimina (cancella anche output filesystem) |
| `POST`   | `/api/admin/letture/:slug/steps/:step_id/run` | Avvia esecuzione step (LPUSH Redis) |
| `GET`    | `/api/admin/letture/:slug/steps/:step_id` | Stato + output di uno step |

## 6. Flussi

### 6.1 Esecuzione di uno step (admin)

```
Admin click "Run step_3" su /admin/letture/:slug
  ↓
POST /api/admin/letture/:slug/steps/step_3/run
  ↓
Server:
  isStepEnabled(opera, 'step_3')?     // controlla prerequisites
  Opera.updateOne(...) → step_3.stato = 'in_coda'
  lettureMessageBus.sendStepRun({
    execution_id, context_id=slug, step_id='lett_step_3', run_number,
    input_files: [...], output_dir: <abs>, output_filename: 'step-3-...json',
    output_md_filename: null,
  })
    ↳ LPUSH hcaire:letture:commands
  → 202 Accepted
  ↓
local/LettureCommandHandler:
  BRPOP hcaire:letture:commands
  pre-flight: opera.pipeline.step_3.stato === 'in_coda'?
  LetturePromptComposer.compose(...)
  CoworkRunner.run() → spawn claude --print
    PUBLISH hcaire:letture:events (step.started)
    log line-by-line → PUBLISH events (step.log)
    Cowork scrive step-3-....json sotto <slug>/
    PUBLISH events (step.completed) con output_file + output_data
  ↓
server/lettureEventSubscriber:
  handleStarted → opera.pipeline.step_3.stato = 'in_esecuzione'
  handleLog → buffer log → $push log_lines (batch)
  handleCompleted →
    opera.pipeline.step_3.stato = 'completato'
    opera.pipeline.step_3.output = <output_data parsed>
    opera.pipeline.step_3.completato_il = now
  ↓ (se step_5d|5e|5f) legge articolo-finale.md dal filesystem condiviso
    e popola step_5d.testo (richiede che il worker locale sia sulla stessa macchina
    o che il filesystem sia montato — vedi Criticità §10)
```

### 6.2 Watchdog

Speculare al watchdog produzioni: ogni `PIPELINE_WATCHDOG_INTERVAL_MS` (default 5 min) il server cerca step `in_coda`/`in_esecuzione` con `started_at < threshold` e li forza in `errore` con `error_source: 'timeout'`.

### 6.3 Invalidazione downstream

Quando uno step viene rieseguito (es. `step_3` di nuovo), `buildInvalidationUpdate` rimette `non_avviato` tutti gli step downstream definiti in `LETTURE_PREREQUISITES`. Evita stati incoerenti.

### 6.4 Lettura pubblica

```
GET /api/letture
  ↓
Opera.find({ 'pipeline.step_5d.stato': 'completato' })
  .sort({ 'pipeline.step_5d.completato_il': -1 })
  .select(<summary>)
  ↓
[ { slug, titolo, autore, ..., pubblicata_il, testi_disponibili } ]
```

## 7. Componenti UI

### Pubblico

- **`LettureCriticheLanding`** (`/letture`): hero + CTA verso elenco.
- **`LettureLanding`** (`/letture/elenco`): card con titolo, autore, anno, tipologia, data pubblicazione.
- **`LetturaDetail`** (`/letture/:slug`): titolo, metadati, articolo (markdown da `step_5d.testo`), eventuali "altre forme" (saggio integrato, resoconto se completati).

### Admin

- **`AdminLetture`**: tabella coda. Colonne: titolo, autore, stato globale, avanzamento (`x/10` step), priorità, azioni.
- **`AdminLetturaNuova`**: form con `titolo`, `autore`, `anno`, `tipologia` (dropdown), `lingua_originale`, `priorita`, `note_di_ingresso`. Slug autogenerato (`resolveUniqueSlug`).
- **`AdminLetturaDetail`**: vista pipeline. Per ogni step: stato, bottone "Run" (disabilitato se prerequisites non soddisfatti), log streaming live, viewer JSON/markdown output.
- **`LettureOutputViewer`** + **`LettureOutputModal`**: visualizzazione strutturata dell'`output` JSON con sezioni espandibili.

## 8. Dipendenze

- **MongoDB** (`opere`): unica fonte di verità lato server.
- **Redis Cloud**: bus comando/eventi (`hcaire:letture:commands` + `hcaire:letture:events`).
- **Cowork** (`local/`): esecuzione step via Claude Code CLI. Richiede portatile dello sviluppatore acceso (vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md)).
- **Cartella specs Cowork**: `LETTURE_SPECS_ROOT` (default `C:/Users/.../HCAIRE Cultura/`) — fuori repo.
- **Cartella output**: `LETTURE_OUTPUT_ROOT` (default `<LETTURE_SPECS_ROOT>/letture/`) — fuori repo, condivisa fra worker e (idealmente) server.

## 9. Filesystem

```
$LETTURE_OUTPUT_ROOT/
└── <slug>/
    ├── step-1-dossier-contenutistico.json
    ├── step-2-lettura-libera-orientata.json
    ├── step-3-lettura-strutturata-per-assi.json
    ├── step-4-saggio-critico-revisione.json
    └── editorial/
        ├── step-5a-selezione-editoriale.json
        ├── step-5b-scaletta.json
        ├── step-5c-stesura.json
        ├── step-5d-revisione-finale.json
        ├── articolo-finale.md
        ├── step-5e-resoconto-processo.json
        ├── resoconto-processo.md
        ├── step-5f-saggio-integrato.json
        └── saggio-integrato.md
```

I file JSON `output_data` sono embeddati anche in `Opera.pipeline.step_X.output` su Mongo, quindi il FE non legge il filesystem direttamente. I markdown `*.md` sono letti dal **server** quando arriva l'evento `step.completed` e popolati in `Opera.pipeline.step_5{d,e,f}.testo`.

## 10. Criticità note

- **Filesystem condiviso fra worker e server**: oggi il server è su Railway, il worker `local/` sul portatile. Il server **non ha accesso** al filesystem dove Cowork scrive. Per leggere `articolo-finale.md` dopo lo step 5d, una delle due:
  - Il worker invia anche il contenuto del file dentro l'evento Redis `step.completed` (oggi non è chiaro se lo fa).
  - Si introduce un upload del file dal worker al server (es. via API admin con api-key).
  Vedi anche [Architettura → Backend](../10-architecture/backend.md) per il protocollo.
- **`MOCK_MODE`** è `true` di default in `lettureConstants.ts`. Le esecuzioni reali richiedono `PIPELINE_MOCK_MODE=false` esplicito nel `.env` del worker.
- **Validazione AJV**: implementata in `lettureSchemaValidator.ts` ma applicata solo a fine step. Errori di formato dell'output Cowork sfuggono fino al render UI.
- **Singolo concorrente per step**: `LettureCommandHandler.activeExecutions` è un `Map` per execution_id, ma se l'admin clicca "Run" velocemente sullo stesso step parte una seconda execution con id diverso e il pre-flight fallirebbe (o viceversa).
- **Cancel step**: implementato (`pipeline.step.cancel`) ma il FE oggi non espone il bottone in modo prominente.

## 11. Test

Niente test automatici per il modulo. Esiste `services/__tests__/` ma copre solo pipeline produzioni (mappers, step enablement). Verifiche manuali:

- Run step_1 → step_3 → step_4 → step_5a→5d → articolo finale appare.
- Re-run di step_3: gli step downstream ritornano `non_avviato` per invalidazione.
- Watchdog: simulare timeout (mock un'execution senza eventi) → step va in `errore`.
- Lista pubblica: aggiungere un'opera con `step_5d` completato → appare in `/letture/elenco`.
