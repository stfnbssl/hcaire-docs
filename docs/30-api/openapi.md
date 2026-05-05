---
title: OpenAPI
sidebar_position: 2
---

# OpenAPI

Specifica **OpenAPI 3.1** dell'API REST, scritta a mano in `static/openapi.yaml` e renderizzata via [Redocusaurus](https://redocusaurus.vercel.app/) (Redoc embedded in Docusaurus).

👉 **Apri il viewer**: [API reference](/api-reference/)

## Cosa copre

L'OpenAPI corrente copre **gli endpoint stabili** dell'app:

| Area | Endpoint |
|------|----------|
| Health | `GET /health` |
| Contenuti | `GET/POST/PUT/DELETE /api/contents`, `GET /api/contents/admin`, `GET /api/contents/:slug`, `POST /api/contents/import` |
| Navigation | `GET /api/navigation` |
| Subscriptions | `GET /api/subscriptions/status`, `POST /checkout`/`portal`/`change-plan`/`sync` |
| Site config | `GET /api/site-config`, `PUT /api/site-config` |
| Site content | `GET /api/site-content`, `GET /api/admin/site-content` |
| Letture (pubblico) | `GET /api/letture`, `GET /api/letture/:slug` |
| Webhooks | `POST /webhooks/lemonsqueezy` |

In totale **~17 path** documentati, con schemi completi per request/response basati sui modelli Mongoose reali.

## Cosa **non** copre (intenzionalmente)

- **Verticali narrativi** (`/api/hcaire/*`, `/api/sviluppo-bambino/*`): contratto stabile *funzionalmente* ma in evoluzione *contenutisticamente*. Documentati nei moduli [HCAIRE](../20-modules/hcaire.md) e [SB narrativa](../20-modules/sviluppo-bambino/narrativa.md).
- **Pipeline interna** (`/api/pipeline/*`, `/api/admin/letture/*/run`): API admin con payload complessi (input_files, prompt composer, ecc.) il cui schema è meglio descritto nei moduli [Letture](../20-modules/letture.md) e [Produzioni](../20-modules/sviluppo-bambino/produzioni.md), e nella pagina [Local — ponte Cowork](../10-architecture/local-cowork-bridge.md).
- **Bartleby** (`/api/bartleby/*`): fuori scope B di questa documentazione.
- **Auth legacy** (`POST /api/login`, `/api/logout`): dead code, da rimuovere (vedi [Architettura → Autenticazione §7](../10-architecture/autenticazione.md#residui-legacy)).

## Strumenti di autenticazione

L'OpenAPI dichiara due `securitySchemes`:

- **`ClerkBearer`**: JWT Clerk in `Authorization: Bearer <token>`. Lato FE si ottiene con `useAuth().getToken()`.
- **`ApiKey`**: chiave statica `COWORK_API_KEY` per `POST /api/contents/import`.

Il webhook Lemon Squeezy non è dichiarato come `security` perché l'autenticazione è basata su firma HMAC nel header `x-signature`, fuori dal modello OpenAPI standard.

## Come consumare lo spec

### Dal sito (lettura)

[`/api-reference/`](/api-reference/) ← navigabile, con tre pannelli (sidebar tag, dettaglio path, esempi request/response).

### Da editor esterni

Lo YAML è scaricabile direttamente da [`/openapi.yaml`](/openapi.yaml). Strumenti che lo accettano:

- **Swagger Editor** ([editor.swagger.io](https://editor.swagger.io/)) — incolla o carica via URL.
- **Postman** — Import → URL → `https://<host-docs>/openapi.yaml` per generare la collection.
- **Stoplight Studio**, **Insomnia**, ecc. — supporto OpenAPI 3.1 nativo.

### Generazione client

Lo spec è OpenAPI 3.1 valido; può essere usato con `openapi-generator`, `oazapfts`, `orval` o simili per generare client TS/Python/altro. Esempio:

```bash
npx openapi-typescript ./static/openapi.yaml -o client.d.ts
```

## Manutenzione

Le modifiche allo spec sono **manuali**: si edita `static/openapi.yaml`, si verifica con `npm run build` (Redocusaurus carica e valida lo schema) e si committa.

### Aggiungere un nuovo endpoint

1. Identificare l'endpoint da aggiungere (route, controller, model).
2. Aggiungere il `path` sotto `paths:` con tutti i verb supportati.
3. Se introduce un nuovo modello: aggiungere uno `schema` sotto `components/schemas/`.
4. Aggiungere un `tag` se l'area non è ancora coperta.
5. Build di verifica.

### Sincronizzazione con il codice

**Non c'è generazione automatica oggi**. Modificare il codice del controller senza aggiornare l'OpenAPI provoca *drift*. Tre strategie possibili in futuro:

- **Annotation-based** (`swagger-jsdoc`): JSDoc nei controller, generazione dello YAML da quelli. Invasivo (tocca ogni route).
- **Code-first con tsoa o NestJS**: controller decorati, generazione automatica. Refactor pesante.
- **Schema-first con runtime validation** (`zod` + `zod-to-openapi`): si definisce uno schema zod per ogni request/response, si valida a runtime e si genera lo spec. Ideale ma richiede touch sui controller.

Per ora la strategia è "manuale + disciplina": lo schema è una scheda di documentazione, non la verità di runtime.

## Esempi di consumo

### Lettura paginata articoli

```bash
curl "https://api.hcaire.example/api/contents?page=1&limit=10"
```

### Articolo plus con sessione

```bash
curl "https://api.hcaire.example/api/contents/articolo-plus" \
  -H "Authorization: Bearer $CLERK_JWT"
```

### Import articolo via Cowork

```bash
curl -X POST "https://api.hcaire.example/api/contents/import" \
  -H "Authorization: Bearer $COWORK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "esempio",
    "titolo": "Esempio",
    "contenuto": "# Esempio\n\nMarkdown...",
    "isPublished": true,
    "accessType": "free",
    "articleRequestId": "65ff..."
  }'
```

### Stato abbonamento

```bash
curl "https://api.hcaire.example/api/subscriptions/status" \
  -H "Authorization: Bearer $CLERK_JWT"
# → { "status": "active", "plan": "abbonato", "currentPeriodEnd": "2026-06-12T..." }
```
