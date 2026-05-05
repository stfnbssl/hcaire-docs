---
title: Deployment
sidebar_position: 8
---

# Deployment

Questa pagina descrive **come si distribuisce** il monorepo. La topologia è ibrida:

- **Frontend** → Cloudflare (Workers SPA via `wrangler`).
- **Server Express** → **Railway** (PaaS Node.js).
- **Worker `local/`** → gira **solo sul portatile dello sviluppatore** perché deve poter spawnare Cowork (Claude Code CLI), che attualmente non è disponibile come servizio remoto. Vedi [Local — ponte Cowork](./local-cowork-bridge.md) per la motivazione completa.

## 1. Frontend — Cloudflare

Il client (`client/`) è una SPA React deployata su **Cloudflare** (Pages o Workers SPA). Configurazione in `client/wrangler.jsonc`:

```jsonc
{
  "name": "hcaire-web",
  "compatibility_date": "2026-04-13",
  "observability": { "enabled": true },
  "assets": { "not_found_handling": "single-page-application" },
  "compatibility_flags": ["nodejs_compat"]
}
```

Punti notevoli:

- **`single-page-application`**: tutte le route non-asset ricadono su `index.html`, necessario per `BrowserRouter` (no hash routing).
- **`nodejs_compat`**: flag attivo per compatibilità con codice Node-style (probabilmente richiesto da `@cloudflare/vite-plugin` o da SDK lato client).
- **Observability** abilitata: log e metriche Cloudflare.
- **Niente `_redirects`/`_headers`/`_routes.json`**: redirect storici e SPA fallback sono gestiti rispettivamente da React Router e da `not_found_handling`.

### Comandi

```bash
cd client
npm run build            # tsc + vite build → dist/
npm run preview          # build + wrangler dev (simulazione locale)
npm run deploy           # build + wrangler deploy
```

Il deploy presuppone che `wrangler` sia autenticato (`wrangler login` o token in env Cloudflare).

### Variabili d'ambiente al build

Vite incorpora a build-time tutte le variabili che iniziano per `VITE_*`:

- `VITE_API_URL` — URL del backend (es. `https://api.hcaire.example/api`).
- `VITE_APP_NAME` — branding.
- `VITE_CLERK_PUBLISHABLE_KEY` — pubblica, ok in bundle.

Per cambiare il backend in produzione **bisogna ribuildare**. Non c'è un meccanismo di runtime config lato Cloudflare.

## 2. Routing dev → prod

| Ambiente | URL FE | URL API |
|----------|--------|---------|
| Dev locale | `http://localhost:5173` | `http://localhost:3018/api` (proxy Vite) |
| Cloudflare | `https://<deploy>.workers.dev` o dominio custom | `VITE_API_URL` da `.env` di build |

In dev il proxy `/api → http://localhost:3018` è dichiarato in `client/vite.config.ts`. In produzione il client chiama direttamente `VITE_API_URL` (CORS sul server deve consentire l'origine).

## 3. Backend — Railway

Il server gira su **Railway** (PaaS Node.js). Build:

```bash
cd server
npm run build            # tsc → dist/
npm start                # node dist/index.js (porta PORT, default 3018)
```

Su Railway:

- **Build & start** vengono eseguiti dalla piattaforma (Nixpacks rileva Node + workspace `server/`).
- **`PORT`** è iniettato da Railway: il server lo legge correttamente (`process.env.PORT || 3018`).
- **Health check** disponibile su `GET /health` (montato prima di qualsiasi middleware, vedi [Backend §2](./backend.md#2-health-check)).
- **Variabili d'ambiente**: tutte le voci di [Inventario §7](../00-overview/inventario.md#7-variabili-dambiente) configurate come secret/env del servizio Railway.
- **Connettività uscente** verso MongoDB Atlas, Redis Cloud, Clerk, Lemon Squeezy, Telegram API: nessuna restrizione lato Railway.
- **Bot Telegram in long-polling**: avviato da `services/telegramBot.ts`, fa outbound polling verso `api.telegram.org`. Non serve webhook né URL pubblico aggiuntivo (l'URL Railway viene usato solo per le API HTTP del client e per il webhook Lemon Squeezy).

### Cosa **non** è su Railway

- **`CONTENT_BASE_PATH`**: i markdown dei verticali HCAIRE/Sviluppo Bambino sono **fuori repo** e non sono attualmente serviti dal server in produzione. Le rotte `/api/hcaire/*` e parte di `/api/sviluppo-bambino/*` che dipendono da `staticContentReader.ts` funzionano in locale ma in produzione richiedono che la cartella sia montata o sincronizzata sul filesystem Railway. Da chiarire la strategia (volume persistente, sync da S3, commit dentro `server/content/`, ecc.).
- **Worker `local/`**: vedi §4.

### Containerizzazione

Non esiste un `Dockerfile` né un `docker-compose.yml` in repo: Railway costruisce direttamente da Nixpacks. Se in futuro si volesse containerizzare manualmente il backend basterà un `Dockerfile` Node 20+ con `npm ci --workspace=server` + `npm run build --workspace=server` + `node server/dist/index.js`.

## 4. Worker `local/`

Il worker (`local/`) **gira solo sul portatile dello sviluppatore**, non in cloud. Il vincolo è strutturale: il worker spawna **Cowork** (Claude Code CLI) e oggi Cowork può essere usato solo localmente — non esiste un servizio remoto invocabile via HTTP. Il worker fa quindi da **ponte** tra il server cloud (Railway) e il progetto Cowork installato sul portatile.

Vedi la pagina dedicata [Local — ponte Cowork](./local-cowork-bridge.md) per i tre casi d'uso (articoli blog, letture critiche, produzioni Sviluppo Bambino) e per il pattern comune.

In dev gira con `tsx watch` come terzo processo di `npm run dev`. Quando il portatile è acceso e il worker è attivo, le elaborazioni Cowork sono disponibili; quando è spento i comandi restano in coda Redis (LPUSH non scade) finché il worker non ritorna online.

## 5. Variabili d'ambiente per ambiente

### Sviluppo locale

- `server/.env` con valori di sviluppo (DB e Redis Cloud condivisi, niente Telegram/LS attivi se non testati).
- `client/.env` con `VITE_API_URL=http://localhost:3018/api`.
- `local/.env` non esiste come file separato: il worker legge `process.env` (caricato via `dotenv/config` dall'index, che eredita da quello del processo). Se serve un `.env` locale, posizionarlo in `local/.env` e ricaricarlo manualmente.

### Produzione

- Server: tutte le variabili di [Inventario §7](../00-overview/inventario.md#7-variabili-dambiente). I segreti vanno gestiti come secret della piattaforma host.
- Client (build-time): `VITE_API_URL`, `VITE_APP_NAME`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Worker `local`: stesso superset di Mongo + Redis del server, più eventuali credenziali per Cowork.

## 6. Asset esterni richiesti

Non sono in git, vanno trasferiti separatamente:

- Cartella **`CONTENT_BASE_PATH`** (markdown verticali HCAIRE / Sviluppo Bambino / progetti).
- Cartelle sorgente dello script `sync-pipeline.mjs` (`PIPELINE_SOURCE`, `PIPELINE_INPUT`) — solo se si vuole rigenerare gli artefatti `client/public/pipeline/`. Per il solo deploy in lettura non servono: gli artefatti già sincronizzati sono in repo.

## 7. Roll-out checklist (proposta)

Quando si introdurrà un deploy strutturato del backend, una checklist minima:

- [ ] Health check `/health` esposto e monitorato.
- [ ] CORS_ORIGIN puntato all'host FE corretto.
- [ ] Tutti i segreti caricati (3 critici: `MONGODB_PASSWORD`, `MONGODB_URL`, `CLERK_SECRET_KEY`).
- [ ] Webhook Lemon Squeezy: URL pubblico, firma HMAC abilitata.
- [ ] Connessione Redis Cloud verificata (sia client condiviso che subscriber).
- [ ] Background services confermati attivi nei log (`[Telegram]`, `[pipeline-events]`, `[letture-events]`).
- [ ] Worker `local/` connesso allo stesso Redis e Mongo.
- [ ] `CONTENT_BASE_PATH` raggiungibile dal processo server.
