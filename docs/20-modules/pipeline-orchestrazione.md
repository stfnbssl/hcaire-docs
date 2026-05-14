---
title: Pipeline orchestrazione (server)
sidebar_position: 12
---

# Modulo Pipeline orchestrazione

Scheda funzionale dell'**orchestrazione server-side della pipeline F2/F3** di Sviluppo Bambino. Per la visualizzazione lato lettore/admin vedi la scheda [Produzioni](./sviluppo-bambino/produzioni.md). Per il ponte verso Cowork vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md).

## 1. Scopo

Gestire lato server tutto il ciclo di vita di un'esecuzione step pipeline:

- creazione contesti (ricerche F2, temi F3);
- enablement degli step in base a step config + prerequisiti;
- comando `step.run` / `step.cancel` / `step.skip` / `step.reset` / `step.verify`;
- gestione input esterni (`PipelineExternalInput`);
- gestione decisioni umane (bridge F2→F3 ambiti);
- ricezione eventi dal worker (started, log, completed, failed, cancelled);
- watchdog su execution timed-out.

## 2. Modello dati

### `PipelineContext`

Documento principale di un'esecuzione (ricerca o tema):

```ts
{
  context_id: string;              // unique per ricerca o tema
  context_type: 'ricerca' | 'tema';
  label: string;
  ricerca_id?: string;             // solo per temi: id della ricerca F2 origine
  theme_id?: string;
  ambito?: { ... };                // solo per temi
  step_states: Record<StepId, StepState>;
  pending_decision: PendingDecision | null;
  tema_ambiti: Record<theme_id, TemaAmbito[]>;   // solo per ricerche
  steps_completed: StepId[];
  steps_in_progress: StepId[];
  steps_failed: StepId[];
  steps_skipped: { step: StepId; reason: string }[];
  robustezza: 'alta' | 'media' | 'bassa' | null;
  correzioni_residue: number;
  has_revisioni: boolean;
  createdAt, updatedAt
}
```

Collection: `pipeline_contexts`. Index unique su `context_id`.

### `PipelineStepExecution`

Singola esecuzione di uno step:

```ts
{
  execution_id: string;
  context_id: string;
  step_id: StepId;
  run_number: number;
  status: 'in_coda' | 'in_esecuzione' | 'completato' | 'fallito' | 'cancellato';
  is_skipped: boolean;
  skip_reason?: string;
  output_data?: any;               // JSON parsato
  output_file?: string;            // path filesystem worker
  log_lines: { ts, text, level }[];
  error?: { source: string; message: string };
  started_at?: Date;
  completed_at?: Date;
  createdAt, updatedAt
}
```

Collection: `pipeline_step_executions`. Index `(context_id, step_id)` + `status`.

### `PipelineExternalInput`

Input esterno/facoltativo per uno step:

```ts
{
  context_id: string;
  step_id: StepId;
  input_id: string;                // es. 'contesto_ambito', 'casi_dominio'
  input_type: 'json' | 'markdown' | ...;
  label: string;
  file_path?: string;              // path filesystem
  data?: any;                      // o data inline
  is_superseded: boolean;          // history-aware: false = corrente
  createdAt, updatedAt
}
```

Collection: `pipeline_external_inputs`. Più input per `(context_id, step_id)` (le versioni vecchie restano con `is_superseded: true`).

### Step config JSON

`server/pipeline-step-config.json` (versione corrente: `_version: 3.1`). Per ogni step:

```json
{
  "step_id": "f2_step_3",
  "label": "Verifica",
  "phase": "F2",
  "output_prefix": "theme-verification",
  "output_path_template": "ricerche/{context_id}/theme-verification-v{N}.json",
  "inputs_pipeline": [
    { "step_id": "f2_step_2", "required": true },
    { "step_id": "f2_step_2a", "required": true }
  ],
  "inputs_esterni": [],
  "inputs_strutturali": [...],
  "can_skip": false,
  "skip_condition": null,
  "blocks": ["f2_step_4"]
}
```

Caricato da `stepConfigService.ts` all'avvio + reload manuale via endpoint admin.

## 3. File coinvolti

### Controller

| File | Ruolo |
|------|-------|
| `server/src/controllers/pipelineController.ts` | Index pipeline (ricerche + temi), getRicerca/getTema con step config filtrato per fase, run/cancel/skip/verify/reset step, CRUD external inputs, decisioni umane (incl. bridge F2→F3 ambiti, `promoteTemaAmbito`), streaming SSE log |

### Services

| File | Ruolo |
|------|-------|
| `services/pipelineService.ts` | Aggregazione contexts F2/F3 in index, mapping documenti → IndexEntry FE |
| `services/pipelineMappers.ts` | `documentToRicercaEntry` / `documentToTemaEntry`, `pickCanonicalDevice` (priorità `f3_step_4 → f3_step_3 → f3_step_2`) |
| `services/pipelineEventSubscriber.ts` | Subscriber Redis `hcaire:pipeline:events`: handleStarted/handleLog (buffered)/handleCompleted/handleFailed/handleCancelled. Trigger `pending_decision` `f2_to_f3_tema_selection` su `f2_step_6` completato. |
| `services/stepConfigService.ts` | Carica/serve config JSON (per fase F2/F3) |
| `services/stepEnablement.ts` | Calcolo `isStepEnabled`: precondizioni (step precedenti `completato`/`saltato`, input esterni presenti). |
| `services/messageBus.ts` | LPUSH `hcaire:pipeline:commands` + costanti canali |

### Rotte

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET` | `/api/pipeline/index` | public | Index globale (ricerche + temi) |
| `GET` | `/api/pipeline/ricerche/:ricercaId` | public | Context ricerca + step states |
| `GET` | `/api/pipeline/temi/:temaId` | public | Context tema + step states |
| `GET` | `/api/pipeline/step-config/:phase` | public | Step config per fase (F2 / F3) |
| `POST` | `/api/pipeline/executions` | admin | `step.run` (insert execution + LPUSH Redis) |
| `POST` | `/api/pipeline/executions/:id/cancel` | admin | `step.cancel` |
| `POST` | `/api/pipeline/executions/:id/verify` | admin | Marca verificato (post-completed manual check) |
| `POST` | `/api/pipeline/executions/:id/reset` | admin | Reset step a `non_avviato` |
| `POST` | `/api/pipeline/steps/skip` | admin | `step.skip` con `reason` |
| `GET` | `/api/pipeline/executions/:id/logs` | admin (SSE) | Stream log via EventSource |
| `GET/POST/PUT/DELETE` | `/api/pipeline/external-inputs[/:id]` | admin | CRUD input esterni |
| `GET/POST/PUT/DELETE` | `/api/pipeline/ricerche/:r/temi/:t/ambiti[/:a]` | admin | CRUD ambiti F2→F3 |
| `POST` | `/api/pipeline/ricerche/:r/temi/:t/ambiti/:a/promote` | admin | Promuove ambito → pipeline F3 |
| `POST` | `/api/pipeline/ricerche/:r/decisions/dismiss` | admin | Dismiss `pending_decision` |

## 4. Step enablement

`stepEnablement.isStepEnabled(context, stepId, config)`:

```
1. Step esiste in config?
2. Step status corrente = 'non_avviato' o 'attende_input'?
3. Tutti gli step in inputs_pipeline (required: true) sono 'completato' o 'saltato'?
4. Tutti gli input esterni richiesti hanno almeno un record non-superseded?
5. Eventuali blocchi specifici (es. pending_decision)?
→ ritorna true / false con motivazione
```

Test in `services/__tests__/stepEnablement.test.ts`.

## 5. Bridge F2 → F3 (decisione tema → ambiti)

Quando `pipeline.step.completed` arriva per `f2_step_6`, il subscriber:

```ts
// Atomico nello stesso $set
{
  $set: {
    [`step_states.f2_step_6.status`]: 'completato',
    [`step_states.f2_step_6.output_file`]: output_file,
    pending_decision: {
      type: 'f2_to_f3_tema_selection',
      payload: {
        theme_id, theme_label,
        suggested_subdomains: ...,
      }
    }
  },
  $addToSet: { steps_completed: 'f2_step_6' },
  $pull:     { steps_in_progress: 'f2_step_6' }
}
```

Lato FE, al primo polling/refetch del context dopo il completamento, sia lo step `completato` sia il banner di decisione sono visibili. Niente race window.

Endpoint dedicati per gestire la decisione: vedi tabella §3 (`ambiti CRUD`, `promote`, `decisions/dismiss`).

## 6. Watchdog

`pipelineEventSubscriber.startPipelineWatchdog()` esegue `setInterval(PIPELINE_WATCHDOG_INTERVAL_MS, ...)`:

```ts
const threshold = Date.now() - PIPELINE_DEFAULT_TIMEOUT_MS - PIPELINE_WATCHDOG_GRACE_MS;

PipelineStepExecution.find({
  status: { $in: ['in_coda', 'in_esecuzione'] },
  $or: [
    { started_at: { $lt: threshold } },
    { started_at: null, createdAt: { $lt: threshold } },
  ],
})
  .forEach((exec) => {
    // segna fallito + propaga su context
  });
```

Default: `PIPELINE_DEFAULT_TIMEOUT_MS=600000` (10 min), `PIPELINE_WATCHDOG_INTERVAL_MS=600000` (10 min), grace `60000`.

## 7. Throttling log

`handleLog` bufferizza per `execution_id`: flush a 20 righe o 2 s di idle. Singolo `$push` con tutto il batch riduce write contention su `pipeline_step_executions.log_lines`.

## 8. SSE stream log

`GET /api/pipeline/executions/:id/logs` apre un EventSource:

- All'apertura serve il backlog di `log_lines` esistenti.
- Si sottoscrive al canale Redis pipeline.events e filtra per `execution_id`.
- Ogni `step.log` → SSE event `log` (line, level, ts).
- `step.completed` o `step.failed` → SSE event `done` + chiude.

Lato FE: `useExecutionLogs(executionId)` apre l'EventSource e gestisce cleanup su unmount.

## 9. Flusso end-to-end di esecuzione

Diagramma completo in [Backend §6](../10-architecture/backend.md). In sintesi:

```
admin POST /api/pipeline/executions {context, step_id}
  ↓ controller.runStep:
    insert PipelineStepExecution (in_coda)
    LPUSH hcaire:pipeline:commands {execution_id, payload}
  ↓ worker BRPOP, spawn Cowork
  ↓ events back via PUBLISH hcaire:pipeline:events
  ↓ subscriber update Mongo (started → log batches → completed/failed)
  ↓ se f2_step_6 completato: set pending_decision
  ↓ FE refetch context, vede stato aggiornato
```

## 10. Dipendenze

- **MongoDB** (`pipeline_contexts`, `pipeline_step_executions`, `pipeline_external_inputs`).
- **Redis Cloud** (canali `hcaire:pipeline:commands` + `hcaire:pipeline:events`).
- **Worker `local/`** per esecuzione Cowork: vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md).
- **AJV** per validazione `pipeline-step-config.json`.
- **FS condiviso** worker/server per `output_file` (vedi criticità Letture).

## 11. Criticità note

- **Step config in JSON file**: cambio richiede restart server (nodemon non watcha `pipeline-step-config.json`).
- **Filesystem condiviso worker/server**: vedi [Letture §10](./letture.md). Su Railway il server non vede il filesystem del portatile; gli output dovrebbero essere inviati via Redis payload o uploaded da worker.
- **Concurrency**: nessun lock fra esecuzioni concorrenti dello stesso step. `runStep` può creare due execution `in_coda` se l'admin clicca due volte rapidamente; il worker pre-flight controlla lo stato ma c'è una finestra.
- **`requireAdmin` su ogni endpoint admin pipeline**: latenza Clerk a ogni chiamata (vedi [Autenticazione](./autenticazione.md)).
- **Niente metric esposto** su throughput esecuzioni, latenza media step, percentuale fallimenti.

## 12. Test

`server/src/services/__tests__/`:

- `pipelineMappers.test.ts` — mapping documenti → IndexEntry.
- `stepEnablement.test.ts` — logica enablement.
- `scripts/test-pipeline-step-config.mjs` — validazione AJV del config.

`npm run test` esegue tutti e tre.
