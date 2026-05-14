---
title: Jobs, Skills, Plugins
sidebar_position: 15
---

# Modulo Jobs / Skills / Plugins

Scheda funzionale del **sistema di orchestrazione di job** per task generici (ricerca + scrittura), separato dalla pipeline Sviluppo Bambino e dal worker Bartleby. È un'infrastruttura per definire compiti riutilizzabili (`Skill`), connettori esterni (`Plugin`) e composizioni (`JobDefinition` → `JobRequest`).

## 1. Scopo

Permettere all'admin di:

- Definire **Skill** atomiche: cosa fare, con quali parametri, con riferimento eventuale a un `CLAUDE.md` di specifica.
- Definire **Plugin** che configurano fonti esterne / connettori (es. Telegram, Cowork, future integrazioni).
- Definire **JobDefinition** che combinano skill + plugin in un compito eseguibile (`research`, `write`, `research-and-write`).
- Creare **JobRequest** per istanziare ed eseguire un job, tracciandone stato e risultato.

## 2. Modello dati

### `Skill`

```ts
{
  name: string;
  description: string;
  category: 'search' | 'write' | ...;
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
  claudeMdRef?: string;       // path al CLAUDE.md di specifica
  active: boolean;
  createdAt, updatedAt
}
```

Collection: `skills`.

### `Plugin`

```ts
{
  name: string;
  description: string;
  config: Record<string, any>;
  compatibleSkills: string[];   // nomi/id delle skill compatibili
  active: boolean;
  createdAt, updatedAt
}
```

Collection: `plugins`.

### `JobDefinition`

```ts
{
  name: string;
  type: 'research' | 'write' | 'research-and-write';
  description: string;
  skills: string[];             // skill id/name
  plugins: string[];            // plugin id/name
  defaultParams: Record<string, any>;
  active: boolean;
  createdAt, updatedAt
}
```

Collection: `job_definitions`.

### `JobRequest`

```ts
{
  jobDefinitionId: ObjectId;
  userId?: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  createdAt, updatedAt
}
```

Collection: `job_requests`.

## 3. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/{Skill,Plugin,JobDefinition,JobRequest}.ts` | Schemi |
| `server/src/routes/{skills,plugins,jobDefinitions,jobRequests}.ts` | Route admin |
| `server/src/controllers/{skillsController,pluginsController,jobDefinitionsController,jobRequestsController}.ts` | CRUD |
| `server/src/shared/types/jobs.d.ts` | Tipi condivisi |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/AdminSkills.tsx` (lazy) | CRUD skills |
| `pages/AdminPlugins.tsx` (lazy) | CRUD plugins |
| `pages/AdminJobDefinitions.tsx` (lazy) | CRUD job definitions |
| `pages/AdminJobs.tsx` (lazy) | CRUD job requests |
| `services/jobsService.ts` | Wrapper fetch |

## 4. Endpoint

Tutti admin, mounted su `/api/admin/*`:

| Resource | Verbi | Auth |
|----------|-------|------|
| `/api/admin/skills` | GET/POST/PUT/DELETE | admin |
| `/api/admin/plugins` | GET/POST/PUT/DELETE | admin |
| `/api/admin/job-definitions` | GET/POST/PUT/DELETE | admin |
| `/api/admin/job-requests` | GET/POST/PUT/DELETE | admin |

CRUD standard per ciascuno: listing paginato, dettaglio, create/update/delete.

## 5. Stato dell'esecuzione

Al momento il modulo è essenzialmente **anagrafico**: salva `JobRequest` con stato ma non è collegato a un esecutore automatizzato. L'esecuzione effettiva di un job (es. invocare una skill via Cowork) richiede ancora intervento o uno script.

Possibili evoluzioni:

- Hook su `JobRequest` create → pubblica su Redis (canale dedicato `hcaire:jobs:*`) → worker `local/` consuma e spawna Cowork.
- Mapping `Skill.claudeMdRef` → cartella `CLAUDE.md` in `COWORK_PROJECT_PATH/jobs/<skill>/` simile a quanto già fatto per pipeline.

## 6. Componenti UI

### `AdminSkills`

Tabella con colonne: nome, categoria, description preview, # parameters, active (toggle), azioni. Dialog form per crea/edit con array editor per `parameters`.

### `AdminPlugins`

Tabella nome, description, compatible skills, active. Dialog form con JSON editor per `config`.

### `AdminJobDefinitions`

Tabella nome, type, description, # skills, # plugins, active. Dialog con multi-select su skills/plugins esistenti.

### `AdminJobs`

Tabella jobDefinitionId, params summary, status (chip colorata), result preview, azioni (rerun, delete). Dialog crea con select su `JobDefinition` esistente + form params dinamico (derivato dal `defaultParams` della definition).

## 7. Dipendenze

- **MongoDB** (`skills`, `plugins`, `job_definitions`, `job_requests`).
- **Clerk** per gating admin.
- **Nessun esecutore automatico** al momento.

## 8. Criticità note

- **Modulo anagrafico, non esecutivo**: senza un consumer di `JobRequest`, le righe inserite restano `pending`. Da chiarire come/quando viene chiusa la pipeline esecutiva.
- **Duplicazione concettuale con Bartleby**: anche Bartleby ha un'entità `Skill` (sub-modello). Le due collection (`skills` vs `bartleby_skills`) sono separate ma il concetto è simile. Da valutare unificazione o esplicitazione del confine.
- **No versioning** delle definitions: editare una `JobDefinition` può rendere obsolete le `JobRequest` esistenti.

## 9. Test

Niente test automatici. Verifiche manuali:

- CRUD su ciascuna delle 4 entità.
- Cascata: aggiungere skill → comparire in select di `JobDefinition`; usare la `JobDefinition` per creare una `JobRequest`.
