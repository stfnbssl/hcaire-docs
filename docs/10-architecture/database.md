---
title: Database
sidebar_position: 4
---

# Database

L'applicazione usa **un solo database**: MongoDB Atlas, cluster `cluster0.y3qtgdm.mongodb.net`, DB `hcaire_db`. Nessun altro storage transazionale: Redis è solo pub/sub + code, Cloudflare R2 ospita immagini, il filesystem ospita solo fallback markdown e artefatti pipeline.

## 1. Connessione

`server/src/config/db.ts`:

```ts
const mongoUrl = urlTemplate
  .replace('{password}', password)
  .replace('/?', '/hcaire_db?');
await mongoose.connect(mongoUrl);
```

`MONGODB_URL` ha forma `mongodb+srv://stfnbssl_db_user:{password}@cluster0.y3qtgdm.mongodb.net/?appName=Cluster0`. Il codice sostituisce `{password}` con `MONGODB_PASSWORD` e inietta `/hcaire_db` prima dei query params.

Su errore `connectDB` chiama `process.exit(1)`. Lo stesso pattern di iniezione DB name è replicato nel worker `local/`.

Mongoose è usato in modalità default: nessun `strict: 'throw'`, niente pooling esplicito, niente `autoIndex: false`. Gli indici si creano al primo bind dei modelli.

## 2. Collection per dominio

Pubblico:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `hcaire-content` | `Content` | Articoli blog. Chiave: `slug` unique. `accessType: 'free' \| 'plus'` per paywall |
| `navigations` | `Navigation` | Menu dinamico (`order`, `isVisible`, `isSpecial`) |
| `article_requests` | `ArticleRequest` | Tracce articoli Telegram (form pubblico + bot) |

Sezioni narrative:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `site_contents` | `SiteContent` | Pagine slug-based per HCAIRE, Metodo, Sviluppo Bambino, footer, disclaimer, cookies |
| `site_config` | `SiteConfig` | Singleton: `status: 'test' \| 'production'`, `maintenanceMode` |

Letture critiche:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `opere` | `Opera` | Slug, opera, autore, `steps[]` embedded con stato pipeline (10 step) |

Account & abbonamenti:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `user_subscriptions` | `UserSubscription` | Stato per `clerkUserId` (indice unique). Piani `abbonato` / `bartleby` / `bartleby_plus` |

Assi strutturali:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `assi_chapters` | `AssiChapter` | Source-of-truth capitoli (6 assi × ~44 capitoli). `body` markdown con `{{ref:rN}}`, `references[]`, `footnotes[]`, `sections[]`, `_revision_count` |
| `assi_strutturali` | `AsseStrutturale` | Metadati per asse |
| `assi_rebuild_executions` | `AssiRebuildExecution` | Log rebuild dall'archivio FS |

Catalogo (bibliografia):

| Collection | Modello | Scopo |
|------------|---------|-------|
| `authors` | `Author` | Autori (id slug, nome, image R2, rilevanza markdown, birth/death year) |
| `books` | `Book` | Libri (id slug, titolo, cover R2, authorIds, anno, titolo originale) |

Pipeline F2/F3:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `pipeline_contexts` | `PipelineContext` | Stato ricerca F2 o tema F3. `step_states`, `pending_decision`, `tema_ambiti` (bridge), contatori robustezza |
| `pipeline_step_executions` | `PipelineStepExecution` | Singola esecuzione step (`run_number`, `status`, `output_data`, `output_file`, `is_skipped`) |
| `pipeline_external_inputs` | `PipelineExternalInput` | Input esterno per step (file path, `is_superseded`) |
| `temi` | `Tema` | Archivio temi D5 (slug, title, intro, sections, references) |

Job orchestration:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `skills` | `Skill` (legacy) | Skill operativa (non Bartleby) |
| `plugins` | `Plugin` | Plugin di job orchestration |
| `job_definitions` | `JobDefinition` | Definizione di job (ricerca/scrittura) |
| `job_requests` | `JobRequest` | Esecuzione di un job |

Workflow:

| Collection | Modello | Scopo |
|------------|---------|-------|
| `workflow_logs` | `WorkflowLog` | Append-only log di lifecycle (articoli, traces, pipeline) |

Bartleby (in `server/src/models/bartleby/`):

| Collection | Modello | Scopo |
|------------|---------|-------|
| `bartleby_concept_nodes` | `ConceptNode` | Nodo concettuale KB |
| `bartleby_domain_areas` | `DomainArea` | Ambito di ricerca |
| `bartleby_foundation_documents` | `FoundationDocument` | Documento fondazione |
| `bartleby_area_sheets` | `AreaSheet` | Foglio area |
| `bartleby_skills` | `Skill` (Bartleby) | Skill operativa |
| `bartleby_input_traces` | `InputTrace` | Trace utente (corpus, target, area) |
| `bartleby_output_documents` | `OutputDocument` | Output generato |
| `bartleby_output_templates` | `OutputTemplate` | Template di prompt e struttura |
| `bartleby_*_node`, `bartleby_skill_area` | Bridge tables | Relazioni many-to-many |

## 3. Pattern Mongoose ricorrenti

- **`timestamps: true`** sui modelli applicativi.
- **Collection name esplicito** via `{ collection: '...' }` per evitare pluralizzazione automatica.
- **Hot-reload safe**: `mongoose.models[name] ?? mongoose.model(name, schema)` nei file potenzialmente caricati due volte (worker `local/`, nodemon).
- **`.lean()`** sulle query read-only di liste (watchdog pipeline, index).
- **`$set` + `$addToSet` + `$pull`** per aggiornamenti parziali su array (`steps_completed`, `steps_failed`, `steps_in_progress` su `PipelineContext`).
- **Validatori inline** per enum (`accessType`, `status`, `plan`).

## 4. Indici

Dichiarati via `schema.index({...})` dove servono:

- `Content.slug` unique
- `Navigation.slug` unique
- `UserSubscription.clerkUserId` unique
- `AssiChapter.{axis_slug, chapter_number}` compound
- `Author.id` unique, `Book.id` unique
- `PipelineStepExecution.{context_id, step_id}` + `status` (per watchdog)
- `PipelineContext.context_id` unique
- `Tema.slug` unique
- Bartleby: tutti i modelli hanno `bartlebyId` unique

Mongoose crea gli indici al primo bind. In produzione conviene disabilitare `autoIndex` e gestirli con script di migrazione: oggi non lo si fa.

## 5. Operazioni di scrittura per dominio

| Dominio | Quando scrive | Note |
|---------|---------------|------|
| Blog / CMS | Admin via dashboard; automazioni via `/api/contents/import` (API key Cowork) | Nessun versionamento, l'update sovrascrive |
| Article requests | Form pubblico + Telegram bot | Status manuale via admin |
| Site config / content | Admin | UI editabile, cache localStorage 1 h FE |
| Webhooks Lemon Squeezy | Server (HMAC) | `findOneAndUpdate` upsert su `clerkUserId` |
| Assi chapters | Admin editor + script `migrateAssiChaptersToMongo` | `_revision_count++`, `_last_edited_by` |
| Catalogo | Admin (upload R2 + Mongo) | Slugify + validazione mime/size |
| Pipeline events | `pipelineEventSubscriber` | Buffer log batch 20 righe / 2 s |
| Letture events | `lettureEventSubscriber` | Speculare |
| Bartleby traces | API key o admin → trigger Redis → output | Append `WorkflowLog` |
| Workflow logs | Server + worker `local` | Append-only |

## 6. Backup e gestione

Atlas gestisce backup/snapshot lato cloud. **Non** ci sono script di migrazione versionati (no `migrate-mongo`, no Prisma). Le evoluzioni di schema avvengono per Mongoose convention: campi nuovi `optional`, documenti vecchi sopravvivono.

Vedi [TODO — migrazioni MongoDB](../90-todo/migrazioni-mongodb.md) per la decisione aperta su una strategia di migrazione.

## 7. Source of truth per gli artefatti pipeline

I file JSON degli step di pipeline F2/F3 esistono in due forme:

- **Stato runtime in MongoDB**: `PipelineStepExecution.output_data` (parsed) + `PipelineContext.step_states`.
- **File su disco**: `PipelineStepExecution.output_file` (path assoluto sul filesystem del worker) + copia sotto `client/public/pipeline/` per esposizione FE.

Quando uno step completa, `pipelineEventSubscriber` copia il file da `output_file` a `PIPELINE_PUBLIC_DIR` (default `client/public/pipeline/<relativo>`), in modo che il frontend possa leggerlo come statico senza dover passare dal worker.

## 8. Storage immagini

Le immagini di autori/libri (catalogo) non vivono in MongoDB ma su Cloudflare R2. MongoDB memorizza solo l'URL pubblica (`R2_PUBLIC_BASE_URL`) con cache-busting. Vedi [Modulo Catalogo](../20-modules/catalogo.md).
