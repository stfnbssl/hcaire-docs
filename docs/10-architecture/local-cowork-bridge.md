---
title: Local — ponte Cowork
sidebar_position: 9
---

# Local — ponte Cowork

Il workspace `local/` è un sidecar Node che gira **solo sul portatile dello sviluppatore** e fa da **ponte** tra il server cloud (Railway) e il progetto **Cowork** installato in locale. Questa pagina spiega perché esiste, mappa i casi d'uso che lo attraversano e isola il pattern comune.

> **Documentazione operativa correlata**: per i dettagli di basso livello sullo spawn di Cowork (eseguibile, argomenti, working directory, stdio, mock mode, recupero file output), vedi `local/docs/cowork-spawn.md` nel repo `hcaire`. Quel documento è complementare a questa pagina (architettura) e a `local/docs/prompt-composition.md` (cosa finisce nel prompt).

## 1. Perché esiste

Cowork (oggi: Claude Code CLI come `claude --print --dangerously-skip-permissions`) **non è disponibile come servizio remoto invocabile via HTTP**. Si esegue solo come binario locale, con accesso al filesystem del progetto Cowork (`COWORK_PROJECT_PATH`) dove vivono `CLAUDE.md` di prompt, schemi, file di input precompilati e output.

Da qui il vincolo architetturale: ogni elaborazione che richiede Cowork deve girare sul filesystem locale. Il server su Railway non può spawnare Cowork direttamente. La soluzione è il sidecar `local/`:

```
[Server Railway] --(Redis Cloud)--> [local/] --spawn--> [Cowork CLI]
                                                          |
                                                          ↓ filesystem locale
                                                       (output JSON/MD)
```

Redis Cloud è il punto di rendezvous: il server pubblica/coda comandi, il worker locale li consuma e risponde con eventi.

Quando il portatile è spento, i comandi restano in lista Redis (LPUSH non scade). Quando torna online, il worker riprende dal primo comando.

## 2. Casi d'uso che oggi passano da `local/`

Quattro casi d'uso, tutti in scope:

### 2.1 Generazione articoli del blog

| Aspetto | Valore |
|---------|--------|
| **Trigger** | Bot Telegram (autorizzato a un singolo `TELEGRAM_ID`) |
| **Canale Redis** | `article:new` (PUBLISH/SUBSCRIBE) |
| **Subscriber** | `local/src/index.ts` |
| **Esecutore** | `local/src/coworker.ts` (`spawnCoworker`) |
| **Input → Cowork** | File `input_articoli.md` scritto in `COWORK_PROJECT_PATH` con tracce concatenate da separatore `===== NUOVO ARTICOLO =====` |
| **Prompt** | "Leggi le tracce in input_articoli.md, genera gli articoli e pubblicali sul blog." (variante senza pubblicazione disponibile) |
| **Output** | Cowork pubblica direttamente sul blog via `POST /api/contents/import` con `COWORK_API_KEY`; `local` aggiorna `ArticleRequest.status` (`processing` → `done`/`error`) |
| **Eventi indietro** | Nessun protocollo `step.*`: solo update finale + notifica Telegram dello stato |

**Flusso end-to-end:**

1. L'utente Telegram invia un messaggio di testo libero (la "traccia"). Il bot lo salva come `ArticleRequest { testo, status: 'pending' }`.
2. Quando l'utente invia un comando (regex `/(genera|crea|scrivi|produci).{0,30}articol/i`, opzionalmente `+ /e\s+pubblica/i`), il bot estrae gli `ArticleRequest pending` e chiama `redis.publish('article:new', { ids, pubblica })`.
3. Il subscriber in `local/src/index.ts` riceve, chiama `spawnCoworker(ids, pubblica)`.
4. `coworker.ts` scrive `input_articoli.md`, marca i record come `processing`, spawna Cowork con cwd=`COWORK_PROJECT_PATH`.
5. Cowork genera e (se richiesto) pubblica gli articoli, esce con codice 0.
6. `coworker.ts` marca come `done` e manda un messaggio Telegram di riepilogo.

### 2.2 Letture critiche

| Aspetto | Valore |
|---------|--------|
| **Trigger** | UI admin: `POST /api/admin/letture/:slug/steps/:step_id/run` |
| **Canale Redis** | `hcaire:letture:commands` (LPUSH) + `hcaire:letture:events` (PUBLISH) |
| **Subscriber** | `LettureCommandHandler` (BRPOP loop) in `local/src/pipeline/LettureCommandHandler.ts` |
| **Esecutore** | `CoworkRunner` in `local/src/pipeline/CoworkRunner.ts` |
| **Input → Cowork** | Prompt composto da `LetturePromptComposer` via stdin; Cowork legge file da `LETTURE_SPECS_ROOT`, `LETTURE_OUTPUT_ROOT` |
| **Output** | JSON (e in alcuni step MD) in `LETTURE_OUTPUT_ROOT/<slug>/[editorial/]`. Server legge `output_file` da `step.completed` |
| **Eventi indietro** | Protocollo `pipeline.step.{started,log,completed,failed,cancelled,pong}` su `letture:events` |
| **Step coperti** | `step_1` ... `step_4` + `step_5a` ... `step_5f` (10 step, alcuni editoriali) |

**Specificità:**

- Pre-flight: prima di eseguire `step.run`, il worker rilegge `opere` su Mongo per verificare che lo step sia ancora `in_coda`. Se cambiato, salta.
- Path input/output arrivano **assoluti** dal server (no resolver locale).
- Modalità mock: `PIPELINE_MOCK_MODE=true` (default) salta lo spawn e scrive un file segnaposto. Impostare a `false` per esecuzioni reali.

### 2.3 Produzioni Sviluppo Bambino (F2/F3)

| Aspetto | Valore |
|---------|--------|
| **Trigger** | UI admin: endpoint sotto `/api/pipeline/...` |
| **Canale Redis** | `hcaire:pipeline:commands` (LPUSH) + `hcaire:pipeline:events` (PUBLISH) |
| **Subscriber** | `PipelineCommandHandler` in `local/src/pipeline/PipelineCommandHandler.ts` |
| **Esecutore** | `CoworkRunner` (lo stesso delle letture) |
| **Input → Cowork** | `PromptComposer` + risoluzione path locale (`STEPS_ROOT`, `INPUTS_ROOT`); espansione di `assi-strutturali.json` nei 6 file `asse_1..6.json` precompilati |
| **Output** | JSON in `OUTPUT_ROOT/<output_dir>/<output_filename>`. Server lo embedda in `PipelineStepExecution.output_data` e lo copia in `client/public/pipeline/` |
| **Eventi indietro** | Protocollo `pipeline.step.*` |
| **Step coperti** | F2 (v3.0, 7 step): `f2_step_1..6`. F3 (v3.0, 5 step lineari): `f3_step_1..5` |

**Specificità:**

- **Path resolver locale** (`_resolveLocalPath`): traduce path relativi server in path assoluti locali via `STEPS_ROOT`, `INPUTS_ROOT`, `OUTPUT_ROOT`.
- **Espansione assi precompilati**: `assi-strutturali.json` viene esploso in 6 entry pointing ai file `asse_*.json` reali in `PRECOMPILED_AXES_DIR`.
- **`logInputSummary`**: prima di Cowork pubblica un riepilogo human-readable come `pipeline.step.log`. Utile per debug nel log viewer admin.
- Pre-flight check su `pipeline_step_executions`.

### 2.4 Bartleby

| Aspetto | Valore |
|---------|--------|
| **Trigger** | Submission trace (API key o admin) → `bartlebyController.submitTrace` |
| **Canale Redis** | `bartleby:trace:new` (PUBLISH/SUBSCRIBE) |
| **Subscriber** | `local/src/bartlebyWorker.ts` (`processBartlebyTrace`) |
| **Esecutore** | Spawn Cowork via prompt composto da `InputTrace` + KB context |
| **Input → Cowork** | File `input_bartleby.md` con la trace e i riferimenti area/skill |
| **Output** | Cowork emette JSON parsato dallo worker, salvato come `OutputDocument` su `bartleby_output_documents` |
| **Eventi indietro** | Update stato `InputTrace.status` + append `WorkflowLog` |

Dettagli completi in [Modulo Bartleby](../20-modules/bartleby.md).

## 3. Pattern generalizzabile

Pattern comune a tutti i casi d'uso "ponte Cowork":

```
1. TRIGGER esterno
   └─ HTTP admin (letture, produzioni) | Telegram (articoli) | API key (Bartleby)
2. SERVER scrive in MongoDB lo stato iniziale
3. SERVER pubblica un comando su Redis
   └─ LPUSH <canale:commands>  (queue: BRPOP nel worker)
   └─ PUBLISH <canale:events>  (broadcast: tutti i subscriber)
4. LOCAL consuma il comando
   ├─ pre-flight: re-legge stato in Mongo, salta se cambiato
   └─ compone prompt + risolve path locale
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
| `CoworkRunner` | `local/src/pipeline/CoworkRunner.ts` | Spawn Cowork + stdin prompt + log line-by-line + heartbeat 20s + timeout + cancel + glob fallback su filename + parsing JSON. Condiviso fra letture e produzioni. |
| `PromptComposer` / `LetturePromptComposer` | `local/src/pipeline/` | Compongono prompt dal `CLAUDE.md` dello step + inline input < 50 KB |
| Protocollo eventi | `services/messageBus.ts` + `*CommandHandler.ts` | Schema condiviso started/log/completed/failed/cancelled/pong |
| Watchdog server-side | `services/pipelineEventSubscriber.ts` e gemello letture | Re-marca `fallito` execution senza eventi oltre soglia |

### Parti specifiche per dominio

- **Composer del prompt**: una classe per dominio (`PromptComposer` per produzioni, `LetturePromptComposer` per letture, Bartleby ha il suo prompt template).
- **Set di canali Redis**: ogni dominio ha la sua coppia `<dominio>:commands`/`<dominio>:events`.
- **Cartella di lavoro Cowork**: `COWORK_<DOMINIO>_PATH` con fallback a `COWORK_PROJECT_PATH`.

## 4. Replicare il pattern per un nuovo caso d'uso

Checklist per aggiungere un quinto verticale "X" che richieda Cowork:

1. **Sul server**:
   - Costanti `REDIS_X_COMMANDS_KEY` e `REDIS_X_EVENTS_CHANNEL`.
   - `services/xMessageBus.ts` (clone di `messageBus.ts`).
   - `services/xEventSubscriber.ts` con handler started/log/completed/failed/cancelled e `services/xWatchdog.ts` se servono timeout.
   - Avviare i due servizi in `index.ts` dentro `try/catch` indipendente.
   - Rotta admin che fa LPUSH del comando `step.run`.
2. **Sul worker `local/`**:
   - `local/src/pipeline/xConstants.ts` (canali + path filesystem + mappa step).
   - `XPromptComposer.ts` (estende o copia uno dei due esistenti).
   - `XCommandHandler.ts` (clone di `LettureCommandHandler.ts` o `PipelineCommandHandler.ts`).
   - `await xHandler.start()` in `local/src/index.ts`.
3. **In Cowork**:
   - Progetto Cowork dedicato con `CLAUDE.md` degli step di X.
   - `COWORK_X_PATH` in `local/.env`.

Tutta la parte "spawn + log + timeout + glob fallback" è già coperta da `CoworkRunner`.

## 5. Telegram: long-polling, niente webhook

Nessuna traccia di **ngrok** nel monorepo. Il bot Telegram è avviato con `bot.launch()` di Telegraf (`services/telegramBot.ts`) **senza** `bot.telegram.setWebhook(...)`: default Telegraf in questa modalità è long-polling. Il server fa outbound HTTPS verso `api.telegram.org/bot<token>/getUpdates`. Niente endpoint pubblico richiesto.

L'unico endpoint pubblico è quello di Railway, usato per HTTP del client e per il webhook Lemon Squeezy. Niente ngrok.

Se in futuro si volesse passare il bot in modalità webhook:

```ts
const url = `${process.env.SERVER_PUBLIC_URL}/telegram/webhook`;
await bot.telegram.setWebhook(url);
app.use('/telegram/webhook', bot.webhookCallback('/telegram/webhook'));
```

usando direttamente l'URL Railway, senza ngrok.

## 6. Riferimenti rapidi al codice

| File | Scopo |
|------|-------|
| `local/src/index.ts` | Entry: connectMongo, subscribe canali, avvia handler |
| `local/src/coworker.ts` | Articoli: `spawnCoworker(ids, pubblica)` |
| `local/src/bartlebyWorker.ts` | Bartleby: `processBartlebyTrace(payload)` |
| `local/src/pipeline/PipelineCommandHandler.ts` | Produzioni Sviluppo Bambino |
| `local/src/pipeline/LettureCommandHandler.ts` | Letture critiche |
| `local/src/pipeline/CoworkRunner.ts` | Spawn condiviso di Claude Code CLI |
| `local/src/pipeline/PromptComposer.ts` | Composer prompt produzioni |
| `local/src/pipeline/LetturePromptComposer.ts` | Composer prompt letture |
| `local/src/pipeline/constants.ts` | Costanti pipeline produzioni |
| `local/src/pipeline/lettureConstants.ts` | Costanti pipeline letture |
| `server/src/services/telegramBot.ts` | Bot Telegram → Redis `article:new` |
| `server/src/services/messageBus.ts` | Lato server: PUBLISH commands + SUBSCRIBE events |
| `server/src/services/pipelineEventSubscriber.ts` | Handler eventi + watchdog produzioni |
| `server/src/services/lettureMessageBus.ts` + `lettureEventSubscriber.ts` | Speculare per letture |
| `server/src/controllers/bartlebyController.ts` | Submission trace Bartleby |
