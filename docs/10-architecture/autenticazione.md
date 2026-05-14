---
title: Autenticazione
sidebar_position: 5
---

# Autenticazione

L'app usa **Clerk** come unico provider di identità per utenti finali e admin. Esistono inoltre:

- canale **API key** (`COWORK_API_KEY`) per automazioni esterne;
- **firma HMAC SHA256** per il webhook Lemon Squeezy.

Il vecchio JWT custom in `server/src/routes/auth.ts` è dead code (vedi §7).

## 1. Modello concettuale

| Soggetto | Sorgente identità | Cosa sblocca |
|----------|-------------------|--------------|
| Lettore anonimo | Nessuna | Contenuti `accessType: 'free'`, sezioni narrative pubbliche |
| Utente registrato (free) | Clerk session | Account, contenuti free |
| Plus / Abbonato | Clerk + `UserSubscription.status ∈ {active, on_trial}` con `plan='abbonato'` | Contenuti `accessType: 'plus'` |
| Bartleby / Bartleby Plus | Clerk + `UserSubscription.plan ∈ {bartleby, bartleby_plus}` | Aree avanzate Bartleby + contenuti plus |
| Admin | Clerk session + `publicMetadata.role === 'admin'` | Dashboard `/admin/*`, route `/api/admin/*` |
| Automazione esterna | API key in header `Authorization: Bearer <COWORK_API_KEY>` | `POST /api/contents/import`, submission trace Bartleby |
| Lemon Squeezy | Firma HMAC SHA256 sul body raw | `POST /webhooks/lemonsqueezy` |

## 2. Flusso login → contenuto plus

```mermaid
sequenceDiagram
  participant U as Utente
  participant SPA as React SPA
  participant Clerk as Clerk
  participant API as Express :3018
  participant DB as MongoDB

  U->>SPA: visita /blog/articolo-plus
  SPA->>API: GET /api/contents/articolo-plus (no token)
  API->>API: optionalClerkAuth → userId=undefined
  API->>DB: find slug
  alt content.accessType === 'plus'
    API-->>SPA: 200 con teaser + paywall flag
  else free
    API-->>SPA: 200 con contenuto completo
  end

  Note over U,SPA: Se paywall → CTA login

  U->>SPA: click "Accedi"
  SPA->>Clerk: SignIn flow (modale Clerk)
  Clerk-->>SPA: sessione + JWT
  SPA->>SPA: SubscriptionProvider triggers fetch
  SPA->>API: GET /api/subscriptions/status (Bearer token)
  API->>API: requireAuth (clerkMiddleware)
  API->>DB: find UserSubscription by clerkUserId
  API-->>SPA: { status, plan }

  alt subscription active
    SPA->>API: GET /api/contents/articolo-plus (Bearer token)
    API->>API: optionalClerkAuth → userId set
    API->>DB: find slug + find UserSubscription
    API-->>SPA: 200 con contenuto completo
  else
    SPA->>U: redirect /pricing
  end
```

Punto sottile: `GET /api/contents/:slug` cambia comportamento in base alla presenza di `userId` (e quindi di un abbonamento attivo). Il middleware è `optionalClerkAuth`, non `requireAuth`.

## 3. Frontend: ClerkProvider e hook

`App.tsx`:

```tsx
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

<ClerkProvider publishableKey={clerkPublishableKey}>
  ...
</ClerkProvider>
```

Hook principali:

- **`useUser()`** — sessione e profilo. Usato in `AdminRoute` per `user.publicMetadata.role`.
- **`useAuth()`** — espone `getToken()` per ottenere il JWT Clerk da mettere in `Authorization: Bearer ...`. Esempio in `SubscriptionContext`:

```ts
const { getToken } = useAuth();
const token = await getToken();
const data = await getSubscriptionStatus(token);
```

Hook custom helper:

- **`useIsAdmin()`** — wrapper che legge `useUser()` e verifica il ruolo, restituendo `boolean`.

### `AdminRoute`

Check FE-only (UX):

```tsx
function AdminRoute({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return <Spinner />;
  if (!isSignedIn || user?.publicMetadata?.role !== 'admin') {
    return <p>Accesso riservato agli amministratori.</p>;
  }
  return <AdminLayout>...</AdminLayout>;
}
```

Tutte le rotte API admin ripetono il controllo lato server.

## 4. Backend: middleware Clerk

`server/src/middleware/clerkAuth.ts` espone:

```ts
// Globale, già montato in index.ts:
app.use(clerkMiddleware());

// Per route protette:
export const authenticateClerk = requireAuth();   // 401 se non autenticato

// Per route opzionalmente autenticate:
export const optionalClerkAuth = (req, _res, next) => {
  const auth = getAuth(req);
  req.clerkUserId = auth.userId ?? undefined;
  next();
};

// Per route admin (chiama Clerk API):
export const requireAdmin = async (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Autenticazione richiesta' });
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const user = await clerkClient.users.getUser(userId);
  if (user.publicMetadata?.role !== 'admin') return res.status(403).json(...);
  req.clerkUserId = userId;
  next();
};
```

Helper: `checkIsAdmin(userId): Promise<boolean>` per usi puntuali dentro un controller.

### Punti di attenzione

- **`clerkMiddleware()` globale**: applicato prima del mount `/api/*`, dopo `/webhooks` e prima di `express.json`. Senza questo, `requireAuth()` e `getAuth(req)` non avrebbero la sessione iniettata.
- **`requireAdmin` chiama Clerk per ogni richiesta**: nessuna cache di `publicMetadata`. Su rotte admin chiamate spesso è un costo (latenza + rate limit). Da valutare una cache.
- **Errori opachi**: `requireAdmin` ritorna 403 anche se Clerk è irraggiungibile. Per debug serve guardare i log server.

## 5. API key (`COWORK_API_KEY`)

`server/src/middleware/apiKeyAuth.ts`:

```ts
export const authenticateApiKey = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'API key required' });
  if (token !== process.env.COWORK_API_KEY) return res.status(403).json(...);
  next();
};
```

Usata su:

- `POST /api/contents/import` (Cowork CLI pubblica articoli).
- Submission trace Bartleby da agenti esterni.

Il segreto è una stringa statica: chi lo possiede è di fatto admin per quegli endpoint. Generare con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e tenere fuori dal repo.

## 6. Webhook Lemon Squeezy

`server/src/routes/webhooks.ts` (`POST /webhooks/lemonsqueezy`):

1. Body raccolto raw da middleware locale (`req.on('data')` / `req.on('end')`) — la route è montata **prima** di `express.json()`.
2. Calcolo `HMAC-SHA256(rawBody, LEMONSQUEEZY_WEBHOOK_SECRET)`.
3. Confronto con header `x-signature`. Mismatch → `403`.
4. Su event `subscription_*` con `clerk_user_id` in `meta.custom_data`:
   - `findOneAndUpdate({ clerkUserId }, { $set: {...} }, { upsert: true })` su `UserSubscription`.

Il binding Clerk ↔ Lemon Squeezy passa per `meta.custom_data.clerk_user_id`, impostato lato checkout dal FE.

## 7. Residui legacy

`server/src/middleware/auth.ts` e `server/src/routes/auth.ts` implementano il vecchio login JWT (`POST /api/login`, `POST /api/logout`) basato su `jsonwebtoken` + `JWT_SECRET`. La route è ancora montata in `index.ts` ma:

- Nessun file in `client/src/` chiama `/api/login`, `/api/logout` o importa un `authService` JWT.
- L'unico altro consumatore di `authenticateToken` è `routes/auth.ts` stesso (per il logout).

→ **dead code** dal punto di vista dell'app. `JWT_SECRET` è ancora in `.env.example` ma non è necessario.

:::note Cleanup futuro
Rimuovere `routes/auth.ts`, `controllers/authController.ts`, `middleware/auth.ts`, `types/index.ts → JwtPayload`, `JWT_SECRET` dall'env, dependency `jsonwebtoken` da `server/package.json`.
:::
