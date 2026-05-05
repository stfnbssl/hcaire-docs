---
title: Glossario
sidebar_position: 4
---

# Glossario

Termini di dominio e tecnici ricorrenti nel codice e nella documentazione.

## Tecnologie e infrastruttura

| Termine | Significato |
|---------|-------------|
| **Clerk** | Provider di autenticazione/identità. Sostituisce il JWT custom citato nel vecchio `CLAUDE.md`. |
| **MongoDB Atlas** | Cluster MongoDB cloud (`Cluster0` su `mongodb+srv://...`). Database `hcaire_db`. |
| **Redis Cloud** | Istanza Redis su GCP `eu-west3` per pub/sub di eventi pipeline e letture. |
| **Lemon Squeezy** | Provider di billing/SaaS. Webhook per attivazione/deattivazione abbonamenti. Tre varianti: `abbonato`, `bartleby`, `bartleby_plus`. |
| **Telegraf** | Libreria Node per il bot Telegram. Avviata in `services/telegramBot.ts`. |
| **Cloudflare** | Hosting frontend (deploy via `wrangler`). |
| **gray-matter** | Parser per markdown con frontmatter YAML — usato in `staticContentReader.ts`. |
| **Mongoose** | ODM MongoDB. Tutti i modelli in `server/src/models/`. |
| **Mermaid** | Diagrammi testuali integrati nei markdown di Docusaurus. |

## Ruoli e autorizzazioni

| Termine | Significato |
|---------|-------------|
| **Admin** | Utente Clerk con `publicMetadata.role === 'admin'`. Verificato sia FE (`AdminRoute`) sia BE (`requireAdmin`). |
| **Plus** | Utente con abbonamento attivo Lemon Squeezy. Sblocca contenuti `accessType: 'plus'` e funzionalità Bartleby. |
| **Free** | Utente senza abbonamento (anonimo o registrato base). |
| **`optionalClerkAuth`** | Middleware che autentica se possibile ma non blocca: usato per `/api/contents/:slug` (server può servire contenuto diverso in base al tier). |
| **`authenticateApiKey`** | Auth alternativa via API key, usata su `/api/contents/import` per automazioni esterne. |

## Sviluppo Bambino — terminologia di metodo

Il verticale Sviluppo Bambino ha una terminologia molto specifica. La pagina [Produzioni](../20-modules/sviluppo-bambino/produzioni.md) la dettaglia; qui solo l'essenziale.

| Termine | Significato |
|---------|-------------|
| **Fase 1 (F1)** | Fondazione ontologica del metodo. Corso pubblicato in `corso-fase1/`. |
| **Fase 2 (F2)** | Traduzione interdisciplinare. Le **ricerche tematiche** producono temi candidati. 5 step (discovery, rilevanza, verifica, matrice, output family). |
| **Fase 3 (F3)** | Costruzione del **dispositivo configurazionale** a partire da un tema. 10+1 step. |
| **Ricerca** | Contenitore di temi candidati prodotti in F2. Vive sotto `pipeline/ricerche/<id>/`. |
| **Tema** | Specializzazione di una ricerca, oggetto della F3. Vive sotto `pipeline/temi/<id>/`. |
| **Dispositivo** | Output finale della F3: una struttura di lettura configurazionale. Snapshot canonico in `f3_step_9 → dispositivo-*-vN.json`. |
| **Asse strutturale** | Una delle dimensioni di lettura del modello. Pubblicato sotto `/assi-strutturali/`. |
| **Proxy operativo** | Componente del dispositivo che traduce la lettura in osservazione concreta. |
| **Stress test** | Verifica del dispositivo contro casi limite (`f3_step_10`). |
| **Step 6b** | Variante stabilizzata del proxy: quando presente, **sovrascrive** il proxy del dispositivo originale. |
| **Configurazionale** | Tipo di lettura del fenomeno per dimensioni e nodi (vs. inferenza psicologica). |
| **Non classificabilità** | Casi in cui il proxy non può emettere giudizio (categoria distinta da "ambiguo"). |

## Architettura applicativa

| Termine | Significato |
|---------|-------------|
| **Workspace** | Sotto-pacchetto npm gestito tramite `workspaces` del `package.json` root. Tre: `server`, `client`, `local`. |
| **Sidecar `local`** | Processo `tsx watch` separato dal server Express. Worker Bartleby + coworker + executor pipeline. |
| **`messageBus`** | Astrazione su Redis pub/sub per eventi pipeline. Speculare per letture in `lettureMessageBus`. |
| **Watchdog** | Servizio di background che marca come timed-out le esecuzioni che hanno superato `PIPELINE_DEFAULT_TIMEOUT_MS`. |
| **`staticContentReader`** | Servizio che legge markdown frontmatter da `server/content/` (override via `CONTENT_BASE_PATH`). |
| **`AdminRoute`** | Wrapper React che gating le route `/admin/*` su `useUser()` Clerk + ruolo admin. |
| **Verticale** | Una macro-area tematica della webapp con pagine, contenuti e (a volte) endpoint dedicati. Esempi: HCAIRE, Sviluppo Bambino, Letture. |
