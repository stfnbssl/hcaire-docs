---
title: Laboratorio D5b — refactor backend
sidebar_position: 2
---

# Laboratorio D5b — refactor backend

> **Stato**: documento di lavoro per allineare il backend al rifacimento UX `D5b-laboratorio-workbench.md` (cartella `claude-cowork/Sviluppo Bambino/input/produzioni/webapp-hcaire/specifiche/`). La spec D5b descrive solo il frontend; questo documento traduce le sue richieste in un piano di refactor concreto del server e del modello dati. Da rivedere e validare prima di iniziare l'implementazione.

## 1. Sintesi

D5b introduce un **modello a tre entità** (Archivio temi → Tema/RicercaF2 → DispositivoF3 contestualizzato, 1-1-N) che rimpiazza il modello implicito attuale (1 ricerca → 1 tema F3, accoppiati via `pending_decision`).

**Decisione di design semplificante** (suggerita 2026-05-05, conforme a §1.4.1 della spec stessa: *"Non sono due entità: sono due stati di vita della stessa cosa"*):

> **Archivio e Laboratorio condividono UNA sola collezione `temi`**, distinta da un campo `stato` (lifecycle §1.4.2). Quando `stato ∈ {bozza, maturo}` il tema è visibile solo nell'Archivio; quando `stato ∈ {promosso, f2_in_corso, ...}` è visibile nel Laboratorio. La "promozione" è un flip di `stato`, non una copia.

Questa scelta riduce drasticamente il refactor: nessuna doppia scrittura, nessuna sincronizzazione archivio↔laboratorio. L'unica entità nuova è `dispositivi_f3` (1-N rispetto a `temi`).

## 2. Stato corrente (modello implicito)

### 2.1 Collection `pipeline_contexts`

Una sola collection con discriminator `context_type`:

```ts
{
  context_type: 'ricerca' | 'tema',
  context_id: string,           // unique, slug
  label: string,
  theme_id: string | null,      // valorizzato sui 'tema' — punta al theme_id F2 selezionato
  ricerca_origine: string | null, // valorizzato sui 'tema' — punta al context_id della ricerca madre
  dispositivo_sorgente: {...} | null,
  step_states: Record<string, IStepState>,
  pending_decision: IHumanDecision | null,
  steps_completed: string[],
  steps_in_progress: string[],
  steps_failed: string[],
  robustezza, correzioni_residue, has_revisioni
}
```

Oggi `context_type: 'ricerca'` e `context_type: 'tema'` sono in **relazione 1-1** di fatto:

- Una ricerca esegue gli step F2 fino a `f2_step_5` verificato.
- L'evento di verifica di `f2_step_5` (in `pipelineController.verifyExecution`) crea una `pending_decision` di tipo `f2_to_f3_tema_selection` con i temi candidati.
- L'admin sceglie un tema → `postRicercaDecision` crea **un singolo** `context_type: 'tema'` con `step_states` F2 ereditati dalla ricerca, e da lì parte la pipeline F3.
- Non c'è alcun vincolo strutturale "una ricerca → N temi", ma la UI/API di fatto ne crea uno solo.

### 2.2 Flussi backend impattati

| Punto | Cosa fa oggi |
|-------|--------------|
| `pipelineController.verifyExecution` | Su `f2_step_5` verificato, crea `pending_decision: 'f2_to_f3_tema_selection'` con array `options` derivato da `output_data.results[].theme_id` |
| `pipelineController.postRicercaDecision` | Riceve `selected_theme`, crea il context F3 ereditando step_states F2 |
| `stepEnablement.DECISION_BLOCKS_STEP` | `f2_to_f3_tema_selection` blocca `f3_step_1` |
| `routes/pipeline.ts` | Espone GET/POST per ricerche + temi come entità simmetriche |

## 3. Stato target (D5b)

### 3.1 Modello a entità

```
ARCHIVIO TEMI         (UI: /archivio/temi — fuori scope D5b)
        ↓ promozione (stato → 'promosso')
TEMA / RICERCA F2     (UI: /laboratorio/temi/:temaId — pipeline F2)
        ↓ contestualizzazione (atto deliberato, ripetibile)
DISPOSITIVO F3        (UI: /laboratorio/temi/:temaId/dispositivi/:contestoId)
   pipeline F3        ←── 1-N rispetto al Tema
   per (tema, contesto)
```

### 3.2 Lifecycle del Tema (§1.4.2 spec)

```
[bozza] → [maturo] → [promosso] → [f2_in_corso] → [f2_verificata] → [f3_in_corso (1+ contesti)]
                                                          │
                                                          ↓
                                       [parcheggiato] / [abbandonato] / [archiviato]
```

| Stato | Significato | UI: archivio | UI: laboratorio |
|-------|-------------|:---:|:---:|
| `bozza` | candidato in raccolta | ✓ | — |
| `maturo` | pronto per promozione | ✓ | — |
| `promosso` | promosso, F2 non ancora avviata | ✓ (badge) | ✓ |
| `f2_in_corso` | F2 in esecuzione | ✓ (badge) | ✓ |
| `f2_verificata` | F2 completata, può creare dispositivi | ✓ (badge) | ✓ |
| `parcheggiato` | F2 sospesa | ✓ (badge) | ✓ (read-only) |
| `abbandonato` | F2 abbandonata | ✓ (badge) | — |
| `archiviato` | concluso e archiviato | ✓ (filtro) | ✓ (read-only) |

### 3.3 Lifecycle del Dispositivo F3

Più semplice (deriva da step_states):

```
non_avviato → in_corso → verificato (10/10 step) → archiviato
                  ↓
              parcheggiato | abbandonato
```

## 4. Mappa del refactor: collection

### 4.1 Decisione: due collection separate

Da `pipeline_contexts` (con discriminator) → due collection distinte:

#### 4.1.1 `temi`

Sostituisce i record con `context_type: 'ricerca'`. Aggiunge il campo `stato` (lifecycle §3.2).

```ts
{
  tema_id: string,              // unique, slug — = ex context_id
  label: string,                // titolo leggibile
  stato: TemaStato,             // 'bozza' | ... | 'archiviato'

  // Metadati anagrafici (dall'Archivio)
  descrizione: string,
  fonti: string[],
  asse_dominante: string | null,
  note_ricercatore: string,

  // Pipeline F2 (subset di step F2: 2, 2a, 3, 4, 4b, 5, 6 — NO step 1)
  step_states: Record<string, IStepState>,
  pending_decision: IHumanDecision | null,   // SOLO step7_context_selection da rimanere — vedi §5.3
  steps_completed: string[],
  steps_in_progress: string[],
  steps_failed: string[],

  createdAt, updatedAt,
  promosso_at: Date | null,
  parcheggiato_at, abbandonato_at, archiviato_at: Date | null
}
```

Indici: `tema_id` unique, `stato`.

#### 4.1.2 `dispositivi_f3`

Nuova. Sostituisce i record con `context_type: 'tema'`. Relazione N-1 con `temi` (una `tema_id` può avere N `dispositivi_f3`).

```ts
{
  _id: ObjectId,                // PK interno (decisione Q5: ObjectId, non slug derivato)
  tema_id: string,              // FK → temi.tema_id
  contesto_id: string,          // slug del contesto (es. 'clinico-9-24m')
  contesto_label: string,       // leggibile
  dominio: 'clinico' | 'educativo' | 'formazione' | 'politiche',
  note: string,

  // Metadati strutturali del contesto: popolati da f3_step_7 quando viene eseguito
  // (oppure null finché lo step 7 non è arrivato)
  contesto_metadati: {
    sottodominio?: string,
    fascia_eta?: string,
    setting?: string,
    profilo_osservatore?: string,
  } | null,

  // dispositivo_sorgente: copiato/ereditato qui se il dispositivo è una specializzazione
  dispositivo_sorgente: IDispositivoSorgente | null,

  // Pipeline F3 (step 1–10 + 6b/6c)
  step_states: Record<string, IStepState>,
  pending_decision: IHumanDecision | null,    // SOLO step7_context_selection
  steps_completed: string[],
  steps_in_progress: string[],
  steps_failed: string[],
  robustezza, correzioni_residue, has_revisioni,

  createdAt, updatedAt,
  parcheggiato_at, abbandonato_at, archiviato_at: Date | null
}
```

Indici: `_id` PK (ObjectId), `(tema_id, contesto_id)` unique, `tema_id`.

API: l'identità esterna del dispositivo è `(tema_id, contesto_id)`. Le rotte usano `/api/pipeline/temi/:temaId/dispositivi/:contestoId/...`. L'`_id` ObjectId è interno, usato solo per FK con `pipeline_step_executions`.

### 4.2 Migrazione dei dati esistenti

**Decisione (Q4)**: drop. Procedura:

1. Backup mongodump (per sicurezza, prima di toccare).
2. `db.pipeline_contexts.drop()`.
3. `db.pipeline_step_executions.drop()`.
4. `db.pipeline_external_inputs.drop()`.
5. Le collection `temi`, `dispositivi_f3`, `pipeline_step_executions`, `pipeline_external_inputs` vengono create al primo insert dal nuovo backend.

Niente script di migrazione. I dati esistenti sono test cancellabili.

### 4.3 Output `f2_step_1` come fonte di seed/import

Lo step `f2_step_1` esce dalla pipeline UI ma il suo output (file `theme-discovery-v{N}.json` con lista candidati) **resta riusabile**:

- All'avvio dell'Archivio (futuro), si può fornire una funzione "Importa candidati da output step 1": l'admin punta a un file `theme-discovery-v1.json` (presente in `client/public/pipeline/ricerche/.../`), il sistema crea N record `temi` in stato `bozza` con metadati popolati dai campi `theme_id`, `theme_label`, `description`, ecc.
- Anche lo static `client/src/data/theme-discovery-v1.json` (oggi consumato da `SviluppoBambinoProduzioniTemiPage`) può essere bootstrap iniziale dell'Archivio. Vedi anche [Produzioni §8.6](../20-modules/sviluppo-bambino/produzioni.md#86-riallineamento-temi-page--pipeline) (riallineamento `Temi page`↔pipeline noto come critico).

## 5. Mappa del refactor: codice server

### 5.1 Modelli Mongoose

| File | Azione |
|------|--------|
| `server/src/models/PipelineContext.ts` | **Sostituire** con due nuovi modelli (vedi §4.1) — oppure rinominare in `Tema.ts` + creare `DispositivoF3.ts`. |
| `server/src/models/Tema.ts` | **NUOVO**. |
| `server/src/models/DispositivoF3.ts` | **NUOVO**. |
| `server/src/models/PipelineStepExecution.ts` | **Modificare**. Aggiungere `entity_kind: 'tema' \| 'dispositivo'` + `entity_id`. Il vecchio `context_id` diventa `entity_id`, il vecchio `context_type` diventa `entity_kind`. |
| `server/src/models/PipelineExternalInput.ts` | **Modificare**. Stesso refactor: `entity_kind` + `entity_id`. |

### 5.2 Controller

`server/src/controllers/pipelineController.ts` (oggi 1257 righe):

| Funzione | Azione |
|----------|--------|
| `getIndex` | **Modificare**. Estendere con `?include=dispositivi_summary`. Risposta: `{ temi: TemaSummary[] }` con `dispositivi: DispositivoSummary[]` annidati. |
| `getStepConfig` | Invariato. |
| `getTema` | **Rinominare/riscrivere**. Path `/api/pipeline/temi/:temaId` → ritorna context F2 + filtro su step F2 della step config. |
| `getRicerca` | **Rimuovere**. Funzione assorbita da `getTema`. |
| `getDispositivo` | **NUOVO**. Path `/api/pipeline/temi/:temaId/dispositivi/:contestoId`. Ritorna context F3 + step config F3. |
| `getExecutionOutput`, `getStepHistory`, `getContextStepOutput` | **Modificare**. Refactor per usare `entity_kind/entity_id` invece di `context_id`. |
| `runStep` | **Modificare**. La rotta diventa o `/api/pipeline/temi/:temaId/steps/:stepId/run` o `/api/pipeline/temi/:temaId/dispositivi/:contestoId/steps/:stepId/run`. La logica interna lavora su `entity_kind` + `entity_id`. Risolutore di `inputs_pipeline` per F3: deve leggere `output_file` di `f2_step_6` dalla `temi` collection (non più dal context F3 stesso). |
| `cancelExecution`, `verifyExecution` | **Modificare**. `verifyExecution` su `f2_step_5` **NON crea più** `pending_decision: 'f2_to_f3_tema_selection'`. Su `f2_step_5` verificato, transita lo stato del tema a `f2_verificata` e basta. Su `f2_step_6` verificato, *idem* (`f2_verificata` solo dopo `f2_step_6` verificato — vedi §5.3). |
| `getStepInputs`, `postStepInput`, `deleteExternalInput` | **Modificare**. Refactor per `entity_kind/entity_id`. |
| `getTemaPendingDecision`, `getRicercaPendingDecision` | **Consolidare** in `getEntityPendingDecision(kind, id)`. |
| `postRicercaDecision` | **Rimuovere**. Sostituita da `postNuovoDispositivo` (vedi sotto). |
| `postTemaDecision` | **Mantenere** ma solo per `step7_context_selection`. |
| `createRicerca` | **Rimuovere o spostare** in `postPromuoviTema` (lifecycle archivio→laboratorio). La promozione è atto dell'Archivio (fuori scope D5b) ma probabilmente: trova `tema` esistente in stato `maturo`, flip a `promosso`. |
| `getSystemStatus` | Invariato. |
| `streamExecutionLogs` | Invariato. |
| `resetStep`, `skipStep` | **Modificare**. Refactor per `entity_kind/entity_id`. |
| `postNuovoDispositivo` | **NUOVO**. Path `POST /api/pipeline/temi/:temaId/dispositivi`. Body `{ contesto_id, contesto_label, dominio, note }`. Crea record `dispositivi_f3` ereditando step_states F2 dal tema (per la dipendenza di `f3_step_1` da `f2_step_6`). Ritorna `dispositivo_id`. |
| `getDispositiviTema` | **NUOVO**. Path `GET /api/pipeline/temi/:temaId/dispositivi`. Lista dei dispositivi figli con summary stato. |
| `parcheggiaTema`, `abbandonaTema`, `archiviaTema`, `riprendiTema` | **NUOVO**. Endpoint per le transizioni di stato manuali (lifecycle §3.2). |

### 5.3 `stepEnablement.ts`

`HumanDecisionType` rimane definito per `step7_context_selection`. Rimuovere `f2_to_f3_tema_selection` da `DECISION_BLOCKS_STEP`:

```ts
// Prima:
const DECISION_BLOCKS_STEP = {
  f2_to_f3_tema_selection: ['f3_step_1'],   // ← RIMUOVERE
  step7_context_selection: ['f3_step_7'],
};

// Dopo:
const DECISION_BLOCKS_STEP = {
  step7_context_selection: ['f3_step_7'],
};
```

I test in `__tests__/stepEnablement.test.ts` includono `pending_decision f2_to_f3 blocca f3_step_1` (vedi suite). Da rimuovere.

`evaluateStepEnablement` continua a essere data-driven sul `pipeline-step-config.json`. La differenza è solo che gli step F2 e F3 vengono valutati su collection diverse (questa è scelta del controller, non del valutatore).

### 5.4 `pipeline-step-config.json`

Modifiche (decisione Q3):

- `f2_step_1` **rimosso** dall'array `steps`. Niente flag `excluded_from_pipeline_ui`.
- Anche `local/src/pipeline/constants.ts STEP_FOLDER_MAP`: rimuovere `f2_step_1`.
- Anche `client/src/types/pipeline.ts PipelineStepId`: rimuovere `'f2_step_1'`.
- Anche `client/src/components/pipeline/DeviceLineage.tsx STEP_NAME` e `client/src/pages/sviluppo-bambino/SviluppoBambinoPipelineMap.tsx STEP_LABEL`: rimuovere l'entry.

`f3_step_1.inputs_pipeline` ha già `step: 'f2_step_6'` come primario (fatto in pipeline v2.0). La risoluzione cross-collection è descritta in §5.5.

### 5.5 Mongoose: cross-collection lookup per step F3 con dipendenze F2

**Decisione Q6**: riferimento live al tema. Niente snapshot di step_states F2 al momento della creazione del dispositivo.

Oggi `buildExecutionPlan` legge `output_file` da `contextDoc.step_states[depStepId]`. Con due collection separate ed ereditarietà live, eseguendo uno step F3 su un dispositivo:

- Dipendenze F3 (es. `f3_step_2` dipende da `f3_step_1`) → letti dal `dispositivo` doc corrente.
- Dipendenze F2 (es. `f3_step_1` dipende da `f2_step_6`) → letti **live** dal `tema` doc associato (via `dispositivo.tema_id`). Una query in più per esecuzione.

Pattern:

```ts
async function buildExecutionPlan(
  entity: ITema | IDispositivoF3,
  entityKind: 'tema' | 'dispositivo',
  stepConfig: StepConfig,
  runNumber: number,
): Promise<ExecPlan> {
  // Pre-carica il tema madre se l'entità corrente è un dispositivo:
  // serve solo se ci sono dipendenze F2 (il caso comune di f3_step_1).
  const hasF2Deps = (stepConfig.inputs_pipeline ?? []).some((d) => d.step.startsWith('f2_'));
  let temaDoc: ITema | null = null;
  if (entityKind === 'dispositivo' && hasF2Deps) {
    const dispositivo = entity as IDispositivoF3;
    temaDoc = await Tema.findOne({ tema_id: dispositivo.tema_id }, { step_states: 1 }).lean();
    if (!temaDoc) {
      throw new Error(`Tema madre "${dispositivo.tema_id}" non trovato`);
    }
  }

  const inputFiles = [];
  for (const dep of stepConfig.inputs_pipeline ?? []) {
    if (!dep.required) continue;
    // Source: tema madre se F2 in contesto dispositivo, altrimenti entità corrente
    const sourceStates = (entityKind === 'dispositivo' && dep.step.startsWith('f2_'))
      ? temaDoc!.step_states
      : entity.step_states;
    const file = sourceStates[dep.step]?.output_file;
    if (file) inputFiles.push({ role: dep.role, path: file });
  }
  // ...
}
```

**Implicazione operativa**: se il ricercatore rilancia uno step F2 su un tema che ha già dispositivi F3 in corso, gli step F3 successivi (di tutti i dispositivi figli) leggeranno **automaticamente la nuova versione** dell'output. Questo è il comportamento single-source-of-truth desiderato — al netto del rischio di inconsistenze se il dispositivo ha già completato uno step F3 con la vecchia versione (lo step F3 va re-eseguito per usare la nuova). Da gestire con UI: warning "Il tema madre è stato modificato, alcuni step di questo dispositivo potrebbero essere stale".

### 5.6 Routing (`server/src/routes/pipeline.ts`)

| Path attuale | Path nuovo | Azione |
|--------------|-----------|--------|
| `GET /api/pipeline/index` | `GET /api/pipeline/index?include=dispositivi_summary` | Estendere |
| `GET /api/pipeline/step-config` | invariato | — |
| `GET /api/pipeline/temi/:temaId` | invariato (semantica cambia: solo F2) | Modificare |
| `GET /api/pipeline/ricerche/:ricercaId` | **rimuovere** | Sostituito da `temi/:temaId` |
| `GET /api/pipeline/temi/:temaId/dispositivi` | **NUOVO** | Lista figli |
| `POST /api/pipeline/temi/:temaId/dispositivi` | **NUOVO** | Crea dispositivo |
| `GET /api/pipeline/temi/:temaId/dispositivi/:contestoId` | **NUOVO** | Detail F3 |
| `POST /api/pipeline/temi/:temaId/steps/:stepId/run` | invariato (semantica cambia: solo F2) | Modificare |
| `POST /api/pipeline/temi/:temaId/dispositivi/:contestoId/steps/:stepId/run` | **NUOVO** | Run F3 |
| `POST /api/pipeline/ricerche/:ricercaId/decisions` | **rimuovere** | Sostituito da `postNuovoDispositivo` |
| `PATCH /api/pipeline/temi/:temaId/stato` | **NUOVO** | Transizioni di lifecycle (parcheggia, abbandona, archivia, riprendi) |

## 6. Mappa del refactor: codice client

Solo riepilogo (la spec D5b §13 ha l'inventario completo dei file). Da rimuovere lato client:

- `client/src/components/pipeline/orchestration/{OrchestrationPanel,StepList,StepRow,ExternalInputForm,ExecutionLogViewer,VerificationPanel}.tsx` (sostituiti).
- `client/src/components/pipeline/orchestration/{HumanDecisionDialog,PendingDecisionBanner}.tsx` → spostati in `components/laboratorio/` con riduzione varianti (`HumanDecisionDialog` solo `step7_context_selection`).
- I consumer attuali (`SviluppoBambinoPipelineRicercaOverview`, `SviluppoBambinoPipelineDeviceOverview` tab "Esegui") vanno modificati per linkare al Laboratorio invece di montare l'OrchestrationPanel.

⚠ **Effetto collaterale**: `client/src/pages/AdminLetturaDetail.tsx` (modulo letture) **riusa lo stesso `OrchestrationPanel`** del modulo produzioni.

**Decisioni Q1 + Q8**: l'OrchestrationPanel viene rimosso, ma le letture **non** ereditano il pattern Laboratorio (sarebbe overkill per la pipeline letture). Le letture critiche ottengono un orchestratore proprio, più semplice — vedi §11.

## 7. Sequenza di lavoro consigliata

Ordine in cui i pezzi possono essere costruiti senza rompere ciò che esiste. La spec D5b ha la sua roadmap (§20) frontend-centrica; questa è simmetrica lato backend.

### B0 — Decisioni di scope ✓ chiuse il 2026-05-05

Vedi §8. Riassunto operativo:

- ✓ AdminLetturaDetail: legacy rimosso, nuovo orchestratore semplificato fuori dalla famiglia Laboratorio.
- ✓ Archivio: pagina di data-entry (no Cowork integration in questa fase).
- ✓ `f2_step_1` rimosso completamente.
- ✓ Drop dei contesti esistenti (test).

### B1 — Modelli Mongoose

- [ ] Creare `Tema.ts` (con campo `stato`).
- [ ] Creare `DispositivoF3.ts`.
- [ ] Modificare `PipelineStepExecution.ts` con `entity_kind` + `entity_id`.
- [ ] Modificare `PipelineExternalInput.ts` con `entity_kind` + `entity_id`.
- [ ] Eliminare `PipelineContext.ts` (o lasciarlo ma non più usato — meglio eliminare per evitare accoppiamenti).

### B2 — Endpoint nuovi

- [ ] `GET /api/pipeline/temi/:temaId/dispositivi`.
- [ ] `POST /api/pipeline/temi/:temaId/dispositivi`.
- [ ] `GET /api/pipeline/temi/:temaId/dispositivi/:contestoId`.
- [ ] `POST /api/pipeline/temi/:temaId/dispositivi/:contestoId/steps/:stepId/run`.
- [ ] `PATCH /api/pipeline/temi/:temaId/stato` (transizioni lifecycle).
- [ ] `GET /api/pipeline/index?include=dispositivi_summary`.

### B3 — Refactor controller esistente

- [ ] `runStep`, `verifyExecution`, `cancelExecution`, `resetStep`, `skipStep`, `postStepInput`, ecc.: refactor per usare `entity_kind` + `entity_id` e le due collection.
- [ ] `verifyExecution` su `f2_step_5`: rimuovere creazione `pending_decision: 'f2_to_f3_tema_selection'`. Su `f2_step_6` verificato: aggiornare `temi.stato` a `f2_verificata`.
- [ ] `buildExecutionPlan`: implementare cross-collection lookup per dipendenze F2 di step F3 (§5.5).
- [ ] Rimuovere `getRicerca`, `postRicercaDecision`, `createRicerca`. Le loro funzioni utili migrano dove pertinente.
- [ ] `stepEnablement.ts`: rimuovere `f2_to_f3_tema_selection` da `DECISION_BLOCKS_STEP`. Aggiornare i test.

### B4 — Config

- [ ] `pipeline-step-config.json`: marcare `f2_step_1` con `excluded_from_pipeline_ui: true` (oppure rimuovere — decisione B0).

### B5 — Smoke test (con BE pronto, FE ancora vecchio)

A questo punto, il vecchio `OrchestrationPanel` non funzionerà più (le rotte sono cambiate). Il sito è in stato "broken" sulle pagine pipeline. **Si deve coordinare con la roadmap frontend D5b**: o si fa il FE in parallelo, o si tiene un branch separato finché FE non è pronto, o si introduce uno shim API che rimanda alle rotte vecchie temporaneamente.

### B6 — Migrazione lettura cross-collection in step F3

Verifica che `f3_step_1` su un dispositivo nuovo legga correttamente `output_file` di `f2_step_6` dal tema madre. Test end-to-end MOCK_MODE per la pipeline F3.

## 8. Decisioni prese (2026-05-05)

Tutte le 8 domande aperte sono state chiuse:

| ID | Decisione | Conseguenza |
|----|-----------|-------------|
| **Q1** | `AdminLetturaDetail` viene riscritto. Il legacy `OrchestrationPanel` può essere eliminato. | Le letture richiedono un proprio orchestratore semplificato — vedi §6 e §11 (nuovo). |
| **Q2** | Archivio temi specificato ora come **pagina di data-entry**. La funzione di ricerca temi assistita da Cowork è futuro lavoro. | L'Archivio non è MVP embedded ma neanche pieno: una sola pagina form di CRUD sui temi candidati. |
| **Q3** | `f2_step_1` **esce completamente** dal `pipeline-step-config.json`. Non serve più: il suo ruolo (proporre temi) può tornare in futuro come funzione dell'Archivio integrata con Cowork (vedi Q2). | Niente flag `excluded_from_pipeline_ui`. Riga rimossa. `STEP_FOLDER_MAP` del worker locale: rimuovere `f2_step_1`. `STEP_NAME` di `DeviceLineage` e `STEP_LABEL` di `SviluppoBambinoPipelineMap`: rimuovere `f2_step_1`. `PipelineStepId` di `client/src/types/pipeline.ts`: rimuovere `f2_step_1`. |
| **Q4** | **Drop** dei `pipeline_contexts` esistenti (sono test cancellabili). | Niente script di migrazione. La nuova app parte con collection vuote. |
| **Q5** | `dispositivo_id` = **ObjectId**. | URL e log usano ObjectId; lo slug `contesto_id` resta come campo identificativo per la UI. La rotta canonica passa per `(tema_id, contesto_id)` lato API; `dispositivo_id` è il PK interno. |
| **Q6** | **Riferimento al tema (live)**. Niente copia di step_states F2 al momento della creazione del dispositivo. | `buildExecutionPlan` su step F3 con dipendenze F2 fa una query in più su `temi`. Single source of truth: se il tema venisse modificato, gli step F3 successivi vedrebbero la nuova versione. |
| **Q7** | Transizioni di lifecycle del tema: **manuali via UI admin**. | Endpoint `PATCH /api/pipeline/temi/:temaId/stato` con body `{ nuovo_stato, motivo? }`. L'auto-archiviazione è futuro lavoro. |
| **Q8** | Letture critiche: **NO Laboratorio**. Pattern non replicato per ora. | AdminLetturaDetail riscritto in modo più semplice (vedi §11). Non eredita la struttura Workbench/Timeline. |

## 9. Stima ad alto livello

- **B0** (decisioni): ✓ chiuse il 2026-05-05.
- **B1** (modelli): 1 giornata.
- **B2** (endpoint nuovi): 2-3 giornate.
- **B3** (refactor controller): 3-5 giornate.
- **B4** (config): 0.5 giornate.
- **B5** (coordinamento con FE): trasversale, non stimabile in isolamento.
- **B6** (smoke test cross-collection): 1 giornata.
- **§11** (refactor letture critiche): 2-3 giornate (vedi sotto).
- **§12** (Archivio temi data-entry): 1-2 giornate (vedi sotto).

**Totale backend**: ~10-15 giornate uomo nette + coordinamento con FE (roadmap D5b §20: 8 tappe × 1-3 giorni).

## 10. Cosa NON cambia

Per chiarezza:

- Protocollo Redis (D3) — invariato.
- `messageBus.ts`, `pipelineEventSubscriber.ts`, `lettureMessageBus.ts` — invariati.
- Worker `local/` — invariato (riceve sempre `entity_id` come stringa, non gli importa la collection di origine).
- Webhook, auth, subscription — invariati.

## 11. AdminLetturaDetail (Q1 + Q8) — refactor parallelo

Le letture critiche **non** ereditano il pattern Laboratorio (Q8). Ma l'`OrchestrationPanel` legacy viene rimosso (Q1 + naturale conseguenza della rimozione lato produzioni). Quindi `AdminLetturaDetail` va riscritto con un proprio orchestratore.

### 11.1 Vincolo: la pipeline letture è già "leggera"

A differenza delle produzioni F2/F3 (con sub-step, varianti `6b/6c`, dipendenze cross-fase, decisioni umane), la pipeline letture (vedi modulo [Letture](../20-modules/letture.md)) è una catena lineare a 10 step (4 di analisi + 6 editoriali) **senza pending decision** e con dipendenze rigorose lineari. Non serve la timeline + workbench della spec D5b.

### 11.2 Proposta: pannello dedicato

Un componente nuovo `LetturaPipelinePanel` (o nome equivalente) che monta in `AdminLetturaDetail`:

- Lista step verticale (più simile al vecchio `StepList` ma riscritto).
- Per ogni step espandibile inline: stato, log, output (riusa `LettureOutputViewer` esistente).
- Pulsante "Run" per ogni step lanciabile.
- Niente decisione umana, niente complessità a 3 zone.

L'unico riuso da D5b/Laboratorio è eventuale: estrarre `LiveLogPanel` come componente standalone (senza dipendenza dal `Workbench`) e farlo consumare anche dalle letture per il live log.

### 11.3 Backend letture invariato

`server/src/routes/letture.ts`, `controllers/lettureController.ts`, `models/Opera.ts` rimangono invariati. La pipeline letture ha il suo schema (`Opera.pipeline.step_X`) embedded, separato dal modello `pipeline_contexts`. Il refactor del modello produzioni non li tocca.

### 11.4 Sequenza

Va in **parallelo** con il Laboratorio. Si può fare prima, dopo, o durante. È un pezzo isolato che non blocca né è bloccato dal refactor produzioni.

## 12. Archivio temi (Q2) — pagina di data-entry

La spec D5b assume l'esistenza dell'Archivio ma non lo specifica. Decisione Q2: realizzarlo subito come **pagina di CRUD manuale**. La funzione di "ricerca temi assistita" (con riuso di `f2_step_1` ora rimosso dalla pipeline) torna come funzione integrata in futuro.

### 12.1 UI proposta

| Path | Componente | Funzione |
|------|------------|----------|
| `/archivio/temi` | `ArchivioTemiIndexPage` | Lista candidati con filtro per stato (`bozza`/`maturo`/promossi/altro) |
| `/archivio/temi/nuovo` | `ArchivioTemaFormPage` | Form di creazione |
| `/archivio/temi/:temaId` | `ArchivioTemaFormPage` | Form di modifica |
| `/archivio/temi/:temaId/promuovi` | `ArchivioPromuoviDialog` | Modal di conferma promozione |

Tutto gated `useIsAdmin()`.

### 12.2 Form di data-entry

```
Titolo del tema *           [_______________]
Slug *                      [_______________]   (kebab-case, unique)
Descrizione                 [_______________]
                            [_______________]
Asse dominante presunto     ◯ asse_1 ◯ asse_2 ... ◯ asse_6
Fonti                       [+ aggiungi fonte] (URL o citazione)
Note del ricercatore        [_______________]

Stato                       ◯ bozza   ◯ maturo
                            (solo `maturo` è promuovibile)

                            [Annulla]   [Salva]
```

### 12.3 Endpoint backend

| Verb | Path | Funzione |
|------|------|----------|
| `GET` | `/api/archivio/temi` | Lista filtrabile per `stato`, paginata |
| `POST` | `/api/archivio/temi` | Crea (stato iniziale `bozza` o `maturo`) |
| `GET` | `/api/archivio/temi/:temaId` | Detail |
| `PUT` | `/api/archivio/temi/:temaId` | Aggiorna metadati (consentito solo se `stato ∈ {bozza, maturo}`) |
| `DELETE` | `/api/archivio/temi/:temaId` | Elimina (solo se `stato ∈ {bozza, maturo}`) |
| `POST` | `/api/archivio/temi/:temaId/promuovi` | Flip `stato: maturo → promosso`. Redirige il client a `/laboratorio/temi/:temaId`. |

Tutti `requireAdmin`.

### 12.4 Stessa collection `temi`

Niente schema separato. La collection `temi` (§4.1.1) è condivisa tra Archivio e Laboratorio. L'Archivio mostra i record con `stato ∈ {bozza, maturo, promosso, parcheggiato, abbandonato, archiviato}` (filtrati per UI). Il Laboratorio mostra i record con `stato ∈ {promosso, f2_in_corso, f2_verificata, parcheggiato, archiviato}`.

Sovrapposizione voluta: i temi `promosso`/`parcheggiato`/`archiviato` sono visibili (con badge) in entrambi gli ambienti. Il read-write è regolato dallo stato:

| Stato | Modificabile in Archivio | Modificabile in Laboratorio |
|-------|:---:|:---:|
| `bozza` | sì | — |
| `maturo` | sì (incluso "promuovi") | — |
| `promosso` | no (solo lettura + cambio stato lifecycle) | sì (avvio F2) |
| `f2_in_corso` | no | sì |
| `f2_verificata` | no | sì (crea dispositivi) |
| `parcheggiato` | no (solo "riprendi") | no (read-only) |
| `abbandonato` | no | — |
| `archiviato` | no | no (read-only) |

### 12.5 Fonti di seed iniziali

Per popolare l'Archivio al primo avvio, due fonti già esistenti:

1. **Static `client/src/data/theme-discovery-v1.json`** — 10 temi candidati hardcoded usati oggi da `SviluppoBambinoProduzioniTemiPage`. Possono essere importati in `temi` con stato `maturo`. Vedi anche [Produzioni §8.6](../20-modules/sviluppo-bambino/produzioni.md#86-riallineamento-temi-page--pipeline) (riallineamento già notato come necessario).
2. **Output passati di `f2_step_1`** — i file `theme-discovery-v{N}.json` sotto `client/public/pipeline/ricerche/.../`. Importabili come `bozza` per evidenziare che sono candidati storici da revisionare.

Implementazione minima: uno script `scripts/seed-archivio.mjs` che popola la collection `temi` da queste fonti al primo deploy. Idempotente (skippa i record con slug già esistente).

### 12.6 Sequenza

L'Archivio è **prerequisito** del Laboratorio: senza Archivio non c'è modo di promuovere un tema, e senza promozione non si entra nel Laboratorio. Quindi nella roadmap:

- **B7** (Archivio) prima di **B5** (smoke test Laboratorio end-to-end). Se si fa B5 con un tema "fittizio" creato a mano via mongosh, va bene per dev, ma il flusso completo richiede l'Archivio.
