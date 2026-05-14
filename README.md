# hcaire-docs

Sito di documentazione tecnica della webapp **HCAIRE** (dominio `hcaire.ai`, repo applicativa `hcaire`).

Costruito con [Docusaurus](https://docusaurus.io/) v3, con plugin [Redocusaurus](https://redocusaurus.vercel.app/) per il viewer OpenAPI e tema Mermaid per i diagrammi.

## Layout previsto sul disco

```
projects/
├── hcaire/        ← repo applicativa (server + client + local)
└── hcaire-docs/   ← questo repo (Docusaurus)
```

I due repo devono essere cartelle sorelle: lo script `sync-docs` legge `../hcaire/server/src/` per generare TypeDoc.

## Comandi

```bash
npm install         # installa Docusaurus + plugin
npm run start       # dev server su http://localhost:3000
npm run build       # build statico in build/
npm run sync-docs   # genera static/typedoc/ da ../hcaire/server/src/
npm run typedoc     # solo TypeDoc, senza riepilogo
```

## Struttura

- `docs/intro.md` — pagina di benvenuto
- `docs/00-overview/` — cos'è l'applicazione, inventario, mappa moduli, glossario
- `docs/10-architecture/` — stack, frontend, backend, database, autenticazione, routing, deployment, ponte locale Cowork
- `docs/20-modules/` — scheda per ciascun modulo funzionale
- `docs/30-api/` — OpenAPI, TypeDoc, Storybook (proposto)
- `docs/40-reference/` — placeholder per riferimenti generati
- `docs/90-todo/` — proposte aperte / decisioni da prendere
- `static/openapi.yaml` — spec OpenAPI 3.1 hand-written
- `static/typedoc/` — output TypeDoc (gitignored, rigenerato da `sync-docs`)

## Lingua

Tutta la documentazione è in italiano. `i18n.defaultLocale = it` in `docusaurus.config.ts`.
