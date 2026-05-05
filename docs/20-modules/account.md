---
title: Account utente
sidebar_position: 4
---

# Modulo Account utente

Scheda funzionale della **pagina account** (`/account`). È la pagina-ombelico per l'utente loggato: profilo Clerk + gestione abbonamento Lemon Squeezy. Per le primitive di pagamento e webhook si rimanda al modulo [Subscriptions](./subscriptions.md).

## 1. Scopo

Permettere all'utente loggato di:

- Vedere il proprio profilo Clerk (avatar via `<UserButton>`, nome, email).
- Vedere lo stato del proprio abbonamento (piano, status, data di rinnovo).
- Aprire il portale di gestione Lemon Squeezy (cambio carta, cancellazione).
- Cambiare piano direttamente dalla pagina (con conferma).

## 2. Responsabilità

- Renderizzare profilo Clerk e stato abbonamento.
- Mostrare la sezione abbonamento solo se `!isTestMode` (in test si nasconde tutto il blocco).
- Discriminare le azioni in base allo stato (`isActive`, `plan`, `status`):
  - **Attivo**: pulsante "Gestisci abbonamento" + lista cambio piano.
  - **Non attivo**: messaggio + CTA `/pricing`.
- Eseguire il cambio piano via `POST /api/subscriptions/change-plan` con conferma inline.
- Gestire feedback (`error`, `successMsg`).

## 3. File coinvolti

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/pages/Account.tsx` | Pagina `/account` |
| `client/src/services/subscriptionService.ts` | `getPortalUrl`, `changePlan`, `getSubscriptionStatus`, `syncSubscription`, `createCheckout` |
| `client/src/hooks/useSubscription.ts` | Re-export di `useSubscription` da `SubscriptionContext` |
| `client/src/context/SubscriptionContext.tsx` | Provider stato abbonamento |

### Backend

Vedi modulo [Subscriptions](./subscriptions.md). La pagina account chiama solo:

- `GET /api/subscriptions/status` (via `SubscriptionProvider`)
- `POST /api/subscriptions/portal`
- `POST /api/subscriptions/change-plan`

## 4. Componenti UI

### Profilo

```
┌──────────────────────────────────────┐
│ Profilo                              │
│ [avatar UserButton] Mario Rossi      │
│                     mario@example.it │
└──────────────────────────────────────┘
```

`<UserButton>` di Clerk: cliccandolo apre il menu Clerk (sign-out, security, ecc.).

### Abbonamento — utente attivo

```
┌──────────────────────────────────────┐
│ Abbonamento                          │
│ Bartleby+   [Attivo]                 │
│ Rinnovo il 12/06/2026                │
│                                      │
│ [Gestisci abbonamento]               │
│ Modifica metodo di pagamento o…      │
│                                      │
│ Cambia piano                         │
│  ─ Abbonato        €5/mese  [Cambia] │
│  ─ Bartleby        €12/m   [Cambia] │
│  ─ Bartleby+       €24/m   [Attuale]│
└──────────────────────────────────────┘
```

### Abbonamento — utente non attivo

```
┌──────────────────────────────────────┐
│ Abbonamento                          │
│ Non hai un abbonamento attivo.       │
│ Stato precedente: Cancellato.        │
│                                      │
│ [Vedi i piani]                       │
└──────────────────────────────────────┘
```

In modalità test l'intero blocco "Abbonamento" è nascosto.

## 5. Flussi

### 5.1 Caricamento

1. `useSubscription()` espone `subscription`, `isActive`, `loading`. Sotto il cofano: ha già fatto `GET /api/subscriptions/status` al login (vedi [Architettura → Stato applicativo §5](../10-architecture/stato-applicativo.md#5-subscriptionprovider)).
2. La pagina rispecchia lo stato.

### 5.2 Apertura portale Lemon Squeezy

1. Click "Gestisci abbonamento".
2. `getPortalUrl(token)` → `POST /api/subscriptions/portal` con Bearer.
3. BE chiama Lemon Squeezy `GET /v1/customers/{lsCustomerId}` e legge `attributes.urls.customer_portal`.
4. FE apre il link in nuovo tab (`window.open`).

### 5.3 Cambio piano (inline)

1. Click "Cambia" su un piano diverso → appare conferma "Confermi? [Sì] [No]".
2. Click "Sì" → `changePlan(token, plan)` → `POST /api/subscriptions/change-plan` `{ plan }`.
3. BE risolve `plan → variantId` e chiama Lemon Squeezy `PATCH /v1/subscriptions/{lsSubscriptionId}` con il nuovo `variant_id`.
4. BE aggiorna `UserSubscription` con il nuovo piano/status.
5. FE chiama `refresh()` del context → la nuova `subscription` rispecchia il cambio.
6. Banner verde "Piano aggiornato a `<nome>`." (auto-dismiss dopo 4s).

I piani con `comingSoon: true` (`bartleby`, `bartleby_plus`) sono disabilitati lato UI.

## 6. Dati

La pagina non legge/scrive direttamente dati del DB: tutto passa per gli endpoint subscriptions (vedi [Subscriptions](./subscriptions.md)).

Etichette UI:

```ts
PLAN_LABEL = { abbonato: 'Abbonato', bartleby: 'Bartleby', bartleby_plus: 'Bartleby+' };
STATUS_LABEL = {
  active: 'Attivo', on_trial: 'In prova', paused: 'In pausa',
  cancelled: 'Cancellato', expired: 'Scaduto',
  past_due: 'Pagamento in sospeso', none: '—',
};
```

`PLAN_OPTIONS` (lista cambio piano) ha `bartleby` e `bartleby_plus` con `comingSoon: true`.

## 7. Dipendenze

- **Clerk** (`useUser`, `useAuth`, `<UserButton>`): identità + token.
- **`SubscriptionContext`**: stato abbonamento + `refresh()`.
- **`SiteConfigContext`** (`isTestMode`): nasconde l'intero blocco abbonamento in modalità test.
- **`subscriptionService`**: wrapper degli endpoint.
- **Modulo [Subscriptions](./subscriptions.md)**: per la business logic.

## 8. Criticità note

- **Pagina raggiungibile anche da utenti non loggati**: oggi la route `/account` non è gated. Se l'utente non è loggato, `useUser` ritorna `user: undefined` e la pagina mostra "—" come nome/email. Esperienza non ottima ma sicura: nessuna chiamata API parte senza token. Valuta di aggiungere un `<RedirectIfNotSignedIn>` o un messaggio esplicito.
- **`comingSoon` hardcoded** sul FE: per attivare un piano bisogna toccare `Account.tsx` e `Pricing.tsx`. Alternativa: spostare i flag in `SiteConfig` o in env del FE.
- **Cambio piano sincrono**: il `POST /change-plan` aspetta la risposta Lemon Squeezy prima di rispondere al FE. Latenza variabile.

## 9. Test

Nessun test automatico. Verifiche manuali tipiche:

- Loggato senza subscription: messaggio + CTA pricing.
- Loggato attivo: badge "Attivo", portale apribile, cambio piano funzionante.
- Loggato in trial: badge "In prova".
- Test mode: blocco abbonamento invisibile.
- Errore 502 da Lemon Squeezy: messaggio "Errore cambio piano" mostrato.
