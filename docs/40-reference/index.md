---
title: Reference (artefatti generati)
sidebar_position: 1
slug: /reference/
---

# Reference

Pagina indice per i **riferimenti generati automaticamente**. I link puntano ad asset costruiti da script di sync (gitignored, da rigenerare dopo ogni clone).

## TypeDoc — API server

Reference TypeScript del workspace `server/` generato da [TypeDoc](https://typedoc.org/).

👉 **Apri**: [/typedoc/](pathname:///typedoc/)

Per la configurazione, vedi [TypeDoc](../30-api/typedoc.md). Per rigenerare:

```bash
npm run sync-docs
```

## OpenAPI — REST API

Spec OpenAPI 3.1 hand-written renderizzata via Redocusaurus.

👉 **Apri**: [/api-reference/](/api-reference/)

Per il contratto, vedi [OpenAPI](../30-api/openapi.md). Source: `static/openapi.yaml`.

## Storybook

Non implementato. Vedi [proposta](../30-api/storybook.md) e relativa decisione (introdurre solo a trigger specifici).
