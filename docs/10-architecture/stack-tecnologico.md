---
title: Stack tecnologico
sidebar_position: 1
---

# Stack tecnologico

Sintesi delle tecnologie effettivamente in uso nel monorepo `hcaire-blog` al **2026-05-05**, con versioni rilevate dai `package.json` di ciascun workspace.

## 1. Workspace e processi

`hcaire-blog/package.json` definisce tre workspace npm:

| Workspace | Tipo processo | Avvio dev | Build | Note |
|-----------|---------------|-----------|-------|------|
| `server/` | Express HTTP + background services | `nodemon ts-node` | `tsc` | Porta `3018` |
| `client/` | Vite SPA | `vite` (porta `5173`) | `tsc && vite build` | Deploy via `wrangler` |
| `local/` | Worker `tsx watch` | `tsx watch src/index.ts` | `tsc` | Subscriber Redis (articles, bartleby, pipeline, letture) |

`npm run dev` lancia i tre processi in parallelo via `concurrently`.

## 2. Server (`server/`)

| Categoria | Pacchetto | Versione | Ruolo |
|-----------|-----------|----------|-------|
| Runtime | Node.js | ≥ 18 | Testato con Node 24 / npm 11 |
| HTTP | `express` | ^4.18 | Framework |
| HTTP | `cors` | ^2.8 | CORS |
| Auth | `@clerk/express` | ^2.1 | Middleware Clerk + `requireAuth` |
| Auth | `@clerk/backend` | ^3.2 | Client SDK per `users.getUser` |
| Auth (legacy) | `jsonwebtoken` | ^9.0 | JWT residuo, non più consumato dal FE — vedi [Autenticazione](./autenticazione.md#residui-legacy) |
| ODM | `mongoose` | ^8.1 | MongoDB |
| Pub/sub | `ioredis` | ^5.10 | Redis Cloud client |
| Bot | `telegraf` | ^4.16 | Telegram bot |
| Validation | `ajv` | ^8.20 | JSON Schema (usato in `lettureSchemaValidator.ts`) |
| Markdown | `gray-matter` | ^4.0 | Frontmatter parsing |
| Env | `dotenv` | ^16.4 | Caricato per primo da `loadEnv.ts` |
| Tooling | `typescript` | ^5.3 | |
| Tooling | `nodemon`, `ts-node` | ^3 / ^10 | Dev only |

## 3. Client (`client/`)

| Categoria | Pacchetto | Versione | Ruolo |
|-----------|-----------|----------|-------|
| UI | `react` / `react-dom` | ^18.2 | |
| Routing | `react-router-dom` | ^6.21 | `BrowserRouter` |
| Auth | `@clerk/clerk-react` | ^5.61 | `ClerkProvider`, `useUser`, `useAuth` |
| Styling | `tailwindcss` | ^3.4 | Default per pagine |
| UI Kit | `@mui/material` + `@emotion/*` | ^5.15 | Componenti complessi (Dialog, TextField, ecc.) |
| UI Kit | `@mui/icons-material` | ^5.15 | Icone |
| Markdown | `react-markdown` | ^9.0 | Rendering articoli + revisioni |
| Markdown | `remark-gfm` | ^4.0 | Tabelle, task list |
| Markdown | `remark-footnotes` | ^4.0 | Note a piè di pagina |
| Markdown | `rehype-raw` | ^7.0 | HTML inline nei markdown |
| Build | `vite` | ^8.0 | Dev server + build |
| Build | `@vitejs/plugin-react` | ^6.0 | Fast Refresh |
| Deploy | `@cloudflare/vite-plugin` | ^1.31 | Integrazione Cloudflare |
| Deploy | `wrangler` | ^4.81 | CLI Cloudflare (`deploy`, `preview`) |
| Tooling | `tailwindcss`, `postcss`, `autoprefixer` | latest 3.x | Pipeline CSS |

Il client espone tre script principali:

- `npm run dev` — Vite su `http://localhost:5173`, con proxy `/api → http://localhost:3018`.
- `npm run build` — type-check (`tsc`) + bundle Vite.
- `npm run deploy` — build + `wrangler deploy`.

## 4. Local sidecar (`local/`)

Worker minimale, dipendenze ridotte all'essenziale:

| Pacchetto | Versione | Ruolo |
|-----------|----------|-------|
| `ioredis` | ^5.3 | Subscriber Redis (`article:new`, `bartleby:trace:new`) + handler pipeline (`hcaire:pipeline:commands`, `hcaire:letture:commands`) |
| `mongoose` | ^8.1 | Aggiornamento collection `workflow-logs`, `bartleby_input_traces`, ecc. |
| `tsx` | ^4.7 | Esecutore TS in modalità watch |

Avvio: `tsx watch src/index.ts`. Connessione Redis con `retryStrategy` e riconnessione automatica.

## 5. Servizi esterni

| Servizio | Provider | Uso |
|----------|----------|-----|
| **MongoDB Atlas** | Cluster `cluster0.y3qtgdm.mongodb.net`, db `hcaire_db` | Persistenza contenuti, utenti subscription, log, pipeline state |
| **Redis Cloud** | GCP `eu-west3`, host `redis-11976.crce275.eu-west3-1.gcp.cloud.redislabs.com:11976` | Pub/sub eventi pipeline + letture, code commands per worker |
| **Clerk** | SaaS | Identità, sessioni, ruoli (`publicMetadata.role`) |
| **Lemon Squeezy** | SaaS | Billing, webhook HMAC SHA256, 3 varianti piano |
| **Telegram** | Bot API | Notifiche tramite `telegraf` |
| **Cloudflare** | Pages/Workers SPA | Deploy frontend (`wrangler.jsonc`, `nodejs_compat`) |

Vedi [Inventario §7](../00-overview/inventario.md#7-variabili-dambiente) per l'elenco delle variabili d'ambiente associate.

## 6. Mappa di sistema

Vista d'insieme delle dipendenze fra processi locali e servizi esterni.

```mermaid
flowchart LR
  classDef proc fill:#dbeafe,stroke:#1e40af,color:#1e3a8a
  classDef ext fill:#f3f4f6,stroke:#6b7280,color:#374151
  classDef storage fill:#fef3c7,stroke:#a16207,color:#713f12

  Browser["Browser<br/>(SPA React)"]:::ext

  subgraph LOCAL["Macchina di runtime"]
    Server["server/<br/>Express :3018"]:::proc
    Client["client/<br/>Vite :5173 (dev)"]:::proc
    LocalW["local/<br/>tsx worker"]:::proc
  end

  subgraph CLOUD["Servizi cloud"]
    Mongo[("MongoDB Atlas<br/>hcaire_db")]:::storage
    Redis[("Redis Cloud<br/>pub/sub + lists")]:::storage
    Clerk["Clerk"]:::ext
    LS["Lemon Squeezy"]:::ext
    TG["Telegram Bot API"]:::ext
    CF["Cloudflare<br/>(deploy FE)"]:::ext
  end

  Browser -- "HTTPS / sessione Clerk" --> Server
  Browser -- "VITE_API_URL" --> Server
  Client -- "build artefatto" --> CF
  Server -- "Mongoose" --> Mongo
  Server -- "ioredis (PUBLISH/LPUSH)" --> Redis
  Server -- "telegraf" --> TG
  Server -- "verify session / users" --> Clerk
  LocalW -- "Mongoose" --> Mongo
  LocalW -- "ioredis (SUBSCRIBE/BRPOP)" --> Redis
  LS -- "webhook HMAC" --> Server
```

## 7. Test

Solo `node --test` nativo, niente Jest/Vitest:

```
npm run test                     # esegue i tre suite
npm run test:pipeline-config     # test su scripts/test-pipeline-step-config.mjs
npm run test:pipeline-mapper     # services/__tests__/pipelineMappers.test.ts
npm run test:pipeline-enablement # services/__tests__/stepEnablement.test.ts
```

I test usano `--experimental-strip-types` per girare TS direttamente senza compilazione.

## 8. Vincoli

- **Node ≥ 18** (testato con 24).
- **Single tenant**: oggi non c'è multi-tenancy, gli admin sono identificati per `publicMetadata.role`.
- **`CONTENT_BASE_PATH`**: i verticali HCAIRE e Sviluppo Bambino leggono markdown da una cartella esterna alla repo (`C:/Users/.../HCAIRE Site/sezioni/` sulla macchina di sviluppo principale). Senza quella cartella i verticali non funzionano.
- **`scripts/sync-pipeline.mjs`**: presuppone l'esistenza di una cartella locale dello sviluppatore con gli output della pipeline F2/F3 (vedi [Produzioni §6](../20-modules/sviluppo-bambino/produzioni.md#6-sync-degli-artefatti-scriptssync-pipelinemjs)).
