---
title: Local — ponte Cowork
sidebar_position: 9
---

# Local — ponte Cowork

Il workspace `local/` è un sidecar Node che gira **solo sul portatile dello sviluppatore** e fa da **ponte** tra il server cloud (Railway) e il progetto **Cowork** installato in locale. Questa pagina spiega perché esiste, mappa i tre casi d'uso che lo attraversano e isola il pattern comune riusabile per casi futuri.

## 1. Perché esiste

Cowork (oggi: Claude Code CLI come `claude --print --dangerously-skip-permissions`) **non è disponibile come servizio remoto invocabile via HTTP**. Si esegue solo come binario locale, con accesso al filesystem del progetto Cowork (`COWORK_PROJECT_PATH`) dove vivono i `CLAUDE.md` di prompt, gli schemi, i file di input precompilati e dove vengono scritti gli output.

Da qui il vincolo architetturale: ogni elaborazione che richiede Cowork **deve girare sul filesystem locale**. Il server su Railway non può spawnare Cowork direttamente. La soluzione è il sidecar `local/`:

```
[Server Railway] --(Redis Cloud)--> [local/] --spawn--> [Cowork CLI]
                                                          |
                                                          ↓ filesystem locale
                                                       (output JSON/MD)
```

Redis Cloud è il punto di rendezvous: il server pubblica/coda comandi, il worker locale li consuma e risponde con eventi.

Quando il portatile è spento, i comandi restano in lista Redis (LPUSH non scade). Quando torna online, il worker riprende dal primo comando.

## 2. Casi d'uso che oggi passano da `local/`

Tre sono confermati nel codice. Oltre a questi, il worker gestisce anche Bartleby (fuori scope B di questa documentazione, vedi §6).

### 2.1 Generazione articoli del blog

| Aspetto | Valore |
|---------|--------|
| **Trigger** | Bot Telegram (autorizzato a un singolo `TELEGRAM_ID`) |
| **Canale Redis** | `article:new` (PUBLISH/SUBSCRIBE) |
| **Subscriber** | `local/src/index.ts` |
| **Esecutore** | `local/src/coworker.ts` (`spawnCoworker`) |
| **Input → Cowork** | File `input_articoli.md` scritto in `COWORK_PROJECT_PATH` con tracce concatenate da separatore `===== NUOVO ARTICOLO =====` |
| **Prompt** | "Leggi le tracce in input_articoli.md, genera gli articoli e pubblicali sul blog." (variante senza pubblicazione disponibile) |
| **Output** | Cowork pubblica direttamente sul blog (probabilmente via `POST /api/contents/import` con `COWORK_API_KEY`); `local` aggiorna solo `ArticleRequest.status` (`processing` → `done`/`error`) |
| **Eventi indietro** | Nessun protocollo `step.*`: solo update finale + notifica Telegram dello stato |

**Flusso end-to-end:**

1. L'utente Telegram autorizzato invia un messaggio di testo libero (la "traccia"). Il bot lo salva come `ArticleRequest { testo, status: 'pending' }`.
2. Quando l'utente invia un comando del tipo "genera articoli e pubblica" (regex `/genera|crea|scrivi|produci.../articol/i` + `/e\s+pubblica/i`), il bot:
   - estrae tutti gli `ArticleRequest` con `status: 'pending'`,
   - chiama `redis.publish('article:new', { ids, pubblica })`.
3. Il subscriber in `local/src/index.ts` riceve il messaggio, chiama `spawnCoworker(ids, pubblica)`.
4. `coworker.ts` scrive `input_articoli.md`, marca tutti come `processing`, spawna `claude --print --dangerously-skip-permissions` con cwd=`COWORK_PROJECT_PATH`.
5. Cowork legge le tracce, genera e pubblica gli articoli, esce con codice 0.
6. `coworker.ts` marca tutti come `done` e manda un messaggio Telegram di riepilogo.

### 2.2 Letture critiche

| Aspetto | Valore |
|---------|--------|
| **Trigger** | UI admin del sito: `POST /api/admin/letture/:slug/steps/:step_id/run` |
| **Canale Redis** | `hcaire:letture:commands` (LPUSH dal server) + `hcaire:letture:events` (PUBLISH dal worker) |
| **Subscriber** | `LettureCommandHandler` (BRPOP loop) in `local/src/pipeline/LettureCommandHandler.ts` |
| **Esecutore** | `CoworkRunner` in `local/src/pipeline/CoworkRunner.ts` |
| **Input → Cowork** | Prompt composto da `LetturePromptComposer` inviato via stdin; Cowork legge i file di input dal filesystem locale (`LETTURE_SPECS_ROOT`, `LETTURE_OUTPUT_ROOT`) |
| **Output** | Cowork scrive JSON (e in alcuni step anche MD) in `LETTURE_OUTPUT_ROOT/<slug>/[editorial/]`. Il server legge il file via `output_file` riportato nell'evento `step.completed` |
| **Eventi indietro** | Protocollo `pipeline.step.{started,log,completed,failed,cancelled,pong}` su `hcaire:letture:events` |
| **Step coperti** | `step_1` ... `step_4` + `step_5a` ... `step_5f` (10 step totali, alcuni editoriali) |

**Specificità:**

- Pre-flight check: prima di eseguire `step.run`, il worker legge `opere` su Mongo per verificare che lo stato dello step sia ancora `in_coda`. Se è cambiato (cancellato, ri-triggerato), salta il comando.
- I path di input/output arrivano già **assoluti** dal server (no resolver locale come per Sviluppo Bambino).
- Modalità mock: `PIPELINE_MOCK_MODE=true` (default!) salta lo spawn Cowork e scrive un file segnaposto. Va impostata a `false` per esecuzioni reali.

### 2.3 Produzioni — Sviluppo Bambino (F2/F3)

| Aspetto | Valore |
|---------|--------|
| **Trigger** | UI admin del sito: endpoint sotto `/api/pipeline/...` (vedi `routes/pipeline.ts`) |
| **Canale Redis** | `hcaire:pipeline:commands` (LPUSH) + `hcaire:pipeline:events` (PUBLISH) |
| **Subscriber** | `PipelineCommandHandler` (BRPOP loop) in `local/src/pipeline/PipelineCommandHandler.ts` |
| **Esecutore** | `CoworkRunner` (lo stesso usato dalle letture) |
| **Input → Cowork** | Prompt composto da `PromptComposer`; risoluzione path locale per input pipeline (`STEPS_ROOT`, `INPUTS_ROOT`); espansione speciale di `assi-strutturali.json` nei 6 file `asse_1..6.json` precompilati |
| **Output** | Cowork scrive JSON in `OUTPUT_ROOT/<output_dir>/<output_filename>`. Il server lo legge, lo embedda in `PipelineStepExecution.output_data` e lo copia in `client/public/pipeline/` |
| **Eventi indietro** | Protocollo `pipeline.step.*` su `hcaire:pipeline:events` |
| **Step coperti** | F2 (v2.x, 7 step): `f2_step_2`, `2a`, `3`, `4`, `4b`, `5`, `6` (`f2_step_1` rimosso, ora gestito dall'Archivio temi). F3 (v3.0 / D7, 5 step lineari): `f3_step_1` Nodo+Funzione, `f3_step_2` Micro-dispositivo, `f3_step_3` Stress test e correzione, `f3_step_4` Coerenza F3, `f3_step_5` Audit metodologico (opz.) |

**Specificità non presenti nelle letture:**

- **Path resolver locale** (`_resolveLocalPath`): traduce path relativi del server (`inputs/...`, `strutturali/...`, ecc.) in path assoluti sul filesystem locale, usando le env `STEPS_ROOT`, `INPUTS_ROOT`, `OUTPUT_ROOT`.
- **Espansione assi precompilati**: l'input logico `assi-strutturali.json` viene esploso in 6 entry pointing ai file `asse_*.json` reali nella cartella `PRECOMPILED_AXES_DIR`.
- **`logInputSummary`**: prima dell'avvio Cowork, pubblica come `pipeline.step.log` un riepilogo human-readable di tutti i parametri ricevuti. Visibile nel log viewer dell'admin per debug.
- **Pre-flight check** su `pipeline_step_executions`: salta se lo stato non è più `in_coda`.

## 3. Pattern generalizzabile

Pattern comune a tutti i casi d'uso "ponte Cowork":

```
1. TRIGGER esterno
   └─ HTTP admin (letture, produzioni) | Telegram (articoli) | webhook? | etc.
2. SERVER scrive in MongoDB lo stato iniziale (es. PipelineStepExecution: in_coda)
3. SERVER pubblica un comando su Redis
   └─ LPUSH <canale:commands>  (queue: il worker consuma uno alla volta con BRPOP)
   └─ PUBLISH <canale:events>  (broadcast: tutti i subscriber attivi)
4. LOCAL consuma il comando
   ├─ pre-flight: re-leggi lo stato in Mongo, salta se è cambiato
   └─ compone prompt + risolve path filesystem locale
5. LOCAL spawna Cowork
   └─ claude --print --dangerously-skip-permissions
   └─ stdin: prompt; cwd: COWORK_PROJECT_PATH
6. COWORK lavora sul filesystem locale
   └─ legge specs (CLAUDE.md, schemi, input precompilati)
   └─ scrive output (JSON o markdown)
7. LOCAL pubblica eventi sul ritorno
   └─ PUBLISH <canale:events>  (started, log, completed/failed)
8. SERVER ascolta eventi e aggiorna MongoDB
   └─ stato execution, log_lines (con buffer), output_data, output_file
9. SERVER (post-completed) copia il file da filesystem locale a path pubblico
   └─ es. client/public/pipeline/ per le produzioni
```

### Pezzi riusabili oggi

| Componente | File | Cosa fa |
|------------|------|---------|
| `CoworkRunner` | `local/src/pipeline/CoworkRunner.ts` | Spawn Cowork + stdin del prompt + log line-by-line + heartbeat 20s + timeout + cancel + glob fallback su filename con placeholder + parsing JSON dell'output. Già condiviso fra letture e produzioni. |
| `PromptComposer` / `LetturePromptComposer` | `local/src/pipeline/` | Compongono il prompt finale a partire dal `CLAUDE.md` dello step + inline degli input < 50KB |
| Protocollo eventi `pipeline.step.*` | `services/messageBus.ts` (server) + `*CommandHandler.ts` (local) | Schema condiviso per started/log/completed/failed/cancelled/pong |
| Watchdog server-side | `services/pipelineEventSubscriber.ts` (e gemello letture) | Re-marca come `fallito` le execution senza eventi oltre soglia |

### Parti specifiche per ogni caso

- **Composer del prompt**: oggi una classe per dominio (`PromptComposer` per produzioni, `LetturePromptComposer` per letture). Differiscono per come trovano i `CLAUDE.md` degli step e per la mappa `step_id → cartella`.
- **Set di canali Redis**: ogni dominio ha la sua coppia `<dominio>:commands`/`<dominio>:events` per evitare collisioni.
- **Cartella di lavoro Cowork**: `COWORK_<DOMINIO>_PATH` con fallback a `COWORK_PROJECT_PATH`.

## 4. Replicare il pattern per un nuovo caso d'uso

Checklist (proposta) per aggiungere un quarto verticale "X" che richieda Cowork:

1. **Sul server**:
   - Definire le costanti `REDIS_X_COMMANDS_KEY` e `REDIS_X_EVENTS_CHANNEL`.
   - Creare `services/xMessageBus.ts` (clone di `messageBus.ts` con i nuovi canali).
   - Creare `services/xEventSubscriber.ts` con handler `started/log/completed/failed/cancelled` che aggiornano i modelli di X (e `services/xWatchdog.ts` se servono timeout).
   - Avviare i due servizi in `index.ts` dentro un `try/catch` indipendente.
   - Aggiungere la rotta admin che fa LPUSH del comando `step.run`.
2. **Sul worker `local/`**:
   - Definire `local/src/pipeline/xConstants.ts` (canali + path filesystem `X_SPECS_ROOT`, `X_OUTPUT_ROOT`, `COWORK_X_PATH`, mappa step).
   - Creare `XPromptComposer.ts` (può estendere o copiare uno dei due esistenti, a seconda della struttura dei `CLAUDE.md`).
   - Creare `XCommandHandler.ts` (clone di `LettureCommandHandler.ts` se gli input arrivano già assoluti dal server, altrimenti di `PipelineCommandHandler.ts` se serve un path resolver locale).
   - Avviare `await xHandler.start()` in `local/src/index.ts`.
3. **In Cowork**:
   - Creare il progetto Cowork dedicato con i `CLAUDE.md` degli step di X.
   - Impostare `COWORK_X_PATH` in `local/.env` per puntare a quella cartella.

Tutta la parte "spawn + log + timeout + glob fallback" è già coperta da `CoworkRunner` e si riusa così com'è.

## 5. NGROK: situazione reale

**Verifica sul codice (2026-05-05): nessuna traccia di ngrok in tutto il monorepo.** La grep su `ngrok|NGROK` nelle directory `server/`, `client/`, `local/`, `scripts/`, `docs/` non trova nulla.

Il bot Telegram è avviato con `bot.launch()` di Telegraf (`services/telegramBot.ts:101`) **senza** chiamata a `bot.telegram.setWebhook(...)`. Il default di Telegraf in questa modalità è il **long-polling**: il server fa outbound HTTPS verso `api.telegram.org/bot<token>/getUpdates` a intervalli, niente endpoint pubblico richiesto.

Possibile spiegazione storica della memoria su ngrok:

- In una versione precedente il bot Telegram poteva essere stato configurato in modalità **webhook** (Telegraf supporta entrambe). In quel caso serviva un URL HTTPS pubblico, e in dev locale ngrok era il modo comune di esporlo.
- Quando il server è stato spostato su Railway (URL pubblico HTTPS già disponibile), si poteva mantenere il webhook ma il codice attuale usa long-polling. Probabilmente la transizione ha reso ngrok non più necessario e il setup è stato semplificato.
- L'altra integrazione che richiederebbe webhook (Lemon Squeezy → `POST /webhooks/lemonsqueezy`) oggi punta direttamente all'URL Railway, non passa per ngrok.

**Conclusione operativa:** non serve ngrok per nulla nello stato attuale del codice. Se in futuro si volesse passare il bot Telegram in modalità webhook (per latenza minore o per ridurre l'overhead di polling), basterebbe:

```ts
const url = `${process.env.SERVER_PUBLIC_URL}/telegram/webhook`;
await bot.telegram.setWebhook(url);
app.use('/telegram/webhook', bot.webhookCallback('/telegram/webhook'));
```

usando direttamente l'URL Railway, senza ngrok di mezzo.

## 6. Bartleby (fuori scope B)

Per completezza: il worker `local/` gestisce anche un quarto caso d'uso, **Bartleby**, sul canale `bartleby:trace:new`. Il publisher è `server/src/controllers/bartlebyController.ts:205`. L'esecutore locale è `local/src/bartlebyWorker.ts` (`processBartlebyTrace`). Il pattern è simile agli articoli (PUBLISH/SUBSCRIBE, prompt come file `input_bartleby.md`, spawn Cowork) ma con un passaggio aggiuntivo: il worker parsa la risposta JSON dello stdout di Cowork e salva un `OutputDocument` su Mongo (`bartleby_output_documents`).

Bartleby è documentato a parte (`hcaire-blog/CLAUDE_bartleby.md`) e non è incluso nello scope di questa documentazione.

## 7. Riferimenti rapidi al codice

| File | Scopo |
|------|-------|
| `local/src/index.ts` | Entry: connectMongo, subscribe `article:new` + `bartleby:trace:new`, avvia `PipelineCommandHandler` e `LettureCommandHandler` |
| `local/src/coworker.ts` | Articoli: `spawnCoworker(ids, pubblica)` |
| `local/src/bartlebyWorker.ts` | Bartleby: `processBartlebyTrace(payload)` |
| `local/src/pipeline/PipelineCommandHandler.ts` | Produzioni Sviluppo Bambino |
| `local/src/pipeline/LettureCommandHandler.ts` | Letture critiche |
| `local/src/pipeline/CoworkRunner.ts` | Spawn condiviso di Claude Code CLI con timeout/cancel/glob fallback |
| `local/src/pipeline/PromptComposer.ts` | Composer prompt produzioni |
| `local/src/pipeline/LetturePromptComposer.ts` | Composer prompt letture |
| `local/src/pipeline/constants.ts` | Costanti pipeline produzioni (canali, root filesystem, mappa step) |
| `local/src/pipeline/lettureConstants.ts` | Costanti pipeline letture |
| `server/src/services/telegramBot.ts` | Bot Telegram → Redis `article:new` |
| `server/src/services/messageBus.ts` | Lato server: PUBLISH commands + SUBSCRIBE events (produzioni) |
| `server/src/services/pipelineEventSubscriber.ts` | Lato server: handler eventi + watchdog (produzioni) |
| `server/src/services/lettureMessageBus.ts` | Speculare per letture |
| `server/src/services/lettureEventSubscriber.ts` | Speculare per letture |
