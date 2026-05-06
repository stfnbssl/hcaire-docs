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
| **Fase 2 (F2)** | Traduzione interdisciplinare. Le **ricerche tematiche** producono il passaporto di un tema. 7 step lineari (v3.0): rilevanza, verifica nodi, verifica, matrice, CE prototipica, output family, output-tipo vuoto. |
| **Fase 3 (F3)** | Costruzione del **micro-dispositivo di campo** a partire dal passaporto del tema. 5 step lineari (v3.0): Nodo dominante e funzione, Micro-dispositivo, Stress test e correzione, Coerenza F3, Audit metodologico (opzionale). |
| **Ricerca** | Contenitore della pipeline F2 di un tema. Vive sotto `pipeline/ricerche/<id>/`. |
| **Tema (F3)** | Coppia `(theme_F2, ambito)` su cui gira una pipeline F3. Vive sotto `pipeline/temi/<id>/` con `<id> = ${theme}--${ambito}`. |
| **Ambito** | Contesto operativo (clinico/educativo/formazione/politiche + sottodominio + età + setting + profilo osservatore) in cui un tema F2 viene applicato in F3. Un tema F2 può aprire *N* pipeline F3, una per ambito. |
| **Bridge ambiti F2→F3** | Componente che, alla conclusione di F2, permette di definire e promuovere uno o più ambiti per il tema corrente. Embedded come `tema_ambiti` su `PipelineContext`. |
| **Dispositivo** | Output finale della F3 (v3.0): struttura template a 7 campi del micro-dispositivo + classificazione U1–U6 + condizioni di non-applicabilità. Snapshot canonico in `f3_step_4` (verdetto coerenza) → `f3_step_3` (post-correzione) → `f3_step_2`. |
| **Nodo dominante** | Nel modello v3.0: nodo della CE la cui fragilità o disorganizzazione condiziona maggiormente l'abitabilità del campo nel dominio scelto. Identificato in `f3_step_1`. |
| **Funzione (F3)** | Una delle quattro categorie chiuse della metodologia: stabilizzare, ampliare, mediare, proteggere. Una funzione per dispositivo. |
| **Asse strutturale** | Una delle dimensioni di lettura del modello. Pubblicato sotto `/assi-strutturali/`. |
| **Proxy operativo** | Componente del dispositivo che traduce la lettura in osservazione concreta. v3.0: proprietà del dispositivo prodotto in `f3_step_2`, niente più stratificazione 6/6b/6c. |
| **Stress test** | Verifica del dispositivo contro 5 casi tipologici (assenza, parziale, distorta-chiudente, oscillante, apparente-indistinguibile) con eventuale correzione condizionale. Step `f3_step_3`. |
| **Coerenza F3** | Checklist 10 controlli normativi del metodo che valida o respinge il dispositivo (`valido` / `richiede_revisione` / `fuori_modello`). Step `f3_step_4`. |
| **Audit metodologico** | 8 controlli sulla qualità di esecuzione della pipeline F3 da parte degli agenti AI. Step opzionale `f3_step_5`. |
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
