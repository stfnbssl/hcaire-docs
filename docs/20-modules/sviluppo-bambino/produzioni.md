---
title: Produzioni — visualizzazione pipeline F2/F3
sidebar_label: Produzioni
sidebar_position: 1
---

# Sezione Produzioni

Scheda funzionale della sezione **Produzioni** (`/sviluppo-bambino/produzioni/*`). Espone al lettore la pipeline `F2 → F3` di costruzione dispositivi configurazionali a partire da temi empiricamente fondati. Per la sezione server-side (modello dati, controller, orchestrazione step) vedi la scheda dedicata **[Pipeline orchestrazione](../pipeline-orchestrazione.md)**.

## 1. Scopo

Mostrare la pipeline `F2 (ricerca tematica) → F3 (micro-dispositivo di campo)` come oggetto ispezionabile:

- la **mappa** delle ricerche F2 e dei temi/dispositivi F3 prodotti;
- la **provenienza** di ciascun tema (ricerca origine, dispositivo sorgente, input esterni);
- la **struttura** del dispositivo finale (configurazione, dimensioni di lettura, proxy operativo, osservabilità, non-classificabilità, warning, validazione);
- gli **stress test** con verdetto per caso e robustezza globale;
- le **correzioni** applicate dopo le fratture rilevate;
- la **storia decisionale** (revisioni in markdown).

L'admin orchestra l'esecuzione step-by-step da `/sviluppo-bambino/produzioni/pipeline/...` (e dalle pagine ricerca/tema) e dialoga con la pipeline tramite il [ponte Cowork](../../10-architecture/local-cowork-bridge.md).

## 2. Rotte

| Path FE | Componente | Funzione |
|---------|------------|----------|
| `/sviluppo-bambino/produzioni` | `SviluppoBambinoProduzioniLanding` | Landing narrativa (cos'è una produzione, processo produttivo) |
| `/sviluppo-bambino/produzioni/temi` | `SviluppoBambinoProduzioniTemiPage` | Catalogo dei temi candidati (sorgente: `theme-discovery-v1.json` statico, da riallineare all'Archivio) |
| `/sviluppo-bambino/produzioni/pipeline` | `SviluppoBambinoPipelineMap` | Mappa master-detail: ricerche F2 + ambiti del tema selezionato + temi F3 |
| `/sviluppo-bambino/produzioni/pipeline/nuova-ricerca` | `SviluppoBambinoPipelineNuovaRicerca` | Form creazione ricerca F2 dal tema scelto |
| `/sviluppo-bambino/produzioni/pipeline/ricerche/:ricercaId` | `SviluppoBambinoPipelineRicercaOverview` | Overview ricerca F2 + step + bridge ambiti |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId` | `SviluppoBambinoPipelineDeviceOverview` | Panoramica tema F3 (Panoramica / Provenienza / Correzioni / Storia) |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/dispositivo` | `SviluppoBambinoPipelineDeviceViewer` | Vista strutturale completa del dispositivo finale |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/stress-test` | `SviluppoBambinoPipelineStressTest` | Casi di test, verdetti, valutazione globale |

Nav:

- `SviluppoBambinoProduzioniNav` — barra con link Temi / Pipeline.
- `SviluppoBambinoPipelineNav` — breadcrumb dinamico (Mappa / Ricerca: X / Tema: Y / Dispositivo|Stress test).

## 3. Modello della pipeline

### Fase 2 — Ricerche tematiche (7 step lineari)

| Step | Etichetta | File-prefix | Skippabile |
|------|-----------|-------------|-----------|
| `f2_step_2` | Rilevanza | `theme-relevance-*.json` | no |
| `f2_step_2a` | Verifica nodi trasversali (mappatura su N1–N7) | `node-verification-*.json` | sì |
| `f2_step_3` | Verifica | `theme-verification-*.json` | no |
| `f2_step_4` | Matrice | `theme-matrix-*.json` | no |
| `f2_step_4b` | CE prototipica (grammatica S, R, D, T, A) | `ce-prototipica-*.json` | sì |
| `f2_step_5` | Output family | `output-family-*.json` | no |
| `f2_step_6` | Output-tipo vuoto (**passaporto del tema**) | `output-tipo-vuoto-*.json` | no |

Sequenza lineare forzata `2 → 2a → 3 → 4 → 4b → 5 → 6`. Una **ricerca** è un `PipelineContext` con `context_type='ricerca'`. Il tema arriva dall'[Archivio Temi](../archivio-temi.md) tramite un input esterno auto-popolato `scelta_tema`.

### Bridge F2 → F3 (1→N tema → dispositivi)

Quando `f2_step_6` raggiunge `completato`, il subscriber server scrive atomicamente un `pending_decision` `f2_to_f3_tema_selection` sulla ricerca. La decisione permette di definire **ambiti operativi** per il tema (uno o più, ciascuno aprirà una pipeline F3 dedicata).

Modello dati (embedded su `PipelineContext` della ricerca):

```ts
tema_ambiti: Record<theme_id, TemaAmbito[]>

TemaAmbito = {
  ambito_id: string;
  label: string;
  data: {
    target_domain: 'clinico' | 'educativo' | 'formazione' | 'politiche';
    target_subdomain: string;
    age_range: string;
    setting: string;
    observer_profile: string;
    notes?: string;
  };
  created_at: Date;
  created_by: string;
  promoted_to_f3: boolean;
  promoted_tema_id: string | null;   // `${theme}--${ambito}` (separatore `--`)
}
```

Endpoint admin:

- `GET    /api/pipeline/ricerche/:r/temi/:t/ambiti`
- `POST   /api/pipeline/ricerche/:r/temi/:t/ambiti`
- `PUT    /api/pipeline/ricerche/:r/temi/:t/ambiti/:a`
- `DELETE /api/pipeline/ricerche/:r/temi/:t/ambiti/:a`
- `POST   /api/pipeline/ricerche/:r/temi/:t/ambiti/:a/promote` — apre la pipeline F3
- `POST   /api/pipeline/ricerche/:r/decisions/dismiss` — chiude esplicitamente il banner

Al `promote`, il controller pre-popola un `PipelineExternalInput` per `f3_step_1` (`input_id: 'contesto_ambito'`, `data: ambito.data`) e scrive `inputs/temi/{tema_id}/f3-step-1-contesto-ambito.json`. Lo step 1 nasce già compilato.

UI: dialogo `HumanDecisionDialog` (variante `f2_to_f3_tema_selection`) con CRUD inline degli ambiti + bottoni "Apri pipeline F3 →"/"Vai al tema F3 →" + "Concluso" per archiviare il banner.

### Fase 3 — Costruzione del dispositivo (5 step lineari)

| Step | Etichetta | File-prefix | Note |
|------|-----------|-------------|------|
| `f3_step_1` | Nodo dominante e funzione | `nodo-funzione-*.json` | Identifica nodo dominante della CE per il dominio + sceglie 1 di 4 funzioni (stabilizzare/ampliare/mediare/proteggere). Input esterno obbligatorio `contesto_ambito` (auto-popolato dal bridge). |
| `f3_step_2` | Micro-dispositivo di campo | `micro-dispositivo-*.json` | Template a 7 campi + classificazione U1–U6 + condizioni di non-applicabilità. |
| `f3_step_3` | Stress test e correzione | `stress-test-*.json` | 5 casi tipologici (assenza, parziale, distorta-chiudente, oscillante, apparente-indistinguibile) + correzione condizionale. Input esterno facoltativo `casi_dominio`. |
| `f3_step_4` | Verifica di coerenza F3 | `coerenza-*.json` | Checklist 10 controlli → verdetto `valido` / `richiede_revisione` / `fuori_modello`. |
| `f3_step_5` | Output-tipo contestualizzato | `output-tipo-{dominio}-*.json` | Versione del modulo triadico A-E (sezioni dell'output-tipo vuoto F2) contestualizzata per il dominio. **Artefatto pubblico finale** della pipeline. |

Un **tema F3** è un `PipelineContext` con `context_type='tema'`, id `${theme_slug}--${ambito_slug}`. Sequenza lineare `1 → 2 → 3 → 4 → 5` tutta obbligatoria. Nessuna biforcazione né override post-verifica.

## 4. Sorgenti dati

Combinazione di file su disco (output Cowork copiati in `client/public/pipeline/`) + MongoDB (stato runtime). Il FE legge:

- **`/api/pipeline/index`** — index globale (ricerche + temi con steps_completed, files, robustezza, correzioni_residue, has_revisioni, ricerca_origine, dispositivo_sorgente, steps_skipped, external_inputs).
- **`/api/pipeline/ricerche/:id`** / **`/api/pipeline/temi/:id`** — context completo + step_states + pending_decision + tema_ambiti.
- **`/pipeline/<...>`** — file JSON statici degli step (output canonici).

Struttura filesystem statico:

```
client/public/pipeline/
├── pipeline-index.json
├── ricerche/<ricerca-id>/
│   ├── theme-relevance-vN.json         # f2_step_2
│   ├── node-verification-vN.json       # f2_step_2a
│   ├── theme-verification-vN.json      # f2_step_3
│   ├── theme-matrix-vN.json            # f2_step_4
│   ├── ce-prototipica-vN.json          # f2_step_4b
│   ├── output-family-vN.json           # f2_step_5
│   └── output-tipo-vuoto-vN.json       # f2_step_6
├── temi/<tema-id>/                      # tema-id = `${theme}--${ambito}`
│   ├── nodo-funzione-vN.json           # f3_step_1
│   ├── micro-dispositivo-vN.json       # f3_step_2
│   ├── stress-test-vN.json             # f3_step_3
│   ├── coerenza-vN.json                # f3_step_4
│   ├── output-tipo-{dominio}-vN.json   # f3_step_5
│   └── revisioni.md                     # storia decisionale, opzionale
└── inputs/temi/<tema-id>/
    ├── f3-step-1-contesto-ambito.json   # auto-popolato dal bridge
    └── f3-step-3-casi-dominio.json      # facoltativo, fornito dal ricercatore
```

## 5. Tipi chiave (FE)

`client/src/types/pipeline.ts`:

```ts
type RicercaIndexEntry = {
  id: string;
  label: string;
  steps_completed: PipelineStepId[];
  files: Partial<Record<PipelineStepId, string>>;
};

type TemaIndexEntry = {
  id: string;
  label: string;
  steps_completed: PipelineStepId[];
  files: Partial<Record<PipelineStepId, string>>;
  canonical_device: { file: string; shape: 'device' | 'corrected_device' | 'result_0' } | null;
  theme_id?: string | null;
  ricerca_origine?: string | null;
  dispositivo_sorgente?: { tema_id: string; file: string; device_id: string } | null;
  steps_skipped?: { step: PipelineStepId; reason: string }[];
  external_inputs?: ExternalInput[];
  robustezza?: 'alta' | 'media' | 'bassa' | null;
  correzioni_residue?: number;
  has_revisioni?: boolean;
};

type DeviceSnapshot = {
  device_id: string;
  theme_id: string;
  domain?: string;
  device_type?: string;
  function: string;
  structural_reference: {
    core_configuration: string;
    axes: string[];        // ["asse_1","asse_2","asse_4"]
    nodes: string[];
    bridge_concepts: string[];
  };
  reading_focus: { dimension: string; description: string }[];
  access_points: { label: string; description: string }[];
  structural_questions: string[];
  operative_proxies: OperativeProxy[];
  observability_requirements: ObservabilityRequirement[];
  non_classifiability_rules: NonClassifiabilityRule[];
  interpretive_warnings: { risk_type: string; description: string }[];
  non_permitted_transformations: string[];
  validation_structural_check?: { ... };
};
```

Vedi il file types per `OperativeProxy`, `ObservabilityRequirement`, `NonClassifiabilityRule`, `StressTestCase`.

## 6. Servizio `pipelineService` (FE)

Wrapper sui fetch al BE + normalizzazione device:

| Funzione | Ritorna | Note |
|----------|---------|------|
| `fetchPipelineIndex()` | `PipelineIndex` | Index globale |
| `fetchDevice(tema)` | `DeviceSnapshot \| null` | Priorità: `f3_step_4` → `f3_step_3` → `f3_step_2` |
| `fetchStressTest(tema)` | `F3StressTestRaw \| null` | Da `f3_step_3` |
| `fetchCorrectionsLog(tema)` | `Array<{step, entries}>` | Da `f3_step_3` |
| `fetchRevisioni(tema)` | `string \| null` | Markdown grezzo |
| `fetchExternalInput(path)` | `unknown` | File in `inputs/` |

`extractDevice()` normalizza tre shape (`'device'` / `'corrected_device'` / `'result_0'`) al modello unico `DeviceSnapshot`.

## 7. Componenti di visualizzazione

| Componente | Cosa fa |
|------------|---------|
| `SviluppoBambinoPipelineMap` | Master-detail: ricerche F2 (sinistra) + ambiti del tema selezionato (destra). Auto-seleziona la prima ricerca per non lasciare vuoto il pannello. |
| `SviluppoBambinoPipelineRicercaOverview` | Step F2 della ricerca + banner decisione ambiti F2→F3 (se aperta) |
| `SviluppoBambinoPipelineDeviceOverview` | Tab: Panoramica / Provenienza / Correzioni / Storia. Header con badge: robustezza, n. step, step saltati, correzioni residue. |
| `SviluppoBambinoPipelineDeviceViewer` | Vista strutturale completa del dispositivo: funzione, configurazione, dimensioni, domande, proxy, osservabilità, non-classificabilità, warning, validazione. Layout a due colonne con rail di nav. |
| `SviluppoBambinoPipelineStressTest` | Master-detail: lista casi + dettaglio (configurazione osservata, applicazione proxy, performance, breaking point, rischio falso positivo). |
| `DeviceLineage` | Lista verticale dei 5 step F3 con espansione: input pipeline, input esterni, output. Box "Origine" (ricerca F2 e/o dispositivo sorgente). |
| `CorrectionsLog` | Per ogni entry: box frattura, freccia, box correzione (verde se applicata), razionale. |
| `ProcessNarrative` | Renderizza `revisioni.md`; estrae con regex `**Principio consolidato**: "..."` come blockquote evidenziati. |
| `pipeline/output-viewers/F2OutputViewer` + `F3OutputViewer` | Viewer strutturati per ogni step (Step1Viewer..Step5Viewer per F3; Step2aViewer, Step4bViewer, Step6Viewer per F2). Fallback JSON pretty-printed per step non coperti. |
| `pipeline/orchestration/*` | Panel admin per esecuzione step. Vedi [Pipeline orchestrazione](../pipeline-orchestrazione.md). |

## 8. Orchestrazione step (admin)

`pipeline/orchestration/OrchestrationPanel`:

- Lista step con badge stato (`non_avviato` / `in_coda` / `in_esecuzione` / `completato` / `fallito` / `saltato`).
- Bottoni "Lancia" / "Salta" (inline secondari quando applicabile) / "Verifica" / "Cancel" / "Reset".
- Form input esterni (`ExternalInputForm`) per gli step che li richiedono.
- Dialog decisione umana (`HumanDecisionDialog`) per il bridge ambiti F2→F3.
- Streaming log (`ExecutionLogViewer`) via SSE `/api/pipeline/executions/:id/logs`.

Il flusso end-to-end (admin click "Lancia" → server LPUSH Redis → worker `local/` spawna Cowork → eventi pubblicati → server aggiorna Mongo → FE polling/SSE) è descritto in [Backend §6](../../10-architecture/backend.md) e [Local — ponte Cowork](../../10-architecture/local-cowork-bridge.md).

## 9. Sync degli artefatti

`scripts/sync-pipeline.mjs` importa gli artefatti prodotti localmente da Cowork dentro `client/public/pipeline/`:

- **Sorgente output** (default): `${HOME}/Documents/Claude/Projects/Sviluppo Bambino/output/produzioni` — override `PIPELINE_SOURCE`.
- **Sorgente input esterni**: `${HOME}/Documents/Claude/Projects/Sviluppo Bambino/input/produzioni` — override `PIPELINE_INPUT`.
- **Target**: `client/public/pipeline/` (svuotato e ricostruito).

Comando: `npm run sync-pipeline`.

Lo script:

1. Scansiona ricerche/temi e seleziona la versione più alta per step (`-vN.json`).
2. Costruisce `pipeline-index.json` con `steps_completed`, `files`, `canonical_device`, `ricerca_origine`, `dispositivo_sorgente`, `correzioni_residue`, `robustezza`, `steps_skipped`, `external_inputs`, `has_revisioni`.
3. Copia tutti i file nel target.

## 10. Dipendenze

- **MongoDB** (`pipeline_contexts`, `pipeline_step_executions`, `pipeline_external_inputs`).
- **Redis Cloud** (canali `hcaire:pipeline:commands` + `hcaire:pipeline:events`).
- **Cowork** via worker `local/` per esecuzione step (vedi [Local — ponte Cowork](../../10-architecture/local-cowork-bridge.md)).
- **`scripts/sync-pipeline.mjs`** per importare artefatti.
- **Modulo [Archivio Temi](../archivio-temi.md)**: sorgente dei temi candidati che alimentano `f2_step_2`.

## 11. Criticità note

- **`SviluppoBambinoProduzioniTemiPage`** consuma un JSON statico locale (`client/src/data/theme-discovery-v1.json`) duplicato rispetto all'Archivio Temi. Da riallineare.
- **Renderer input esterni**: i renderer specifici (`F3Step1InputRenderer`, `F3Step3InputRenderer`) sono inline in `ExternalInputForm.tsx`. Refactor possibile.
- **Output legacy su filesystem**: cartelle di esecuzioni pre-pipeline corrente possono restare su disco. Cleanup via `scripts/cleanup-obsolete-pipeline-folders.ps1`.
- **Validazione JSON runtime assente lato FE**: tipi TS descrivono il subset consumato, niente AJV/zod runtime. Sufficiente finché i viewer strutturati coprono il payload.

## 12. Riferimenti rapidi al codice

- Tipi: `client/src/types/pipeline.ts`
- Servizio: `client/src/services/pipelineService.ts`, `pipelineOrchestratorService.ts`
- Sync: `scripts/sync-pipeline.mjs`
- Pagine: `client/src/pages/sviluppo-bambino/SviluppoBambinoPipeline*.tsx`, `SviluppoBambinoProduzioni*.tsx`
- Componenti: `client/src/components/pipeline/{DeviceLineage, CorrectionsLog, ProcessNarrative, GuidaPipelinePanel}.tsx`, `output-viewers/`, `orchestration/`
- Server: vedi [Pipeline orchestrazione](../pipeline-orchestrazione.md)
