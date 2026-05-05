---
title: TypeDoc
sidebar_position: 3
---

# TypeDoc

API reference TypeScript del workspace `server/`, **generata automaticamente** dai sorgenti via [TypeDoc](https://typedoc.org/) e servita come HTML statico.

👉 **Apri la reference**: [/typedoc/](pathname:///typedoc/)

(Il link funziona dopo che `npm run sync-docs` è stato eseguito almeno una volta — vedi [§ Sync](#sync).)

## Cosa copre

TypeDoc analizza i seguenti entry point di `hcaire-blog/server/src/`:

| Cartella | Contenuto |
|----------|-----------|
| `services/` | `messageBus`, `pipelineEventSubscriber`, `lettureMessageBus`, `lettureEventSubscriber`, `staticContentReader`, `telegramBot`, `workflowLogger`, e tutti gli altri |
| `middleware/` | `clerkAuth`, `apiKeyAuth`, `auth` (legacy) |
| `models/` | Tutti i modelli Mongoose (esclusi `bartleby/`) |
| `controllers/` | I controller dei domini in scope (esclusi `bartlebyController.ts` e `seedBartleby.ts`) |
| `utils/` | Helper letture, pipeline, ecc. |
| `types/` | Type alias condivisi |
| `config/` | `db.ts`, `redis.ts` |

Esclusioni:

- `__tests__/` (suite di test).
- `bartleby/` (sub-app fuori scope B).

## Configurazione

`hcaire-docs/typedoc.json`:

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "name": "HCAIRE — API reference (server)",
  "entryPointStrategy": "expand",
  "entryPoints": ["../hcaire-blog/server/src/services", "..."],
  "tsconfig": "../hcaire-blog/server/tsconfig.json",
  "out": "static/typedoc",
  "exclude": ["**/__tests__/**", "**/bartleby/**", ...],
  "skipErrorChecking": true,
  "excludePrivate": true,
  "excludeInternal": true
}
```

- **`entryPoints` punta a sibling**: la generazione presuppone che `hcaire-blog/` e `hcaire-docs/` siano cartelle sorelle sul filesystem.
- **`tsconfig` del server** è riusato così TypeDoc risolve correttamente i tipi.
- **`skipErrorChecking: true`**: tollera errori TS marginali (utile durante sviluppo, dove il server può essere in stato non-buildable).

## Sync

Lo script `scripts/sync-docs.mjs` automatizza la rigenerazione. Comando:

```bash
npm run sync-docs
```

Cosa fa:

1. Verifica che `../hcaire-blog/server/` esista (sibling check).
2. Esegue `npx typedoc` con `typedoc.json`.
3. Output in `static/typedoc/` (gitignored — vedi `.gitignore`).
4. Verifica che `static/openapi.yaml` esista (warning se mancante, no errore).
5. Stampa un riepilogo.

Dopo il sync, `npm run build` o `npm run start` includono il TypeDoc nei file statici serviti.

## Quando rigenerare

- **Dopo modifiche significative al server**: nuove rotte, controller, services, middleware.
- **Prima di un release/deploy della doc**: per garantire allineamento.
- **Su CI** (futuro): in un job che ha entrambi i repo checkout.

## Limiti noti

- **Dipendenza dal sibling layout**: TypeDoc deve poter leggere `../hcaire-blog/server/src/`. Su un'installazione che ha solo `hcaire-docs/` checkout (senza `hcaire-blog/`), `npm run sync-docs` fallisce. Senza il run, il link `/typedoc/` ritorna 404.
- **Nessuna documentazione del client**: per ora `client/src/` non è coperto. Aggiungerlo richiede un secondo entry point e probabilmente un secondo run TypeDoc (per evitare conflitti di tsconfig: il server è CommonJS, il client è ESM/Vite).
- **Warning su tipi `@types/node`**: TypeDoc non risolve i link a tipi node esterni come `http.Server`, `EventEmitter.defaultMaxListeners`. Non bloccanti ma rumorosi nel log. Ignorabili.
- **Output ~8 MB / 300 file**: grosso ma accettabile come asset statico (gitignored, rigenerato on demand).

## Estensioni future

- **Includere `client/`**: entry point separato + ulteriore `tsconfig` lato client.
- **Tema custom**: oggi tema TypeDoc default. Si potrebbe usare `typedoc-plugin-markdown` per generare MDX e integrare TypeDoc dentro Docusaurus come pagine native (invece di sito statico esterno). Vantaggio: ricerca unificata. Costo: configurazione non triviale.
- **Tag custom**: introdurre `@example`, `@throws`, `@deprecated` nel codice del server per arricchire la doc generata.
