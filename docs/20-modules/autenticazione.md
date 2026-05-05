---
title: Autenticazione
sidebar_position: 1
---

# Modulo Autenticazione

Scheda funzionale del modulo di **autenticazione e autorizzazione**. Per la vista architetturale (middleware, ordine di mount, internals di Clerk) si rimanda a [Architettura → Autenticazione](../10-architecture/autenticazione.md).

## 1. Scopo

Permettere a un utente di:

- Registrarsi e accedere al sito con un'identità Clerk.
- Vedere il proprio stato (loggato/anonimo, ruolo, piano abbonamento) nella nav.
- Accedere a contenuti gated (`free`/`plus`) e funzionalità admin in base a credenziali e ruolo.

L'autenticazione è realizzata interamente da **Clerk** sul lato client e dal middleware `@clerk/express` sul lato server. Il modulo include anche un canale **API key** per automazioni esterne e un firmaggio **HMAC SHA256** per il webhook Lemon Squeezy.

## 2. Responsabilità

- Gestire registrazione, login, logout (delegati a Clerk).
- Esporre lo stato `isSignedIn` / `user` ai consumer FE.
- Esporre il ruolo admin (`publicMetadata.role`) per gating UX (`AdminRoute`, `useIsAdmin`).
- Tradurre la sessione Clerk in `Authorization: Bearer <token>` per le chiamate API protette.
- Validare le richieste sul backend: `requireAuth`, `requireAdmin`, `optionalClerkAuth`, `authenticateApiKey`.
- Verificare la firma del webhook Lemon Squeezy.

## 3. File coinvolti

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/App.tsx` | `<ClerkProvider>` + `<AdminRoute>` |
| `client/src/components/UserNav.tsx` | Bottoni `SignIn` / `UserButton` + badge piano |
| `client/src/components/AdminLayout.tsx` | Layout pagine `/admin/*` |
| `client/src/hooks/useIsAdmin.ts` | Hook helper `isAdmin` |
| `client/src/services/apiClient.ts` | Helper `apiRequest(endpoint, { token })` |

### Backend

| File | Ruolo |
|------|-------|
| `server/src/index.ts` | Mount `clerkMiddleware()` globale |
| `server/src/middleware/clerkAuth.ts` | `authenticateClerk`, `optionalClerkAuth`, `requireAdmin`, `checkIsAdmin` |
| `server/src/middleware/apiKeyAuth.ts` | `authenticateApiKey` (Bearer `COWORK_API_KEY`) |
| `server/src/routes/webhooks.ts` | Verifica HMAC del webhook Lemon Squeezy |
| `server/src/middleware/auth.ts` | **Legacy JWT — dead code** |
| `server/src/routes/auth.ts` | **Legacy login `admin/admin` — dead code** |
| `server/src/controllers/authController.ts` | **Legacy — dead code** |

## 4. Componenti UI

`UserNav` (in `Navigation`):

- **Anonimo**: link "Prezzi" + bottone "Accedi" (`SignInButton mode="modal"`).
- **Loggato**: opzionale badge piano (es. "Bartleby+", verde) → link `/account`. Eventuale link "Abbonati" se non attivo e non admin e non in `isTestMode`. `UserButton` di Clerk con menu personalizzato (voce "Il mio account", voce "Abbonati" condizionale).

`AdminRoute` (in `App.tsx`): wrapper di tutte le `/admin/*`. Mostra spinner mentre Clerk carica, messaggio "Accesso riservato agli amministratori" se non admin, altrimenti `<AdminLayout>` con `<AdminSuspense>`.

## 5. Flussi

### 5.1 Login

1. Utente clicca "Accedi" su `UserNav` → `SignInButton` apre il modale Clerk.
2. Clerk autentica e popola la sessione (cookie + JWT).
3. `useUser()` ritorna `isSignedIn: true`. `SubscriptionProvider` scatta e chiama `GET /api/subscriptions/status` con il token Clerk.
4. La nav si aggiorna mostrando `UserButton` ed eventuale badge piano.

### 5.2 Logout

1. Utente apre `UserButton` → "Sign out".
2. Clerk pulisce la sessione. `afterSignOutUrl="/"` riporta in home.
3. `SubscriptionProvider` reagisce a `isSignedIn: false` e setta `subscription: null`.

### 5.3 Gating admin (FE)

1. Utente naviga su `/admin/...`.
2. `AdminRoute` controlla `useUser()`. Se non `isLoaded` → spinner.
3. Se `!isSignedIn` o `user.publicMetadata.role !== 'admin'` → messaggio di refuso.
4. Altrimenti monta `AdminLayout` + lazy-loaded admin page.

L'hook `useIsAdmin()` è una versione "boolean only" usabile dentro componenti senza wrapper.

### 5.4 Gating admin (BE)

Tutte le rotte `/api/admin/*` (e altre puntuali come `POST /api/contents` o `PUT /api/site-config`) montano la coppia `[authenticateClerk, requireAdmin]`. `requireAdmin` chiama `clerkClient.users.getUser(userId)` per leggere `publicMetadata.role`. **Nessuna cache**: una rotta admin chiamata 100 volte fa 100 chiamate Clerk.

### 5.5 Gating contenuto plus

1. Utente naviga su `/blog/articolo-plus`.
2. FE chiama `GET /api/contents/:slug` con (o senza) token Clerk.
3. `optionalClerkAuth` setta `req.clerkUserId` se presente.
4. Il controller legge il `Content` dal DB e, se `accessType === 'plus'`, verifica `UserSubscription` per `clerkUserId`. Se non `isAbbonato`, ritorna teaser + flag paywall.

Vedi [Architettura → Autenticazione §2](../10-architecture/autenticazione.md#2-flusso-login--contenuto-plus) per il diagramma completo.

### 5.6 Automazione esterna (API key)

`POST /api/contents/import` accetta `Authorization: Bearer <COWORK_API_KEY>` (verificato da `authenticateApiKey`). Permette al worker `local/coworker.ts` di pubblicare articoli generati da Cowork senza una sessione Clerk. Vedi [Local — ponte Cowork §2.1](../10-architecture/local-cowork-bridge.md#21-generazione-articoli-del-blog).

## 6. Dati

Il modulo non ha collezioni proprie: tutti i dati identità vivono in **Clerk** (gestita esternamente). Sul lato app ci sono:

- `UserSubscription` (collection `user-subscriptions`): chiave logica `clerkUserId`. Vedi modulo [Subscriptions](./subscriptions.md).
- Sessione Clerk: cookie HttpOnly + JWT generato on-demand via `getToken()`.

## 7. Dipendenze

- **Clerk** (esterno): identità + sessione.
- **MongoDB** (`UserSubscription`): per derivare lo stato plus.
- **`SubscriptionContext`**: consuma `getToken()` di Clerk per chiamare `/api/subscriptions/status`.
- **`SiteConfigContext`** (`isTestMode`): nasconde i CTA "Abbonati" in modalità test.

## 8. Criticità note

- **`requireAdmin` è chatty**: chiama Clerk a ogni richiesta admin. Non c'è cache. Per dashboard con molte chiamate consecutive può essere un costo. Mitigazione futura: caching `clerkUserId → role` con TTL breve.
- **Dead code legacy**: `routes/auth.ts`, `middleware/auth.ts`, `controllers/authController.ts` espongono ancora `POST /api/login` e `POST /api/logout` su `JWT_SECRET`. Le credenziali in `authController.ts` sono `admin/admin` in chiaro con un commento "TODO: in produzione usare bcrypt". **Pulire**: nessun consumatore FE lo chiama. Vedi [Architettura → Autenticazione §7](../10-architecture/autenticazione.md#residui-legacy).
- **API key statica** (`COWORK_API_KEY`): chi la possiede ha de facto i privilegi di `/api/contents/import`. Da ruotare se cambia il consumatore.
- **`AdminRoute` solo lato client**: il check è UX. La sicurezza vera è data da `requireAdmin` lato server. Una manomissione client non aggira l'autorizzazione.

## 9. Test

Nessun test automatico dedicato al modulo. La verifica avviene per integrazione manuale (login/logout, accesso `/admin`, tentativo non-admin). Da considerare in futuro:

- Smoke test BE: tentativo `GET /api/admin/letture` senza token → 401; con token user normale → 403; con token admin → 200.
- Smoke test FE: render `AdminRoute` con stub `useUser()` ritornante role admin / non-admin.
