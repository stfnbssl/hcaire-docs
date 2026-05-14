---
title: Deployment
sidebar_position: 8
---

# Deployment

Topologia ibrida:

- **Frontend** → **Cloudflare Pages** (via Wrangler).
- **Server Express** → **Railway** (PaaS Node.js).
- **Worker `local/`** → gira **solo sul portatile dello sviluppatore** perché deve spawnare Cowork (Claude Code CLI) che non è disponibile come servizio remoto. Vedi [Local — ponte Cowork](./local-cowork-bridge.md).

Dominio di produzione: **`hcaire.ai`** (ex `hcaire.com`).

## 1. Frontend — Cloudflare Pages

Il client (`client/`) è una SPA React deployata su Cloudflare. Configurazione in `client/wrangler.jsonc`:

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

- **`single-page-application`**: tutte le route non-asset ricadono su `index.html`, necessario per `BrowserRouter`.
- **`nodejs_compat`**: compat per codice Node-style (richiesto da `@cloudflare/vite-plugin` o SDK lato client).
- **Observability** abilitata.

### Comandi

```bash
cd client
npm run build            # tsc + vite build → dist/
npm run preview          # build + wrangler dev (simulazione locale)
npm run deploy           # build + wrangler deploy
```

Presuppone `wrangler login` o token Cloudflare nell'env.

### Variabili di build (Vite)

Vite incorpora a build-time tutte le variabili `VITE_*`:

- `VITE_API_URL` — es. `https://api.hcaire.ai/api`.
- `VITE_APP_NAME` — branding.
- `VITE_CLERK_PUBLISHABLE_KEY` — pubblica, ok in bundle.

Per cambiare backend in produzione bisogna ribuildare. Niente runtime config lato Cloudflare.

## 2. Routing dev → prod

| Ambiente | URL FE | URL API |
|----------|--------|---------|
| Dev locale | `http://localhost:5173` | `http://localhost:3018/api` (proxy Vite) |
| Produzione | `https://hcaire.ai` (custom domain Cloudflare Pages) | `https://api.hcaire.ai/api` (Railway, custom domain) |

Proxy `/api → :3018` solo in dev (`client/vite.config.ts`). In produzione il client chiama direttamente `VITE_API_URL`; CORS sul server deve consentire l'origine FE (`CORS_ORIGIN=https://hcaire.ai`).

## 3. Backend — Railway

Il server gira su Railway (PaaS Node.js). Build:

```bash
cd server
npm run build            # tsc → dist/
npm start                # node dist/index.js
```

Su Railway:

- **Build & start** eseguiti dalla piattaforma (Nixpacks rileva Node + workspace `server/`).
- **`PORT`** iniettato da Railway; il server lo legge (`process.env.PORT || 3018`).
- **Health check** su `GET /health` (montato prima di tutti i middleware).
- **Variabili d'ambiente**: tutte le voci di [Inventario §6](../00-overview/inventario.md#6-variabili-dambiente-server) come secret/env del servizio.
- **Connettività uscente** verso MongoDB Atlas, Redis Cloud, Clerk, Lemon Squeezy, Telegram API, Cloudflare R2: nessuna restrizione.
- **Bot Telegram in long-polling**: avviato da `services/telegramBot.ts`, fa polling outbound verso `api.telegram.org`. Niente webhook, niente URL pubblico aggiuntivo.

### Cosa **non** è su Railway

- **`CONTENT_BASE_PATH`** (fallback markdown): i `.md` esterni vivono solo in locale. In produzione le sezioni narrative funzionano se i contenuti sono in `SiteContent` (MongoDB); il fallback FS non è disponibile. Pianificare migrazione di eventuali contenuti residui sul DB.
- **Worker `local/`**: vedi §4.

### Containerizzazione

Niente `Dockerfile` né `docker-compose.yml` in repo: Railway usa Nixpacks. Se in futuro si volesse containerizzare: `Dockerfile` Node 20+ con `npm ci --workspace=server` + `npm run build --workspace=server` + `node server/dist/index.js`.

## 4. Worker `local/`

Il worker (`local/`) gira **solo sul portatile dello sviluppatore**, non in cloud. Vincolo strutturale: spawna **Cowork** (Claude Code CLI) che oggi è solo locale. Il worker fa da ponte tra il server cloud (Railway) e Cowork installato sulla macchina.

Vedi la pagina dedicata [Local — ponte Cowork](./local-cowork-bridge.md) per i tre casi d'uso (articoli blog, letture critiche, produzioni Sviluppo Bambino) e il pattern comune.

In dev: terzo processo di `npm run dev` (`tsx watch`). Quando il portatile è acceso e il worker attivo, le elaborazioni Cowork sono disponibili; quando è spento i comandi restano in coda Redis finché il worker non torna online.

## 5. Variabili d'ambiente per ambiente

### Sviluppo locale

- `server/.env` con valori dev (DB e Redis Cloud condivisi, Telegram/LS opzionali).
- `client/.env` con `VITE_API_URL=http://localhost:3018/api`.
- `local/.env` separato per il worker (legge Mongo + Redis + eventuali credenziali Cowork).

### Produzione

- **Server (Railway)**: tutte le variabili di [Inventario §6](../00-overview/inventario.md#6-variabili-dambiente-server). Secret della piattaforma.
- **Client (Cloudflare build-time)**: `VITE_API_URL=https://api.hcaire.ai/api`, `VITE_APP_NAME`, `VITE_CLERK_PUBLISHABLE_KEY`.
- **Worker `local`**: superset di Mongo + Redis del server, più `COWORK_PROJECT_PATH` e `COWORK_API_KEY`.

## 6. Asset esterni richiesti

Non sono in git, vanno trasferiti separatamente:

- Cartella **`CONTENT_BASE_PATH`** (se si vuole il fallback FS in locale).
- **Cowork project path** (`COWORK_PROJECT_PATH`): directory esterna dove gira la CLI Cowork.
- Le immagini di catalogo (autori/libri) sono su Cloudflare R2; il bucket persiste indipendentemente dal deploy.

## 7. Checklist di roll-out

- [ ] Health check `/health` esposto e monitorato.
- [ ] `CORS_ORIGIN` puntato a `https://hcaire.ai`.
- [ ] Tutti i segreti caricati (3 critici: `MONGODB_PASSWORD`, `MONGODB_URL`, `CLERK_SECRET_KEY`).
- [ ] Webhook Lemon Squeezy: URL pubblico, firma HMAC abilitata.
- [ ] Connessione Redis Cloud verificata (client condiviso + subscriber).
- [ ] Background services attivi nei log (`[Telegram]`, `[pipeline-events]`, `[letture-events]`, `[assi-events]`, `[bartleby-trace]`).
- [ ] Worker `local/` connesso allo stesso Redis e Mongo del server.
- [ ] R2 raggiungibile dal server (test upload via `npm run r2:test-upload`).
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` e `VITE_API_URL` del bundle FE corretti per produzione.

## 8. Documentazione (questo repo)

`hcaire-docs/` viene buildato a parte (`npm run build`). Target di deploy previsto: `https://docs.hcaire.ai` (configurazione del deploy ancora da definire — opzioni: Cloudflare Pages, GitHub Pages, Railway statico). Vedi [HANDOFF](../../) per lo stato.
