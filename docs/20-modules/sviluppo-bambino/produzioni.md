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

### Fase 2 — Ricerche tematiche (7 step, pipeline v3.0)
| Step | Etichetta | File-prefix | Note |
|---|---|---|---|
| `f2_step_2` | Rilevanza | `theme-relevance-*.json` | Primo step lanciabile direttamente (post v2.2). Il tema arriva dall'Archivio via `scelta_tema` auto-popolato (no input form richiesto). |
| `f2_step_2a` | Verifica nodi trasversali | `node-verification-*.json` | Mappa nodi candidati su N1–N7 canonici. Skippabile (v2.4) |
| `f2_step_3` | Verifica | `theme-verification-*.json` | |
| `f2_step_4` | Matrice | `theme-matrix-*.json` | |
| `f2_step_4b` | CE prototipica | `ce-prototipica-*.json` | Grammatica CE (S, R, D, T, A). Skippabile (v2.4); richiesto da step 5 (v2.5) |
| `f2_step_5` | Output family | `output-family-*.json` | |
| `f2_step_6` | Output-tipo vuoto | `output-tipo-vuoto-*.json` | Passaporto del tema, input primario della pipeline F3 |

Una **ricerca** (`ricerche/<id>/`) ospita la pipeline F2 di un tema promosso dall'[Archivio temi](../../90-todo/laboratorio-d5b-backend.md#12-archivio-temi-q2--pagina-di-data-entry). La pipeline v2.0 (2026-05-04) aggiunge tre step di mediazione metodologica fra F2 e F3 (`2a`, `4b`, `6`); la v2.1 (2026-05-05) rimuove `f2_step_1` (discovery) la cui funzione è confluita nell'Archivio. Il primo step eseguibile è `f2_step_2`, che riceve il tema scelto via `scelta_tema` (input esterno auto-popolato dal bridge Archivio→Laboratorio). La sequenza è lineare e forzata: `2 → 2a → 3 → 4 → 4b → 5 → 6`. Solo `2a` e `4b` sono skippabili con motivazione.

Quando `f2_step_6` raggiunge `completato`, `pipelineEventSubscriber.handleCompleted` scrive nello stesso `$set` Mongo un `pending_decision` di tipo `f2_to_f3_tema_selection` sulla ricerca: è il bridge **F2 → F3 ad ambiti** (vedi §3.1).

#### 3.1 Bridge F2 → F3 ad ambiti (1→N tema → dispositivi)

A partire dalla pipeline v3.0 (D7), il completamento della F2 produce un **passaporto del tema** che può essere applicato a *N* ambiti operativi distinti. Ogni coppia `(tema, ambito)` apre una pipeline F3 indipendente.

**Modello dati** (embedded su `PipelineContext` di tipo `ricerca`):

```ts
tema_ambiti: Record<theme_id, TemaAmbito[]>

TemaAmbito = {
  ambito_id: string;          // slug kebab-case, unico per (ricerca, theme)
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
  promoted_tema_id: string | null;   // tema F3 risultante: `${theme}--${ambito}`
}
```

**Endpoint** (admin):
- `GET    /api/pipeline/ricerche/:r/temi/:t/ambiti` — lista
- `POST   /api/pipeline/ricerche/:r/temi/:t/ambiti` — crea
- `PUT    /api/pipeline/ricerche/:r/temi/:t/ambiti/:a` — modifica (solo se non promosso)
- `DELETE /api/pipeline/ricerche/:r/temi/:t/ambiti/:a` — elimina (solo se non promosso)
- `POST   /api/pipeline/ricerche/:r/temi/:t/ambiti/:a/promote` — apre la pipeline F3
- `POST   /api/pipeline/ricerche/:r/decisions/dismiss` — chiude esplicitamente il banner

**Convenzione tema_id F3**: `${theme_slug}--${ambito_slug}` (separatore `--`). Esempio: `gioco-libero-come-incontro--clinico-neuropsviluppo`.

**Pre-popolamento input step 1**: al `promote`, `pipelineController.promoteTemaAmbito` crea un `PipelineExternalInput` con `step_id: 'f3_step_1'`, `input_id: 'contesto_ambito'`, `data: ambito.data` e scrive il file `inputs/temi/{tema_id}/f3-step-1-contesto-ambito.json`. Il form di step 1 nascerà già compilato.

**UI**: dialogo `HumanDecisionDialog` (variante `f2_to_f3_tema_selection`) — header read-only del tema F2 corrente, lista ambiti con CRUD inline + bottone "Apri pipeline F3 →"/"Vai al tema F3 →" per ciascuno, bottone "Concluso" per archiviare il banner. Il `pending_decision` resta visibile finché non viene esplicitamente dismissed: l'utente può tornare in qualsiasi momento per aggiungere altri ambiti.

### Fase 3 — Costruzione del dispositivo (5 step, pipeline v3.0)

A partire da v3.0 (D7-pipeline-f3-redesign, 2026-05-06) la pipeline F3 è stata ridotta da 11 step (1, 2, 3, 4, 5, 6, 6b, 6c, 7, 8, 9, 10) a 5 step lineari, allineati alla metodologia (`HCAIRE Slides/context/metodo/f3-strumenti-operativi.md`).

| Step | Etichetta | File-prefix | Verifica | Skip | Note |
|---|---|---|---|---|---|
| `f3_step_1` | Nodo dominante e funzione | `nodo-funzione-*.json` | sì | no | Identifica nodo dominante della CE per il dominio scelto + sceglie 1 di 4 funzioni (stabilizzare/ampliare/mediare/proteggere). Input esterno obbligatorio `contesto_ambito` (auto-popolato dal bridge ambiti). |
| `f3_step_2` | Micro-dispositivo di campo | `micro-dispositivo-*.json` | sì | no | Costruisce il dispositivo nel template a 7 campi della metodologia + classificazione U1–U6 + condizioni di non-applicabilità. |
| `f3_step_3` | Stress test e correzione | `stress-test-*.json` | sì | no | 5 casi tipologici integrati (`assenza_configurazione`, `configurazione_parziale`, `configurazione_distorta_chiudente`, `configurazione_oscillante`, `configurazione_apparente_indistinguibile`) + correzione condizionale del dispositivo. Input esterno facoltativo `casi_dominio`. |
| `f3_step_4` | Verifica di coerenza F3 | `coerenza-*.json` | no¹ | no | Checklist 10 controlli normativi → verdetto: `valido` / `richiede_revisione` / `fuori_modello`. |
| `f3_step_5` | Audit metodologico | `audit-metodologico-*.json` | no | **sì** | 8 controlli sulla qualità di esecuzione della pipeline F3. Opzionale: il dispositivo è considerato finalizzato dopo step 4 verificato. |

¹ Lo step 4 *è* la verifica della pipeline F3: non ha senso applicargli un altro layer di verifica.

Un **tema** (`temi/<id>/`) corrisponde alla coppia `(theme_F2, ambito)` (vedi §3.1). La sequenza è lineare semplice — `1 → 2 → 3 → 4 → 5` — senza biforcazioni né virtual ref. Solo `f3_step_5` è skippabile.

**Cosa è scomparso da v2.x → v3.0**:
- gli step di trasferimento (vecchi 7-9: trasferibilità, adattamento strutturale, dispositivo completo) — un tema applicato a un nuovo ambito è semplicemente una nuova pipeline F3 con dominio diverso, non un trasferimento;
- la stratificazione del proxy (vecchi 6, 6b, 6c) — il proxy operativo è ora una proprietà del dispositivo prodotto in `f3_step_2`;
- la decisione umana modale `step7_context_selection` — l'ambito è raccolto come input esterno di `f3_step_1`, niente più dialog modali nel mezzo della pipeline.

---

## 4. Sorgenti dati (file su disco)

Tutti i dati consumati dal frontend sono **file statici** serviti da `client/public/pipeline/`. Non c'è alcun endpoint API dedicato alla pipeline.

```
client/public/pipeline/
├── pipeline-index.json                     # indice globale generato dallo script di sync
├── ricerche/
│   └── <ricerca-id>/                       # F2 (post v2.1: niente più theme-discovery)
│       ├── theme-relevance-vN.json         # f2_step_2
│       ├── node-verification-vN.json       # f2_step_2a
│       ├── theme-verification-vN.json      # f2_step_3
│       ├── theme-matrix-vN.json            # f2_step_4
│       ├── ce-prototipica-vN.json          # f2_step_4b
│       ├── output-family-vN.json           # f2_step_5
│       └── output-tipo-vuoto-vN.json       # f2_step_6 (passaporto del tema)
├── temi/
│   └── <tema-id>/                          # F3 v3.0 — `<tema-id>` = `${theme}--${ambito}`
│       ├── nodo-funzione-vN.json           # f3_step_1
│       ├── micro-dispositivo-vN.json       # f3_step_2
│       ├── stress-test-vN.json             # f3_step_3
│       ├── coerenza-vN.json                # f3_step_4
│       ├── audit-metodologico-vN.json      # f3_step_5 (opzionale)
│       └── revisioni.md                     # storia decisionale, opzionale
└── inputs/temi/<tema-id>/
    ├── f3-step-1-contesto-ambito.json      # auto-popolato dal bridge ambiti
    └── f3-step-3-casi-dominio.json         # facoltativo, fornito dal ricercatore
```

**Cartelle output legacy (pre-v3.0)** non sono più popolate ma possono ancora essere presenti su filesystem per esecuzioni storiche: `lettura-configurazionale-*`, `correzione-strutturale-*`, `indistinguibility-test-*`, `stabilizzazione-proxy-*`, `trasferibilità-*`, `adattamento-strutturale-*`, `dispositivo-*`, `stress-test-dispositivo-*`. Il sync e il mapper le ignorano nel nuovo flusso; possono essere rimosse o archiviate.

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
| `fetchDevice(tema)` | `DeviceSnapshot \| null` | Carica il `canonical_device`. Priorità v3.0: `f3_step_4` (verdetto coerenza) → `f3_step_3` (dispositivo post-correzione) → `f3_step_2` (micro-dispositivo iniziale) |
| `fetchStressTest(tema)` | `F3Step10Raw \| null` | Carica `f3_step_3` (vecchio `f3_step_10` rimosso). Lo schema dell'output v3.0 è ridisegnato; i viewer storici possono mostrare dati malformati e andranno aggiornati. |
| `fetchCorrectionsLog(tema)` | `Array<{step, entries}>` | Aggrega `corrections_log` solo da `f3_step_3` (unico step v3.0 che produce correzioni) |
| `fetchRevisioni(tema)` | `string \| null` | Testo markdown grezzo |
| `fetchExternalInput(path)` | `unknown` | Generico, per file in `inputs/` |

La funzione `extractDevice()` normalizza tre **shape** al modello `DeviceSnapshot`:
- `'device'` (`f3_step_4` — coerenza): contiene il dispositivo finalizzato dopo verifica.
- `'corrected_device'` (`f3_step_3` — stress test e correzione): contiene il dispositivo dopo l'eventuale correzione condizionale.
- `'result_0'` (`f3_step_2` — micro-dispositivo iniziale): è la prima forma del dispositivo, prima dello stress test.

In v3.0 (D7) **non c'è più override post-step**: il dispositivo è prodotto e finalizzato lungo `2 → 3 → 4` senza sostituzioni ex post (vecchio meccanismo `applyStep6bOverride` rimosso).

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
- Layout **master-detail** in due colonne (riprogettato 2026-05-06):
  - **Sinistra**: ricerche F2 in righe compatte (~32px) — pallino di stato + label + contatore `n/7`. Click → seleziona la ricerca.
  - **Destra**: ambiti del tema della ricerca selezionata (relazione 1→N). Per ogni ambito: label, dominio · sottodominio · età · setting, progress bar dei 5 step F3, link "Apri pipeline F3 →" (per ambiti non promossi) o "Vai al tema F3 →" (promossi). Sezione "Temi legacy" in fondo per i temi creati col vecchio bridge senza ambito.
- All'avvio auto-seleziona la prima ricerca per non lasciare il pannello destro vuoto.
- Il context completo della ricerca selezionata (con `tema_ambiti` embedded) viene fetchato via `pipelineOrchestratorService.getRicerca` (l'index pubblico non lo include perché è dato runtime DB).

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
- Lista verticale dei 5 step F3 di interesse (presenti o saltati). v3.0: dipendenza lineare `1 → 2 → 3 → {2,3} → 4 → 5`.
- Ogni step espandibile mostra: **input pipeline** (con file di provenienza), **input esterni forniti dal ricercatore** (badge tipizzato), **output prodotto** (filename).
- Box "Origine" in alto: ricerca F2 e/o dispositivo sorgente (campo legacy ancora popolabile sul context, non più consumato dalla pipeline v3.0).

### 7.8 `CorrectionsLog.tsx`
Per ciascuna entry di `corrections_log` (v3.0: solo `f3_step_3`):
- box rosso "Frattura" (riferimento + summary + scope),
- freccia + tipo correzione,
- box correzione (verde se applicata, slate altrimenti),
- box razionale.
Supporta highlight di un `breaking_point_ref` specifico via prop.

### 7.9 `ProcessNarrative.tsx`
- Renderizza `revisioni.md` con `react-markdown` e mapping di componenti per stile Tailwind.
- Estrae con regex i `**Principio consolidato**: "..."` e li mostra come blockquote evidenziati in cima.

---

## 8. Cosa è ancora aperto

La sezione era originariamente un elenco dei vincoli architetturali per progettare l'estensione di esecuzione delle produzioni. La maggior parte è stata risolta nei round D2-D7. Restano alcuni punti aperti.

### 8.1 Schemi JSON non validati lato sito
Gli **schemi JSON di ciascuno step** sono noti come `*-schema.json` nelle cartelle di Cowork (`input/produzioni/f{2,3}-step-*-*/`) e usati lì come direttiva agli agenti. Lato webapp, le interfacce TypeScript in `client/src/types/pipeline.ts` descrivono il subset consumato dai viewer, ma non c'è validazione runtime (zod, ajv) sui dati prodotti dagli step. Per ora sufficiente; quando i viewer specifici verranno introdotti (vedi 8.2) sarà naturale aggiungere la validazione.

### 8.2 Viewer specifici per gli step F3 v3.0
I componenti di preview per gli output dei nuovi step F3 non sono ancora stati implementati (D7 §5.4 li lista come *tappa successiva*):

| Step | Componente di preview suggerito | Stato |
|---|---|---|
| `f3_step_1` (Nodo + funzione) | JSON pretty-printed | fallback OK |
| `f3_step_2` (Micro-dispositivo) | `MicroDispositivoViewer` (template a 7 campi + U1–U6 + non_applicability) | da implementare |
| `f3_step_3` (Stress test e correzione) | `StressTestDashboard` riconfigurato sui 5 nuovi `case_type` | da rivedere — il vecchio renderer assume lo schema di vecchio `f3_step_10` |
| `f3_step_4` (Coerenza F3) | `CoerenzaChecklistViewer` (10 controlli + critici falliti in evidenza) | da implementare |
| `f3_step_5` (Audit metodologico) | `AuditViewer` (8 controlli + esito globale) | da implementare |

Per la prima implementazione si accetta il fallback "JSON pretty-printed" su tutti.

### 8.3 Renderer input esterni rinominati
I renderer esterni si trovano inline in `client/src/components/pipeline/orchestration/ExternalInputForm.tsx`. Con v3.0:
- il vecchio `F3Step7InputRenderer` (form contesto/ambito) andrà rinominato semanticamente in `F3Step1InputRenderer` (lo step di destinazione è cambiato) — già allineato logicamente perché il form si attiva su `stepId === 'f3_step_7'` ma quella cartella di config non esiste più. Da fare al primo refactor.
- il vecchio `F3Step10InputRenderer` (5 casi stress test) andrà rinominato in `F3Step3InputRenderer` con i nuovi `case_type`.

### 8.4 Pulizia output legacy su filesystem
Le esecuzioni F3 precedenti a v3.0 sono **prove tecniche da abbandonare** (decisione del ricercatore, D7 §1.1). Possono essere cancellate o spostate in `output/produzioni/temi/_archivio-prove-tecniche-pre-r3/`. La rimozione delle 10 cartelle di prompt vecchie in `input/produzioni/f3-step-*` (vedi D7 §3.1) va fatta manualmente.

### 8.5 Riallineamento `Temi page` ↔ pipeline
`SviluppoBambinoProduzioniTemiPage` consuma un **JSON statico locale** (`client/src/data/theme-discovery-v1.json`) duplicato rispetto al modello "Archivio temi". Per coerenza conviene unificare le sorgenti — task ereditato da v2.x, ancora aperto.

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

### Pipeline v3.0 — 2026-05-06

**Refactoring metodologico della pipeline F3** (D7-pipeline-f3-redesign): da 11 step (1, 2, 3, 4, 5, 6, 6b, 6c, 7, 8, 9, 10) a **5 step lineari**: Nodo+Funzione, Micro-dispositivo, Stress test e correzione, Coerenza F3, Audit metodologico (opz.).

**Motivazione**: il confronto con la metodologia (`f3-strumenti-operativi.md`) ha evidenziato (a) sproporzione dimensionale, (b) assenza dei passaggi metodologici espliciti (nodo dominante, 4 funzioni), (c) stratificazioni di controllo non previste (3 stress test, audit di un audit, frammentazione del proxy, 4 step per "trasferimento" tra temi). v3.0 ricuce la pipeline al modello effettivo.

**Cambiamenti strutturali**:
- Sequenza F3 lineare: `1 → 2 → 3 → 4 → 5`. Niente più virtual ref `f3_step_3_or_6c`, niente più varianti `inputs_pipeline_skip_8`, niente più override post-verifica di `f3_step_6b`.
- Step di trasferimento (vecchi 7-9) abbandonati: nuovo ambito = nuova pipeline F3 indipendente, gestita dal **bridge ambiti** (vedi §3.1).
- Decisione modale `step7_context_selection` rimossa: l'ambito è raccolto come input esterno obbligatorio di `f3_step_1`, auto-popolato dal bridge.
- `f2_step_6.blocks` ora punta direttamente a `f3_step_1` (niente più `[human_decision] →`).
- Entità con cartelle/schemi nuovi in Cowork: `f3-step-{1-nodo-funzione, 2-micro-dispositivo, 3-stress-test, 4-coerenza, 5-audit-metodologico}/`. Le vecchie cartelle vanno rimosse manualmente.

**Bridge F2→F3 ad ambiti** (componente nuovo, costruito appositamente per v3.0):
- `PipelineContext.tema_ambiti: Record<theme_id, TemaAmbito[]>` — embedded sui contesti `ricerca`.
- 5 endpoint CRUD + 1 di promote (`POST /api/pipeline/ricerche/:r/temi/:t/ambiti/:a/promote`) + 1 di dismiss.
- Convenzione `tema_id F3 = ${theme}--${ambito}`.
- Pre-popolamento `PipelineExternalInput` di `f3_step_1` al promote, cosicché lo step parta col form contesto/ambito già compilato.

**Codice modificato**:

| File | Modifica |
|---|---|
| `server/pipeline-step-config.json` | v3.0: rimosse 11 entry F3 vecchie, aggiunte 5; `f2_step_6.blocks` aggiornato |
| `server/src/services/stepEnablement.ts` | Rimosse `pickPipelineInputs` con biforcazione step 9, `resolveVirtualStepRef`, `DECISION_BLOCKS_STEP`; `HumanDecisionType` ora `never` |
| `server/src/controllers/pipelineController.ts` | Rimossa logica f3_step_9 standard/skip-8 e f3_step_3_or_6c in `buildExecutionPlan` e in rollback. `promoteTemaAmbito` ora pre-popola `f3_step_1`. `postTemaDecision` deprecato (HTTP 410). Trigger `step7_context_selection` rimosso |
| `server/src/services/pipelineEventSubscriber.ts` | Rimossa `applyOverrideStep6b` |
| `server/src/services/pipelineMappers.ts` | `pickCanonicalDevice` mappa `f3_step_4 → f3_step_3 → f3_step_2` |
| `local/src/pipeline/constants.ts` | `STEP_FOLDER_MAP` con i 5 nuovi nomi cartella; `STEP_CLAUDE_FILE_MAP` svuotato |
| `local/src/pipeline/PromptComposer.ts` | Rimossa gestione speciale MICRO CASI di `f3_step_10` |
| `client/src/types/pipeline.ts` | `PipelineStepId` ridotto |
| `client/src/services/pipelineService.ts` | `shapeToStepId` riallineato; `fetchStressTest` legge da `f3_step_3`; `fetchCorrectionsLog` legge solo da `f3_step_3`; rimosso `applyStep6bOverride` |
| `client/src/pages/.../SviluppoBambinoPipelineMap.tsx` | F3_STEPS a 5; layout master-detail (vedi §7.3) |
| `client/src/components/pipeline/DeviceLineage.tsx` | F3_STEP_ORDER a 5; `inferPipelineInputs` lineare |

**Migrazione dati**: `scripts/migrate-f3-step-input-rename.mjs` rinomina `step_id: f3_step_7 → f3_step_1` per i `PipelineExternalInput contesto_ambito` dei temi promossi col vecchio bridge. Idempotente, supporta `--dry-run` e `--context X`.

**Esecuzioni precedenti**: i temi F3 pre-v3.0 sono prove tecniche; gli output JSON in `output/produzioni/temi/...` possono essere cancellati o spostati in `_archivio-prove-tecniche-pre-r3/`. Nessuna conversione di dati storici è richiesta.

**Caveat operativi**:
- riavviare il server Express dopo la modifica del config (`nodemon` non watcha `pipeline-step-config.json`);
- rimuovere manualmente le 10 cartelle vecchie F3 in `claude-cowork/.../input/produzioni/`.

### Pipeline v2.6 — 2026-05-06

Rimosso `tema_selezionato` da `inputs_esterni` di `f3_step_1`. Dopo l'introduzione del bridge F2→F3 ad ambiti (1→N), `tema_id`, `label` e `ricerca_origine` sono già disponibili sul context tema e derivabili dall'input pipeline `f2_step_6` (passaporto). Lo step parte ora senza richiesta input al ricercatore (a parte `contesto_ambito` introdotto poi in v3.0).

### Pipeline v2.5 — 2026-05-06

Aggiunta `f2_step_4b` come dipendenza `required` di `f2_step_5`. Era assente in v2.3 (la sequenza lineare `2 → 2a → 3 → 4 → 4b → 5 → 6` era infranta perché `f2_step_5` dipendeva solo da step 3 e 4 e diventava lanciabile prima che lo step opzionale 4b fosse eseguito o saltato). **Regola generale**: ogni step che segue uno step opzionale deve attendere che il predecessore sia in stato `completato` o `saltato`.

### Pipeline v2.4 — 2026-05-05

`f2_step_2a` e `f2_step_4b` ora skippabili: aggiunto `can_skip: true` + `skip_condition` (motivazione raccomandata) nel config.

**Motivazione**: la sequenza lineare forzata di v2.3 era troppo rigida — se i nodi candidati o la micro-matrice sono già strutturalmente pronti per gli step successivi, costringere ad eseguire 2a/4b è solo overhead. Il sistema di skip esisteva già lato server (`POST /api/pipeline/temi/:id/steps/:stepId/skip` con `reason` obbligatoria) ma era bloccato dal `can_skip: false`.

**UI**: in `StepRow` il bottone **"Salta"** è ora un pulsante secondario inline accanto a "Lancia" (prima era nel menu `▾`, meno scopribile). Visibile solo quando `state.can_skip && state.status ∈` `{non_avviato, attende_input}`. Click → dialog di conferma con campo motivazione obbligatorio.

**Step F2 skippabili in v2.4**: `f2_step_2a`, `f2_step_4b`. Tutti gli altri F2 sono `can_skip: false` (sono nodi strutturali della pipeline). Anche alcuni step F3 erano già skippabili da prima (vedi config).

### Pipeline v2.3 — 2026-05-05

Rese `required: true` le tre dipendenze precedentemente facoltative ("raccomandate"):

- `f2_step_3.inputs_pipeline` → `f2_step_2a` ora obbligatoria.
- `f2_step_4b.inputs_pipeline` → `f2_step_2a` ora obbligatoria.
- `f2_step_6.inputs_pipeline` → `f2_step_4b` ora obbligatoria.

**Motivazione**: la spec metodologica originale (v2.0) le aveva indicate come facoltative ma raccomandate. In pratica la pipeline è una sequenza lineare `2 → 2a → 3 → 4 → 4b → 5 → 6`: lasciare 2a e 4b facoltativi creava un'ambiguità (potevano non eseguirsi senza preavviso). Ora la sequenza è forzata: ogni step a valle attende il completamento del precedente.

**Per saltare uno step** (caso eccezionale, motivato): usare l'azione esplicita di skip (`POST /api/pipeline/temi/:id/steps/:stepId/skip` con `reason` obbligatoria). Il sistema di skip era già presente (vedi `pipelineController.skipStep`); ora è la via ufficiale per non eseguire 2a o 4b.

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
