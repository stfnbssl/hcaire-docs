---
title: Database
sidebar_position: 4
---

# Database

L'applicazione usa **un solo database**: MongoDB Atlas, cluster `Cluster0`, database `hcaire_db`. Nessun altro storage transazionale (Redis è solo pub/sub + code, non source-of-truth). Filesystem usato solo per artefatti pipeline e contenuti statici.

## 1. Connessione

`server/src/config/db.ts`:

```ts
const mongoUrl = urlTemplate
  .replace('{password}', password)
  .replace('/?', '/hcaire_db?');
await mongoose.connect(mongoUrl);
```

`MONGODB_URL` ha la forma `mongodb+srv://stfnbssl_db_user:{password}@cluster0.y3qtgdm.mongodb.net/?appName=Cluster0`. Il codice sostituisce `{password}` con `MONGODB_PASSWORD` e inietta `/hcaire_db` prima dei query params.

Su errore di connessione `connectDB` chiama `process.exit(1)`. Lo stesso pattern di iniezione del nome DB è replicato nel worker `local/` (`local/src/index.ts`).

Mongoose è usato in modalità default: nessun `strict: 'throw'`, nessuna opzione di pooling esplicita, nessun `autoIndex: false`. Gli indici vengono creati al primo bind dei modelli (vedi `server/src/models/*.ts`).

## 2. Collection

12 modelli applicativi nel core (escluso Bartleby, fuori scope B):

| Collection | Modello | File | Scopo |
|------------|---------|------|-------|
| `hcaire-content` | `Content` | `models/Content.ts` | Articoli blog. Campo chiave `accessType: 'free' \| 'plus'` per il paywall |
| `navigation` | `Navigation` | `models/Navigation.ts` | Menu dinamico (`order`, `isVisible`, `isSpecial`) |
| `article-requests` | `ArticleRequest` | `models/ArticleRequest.ts` | Form richiesta articolo (testo libero + status) |
| `opere` | `Opera` | `models/Opera.ts` | Letture critiche (slug, opera, step di analisi) |
| `site-config` | `SiteConfig` | `models/SiteConfig.ts` | `status: 'test' \| 'live'` (vedi `SiteConfigContext`) |
| `site-content` | `SiteContent` | `models/SiteContent.ts` | Stringhe UI con `translations: { it, en, ... }` |
| `user-subscriptions` | `UserSubscription` | `models/UserSubscription.ts` | Stato abbonamento per `clerkUserId` (chiave logica) |
| `workflow-logs` | `WorkflowLog` | `models/WorkflowLog.ts` | Log eventi articolo + Bartleby + pipeline |
| `pipeline-context` | `PipelineContext` | `models/PipelineContext.ts` | Stato per `context_id` (un context = un tema/letture run) |
| `pipeline-external-input` | `PipelineExternalInput` | `models/PipelineExternalInput.ts` | Input forniti dall'utente per step che li richiedono |
| `pipeline-step-execution` | `PipelineStepExecution` | `models/PipelineStepExecution.ts` | Singola esecuzione di step (status, log_lines, output_data) |
| `bartleby_input_traces` | (locale) | `local/src/index.ts` | Tracce input Bartleby — definita anche nel worker |

Le collection `bartleby/*` (modelli sotto `server/src/models/bartleby/`) sono fuori scope B.

## 3. Pattern Mongoose ricorrenti

- **`timestamps: true`** sui modelli applicativi (createdAt/updatedAt automatici).
- **Collection name esplicito** via `{ timestamps: true, collection: 'workflow-logs' }` per evitare la pluralizzazione automatica di Mongoose (`workflowlogs`).
- **Hot-reload safe**: nei file potenzialmente caricati due volte (es. worker `local/`) si usa il pattern `mongoose.models[name] ?? mongoose.model(name, schema)` per evitare l'errore "OverwriteModelError".
- **`.lean()`** per le query read-only di liste (es. nel watchdog pipeline).
- **`$set` + `$addToSet` + `$pull`** per aggiornamenti parziali su array di stato (`steps_completed`, `steps_failed`, `steps_in_progress` su `PipelineContext`).

## 4. Indici

I modelli dichiarano indici via `schema.index({...})` quando servono. Esempi noti:

- `UserSubscription`: indice unico su `clerkUserId` (è la chiave esterna verso Clerk).
- `PipelineStepExecution`: indici per `(context_id, step_id)` e `status` (usato dal watchdog).
- `Content`: indice unico su `slug`.

Mongoose crea gli indici al primo bind del modello. **In produzione conviene** disabilitare `autoIndex` e gestirli con script di migrazione, ma oggi non lo si fa.

## 5. Operazioni di scrittura per dominio

| Dominio | Quando scrive | Note |
|---------|---------------|------|
| Blog/CMS | Admin via dashboard, automazioni via `/api/contents/import` (api-key) | Nessun versionamento, l'update sovrascrive |
| Article requests | Form pubblico | Status manuale via admin |
| Site config | Admin | Singolo doc letto dal context FE |
| Site content | Admin | UI editabile con cache localStorage 1h lato FE |
| Webhooks Lemon Squeezy | Server (HMAC verified) | `findOneAndUpdate` con `upsert` su `clerkUserId` |
| Pipeline events | `pipelineEventSubscriber` | Buffer log + `$set/$push/$addToSet/$pull` |
| Letture events | `lettureEventSubscriber` | Speculare a pipeline |
| Workflow logs | Server + worker `local` | Append-only |

## 6. Backup e gestione

Atlas gestisce backup e snapshot lato cloud. **Non** ci sono script di migrazione versionati nella repo (niente `migrate-mongo`, niente Prisma migrate). Le evoluzioni di schema avvengono per Mongoose convention: i nuovi campi sono `optional` e i documenti vecchi sopravvivono.

:::note Da chiarire
Se si introduce una migrazione *non additiva* (rinomina campo, cambio di tipo) oggi non c'è un meccanismo strutturato. Per ora va eseguita manualmente su Atlas con uno script `mongosh`.
:::

## 7. Source of truth per gli artefatti pipeline

I file JSON degli step (vedi [Produzioni §4](../20-modules/sviluppo-bambino/produzioni.md#4-sorgenti-dati-file-su-disco)) **non** sono in MongoDB ma sotto `client/public/pipeline/`. MongoDB conserva solo:

- Lo **stato runtime** dell'esecuzione (`PipelineStepExecution`).
- Il **contesto** (`PipelineContext` con `step_states`, `overrides_applied`, ecc.).
- L'**embed** dell'output JSON parsato (`PipelineStepExecution.output_data`) per evitare al frontend di andare a leggere il filesystem locale.

Quando un step completa con successo, `pipelineEventSubscriber` copia il file da `output_file` (path assoluto sul filesystem del worker) a `PIPELINE_PUBLIC_DIR` (default `client/public/pipeline/<output_file_relative>`).
