---
title: Produzioni — architettura della visualizzazione
sidebar_label: Produzioni (architettura)
sidebar_position: 1
---

# Sezione Produzioni — Architettura della visualizzazione

> Documento di sintesi dello stato attuale della sezione `produzioni` del progetto **Sviluppo Bambino** all'interno di `hcaire-blog`. Descrive **cosa è stato realizzato finora** (sola visualizzazione di artefatti già prodotti altrove) e **quali dati vengono letti**, come base per progettare l'estensione che permetterà di **eseguire** le produzioni dal sito.

:::note Migrato
Documento originariamente in `hcaire-blog/docs/produzioni-architettura.md`, migrato in `hcaire-docs` il 2026-05-05 nell'ambito del setup del sistema di documentazione Docs-as-Code.
:::

---

## 1. Scopo della sezione

La sezione **Produzioni** mostra al lettore il percorso con cui, a partire da un tema empiricamente fondato, viene costruito un **dispositivo configurazionale** (Fase 3 del metodo). Espone:

- la **mappa** di tutte le ricerche tematiche (F2) e dei dispositivi (F3) prodotti,
- la **provenienza** di ciascun dispositivo (ricerca di origine, dispositivo sorgente, input esterni),
- la **struttura** del dispositivo finale (configurazione nucleare, dimensioni di lettura, proxy operativo, osservabilità, regole di non-classificabilità, warning interpretativi, validazioni),
- gli **stress test** effettuati con verdetti per caso e robustezza globale,
- il **log delle correzioni** applicate dopo le fratture rilevate,
- la **storia decisionale** (revisioni in markdown).

**Limite attuale**: la sezione è **read-only**. I file JSON e markdown sono prodotti **fuori dal sito** (vedi §6) e copiati in `client/public/pipeline/`. Il sito non ha alcuna capacità di eseguire step della pipeline, né di scrivere/aggiornare gli artefatti.

---

## 2. Struttura delle rotte

Tutte le rotte sono definite in `client/src/App.tsx` e usano `react-router-dom`.

| Path | Componente | Funzione |
|---|---|---|
| `/sviluppo-bambino/produzioni` | `SviluppoBambinoProduzioniLanding` | Landing narrativa (cos'è una produzione, processo produttivo) |
| `/sviluppo-bambino/produzioni/temi` | `SviluppoBambinoProduzioniTemiPage` | Catalogo dei 10 temi candidati (F2 step 1) con dettaglio per tema |
| `/sviluppo-bambino/produzioni/pipeline` | `SviluppoBambinoPipelineMap` | Mappa dello stato di tutte le ricerche (F2) e dei temi (F3) |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId` | `SviluppoBambinoPipelineDeviceOverview` | Panoramica del tema con tab: Panoramica / Provenienza / Correzioni / Storia |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/dispositivo` | `SviluppoBambinoPipelineDeviceViewer` | Vista strutturale completa del dispositivo finale |
| `/sviluppo-bambino/produzioni/pipeline/temi/:temaId/stress-test` | `SviluppoBambinoPipelineStressTest` | Casi di test, verdetti, valutazione globale |

### Navigazione

- `SviluppoBambinoProduzioniNav` — barra sticky con i due link figli: **Temi** e **Pipeline**.
- `SviluppoBambinoPipelineNav` — breadcrumb dinamico per la sotto-sezione pipeline (`Mappa / Tema: X / Dispositivo|Stress test|...`).

---

## 3. Modello degli step della pipeline

Il metodo è organizzato in **due fasi** rappresentate nel codice come prefissi:

### Fase 2 — Ricerche tematiche (7 step, pipeline v2.2)
| Step | Etichetta | File-prefix | Note |
|---|---|---|---|
| `f2_step_2` | Rilevanza | `theme-relevance-*.json` | Primo step lanciabile direttamente (post v2.2). Il tema arriva dall'Archivio via `scelta_tema` auto-popolato (no input form richiesto). |
| `f2_step_2a` | Verifica nodi trasversali | `node-verification-*.json` | **v2.0** — mappa nodi candidati su N1–N7 canonici |
| `f2_step_3` | Verifica | `theme-verification-*.json` | |
| `f2_step_4` | Matrice | `theme-matrix-*.json` | |
| `f2_step_4b` | CE prototipica | `ce-prototipica-*.json` | **v2.0** — Grammatica CE (S, R, D, T, A) |
| `f2_step_5` | Output family | `output-family-*.json` | |
| `f2_step_6` | Output-tipo vuoto | `output-tipo-vuoto-*.json` | **v2.0** — passaporto del tema, input primario di `f3_step_1` |

Una **ricerca** (`ricerche/<id>/`) ospita la pipeline F2 di un tema promosso dall'[Archivio temi](../../90-todo/laboratorio-d5b-backend.md#12-archivio-temi-q2--pagina-di-data-entry). La pipeline v2.0 (2026-05-04) aggiunge tre step di mediazione metodologica fra F2 e F3 (`2a`, `4b`, `6`); la v2.1 (2026-05-05) rimuove `f2_step_1` (discovery) la cui funzione è confluita nell'Archivio. Il primo step eseguibile è quindi `f2_step_2`, che riceve il tema scelto via `scelta_tema` (input esterno, popolato manualmente o copiato dall'Archivio).

In v2.0 `f3_step_1` consuma sia `output-tipo-vuoto-v{N}.json` (primario, da `f2_step_6`) sia `output-family-v{N}.json` (secondario, da `f2_step_5`). Il path `output-tipo-vuoto` vive in `ricerche/<id>/`, non in `temi/<id>/`: la risoluzione cross-folder è trasparente perché `step_states` del tema eredita `output_file` dalla ricerca al passaggio F2→F3 (vedi `pipelineController.postRicercaDecision`).

### Fase 3 — Costruzione del dispositivo (10+1 step)
| Step | Etichetta | File-prefix |
|---|---|---|
| `f3_step_1` | Lettura configurazionale | `lettura-configurazionale-*.json` |
| `f3_step_2` | Stress test | `stress-test-*.json` |
| `f3_step_3` | Correzione strutturale | `correzione-strutturale-*.json` |
| `f3_step_4` | Indistinguibility test | `indistinguibility-test-*.json` |
| `f3_step_5` | Audit | `audit-*.json` |
| `f3_step_6` | Stabilizzazione proxy | `stabilizzazione-proxy-*.json` |
| `f3_step_6b` | Stabilizzazione proxy (variante) | `stabilizzazione-proxy-*v?b.json` |
| `f3_step_7` | Trasferibilità | `trasferibilità-*.json` |
| `f3_step_8` | Adattamento strutturale | `adattamento-strutturale-*.json` |
| `f3_step_9` | Dispositivo completo | `dispositivo-*.json` |
| `f3_step_10` | Stress test dispositivo | `stress-test-dispositivo-*.json` (o equivalente) |

Un **tema** (`temi/<id>/`) può saltare alcuni step (registrato in `revisioni.md` con la sintassi `**Step-N saltato**: motivo`).

Lo step `6b` è una **variante stabilizzata** del proxy che, quando presente, **sovrascrive** il proxy del dispositivo originale (`f3_step_9`).

### Grafo delle dipendenze fra step (euristica usata in `DeviceLineage.tsx`)
```
f3_step_1 → f3_step_2 → f3_step_3 → {f3_step_4, f3_step_5} → f3_step_6 → f3_step_6b
f3_step_3, f3_step_6b → f3_step_7 → f3_step_8
f3_step_3, f3_step_6b, f3_step_7, f3_step_8 → f3_step_9 → f3_step_10
```

---

## 4. Sorgenti dati (file su disco)

Tutti i dati consumati dal frontend sono **file statici** serviti da `client/public/pipeline/`. Non c'è alcun endpoint API dedicato alla pipeline.

```
client/public/pipeline/
├── pipeline-index.json                     # indice globale generato dallo script di sync
├── ricerche/
│   └── <ricerca-id>/
│       ├── theme-discovery-vN.json         # f2_step_1
│       ├── theme-relevance-vN.json         # f2_step_2
│       ├── theme-verification-vN.json      # f2_step_3
│       ├── theme-matrix-vN.json            # f2_step_4
│       └── output-family-vN.json           # f2_step_5
├── temi/
│   └── <tema-id>/
│       ├── lettura-configurazionale-vN.json
│       ├── stress-test-vN.json
│       ├── correzione-strutturale-vN.json
│       ├── indistinguibility-test-vN.json
│       ├── audit-vN.json
│       ├── stabilizzazione-proxy-vN.json     # f3_step_6
│       ├── stabilizzazione-proxy-vNb.json    # f3_step_6b
│       ├── trasferibilità-vN.json
│       ├── adattamento-strutturale-vN.json
│       ├── dispositivo-*-vN.json             # f3_step_9
│       ├── stress-test-*-vN.json             # f3_step_10
│       └── revisioni.md                      # storia decisionale, opzionale
└── inputs/temi/<tema-id>/
    └── f3-step-N-<label>.json                # input esterni forniti dal ricercatore
```

### `pipeline-index.json` (root del catalogo)

```ts
{
  generated_at: ISO8601,
  ricerche: RicercaIndexEntry[],
  temi: TemaIndexEntry[]
}
```

Vedi `client/src/types/pipeline.ts` per gli schemi completi. Estratti chiave:

```ts
type RicercaIndexEntry = {
  id: string;
  label: string;
  steps_completed: PipelineStepId[];
  files: Partial<Record<PipelineStepId, string>>;   // path relativo a /pipeline/
};

type TemaIndexEntry = {
  id: string;
  label: string;
  steps_completed: PipelineStepId[];
  files: Partial<Record<PipelineStepId, string>>;
  canonical_device: { file: string; shape: 'device' | 'corrected_device' | 'result_0' } | null;
  theme_id?: string | null;
  ricerca_origine?: string | null;             // id della ricerca F2 che ha originato il tema
  dispositivo_sorgente?: {                     // se il tema è una specializzazione di un altro
    tema_id: string;
    file: string;
    device_id: string;
  } | null;
  steps_skipped?: { step: PipelineStepId; reason: string }[];
  external_inputs?: ExternalInput[];           // input forniti dal ricercatore (non pipeline)
  robustezza?: 'alta' | 'media' | 'bassa' | string | null;
  correzioni_residue?: number;                 // somma di corrections_log non `applicata` su step 3/6/8
  has_revisioni?: boolean;
  revisioni_file?: string | null;
};
```

### Forma del **dispositivo** (`DeviceSnapshot`)

Modello unificato a cui ogni step "device-bearing" viene normalizzato dal `pipelineService` (`client/src/services/pipelineService.ts`).

```ts
type DeviceSnapshot = {
  device_id: string;
  theme_id: string;
  domain?: string;
  device_type?: string;
  function: string;                                   // descrizione funzionale
  structural_reference: {
    core_configuration: string;                       // config nucleare
    axes: string[];                                   // es. ["asse_1","asse_2","asse_4"]
    nodes: string[];
    bridge_concepts: string[];
  };
  reading_focus: { dimension: string; description: string }[];   // dimensioni di lettura
  access_points: { label: string; description: string }[];
  structural_questions: string[];
  operative_proxies: OperativeProxy[];                // dopo eventuale override da step 6b
  observability_requirements: ObservabilityRequirement[];
  non_classifiability_rules: NonClassifiabilityRule[];
  interpretive_warnings: { risk_type: string; description: string }[];
  non_permitted_transformations: string[];
  validation_structural_check?: {
    configurational_logic_preserved?: boolean; configurational_logic_notes?: string;
    no_psychological_inference?: boolean;     no_psychological_inference_notes?: string;
    no_circularity?: boolean;                 no_circularity_notes?: string;
    proxy_observable?: boolean;               proxy_observable_notes?: string;
    self_limiting?: boolean;                  self_limiting_notes?: string;
  };
};

type OperativeProxy = {
  proxy_id?: string;
  dimension?: string;
  proxy_name: string;
  what_it_measures: string;
  required_observations?: string[];
  applicability_conditions?: string[];
  non_applicability_conditions?: string[];
  decision_logic: string;          // testo libero, mostrato come blocco mono-spaziato
  allowed_outputs: string[];       // tipicamente: "aperto" | "predeterminato" | "ambiguo" | "non_classificabile"
  epistemic_limit?: string;
  supersedes?: string;
};
```

### Forma dello **stress test dispositivo** (`F3Step10Raw`)

```ts
{
  step: 'f3_step_10',
  device_id: string,
  stress_test_results: StressTestCase[],
  global_assessment: {
    device_robustness: 'alta' | 'media' | 'bassa' | string,
    main_strengths?: string[],
    main_weaknesses?: string[],
    required_corrections?: string[],
  }
}

StressTestCase = {
  case_id, case_type, case_description,
  observed_configuration: { corporeity, field, co_regulation, symbolic_mediation, transformative_passage },
  proxy_application: { applicable, reason?, required_observations_present?, missing_observations?, proxy_output? },
  device_performance:  { readable, what_it_reads?, what_becomes_unclear?, ambiguity_level? },
  breaking_point:      { present, where?, why? },
  false_positive_risk: { risk_present, description?, mitigation? },
  test_verdict: 'regge' | 'regge_con_riserva' | 'fallisce' | string,
}
```

### Forma del **log correzioni** (estratto da step 3, 6, 8)

```ts
{
  corrections_log: {
    breaking_point_ref?: string;
    breaking_point_summary?: string;
    correction_type: 'applicata' | 'rinviata' | 'non_applicata' | string;
    correction_scope?: string;
    correction_description: string;
    rationale?: string;
  }[]
}
```

### Markdown delle revisioni (`revisioni.md`)
Testo libero, parsato in due punti:
- **lettura**: renderizzato con `react-markdown` da `ProcessNarrative.tsx`; il componente estrae con regex i **principi consolidati** (`**Principio consolidato**: "..."`) e li mostra come blockquote in evidenza.
- **sync**: lo script di sync estrae con regex la sintassi `**Step-N saltato**: motivo` per popolare `steps_skipped` nell'indice.

---

## 5. Servizio di accesso ai dati (`client/src/services/pipelineService.ts`)

Tutti i fetch sono `GET` di file statici sotto `/pipeline/`. Nessun side-effect, nessuna scrittura.

| Funzione | Ritorna | Note |
|---|---|---|
| `fetchPipelineIndex()` | `PipelineIndex` | Carica l'indice globale |
| `fetchDevice(tema)` | `DeviceSnapshot \| null` | Carica il `canonical_device` (step 9, fallback step 3, fallback step 1) e applica l'override di step 6b se presente |
| `fetchStressTest(tema)` | `F3Step10Raw \| null` | Carica step 10 |
| `fetchCorrectionsLog(tema)` | `Array<{step, entries}>` | Aggrega `corrections_log` da step 3, 6, 8 |
| `fetchRevisioni(tema)` | `string \| null` | Testo markdown grezzo |
| `fetchExternalInput(path)` | `unknown` | Generico, per file in `inputs/` |

La funzione `extractDevice()` normalizza tre **shape** diverse al modello `DeviceSnapshot`:
- `'device'` (step 9): la chiave è `device`.
- `'corrected_device'` (step 3 fallback): la chiave è `corrected_device`.
- `'result_0'` (step 1 fallback): la chiave è `results[0]`, con `operative_proxy` (singolare) → `operative_proxies` (array).

L'override di step 6b sostituisce `operative_proxies`, e — se forniti — `observability_requirements` (anche sotto la chiave `required_observations`) e `non_classifiability_rules`.

---

## 6. Sync degli artefatti (`scripts/sync-pipeline.mjs`)

Script Node usato dallo sviluppatore per **importare** gli artefatti prodotti altrove dentro `client/public/pipeline/`.

- **Sorgente output (default)**: `C:/Users/nnmrd/Documents/Claude/Projects/Sviluppo Bambino/output/produzioni`
  - Override via env `PIPELINE_SOURCE`.
- **Sorgente input esterni (default)**: `C:/Users/nnmrd/Documents/Claude/Projects/Sviluppo Bambino/input/produzioni`
  - Override via env `PIPELINE_INPUT`.
- **Target**: `client/public/pipeline/` (svuotato e ricostruito ad ogni run).

Comando:
```
npm run sync-pipeline
```
(definito in `package.json` come `"sync-pipeline": "node scripts/sync-pipeline.mjs"`).

### Cosa fa lo script (in sintesi)
1. Scansiona ogni cartella ricerca per riconoscere i file F2 (per prefisso + versione `-vN.json`); seleziona la versione più alta per step.
2. Scansiona ogni cartella tema per riconoscere i file F3, prima leggendo la chiave `step` interna del JSON, con fallback a riconoscimento per nome file.
3. Costruisce una mappa `device_id → {tema_id, file}` leggendo gli ID emessi da ogni file (`device.device_id`, `corrected_device.device_id`, `results[].device_id`, ecc.).
4. Per ciascun tema deriva: `theme_id`, `ricerca_origine`, `dispositivo_sorgente` (da `source_device_id` di step 7), `correzioni_residue` (somma su step 3/6/8), `robustezza` (da step 10), `steps_skipped` (parsando `revisioni.md`), `external_inputs` (scansionando `inputs/temi/<id>/`).
5. Copia tutti i file rilevanti nel target e produce `pipeline-index.json`.

> **Implicazione architetturale**: oggi il **ciclo di vita degli step è interamente esterno al sito**. Lo script si limita a fotografare lo stato di una directory di filesystem locale. Per supportare l'esecuzione delle produzioni dal sito sarà necessario un sostituto/affiancamento di questa pipeline file-based.

---

## 7. Componenti di visualizzazione

### 7.1 Landing — `SviluppoBambinoProduzioniLanding.tsx`
Solo testo statico: cos'è una produzione, le 3 fasi del processo produttivo, link verso i temi.

### 7.2 Catalogo temi candidati — `SviluppoBambinoProduzioniTemiPage.tsx`
- **Sorgente**: `client/src/data/theme-discovery-v1.json` (statico, importato come modulo).
- Layout master/detail (sidebar + dettaglio), responsive.
- Mostra per ciascun tema: priorità (esploratoria + pilota), definizione, "cos'è/cos'è non", focus strutturale, assi coinvolti, nodi/concetti ponte, segnali fonte, rischi, note.
- **Nota**: questa pagina **non** legge da `pipeline-index.json` ed è disaccoppiata dalle ricerche F2 dell'indice (è un punto di possibile riallineamento futuro).

### 7.3 Mappa pipeline — `SviluppoBambinoPipelineMap.tsx`
- Due colonne: ricerche F2 (sky) e temi F3 (emerald).
- Per ciascuna entry: barra di avanzamento step (segmenti pieni = completato), conteggio `n/totale`, badge `robustezza`, badge `deriva da <tema>`.
- Click sul tema → overview.

### 7.4 Overview tema — `SviluppoBambinoPipelineDeviceOverview.tsx`
- Tab: **Panoramica** (accesso rapido a Dispositivo/Stress test + lineage), **Provenienza** (lineage esteso), **Correzioni**, **Storia**.
- Header con badge: robustezza, n. step eseguiti, step saltati, correzioni residue, derivazione.
- Compone:
  - `DeviceLineage` (vedi 7.7),
  - `CorrectionsLog` (vedi 7.8),
  - `ProcessNarrative` (vedi 7.9).

### 7.5 Vista dispositivo — `SviluppoBambinoPipelineDeviceViewer.tsx`
- Layout a due colonne con **rail di navigazione** sinistra (anchor sulle dimensioni e sulle sezioni: proxy, osservabilità, non-classificabilità, warning, vietate, validazione).
- Sezioni renderizzate (in ordine):
  1. **Funzione** — `device.function`
  2. **Configurazione nucleare** — `core_configuration` + chip `axes`/`nodes`/`bridge_concepts`
  3. **Dimensioni di lettura** — una sezione per `reading_focus[]`
  4. **Domande strutturali** — `structural_questions[]`
  5. **Proxy operativo** — sotto-sezione dettagliata con cosa misura, logica di decisione, output ammessi colorati, condizioni di applicabilità/non-applicabilità, limite epistemico
  6. **Osservabilità** — tabella con id, label, tipo, dipendenza dall'osservatore, flag "richiesto per il proxy"
  7. **Regole di non-classificabilità** — distingue visivamente `ambiguo` (giallo) da `non_classificabile` (slate)
  8. **Warning interpretativi** — `<details>` espandibili con icona per `risk_type`
  9. **Trasformazioni non permesse** — lista in stile blocco rosso
  10. **Validazione strutturale** — checklist a 5 voci (logica configurazionale, no inferenza psicologica, no circolarità, proxy osservabile, self-limiting) con note

### 7.6 Stress test — `SviluppoBambinoPipelineStressTest.tsx`
- Layout master/detail: sidebar con la lista dei casi, dettaglio del caso selezionato.
- Per caso: header (id + tipo + verdetto), configurazione osservata, applicazione del proxy (osservazioni presenti/mancanti, output), performance (leggibile sì/no, ambiguità, cosa legge / cosa rimane non chiaro), breaking point, rischio falso positivo + mitigazione.
- Footer con valutazione globale: punti di forza, debolezze, correzioni richieste; badge robustezza nel header.

### 7.7 `DeviceLineage.tsx`
- Lista verticale degli step F3 di interesse (presenti o saltati).
- Ogni step espandibile mostra: **input pipeline** (con file di provenienza), **input esterni forniti dal ricercatore** (badge tipizzato), **dispositivo sorgente** (per step 7 quando il tema è una specializzazione), **output prodotto** (filename).
- Box "Origine" in alto: ricerca F2 e/o dispositivo sorgente.

### 7.8 `CorrectionsLog.tsx`
Per ciascuna entry di `corrections_log` (step 3/6/8):
- box rosso "Frattura" (riferimento + summary + scope),
- freccia + tipo correzione,
- box correzione (verde se applicata, slate altrimenti),
- box razionale.
Supporta highlight di un `breaking_point_ref` specifico via prop.

### 7.9 `ProcessNarrative.tsx`
- Renderizza `revisioni.md` con `react-markdown` e mapping di componenti per stile Tailwind.
- Estrae con regex i `**Principio consolidato**: "..."` e li mostra come blockquote evidenziati in cima.

---

## 8. Cosa **manca** per gestire l'esecuzione delle produzioni

Indice ragionato dei vincoli architetturali oggi presenti, utile a Cowork per progettare l'estensione.

### 8.1 Sull'origine dei dati
- **Tutti i dati sono statici** sotto `client/public/pipeline/`. Non esistono endpoint sul server Express che parlino di pipeline.
- Lo script `sync-pipeline.mjs` legge da una cartella locale dell'utente sviluppatore (`C:/Users/nnmrd/Documents/Claude/Projects/Sviluppo Bambino/...`). Per esecuzione server-side servirà spostare la sorgente di verità in un luogo accessibile al backend (filesystem del server, MongoDB, object storage), o introdurre una pipeline di ingestion.

### 8.2 Sui contratti
- Gli **schemi JSON di ciascuno step** sono noti **lato lettura** ma **non sono validati** (nessun JSON Schema esplicito, nessun `zod`, ecc.). Le interfacce TypeScript in `types/pipeline.ts` descrivono solo il subset osservato.
- Il riconoscimento per file usa **prefisso del filename + versione `-vN[b].json`**: il sync rinomina nulla, ma la convenzione è critica e attualmente "tribale". Per esecuzioni programmatiche andrà esplicitata.

### 8.3 Sul flusso fra step
- La dipendenza fra step è **euristica** (vedi `inferPipelineInputs` in `DeviceLineage.tsx`). Per eseguire serve un grafo dichiarativo (per ogni step: input pipeline obbligatori, input esterni obbligatori/opzionali, output prodotto).
- Lo step 6b è gestito come **override** di step 9: la convenzione va resa esplicita nel motore di esecuzione.

### 8.4 Sulle azioni di esecuzione
Una sezione di esecuzione ha bisogno di concetti che oggi non esistono nel codice:
- **Stato runtime di un'esecuzione** (queued / running / failed / done) per coppia `(tema_id, step)`.
- **Trigger** di esecuzione (chi/come avvia uno step). Il sito ha già autenticazione Clerk con ruolo `admin` (vedi `AdminRoute` in `App.tsx`) — naturale candidato per gating.
- **Storage degli artefatti generati** durante l'esecuzione (oggi il filesystem è scritto fuori dal sito).
- **Log/streaming dell'output** dello step in esecuzione.
- **Versionamento** esplicito (oggi catturato solo dal suffisso `-vN[b]` del filename). Per ri-esecuzioni controllate serve una nozione di run/version distinta dal naming.
- **Validazione post-step** (la pipeline produce `validation_structural_check`: serve normarla come esito macchina, non solo come blob da mostrare).

### 8.5 Sugli input esterni
- Gli `external_inputs` di tipo `esterno_obbligatorio` (es. step 7 per `pointing` → `f3-step-7-contesto-clinico.json`) presuppongono che **un essere umano** prepari il file prima dell'esecuzione. La sezione di esecuzione dovrà offrire una **UI di compilazione/upload** per quegli input, possibilmente guidata dallo schema atteso dello step.

### 8.6 Riallineamento `Temi page` ↔ pipeline
- `SviluppoBambinoProduzioniTemiPage` consuma un **JSON statico locale** (`client/src/data/theme-discovery-v1.json`) duplicato rispetto a quanto presente in `pipeline/ricerche/.../theme-discovery-v1.json`. Per coerenza, in fase di estensione conviene unificare le sorgenti.

---

## 9. Riferimenti rapidi al codice

- Tipi: `client/src/types/pipeline.ts`
- Servizio: `client/src/services/pipelineService.ts`
- Sync: `scripts/sync-pipeline.mjs`
- Indice live: `client/public/pipeline/pipeline-index.json`
- Pagine: `client/src/pages/sviluppo-bambino/SviluppoBambinoProduzioni*.tsx`, `SviluppoBambinoPipeline*.tsx`
- Componenti: `client/src/components/SviluppoBambinoProduzioniNav.tsx`, `client/src/components/SviluppoBambinoPipelineNav.tsx`, `client/src/components/pipeline/{DeviceLineage,CorrectionsLog,ProcessNarrative}.tsx`
- Routing: `client/src/App.tsx` (linee `/sviluppo-bambino/produzioni/*`)

---

## Storia modifiche pipeline

### Pipeline v2.2 — 2026-05-05

Rimosso `scelta_tema` da `inputs_esterni` di `f2_step_2`. La UI legacy (`OrchestrationPanel`) apriva il form di compilazione esterno anche quando l'input era già fornito (auto-popolato dal bridge Archivio→Laboratorio al momento della promozione), costringendo l'utente a confermare prima di lanciare. Con la rimozione dal config, la UI non chiede più il form: "Lancia" parte direttamente.

**Come arriva `scelta_tema` a Cowork senza che sia dichiarato nel config**: `pipelineController.buildExecutionPlan` query la collection `pipeline_external_inputs` per **tutti** i record `(context_id, step_id)` non-superseded, senza filtrare per gli input dichiarati in config. Il record auto-popolato dal bridge resta nel DB e viene comunque incluso nel payload Redis verso Cowork. Questo è un dettaglio di implementazione del backend esistente, sfruttato qui per separare "cosa chiede la UI" (config-driven) da "cosa riceve il worker" (DB-driven).

**Auto-popolamento**: alla promozione di un tema da `maturo → promosso`, `archivioTemiController.promuoveTema` crea un `PipelineExternalInput` con `input_id: 'scelta_tema'` e `data: { tema_label, descrizione, motivazione, asse_dominante_presunto, fonti, tema_id }`. Mapping: `tema.label → tema_label`, `tema.descrizione → descrizione`, `tema.note_ricercatore → motivazione`. I primi tre campi matchano lo schema atteso da Cowork (`external-input-schemas/f2-step-2-scelta-tema.json`); gli altri sono context aggiuntivo che Cowork può ignorare.

**Heal**: lo script `npm run heal:archivio-bridge` ora ripara sia i `PipelineContext` mancanti sia i `scelta_tema` mancanti, indipendentemente.

### Pipeline v2.1 — 2026-05-05

Rimosso `f2_step_1` (discovery) dal `pipeline-step-config.json`. La sua funzione è ora gestita dall'[Archivio temi](../../90-todo/laboratorio-d5b-backend.md#12-archivio-temi-q2--pagina-di-data-entry): un tema promosso dall'Archivio entra nella pipeline F2 a partire da `f2_step_2`. Le dipendenze pipeline `theme-discovery` sono state rimosse anche dagli step a valle (2, 3, 4, 5).

**Effetti collaterali**: nessuno sui flussi nuovi. Per le ricerche pre-v2.1 con `f2_step_1` già eseguito: l'output `theme-discovery-v{N}.json` resta sul filesystem ma non è più letto come dipendenza della pipeline.

### Pipeline v2.0 — 2026-05-04

Tre nuovi step F2 introdotti per esplicitare la transizione metodologica F2→F3 attraverso il linguaggio formale del modello HCAIRE. Sorgente: `aggiornamento-metodologico-pipeline-hcaire-v2.docx.md` prodotto da Claude Cowork.

**Nuovi step:**

| Step | Posizione | Funzione |
|------|-----------|----------|
| `f2_step_2a` | dopo `f2_step_2` | Mappa nodi candidati sui 7 Nodi Trasversali canonici N1–N7. Output: `node-verification-v{N}.json`. |
| `f2_step_4b` | dopo `f2_step_4` | Traduce micro-matrice in Grammatica CE (S, R, D, T, A). Output: `ce-prototipica-v{N}.json`. |
| `f2_step_6` | dopo `f2_step_5` (verificato) | Produce il "passaporto del tema" — input primario di `f3_step_1`. Output: `output-tipo-vuoto-v{N}.json`. |

**Modifica a step esistente:**

- `f3_step_1.inputs_pipeline` ora include `output-tipo-vuoto` (primario, da `f2_step_6`) **prima** di `output-family` (da `f2_step_5`).

**Toccchi al codice (pipeline v2.0 → webapp):**

| Modifica | File |
|----------|------|
| Config sostituito | `server/pipeline-step-config.json` (da claude-cowork sibling) |
| Mapping wire-id → cartella Cowork | `local/src/pipeline/constants.ts` (`STEP_FOLDER_MAP`, +3 entry) |
| Tipo TS step IDs | `client/src/types/pipeline.ts` (`PipelineStepId`, +3 letterali) |
| Label UI | `client/src/components/pipeline/DeviceLineage.tsx`, `client/src/pages/sviluppo-bambino/SviluppoBambinoPipelineMap.tsx` |

**Nessuna modifica** è stata necessaria a:

- `stepConfigService`, `stepEnablement`, `pipelineService`, `pipelineController` (logica già data-driven sul JSON).
- Schema MongoDB (`step_states` è `Record` dinamico, chiavi mancanti default a `'non_avviato'`).
- Protocollo Redis o handler `local/src/pipeline/PipelineCommandHandler.ts` (path-resolver già supporta cross-folder).

**Effetto sui dati esistenti:** i temi già passati F2→F3 prima della v2.0 non hanno `f2_step_6` completato, quindi `f3_step_1` su di loro diventa non-eseguibile. Accettabile in questa fase perché i contesti esistenti sono test che andranno cancellati.

**Caveat operativo:** dopo la copia del nuovo `pipeline-step-config.json`, il server Express va riavviato a mano. `nodemon` watcha solo `src/**/*.ts`, non legge cambi al config root del workspace.
