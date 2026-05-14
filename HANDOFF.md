# HANDOFF — Sistema di documentazione `hcaire-docs`

> Snapshot **2026-05-14**. Riscrittura completa della documentazione allineata al codice della repo applicativa `hcaire` (ex `hcaire-blog`) e al nuovo dominio `hcaire.ai` (ex `hcaire.com`).

## 1. Cosa è cambiato in questa riscrittura

La documentazione precedente era allineata al codice di inizio maggio e copriva un sottoinsieme dell'applicazione ("scope B"). Da maggio sono state fatte ristrutturazioni importanti:

- **Repo applicativa rinominata**: `hcaire-blog` → `hcaire`.
- **Dominio rinominato**: `hcaire.com` → `hcaire.ai`.
- **Moduli nuovi/promossi** integrati nel codice:
  - **Bartleby** è ora in scope (knowledge base + console + outputs).
  - **Metodo** è stato promosso da sotto-area di Sviluppo Bambino a sezione di primo livello (`/metodo/*`).
  - **Pipeline orchestrazione** F2/F3 è una sezione dedicata con esecuzione step lato server (PipelineContext, PipelineStepExecution, PipelineExternalInput, watchdog).
  - **Catalogo** (autori/libri con upload Cloudflare R2) e **Archivio Temi** (D5) sono entità dedicate.
  - **Jobs / Skills / Plugins** sono moduli di orchestrazione admin.
  - **SiteConfig / SiteContent** governano testi e configurazione globale.
  - **Telegram bot + integrazione Cowork** (FEAT-001…FEAT-004 in `hcaire/FEATURES.md`).

La scelta condivisa con il proprietario è stata: **riscrittura da zero**, niente versionamento storico — il versioning ricomincia da ora.

## 2. Stato per area

| Area | Stato |
|------|-------|
| Configurazione Docusaurus (`docusaurus.config.ts`, `typedoc.json`, `sync-docs.mjs`, `sidebars.ts`) | da aggiornare nella stessa sessione |
| `docs/intro.md` | riscritto |
| `docs/00-overview/` (5 file) | riscritto |
| `docs/10-architecture/` (9 file) | riscritto |
| `docs/20-modules/` (moduli esistenti + nuovi) | riscritto |
| `docs/30-api/` + `static/openapi.yaml` | aggiornato |
| `docs/40-reference/` | placeholder, da popolare con link a TypeDoc / Redoc |
| `docs/90-todo/` | rivisto |

## 3. Layout disco previsto

```
projects/
├── hcaire/        ← repo applicativa (ex hcaire-blog)
└── hcaire-docs/   ← questo repo
```

Lo script `npm run sync-docs` legge da `../hcaire/server/src/` per generare TypeDoc in `static/typedoc/` (gitignored).

## 4. File NON in git che servono altrove

### Segreti (`.env`)

`hcaire/server/.env` e `hcaire/client/.env` non sono versionati. Su nuova macchina vanno ricreati da `.env.example`. Credenziali rilevanti elencate in `docs/00-overview/inventario.md`:

- **MongoDB Atlas** (`MONGODB_PASSWORD`, `MONGODB_URL`)
- **Clerk** (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`)
- **Redis Cloud** (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)
- **Telegram** (`TELEGRAM_TOKEN`, `TELEGRAM_ID`)
- **Lemon Squeezy** (`LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, e i 3 `LEMONSQUEEZY_VARIANT_*`)
- **Cloudflare R2** (`R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`)
- **Cowork** (`COWORK_API_KEY`, `COWORK_PROJECT_PATH`)

`hcaire-docs` non ha `.env` proprio.

### Cartelle contenuti fuori repo

- **`CONTENT_BASE_PATH`** — fallback markdown per HCAIRE/Sviluppo Bambino (vedi `docs/10-architecture/local-cowork-bridge.md`).
- **`PIPELINE_SOURCE` / `PIPELINE_INPUT`** — output/input per `scripts/sync-pipeline.mjs` (artefatti già committati in `client/public/pipeline/`).
- **Cowork project path** (`COWORK_PROJECT_PATH`) — directory esterna dove gira la CLI Cowork triggerata dal Telegram bot.

## 5. Setup su nuova macchina

```bash
# 1. Clona i due repo come sibling
git clone https://github.com/stfnbssl/hcaire.git
git clone https://github.com/stfnbssl/hcaire-docs.git

# 2. Ricostruisci .env nell'app
cp hcaire/server/.env.example hcaire/server/.env
cp hcaire/client/.env.example hcaire/client/.env
cp hcaire/local/.env.example hcaire/local/.env
# poi riempi i valori

# 3. Install
cd hcaire && npm install
cd ../hcaire-docs && npm install

# 4. Avvia
cd ../hcaire && npm run dev          # server 3018 + client 5173 + local sidecar
cd ../hcaire-docs && npm run start   # documentazione su http://localhost:3000
```

**Versioni richieste**: Node ≥ 18 (testato con Node 24, npm 11).

## 6. Pubblicazione documentazione

- `npm run start` → dev server (`http://localhost:3000`)
- `npm run build` → output statico in `build/`
- URL di produzione previsto: `https://docs.hcaire.ai` (deploy ancora da configurare; opzioni: Cloudflare Pages, GitHub Pages, Railway statico)

## 7. Punti aperti

Tracciati come `:::note Da confermare` nei file o in `docs/90-todo/`:

1. **Auth legacy** (`server/src/routes/auth.ts`, `middleware/auth.ts`): dead code, candidato alla rimozione.
2. **Schemi messaggi Redis**: i canali (`article:new`, `bartleby:trace:new`, `pipeline:step:execution:complete`, `letture:*`) non hanno ancora schema esplicito documentato.
3. **JSON Schema pipeline**: validazione AJV solo lato server; nessuno schema pubblicato per consumatori esterni.
4. **Migrazioni MongoDB**: nessun framework adottato (vedi `docs/90-todo/migrazioni-mongodb.md`).
5. **Storybook**: non implementato (vedi `docs/30-api/storybook.md`).
6. **Deploy docs**: target finale da decidere.

## 8. Note importanti

- Il `CLAUDE.md` di `hcaire` è la sorgente autoritativa per le convenzioni del codice applicativo, ma può andare stale rispetto allo stato reale; la documentazione qui descrive il **codice che gira**, non l'intent originale.
- La memoria persistente di Claude Code è in `~/.claude/projects/...` (path dipendente dal workspace); va eventualmente sincronizzata fra macchine.

## 9. Verifiche rapide

```bash
# Build documentazione
cd hcaire-docs && npm run build
# atteso: "[SUCCESS] Generated static files in build."

# Dev server documentazione
npm run start    # http://localhost:3000

# App applicativa
cd ../hcaire && npm run dev
# atteso: server 3018, client 5173, local sidecar attivo
```
