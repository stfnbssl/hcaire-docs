---
title: Glossario
sidebar_position: 4
---

# Glossario

Termini di dominio e tecnici ricorrenti nel codice e nella documentazione.

## Tecnologie e infrastruttura

| Termine | Significato |
|---------|-------------|
| **Clerk** | Provider di autenticazione/identità. Unico provider attivo (il JWT custom in `routes/auth.ts` è dead code). |
| **MongoDB Atlas** | Cluster MongoDB cloud (`cluster0.y3qtgdm.mongodb.net`). Database `hcaire_db`. |
| **Redis Cloud** | Istanza Redis GCP `eu-west3` per pub/sub di eventi pipeline, assi, letture, Bartleby. |
| **Lemon Squeezy** | Provider di billing. Webhook HMAC per attivazione/deattivazione abbonamenti. Tre varianti piani: `abbonato`, `bartleby`, `bartleby_plus`. |
| **Telegraf** | Libreria Node per il bot Telegram. Avviata in `services/telegramBot.ts`. |
| **Cloudflare Pages** | Hosting frontend (deploy via `wrangler deploy`). |
| **Cloudflare R2** | Object storage S3-compatibile, usato per immagini autori/libri del catalogo. |
| **Railway** | PaaS che ospita il server Express in produzione. |
| **Cowork** | Strumento CLI locale (Claude Code wrapper) per generazione articoli e step pipeline pesanti. Triggerato dal Telegram bot. Path su disco controllato da `COWORK_PROJECT_PATH`. |
| **gray-matter** | Parser markdown con frontmatter YAML, usato in `staticContentReader.ts`. |
| **Mongoose** | ODM MongoDB. Tutti i modelli in `server/src/models/`. |
| **Mermaid** | Diagrammi testuali integrati in Docusaurus. |
| **TanStack React Query** | Cache + state management per fetch lato client. |
| **Wrangler** | CLI Cloudflare per deploy/preview Pages. |

## Ruoli e autorizzazioni

| Termine | Significato |
|---------|-------------|
| **Anonimo** | Nessuna sessione Clerk; vede solo contenuti `accessType: 'free'`. |
| **Free** | Utente Clerk autenticato senza abbonamento. |
| **Plus** / **Abbonato** | Utente con `UserSubscription.plan='abbonato'` e `status='active'`. Sblocca contenuti `accessType: 'plus'`. |
| **Bartleby** / **Bartleby Plus** | Piani che sbloccano le aree avanzate di Bartleby (`/bartleby/*`). |
| **Admin** | Utente Clerk con `publicMetadata.role === 'admin'`. Gated FE (`useIsAdmin`) e BE (`requireAdmin`). |
| **API key (Cowork)** | Bearer token `COWORK_API_KEY` per automazioni esterne (es. `/api/contents/import`, submission trace Bartleby). |
| **`optionalClerkAuth`** | Middleware che autentica se possibile ma non blocca: usato per rotte con tier-gated content. |

## Sviluppo Bambino — terminologia di metodo

Terminologia molto specifica. La pagina [Produzioni](../20-modules/sviluppo-bambino/produzioni.md) dettaglia; qui l'essenziale.

| Termine | Significato |
|---------|-------------|
| **Fase 1 (F1)** | Fondazione ontologica. Corso pubblicato in `corso-fase1/`. |
| **Fase 2 (F2)** | Traduzione interdisciplinare. Le ricerche tematiche producono il passaporto di un tema. 7 step lineari (v3.0). |
| **Fase 3 (F3)** | Costruzione del micro-dispositivo di campo a partire dal passaporto del tema. 5 step lineari (v3.0). |
| **Ricerca** | Contenitore della pipeline F2 di un tema. `PipelineContext` con `context_type='ricerca'`. |
| **Tema (F3)** | Coppia `(theme_F2, ambito)` su cui gira una pipeline F3. `PipelineContext` con `context_type='tema'`, id `${theme}--${ambito}`. |
| **Ambito** | Contesto operativo in cui un tema F2 viene applicato in F3 (clinico/educativo/formazione/politiche + sottodominio + età + setting + profilo osservatore). Un tema F2 può aprire più pipeline F3 (una per ambito). |
| **Bridge ambiti F2→F3** | Decisione umana che, alla conclusione di F2, definisce uno o più ambiti per il tema. Embedded come `tema_ambiti` su `PipelineContext`. |
| **Dispositivo** | Output finale della F3 (v3.0): struttura template a 7 campi + classificazione U1–U6 + condizioni di non-applicabilità. |
| **Nodo dominante** | Nodo della CE la cui fragilità condiziona l'abitabilità del campo. Identificato in `f3_step_1`. |
| **Funzione (F3)** | Una di: stabilizzare / ampliare / mediare / proteggere. Una per dispositivo. |
| **Proxy operativo** | Componente del dispositivo che traduce la lettura in osservazione concreta (v3.0). |
| **Stress test** | Verifica contro 5 casi tipologici (assenza, parziale, distorta-chiudente, oscillante, apparente-indistinguibile). Step `f3_step_3`. |
| **Coerenza F3** | Checklist 10 controlli normativi (`valido` / `richiede_revisione` / `fuori_modello`). Step `f3_step_4`. |
| **Audit metodologico** | 8 controlli sulla qualità di esecuzione della pipeline F3. Step opzionale `f3_step_5`. |
| **Configurazionale** | Lettura per dimensioni e nodi (vs. inferenza psicologica). |
| **Non classificabilità** | Caso in cui il proxy non può emettere giudizio. |
| **Asse strutturale** | Una delle 6 dimensioni di lettura del modello (44 capitoli complessivi). |

## Bartleby — terminologia

| Termine | Significato |
|---------|-------------|
| **Concept node** | Nodo concettuale della KB. Ha `priority_level` e `source_context`. |
| **Domain area** | Ambito di ricerca con `research_focus[]` e `access_points[]`. |
| **Foundation document** | Documento fondazione: testo grezzo + `structural_refs`, `reading_focus[]`, `interpretive_warnings[]`, `observability_requirements[]`, `non_classificability_rules[]`. |
| **Area sheet** | Foglio area che descrive struttura e profondità di un Domain area. |
| **Skill** (Bartleby) | Capacità operativa: tipo `research` / `synthesis` / `application`, con `instruction_payload` e `activation_context`. |
| **Input trace** | Traccia inviata dall'utente per generare output (corpus, area target, attivazione nodi). |
| **Output document** | Documento generato da una trace, eventualmente pubblico. |
| **Output template** | Template di prompt + struttura attesa per un tipo di output. |
| **Bridge table** | Relazione many-to-many tra entità (`FoundationDocumentNode`, `AreaSheetNode`, `SkillNode`, `SkillArea`). |

## Pipeline orchestrazione (server)

| Termine | Significato |
|---------|-------------|
| **PipelineContext** | Documento principale di un'esecuzione (ricerca F2 o tema F3). Contiene `step_states`, `pending_decision`, `tema_ambiti`, contatori di robustezza. |
| **PipelineStepExecution** | Singola esecuzione di uno step (con `run_number`, `status`, `output_data`, `output_file`, `is_skipped`). |
| **PipelineExternalInput** | Input esterno/facoltativo per uno step (file path, label, `is_superseded`). |
| **Step enablement** | Calcolo se uno step è eseguibile (step precedenti completed + input esterni presenti). Logica in `stepEnablement.ts`. |
| **Watchdog** | Servizio background che marca timed-out le esecuzioni oltre `PIPELINE_DEFAULT_TIMEOUT_MS`. |
| **Decisione umana** | Richiesta di input bloccante embedded in `PipelineContext.pending_decision` (es. ambiti F2→F3). |
| **SSE** | Server-Sent Events: stream log esecuzione step → FE via EventSource. |

## Architettura applicativa

| Termine | Significato |
|---------|-------------|
| **Workspace** | Sotto-pacchetto npm gestito da `workspaces`. Tre: `server`, `client`, `local`. |
| **Sidecar `local`** | Processo `tsx watch` separato dal server Express. Bridge verso Cowork CLI; subscriber Redis per generazione articoli/dispositivi/letture. |
| **messageBus** | Astrazione su Redis pub/sub. Canali principali: `article:new`, `bartleby:trace:new`, `pipeline:step:execution:complete`, `letture:*`, `assi:*`. |
| **staticContentReader** | Servizio che legge markdown frontmatter come fallback (override via `CONTENT_BASE_PATH`). |
| **SiteConfig / SiteContent** | Singleton di configurazione (test/production, maintenance) e contenuti editabili slug-based (footer, disclaimer, cookies, landing). |
| **AdminRoute** | Wrapper che gating le route `/admin/*` su `useUser()` Clerk + `useIsAdmin`. |
| **Verticale** | Macro-area tematica della webapp (HCAIRE, Sviluppo Bambino, Letture, Bartleby, Metodo, Anthropos, Assi). |
| **Sezione promossa** | Area precedentemente sotto SB, oggi a primo livello (es. **Metodo**, **Assi strutturali**). |
