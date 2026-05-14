---
title: Cos'è l'applicazione
sidebar_position: 1
---

# Cos'è l'applicazione

**HCAIRE** (Human-Centred AI Research and Education, dominio `hcaire.ai`) è una webapp full-stack che ospita un laboratorio editoriale e di ricerca su intelligenza artificiale, metodologia educativa e sviluppo del bambino. Il monorepo si chiama `hcaire` (ex `hcaire-blog`) e contiene tre workspace: `server/` (Express + MongoDB), `client/` (React + Vite, deploy Cloudflare Pages), `local/` (worker portatile per integrazioni esterne come Cowork CLI).

Non è un blog generico: la pubblicazione di articoli markdown è solo uno dei moduli. Sopra al CMS vivono diverse **sezioni verticali** dedicate a un dominio, con pagine, layout e logiche dedicate.

## Aree funzionali

| Area | Cosa fa | Path principale |
|------|---------|-----------------|
| **Blog / CMS** | Articoli markdown pubblici, gating `free` / `plus`, import via Cowork API | `/blog/:slug` |
| **HCAIRE laboratorio** | Pagine narrative del progetto (manifesto, protocolli, sezioni) | `/hcaire/*` |
| **Metodo** | Sezione promossa a primo livello: introduzione, fasi, rapporto con IA, ricerca scientifica, **didattica** (corsi F1/F2/F3 in formato slide React) | `/metodo/*` |
| **Sviluppo Bambino** | Finalità, concetti, nota metodologica, riflessioni, interlocuzioni con le discipline, modello (assi), **produzioni** (pipeline F2/F3) | `/sviluppo-bambino/*` |
| **Assi strutturali** | 6 assi × ~44 capitoli, source-of-truth in MongoDB con body markdown, references e footnotes | `/assi-strutturali/*` |
| **Letture critiche** | Opere commentate con pipeline editoriale a 10 step, back-office per orchestrazione | `/letture/*` |
| **Bartleby** | Knowledge base + console + output documents; trace utente con sottomissione asincrona | `/bartleby/*` |
| **Anthropos** | Landing del progetto Anthropos sotto `/progetti` | `/anthropos` |
| **Archivio Temi** | Backoffice D5 per i temi che alimentano la pipeline F3 | `/archivio/temi` |
| **Account utente** | Profilo Clerk + stato abbonamento Lemon Squeezy | `/account` |
| **Pricing** | Piani commerciali (mappati su variant Lemon Squeezy) | `/pricing` |
| **Admin CMS** | Dashboard amministrativa per contenuti, configurazione sito, testi, richieste articoli, letture, workflow log, assi, catalogo (autori/libri), pipeline assi rebuild, skills/plugins/jobs | `/admin/*` |

## Chi la usa

| Ruolo | Come si identifica | Cosa può fare |
|-------|--------------------|---------------|
| **Anonimo** | Nessuna sessione | Legge contenuti `isPublished: true` con `accessType: 'free'`, naviga le sezioni narrative pubbliche |
| **Free** | Utente Clerk autenticato senza abbonamento attivo | Idem anonimo + profilo, può vedere paywall |
| **Plus / Bartleby / Bartleby Plus** | Utente Clerk con `UserSubscription.status='active'` | Sblocca contenuti `accessType: 'plus'` e (per piani Bartleby) le aree avanzate Bartleby |
| **Admin** | Utente Clerk con `publicMetadata.role === 'admin'` | Accede a `/admin/*` e a tutte le rotte server protette |
| **Sistemi esterni (API key)** | Bearer `COWORK_API_KEY` | Pubblicazione articoli (`POST /api/contents/import`), submission trace Bartleby |
| **Webhook** | Firma HMAC Lemon Squeezy | Aggiorna `UserSubscription` |

## Flussi dati principali

1. **Articoli blog** → MongoDB Atlas (DB `hcaire_db`, collection `contents` via modello `Content`).
2. **Navigazione** → MongoDB collection `navigations` (modello `Navigation`).
3. **Contenuti narrativi (HCAIRE, Metodo, Sviluppo Bambino)** → MongoDB collection `siteContents` slug-based (modello `SiteContent`), con fallback su filesystem (`CONTENT_BASE_PATH`) via `staticContentReader.ts`.
4. **Capitoli assi strutturali** → MongoDB collection `assi_chapters` (modello `AssiChapter`, body markdown con riferimenti `{{ref:rN}}`).
5. **Catalogo autori/libri** → MongoDB collections `authors`, `books` (modelli `Author`, `Book`); immagini su Cloudflare R2.
6. **Pipeline produzioni Sviluppo Bambino** → MongoDB `pipeline_contexts`, `pipeline_step_executions`, `pipeline_external_inputs`; eventi su Redis (`pipeline:step:execution:complete`).
7. **Letture critiche** → MongoDB collection `opere` (modello `Opera` con `steps[]` embedded); eventi step su Redis.
8. **Bartleby KB** → MongoDB collections `bartleby_*` (concept nodes, domain areas, foundation documents, area sheets, skills, input traces, output documents, output templates, bridge tables); trace utente su Redis (`bartleby:trace:new`).
9. **Archivio Temi (D5)** → MongoDB collection `temi`.
10. **Workflow** → MongoDB collection `workflow_logs` (modello `WorkflowLog`), una riga per evento di lifecycle.
11. **Article requests (Telegram)** → MongoDB collection `article_requests` (modello `ArticleRequest`); il Telegram bot pubblica su Redis `article:new` e può triggerare la Cowork CLI in background.
12. **Sottoscrizioni** → webhook Lemon Squeezy → MongoDB `user_subscriptions` (modello `UserSubscription`).
13. **Sito** → `SiteConfig` (test/production, maintenanceMode) e `SiteContent` (footer/disclaimer/cookies/landing) caricati da context FE.

## Cosa HCAIRE **non** è

- Non è una piattaforma e-commerce: i pagamenti sono delegati a Lemon Squeezy.
- Non è una piattaforma video: i corsi sono slide React (componenti `corso-fase1/2/3`).
- Non esegue l'orchestrazione pipeline F2/F3 *interamente nel server*: parte del lavoro (generazione articoli e step pesanti) avviene tramite la **Cowork CLI** locale, triggerata dal sidecar `local/`. Vedi [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md).

:::note Da confermare con il proprietario del prodotto
Pubblico target, posizionamento commerciale e roadmap non sono ricavabili dal codice. Una conferma esplicita aiuterebbe a stabilizzare questa pagina.
:::
