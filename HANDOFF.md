# HANDOFF — Sistema di documentazione hcaire-docs

> Snapshot **2026-05-05** (setup) → **aggiornamento 2026-05-05** (chiusura Fase 2) → **aggiornamento 2026-05-09** (assi strutturali — migrazione JSON ibrido). Questo file serve a riprendere il lavoro su un'altra macchina senza perdere contesto.

## Aggiornamento 2026-05-09 — modulo Assi strutturali

Riportate in documentazione le modifiche profonde fatte sul modulo **Assi strutturali** in `hcaire-blog` (commit `68d647f`):

- **Schema dati**: introdotti tipi shared `Author`, `Book`, `Reference`, `Footnote`, `ChapterDocument`, `CitationsIndex` in `shared/types/assi.d.ts`. I 44 capitoli sono ora rappresentati come JSON ibrido (body markdown a token + array structures di references e footnotes).
- **Pipeline**: 6 npm script (`assi:inventory`, `catalogo:build`, `assi:convert`, `assi:merge-revision`, `assi:fix-img-ext`) + uno ad-hoc (`decorateMarkers.ts`). Documentati end-to-end in `docs/20-modules/assi-strutturali-pipeline.md`, inclusi algoritmo di re-iniezione `<img>` per il roundtrip Google Docs e procedura di applicazione revisioni.
- **Endpoint server**: `GET /api/sviluppo-bambino/assi/:asseSlug/:chapterSlug` ora ritorna `ChapterDocument` (non più `{frontmatter, content, isEmpty}`); nuovi `GET /assi/citazioni` (indice aggregato), `GET /catalogo/authors`, `GET /catalogo/books`. Endpoint legacy markdown-runtime rimosso.
- **Frontend**: nuovo `StructuredChapterRenderer` (con sezione "altri capitoli che lo citano" nel pannello rilevanza), nuova pagina `Bibliografia` (tab autori/libri, filtro, sort, drawer di dettaglio). `MarkdownRenderer` semplificato (resta per il resto del sito).
- **Catalogo**: cresciuto a 46 autori + 67 libri (aggiunte voci Spinoza, Hegel + 4 libri durante il primo lotto di revisioni).

**Pagine aggiornate/aggiunte**:

- `docs/20-modules/assi-strutturali.md` — riscritta. Aggiunge §3 "Sorgenti dati: pipeline a tre livelli", §4 "Schema dati", §6 "Pattern ricorrente", §7 "Bibliografia e citazioni", §11 "Criticità e debiti" (asset placeholder, OpenAPI non aggiornato, ecc.). Aggiornati File Coinvolti, Storia (entry 2026-05-09), Test.
- `docs/20-modules/assi-strutturali-pipeline.md` — nuova. Procedura editoriale operativa: tabella script, sequenza completa per applicare revisioni Google Docs, algoritmo re-iniezione, gestione asset mancanti.

**Non aggiornato (debito riconosciuto)**:

- `static/openapi.yaml` non documenta nessun endpoint `/assi/*` (né i nuovi né i pre-esistenti). Da affrontare in un passaggio separato sull'OpenAPI.

---

## 1. Cosa è stato fatto in questa sessione

Inizializzato il sistema di documentazione **Docs-as-Code** con **Docusaurus** in `hcaire-docs/`, secondo il piano descritto in `prompts/Sistema di documentazione della webapp di HCAIRE.md`.

Stato per fase:

| Fase | Stato | Output |
|------|-------|--------|
| **0 — Setup Docusaurus** | ✓ completata | `package.json`, `docusaurus.config.ts`, `sidebars.ts`, `tsconfig.json`, `src/css/custom.css`, `.gitignore` aggiornato. Build verde con `npm run build`. |
| **Migrazione produzioni-architettura.md** | ✓ completata | Spostato in `docs/20-modules/sviluppo-bambino/produzioni.md`. Originale rimosso da `hcaire-blog/docs/`. |
| **1 — Inventario tecnico** | ✓ completata | `docs/00-overview/cos-e-l-applicazione.md`, `mappa-moduli.md`, `inventario.md`, `glossario.md`, `obiettivi-funzionali.md` (stub). |
| **2 — Architettura reale** | ✓ completata | 9 pagine in `docs/10-architecture/`: `stack-tecnologico.md`, `frontend.md`, `backend.md`, `database.md`, `autenticazione.md`, `routing.md`, `stato-applicativo.md`, `deployment.md`, `local-cowork-bridge.md`. 3 diagrammi Mermaid integrati: mappa sistema (stack §6), flusso login Clerk → contenuto plus (autenticazione §2), flusso eventi pipeline FE↔BE↔Mongo↔Redis (backend §6). Build verde. |
| **TODO / proposte aperte** | ✓ avviata | Nuova area `docs/90-todo/`. Prima voce: `migrazioni-mongodb.md` (problema + 5 strategie candidate + raccomandazione di partenza). |
| **3 — Schede modulo** | ✓ completata | 9 schede in `docs/20-modules/`: `autenticazione`, `contenuti`, `navigation`, `account`, `subscriptions`, `admin-cms`, `hcaire`, `letture`, `sviluppo-bambino/narrativa`, `sviluppo-bambino/corsi-f1-f2` (oltre alla già migrata `sviluppo-bambino/produzioni`). Build verde. |
| **4 — Automazione (TypeDoc/OpenAPI/Storybook)** | ◐ parziale | TypeDoc + OpenAPI + script `sync-docs` implementati. Storybook proposto ma non implementato. Vedi `docs/30-api/`. |
| **5 — Pubblicazione** | ✓ funzionante | `npm run start` su porta 3000 (locale). |

## 2. Decisioni di scope (prese il 2026-05-05)

Le 5 scelte chiave su cui è impostata tutta la documentazione:

1. **Architettura repo**: opzione A — `hcaire-docs/` è repo separato, parallelo a `hcaire-blog/`. Gli artefatti generati (TypeDoc, OpenAPI) andranno sincronizzati con script in Fase 4.
2. **Migrazione**: il file `hcaire-blog/docs/produzioni-architettura.md` è stato migrato in `hcaire-docs`, non duplicato.
3. **Scope**: **B (core stabile)**. Include blog, admin CMS, autenticazione, navigation, markdown, account, letture, hcaire, sviluppo-bambino narrativa + produzioni. **Esclude**: Bartleby (sub-app, ha già `CLAUDE_bartleby.md`) e Corso Fase 3 (in lavorazione).
4. **Storybook/TypeDoc**: introdotti **dopo** aver completato le schede modulo narrative.
5. **Lingua**: tutta la documentazione in **italiano**.

## 3. Stato git al 2026-05-05

### `hcaire-docs/` — branch `main`, remote `https://github.com/stfnbssl/hcaire-docs.git`

Tutto **non committato**. Da committare prima del transfer:

```
M  .gitignore
?? docs/
?? docusaurus.config.ts
?? package-lock.json
?? package.json
?? sidebars.ts
?? src/
?? tsconfig.json
?? HANDOFF.md   (questo file)
```

`prompts/` è già tracciato (è dove vive il documento di piano originale).

**Cosa fare prima del trasferimento:**
```bash
cd C:/my/projects/hcaire-docs
git add .
git commit -m "feat: setup Docusaurus + Fase 0/1 documentazione"
git push origin main
```

`node_modules/` e `build/` sono in `.gitignore`, restano sulla macchina.

### `hcaire-blog/` — branch `main`, remote `https://github.com/stfnbssl/hcaire-blog.git`

Stato al momento del trasferimento (parziale, vedi `git status`):

- **`D docs/produzioni-architettura.md`** — eliminazione legata alla migrazione. **Da committare** insieme.
- **`M .claude/settings.local.json`**, `M package.json` — modifiche minori da valutare.
- **WIP Corso Fase 3** (file untracked `client/src/components/corso-fase3/F3Builder.tsx`, `DecisionCycle.tsx`, `client/src/data/corso-fase3/modules/m02..m08.ts`, modifiche a `SlideRenderer.tsx`, `index.ts`, `corso.css`) — **decisione tua**: committare/stashare/portare via altri mezzi.

**Suggerimento minimo** prima del transfer:
```bash
cd C:/my/projects/hcaire-blog
git add docs/                     # commit della rimozione del file migrato
git commit -m "docs: migrazione produzioni-architettura.md in hcaire-docs"
git push origin main
# poi decidere cosa fare del WIP corso-fase3
```

## 4. File NON in git che devi portare a mano

### Segreti (`.env`)

Né `hcaire-blog/server/.env` né `hcaire-blog/client/.env` sono versionati. Su nuova macchina vanno **ricreati** copiando da `.env.example` e riempiendo i valori. Variabili rilevanti elencate in `docs/00-overview/inventario.md` §7. Le credenziali da recuperare:

- **MongoDB Atlas**: `MONGODB_PASSWORD` (cluster `cluster0.y3qtgdm.mongodb.net`)
- **Clerk**: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`
- **Redis Cloud**: `REDIS_HOST=redis-11976.crce275.eu-west3-1.gcp.cloud.redislabs.com`, `REDIS_PORT=11976`, `REDIS_PASSWORD`
- **Telegram**: `TELEGRAM_TOKEN`, `TELEGRAM_ID`
- **Lemon Squeezy**: `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`, e i 3 `LEMONSQUEEZY_VARIANT_*`

`hcaire-docs` non ha `.env` proprio: non ne ha bisogno per ora.

### Cartella contenuti `CONTENT_BASE_PATH`

Il verticale **HCAIRE** e **Sviluppo Bambino** legge contenuti markdown da una cartella **esterna alla repo**:

- Path corrente: `C:/Users/nnmrd/Documents/Claude/Projects/HCAIRE Site/sezioni/`
- Configurato via env `CONTENT_BASE_PATH` (server/.env)
- Non è in git

Sulla nuova macchina: copiare la cartella e impostare `CONTENT_BASE_PATH` al nuovo path.

### Cartella sorgente pipeline produzioni

Lo script `scripts/sync-pipeline.mjs` legge artefatti JSON da:

- Output: `C:/Users/nnmrd/Documents/Claude/Projects/Sviluppo Bambino/output/produzioni` (override env `PIPELINE_SOURCE`)
- Input esterni: `C:/Users/nnmrd/Documents/Claude/Projects/Sviluppo Bambino/input/produzioni` (override env `PIPELINE_INPUT`)

Anche queste sono fuori repo. Da copiare se vuoi rieseguire `npm run sync-pipeline`. Gli artefatti già sincronizzati vivono in `client/public/pipeline/` e **sono in git**, quindi per la sola visualizzazione non serve toccare le sorgenti.

## 5. Setup sulla nuova macchina

Sequenza minima:

```bash
# 1. Repo
git clone https://github.com/stfnbssl/hcaire-blog.git
git clone https://github.com/stfnbssl/hcaire-docs.git

# 2. Copia/ricostruisci .env
cp hcaire-blog/server/.env.example hcaire-blog/server/.env  # poi riempi i valori
cp hcaire-blog/client/.env.example hcaire-blog/client/.env  # poi riempi i valori

# 3. Copia la cartella contenuti su un path locale
#    (es. ~/Documents/HCAIRE/sezioni/) e adegua CONTENT_BASE_PATH

# 4. Install
cd hcaire-blog && npm install
cd ../hcaire-docs && npm install

# 5. Avvia
cd ../hcaire-blog && npm run dev          # avvia server (3018) + client (5173) + local sidecar
cd ../hcaire-docs && npm run start        # avvia documentazione su http://localhost:3000
```

**Versioni richieste**: Node ≥ 18 (testato con Node 24, npm 11).

## 6. Piano residuo (cosa resta da fare)

### Fase 2 — Architettura reale ✓ completata

Le 9 pagine in `docs/10-architecture/` sono scritte e la build è verde. I tre diagrammi Mermaid sono integrati. Aggiornata con i chiarimenti del proprietario (sessione 2026-05-05 macchina nuova):

- **Deployment**: `deployment.md` aggiornato con **Railway** come PaaS del server. Worker `local/` confermato girare solo sul portatile (vincolo strutturale: Cowork CLI è solo locale).
- **Local — ponte Cowork**: nuova pagina `local-cowork-bridge.md` dedicata. Copre i 3 casi d'uso (articoli blog, letture critiche, produzioni Sviluppo Bambino), il pattern generalizzabile per nuovi casi, e la verifica esplicita che **ngrok non è presente nel codice** (Telegram in long-polling, no webhook).
- **Auth legacy**: confermato dead code (`routes/auth.ts`, `middleware/auth.ts`). FE non chiama più `/api/login`/`/api/logout`. Pronto per essere rimosso, vedi `autenticazione.md` §7.

### Sezione TODO ✓ avviata

Nuova area `docs/90-todo/` per aspetti non ancora consolidati. Prima voce: `migrazioni-mongodb.md` con descrizione del problema, 5 strategie candidate (`migrate-mongo`, version field + custom, Atlas triggers, lazy migration, script ad-hoc in `scripts/`), raccomandazione di partenza ibrida e domande aperte da rispondere prima di scegliere.

### Fase 3 — Schede modulo ✓ completata

10 schede scritte in `docs/20-modules/` seguendo lo schema fisso (Scopo / Responsabilità / File / Componenti / Flussi / Dati / Dipendenze / Criticità / Test):

- `autenticazione.md` (Clerk + apiKey + dead code legacy)
- `contenuti.md` (CRUD blog, paywall plus, /import via api-key)
- `navigation.md` (mix statico/dinamico)
- `account.md` (pagina /account)
- `subscriptions.md` (Lemon Squeezy: status/checkout/portal/change-plan/sync + webhook HMAC)
- `admin-cms.md` (dashboard, site-config, site-content, requests, workflow log)
- `hcaire.md` (verticale HCAIRE: cascata index→standalone→subsection)
- `letture.md` (10 step pipeline, integrato con [Local — ponte Cowork](./docs/10-architecture/local-cowork-bridge.md))
- `sviluppo-bambino/narrativa.md` (18 pagine narrative + 22 endpoint)
- `sviluppo-bambino/corsi-f1-f2.md` (slide React, F3 fuori scope)

In aggiunta, durante la stesura sono state corrette **inaccuratezze trascinate da Fase 2**:

- Endpoint subscription: era `/api/subscriptions/me` → è `/api/subscriptions/status` (corretto in 6 file).
- Site config status: era `'test' | 'live'` → è `'test' | 'production'` (corretto in 4 file).

### Fase 4 — Automazione ◐ parziale

**Implementato:**

- **TypeDoc** generato automaticamente da `../hcaire-blog/server/src/` via `npx typedoc` configurato in `typedoc.json`. Output in `static/typedoc/` (gitignored, ~7.4 MB / 298 file). Esposto a `/typedoc/`.
- **OpenAPI 3.1** hand-written in `static/openapi.yaml` (~17 path stabili: contents, navigation, subscriptions, site-config, site-content, letture, webhook LS). Rendering Redoc via plugin `redocusaurus`, esposto a `/api-reference/`.
- **Script `sync-docs`** in `scripts/sync-docs.mjs`: verifica sibling layout, esegue TypeDoc, controlla openapi.yaml, riporta riepilogo. Comando `npm run sync-docs`.
- **4 pagine docs** in `docs/30-api/`: index, openapi, typedoc, storybook.

**Non implementato (intenzionalmente):**

- **Storybook**: documentato in `docs/30-api/storybook.md` come proposta. Decisione: aspettare uno dei tre trigger (team frontend > 1, refactor verso design system, estrazione libreria). Costo/beneficio attuale basso per via dei componenti corso-fase\* poco riutilizzabili.

**Aggiunte in `package.json` di hcaire-docs:**

- `typedoc` (devDep) — generatore.
- `redocusaurus` (dep) — preset Docusaurus per Redoc.
- Script `npm run sync-docs` e `npm run typedoc`.

**Setup su nuova macchina** (vedi anche §5):

```bash
cd hcaire-docs && npm install
npm run sync-docs    # genera static/typedoc/ — DEVE girare prima del primo build
npm run build        # ora include /typedoc/ + /api-reference/
```

### Fase 5 — Pubblicazione

Già funzionante in locale (`npm run start`). Eventuale deploy futuro su Cloudflare Pages o GitHub Pages.

## 7. Punti aperti / da chiarire (rilevati esplorando il codice)

Lasciati come `:::note Da confermare` o "Da verificare in Fase 2" nei file:

1. **Auth legacy**: `server/src/middleware/auth.ts` e `server/src/routes/auth.ts` sembrano residui dell'epoca pre-Clerk; `JWT_SECRET` ancora citato in `.env.example`. Da verificare se ancora referenziati o rimuovibili.
2. **Worker `local/`**: cosa subscribe / cosa pubblica via Redis, come si coordina con Express. Capitolo dedicato in Fase 2.
3. **Schemi messaggi Redis**: oggi nessuna documentazione esplicita degli eventi `pipeline:*` e `letture:*`.
4. **Schemi JSON pipeline**: niente JSON Schema esplicito, solo TS interface lato lettura (vedi §8.2 di `produzioni.md`).
5. **`obiettivi-funzionali.md`**: stub deliberato. Richiede input di prodotto, non si ricava dal codice.

## 8. Note importanti

### Il `CLAUDE.md` di `hcaire-blog` è significativamente stale

Al 2026-05-05 il `CLAUDE.md` di `hcaire-blog` descrive un'autenticazione JWT con login `admin`/`admin` e un'app fondamentalmente "blog semplice". L'**implementazione reale** è molto più articolata: Clerk, Lemon Squeezy, Redis pub/sub, Telegram, Cloudflare, tre workspace, sette verticali.

I dettagli reali sono in `docs/00-overview/inventario.md` di questa repo. Non fidarsi del CLAUDE.md per fatti specifici di auth, scope o stack.

### Memoria Claude Code

Esiste una memoria persistente in `C:\Users\nnmrd\.claude\projects\C--my-projects-hcaire-blog\memory\` che include `project_hcaire.md` (contesto di progetto) e `reference_redis.md` (endpoint Redis Cloud). Sulla nuova macchina la memoria è in un path equivalente ma diverso (basato sul nuovo workspace path); va eventualmente ricreata o copiata se vuoi che le sessioni Claude future abbiano la stessa partenza.

### Documento di pianificazione originale

Il prompt che ha guidato tutto il setup vive in `hcaire-docs/prompts/Sistema di documentazione della webapp di HCAIRE.md`. Tracciato in git.

## 9. Comandi rapidi di verifica (su nuova macchina)

```bash
# Verificare che la documentazione builda
cd hcaire-docs && npm run build
# Esito atteso: "[SUCCESS] Generated static files in build."
# Warning ignorabili: "Cannot infer the update date" (file appena committati), "Critical dependency: vscode-languageserver-types" (transitiva di Mermaid).

# Avviare il sito documentale
npm run start    # http://localhost:3000

# Verificare che l'app gira
cd ../hcaire-blog && npm run dev
# Esito atteso: server su 3018, client su 5173, local sidecar attivo (Telegram + Redis subscribers).
```
