---
title: Subscriptions (Lemon Squeezy)
sidebar_position: 5
---

# Modulo Subscriptions

Scheda funzionale dell'**integrazione con Lemon Squeezy**: piani, checkout, portale cliente, cambio piano, sync e webhook. È il backend del modulo [Account](./account.md) e del paywall del modulo [Contenuti](./contenuti.md).

## 1. Scopo

- Mappare l'identità Clerk a un abbonamento Lemon Squeezy.
- Esporre lo stato dell'abbonamento al FE (`/api/subscriptions/status`).
- Avviare un checkout pre-compilato per un piano (`/checkout`).
- Permettere all'utente di accedere al **portale cliente** Lemon Squeezy (`/portal`).
- Cambiare piano sull'abbonamento attivo (`/change-plan`).
- Riconciliare lo stato in caso di webhook in ritardo (`/sync`).
- Aggiornare il DB on-event tramite il **webhook firmato** Lemon Squeezy.

## 2. Responsabilità

- Tradurre `plan ↔ variantId` Lemon Squeezy (mappa via env).
- Persistere `UserSubscription` con `clerkUserId` come chiave logica.
- Gestire i 5 eventi LS riconosciuti: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`.
- Verificare la firma `x-signature` HMAC SHA256 di tutti i webhook.
- Pre-compilare il checkout con email + nome utente recuperati da Clerk.

## 3. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/UserSubscription.ts` | Schema Mongoose |
| `server/src/routes/subscriptions.ts` | 5 rotte sotto `/api/subscriptions` |
| `server/src/routes/webhooks.ts` | `POST /webhooks/lemonsqueezy` con verifica HMAC |
| `server/src/controllers/subscriptionController.ts` | `getStatus`, `createCheckout`, `getPortalUrl`, `syncSubscription`, `changePlan` + helpers `planToVariantId`, `variantToPlan` |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/services/subscriptionService.ts` | Wrapper fetch (5 metodi) |
| `client/src/context/SubscriptionContext.tsx` | Provider stato + boolean derivati |
| `client/src/hooks/useSubscription.ts` | Re-export del context |
| `client/src/pages/Account.tsx` | Pagina account (vedi modulo [Account](./account.md)) |
| `client/src/pages/Pricing.tsx` | Listino piani + checkout + post-return polling |

## 4. Rotte

### REST `/api/subscriptions/*`

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET`  | `/api/subscriptions/status` | `requireAuth` | Stato corrente: `{ status, plan, currentPeriodEnd }` |
| `POST` | `/api/subscriptions/checkout` | `requireAuth` | Crea checkout LS, ritorna `{ checkoutUrl }` |
| `POST` | `/api/subscriptions/portal` | `requireAuth` | Recupera customer portal, ritorna `{ portalUrl }` |
| `POST` | `/api/subscriptions/change-plan` | `requireAuth` | Cambia variant via PATCH LS, aggiorna DB |
| `POST` | `/api/subscriptions/sync` | `requireAuth` | Riconcilia il DB chiamando direttamente LS API by email |

### Webhook `/webhooks/lemonsqueezy`

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `POST` | `/webhooks/lemonsqueezy` | HMAC SHA256 (`x-signature`) | Handler eventi `subscription_*` |

⚠️ Il webhook è montato **prima** di `express.json()` per preservare il body grezzo (necessario alla firma). Vedi [Architettura → Backend §1](../10-architecture/backend.md#1-bootstrap).

## 5. Modello dati

### `UserSubscription`

```ts
{
  clerkUserId:      string;   // unique, chiave logica
  lsSubscriptionId: string;   // id sub LS
  lsCustomerId:     string;   // id customer LS
  lsVariantId:      string;   // id variant LS (un valore per piano)
  plan:             'none' | 'abbonato' | 'bartleby' | 'bartleby_plus';
  status:           'active' | 'on_trial' | 'paused' | 'cancelled' | 'expired' | 'past_due' | 'none';
  currentPeriodEnd: Date | null;
  createdAt, updatedAt        // timestamps
}
```

Collection: `user-subscriptions`. Indice unico su `clerkUserId`.

### Mappa plan ↔ variant

`subscriptionController.ts` usa tre env per la mappa:

```ts
LEMONSQUEEZY_VARIANT_ABBONATO     → plan 'abbonato'
LEMONSQUEEZY_VARIANT_BARTLEBY     → plan 'bartleby'
LEMONSQUEEZY_VARIANT_BARTLEBY_PLUS → plan 'bartleby_plus'
```

Helper esportati: `planToVariantId(plan)` e `variantToPlan(variantId)` (usato anche dal webhook).

### Boolean derivati lato FE

`SubscriptionContext` espone:

```ts
isActive       = status === 'active' || status === 'on_trial'
isAbbonato     = isActive && plan ∈ {abbonato, bartleby, bartleby_plus}
isBartleby     = isActive && plan ∈ {bartleby, bartleby_plus}
isBartlebyPlus = isActive && plan === 'bartleby_plus'
```

## 6. Flussi

### 6.1 Primo acquisto

```
Utente loggato su /pricing
  ↓ click "Inizia ora" sul piano X
FE: createCheckout(token, X)
  ↓ POST /api/subscriptions/checkout { plan: X }
BE: getAuth → userId
    Clerk users.getUser(userId) → email + nome
    LS POST /v1/checkouts:
      - relationships.variant = LEMONSQUEEZY_VARIANT_<X>
      - checkout_data.email/name = pre-compilati
      - checkout_data.custom.clerk_user_id = userId   ← LINK!
      - product_options.redirect_url = $CORS_ORIGIN/pricing?checkout=success
    → ritorna checkoutUrl
FE: window.location.href = checkoutUrl
  ↓
Lemon Squeezy hosted checkout (Stripe/PayPal)
  ↓ pagamento
LS → /webhooks/lemonsqueezy (event: subscription_created)
  ↓ verifica HMAC
BE: estrae meta.custom_data.clerk_user_id
    findOneAndUpdate({ clerkUserId }, { ...attrs }, { upsert: true })
LS → redirect FE su /pricing?checkout=success
  ↓
FE Pricing.tsx detecta query param → polling refresh + sync immediato
  ↓ ogni 2s, max 20 tentativi
SubscriptionContext aggiorna → isActive: true → banner "attivato!"
```

Il `clerk_user_id` in `meta.custom_data` è il **gancio** che lega il customer LS all'utente Clerk. Senza quello il webhook non sa a chi attribuire la subscription.

### 6.2 Webhook (event handler)

`POST /webhooks/lemonsqueezy`:

1. Raccoglie body raw (`req.on('data')/end`).
2. Calcola `HMAC-SHA256(rawBody, LEMONSQUEEZY_WEBHOOK_SECRET)`. Mismatch con `x-signature` → 403.
3. Estrae `event_name`, `meta.custom_data.clerk_user_id`, `data.id`, `attributes`.
4. Se `event_name ∈ {created, updated, cancelled, expired, payment_success}` E `clerkUserId` presente:
   - Calcola `plan = isActive(newStatus) ? variantToPlan(variantId) : 'none'`.
   - `findOneAndUpdate` upsert `UserSubscription`.
5. Risponde sempre `200` (anche su evento ignoto, per non far ritentare LS).

### 6.3 Cambio piano

```
Utente su /account → click "Cambia" su piano Y
FE: changePlan(token, Y)
  ↓ POST /api/subscriptions/change-plan { plan: Y }
BE: planToVariantId(Y) → variantId
    UserSubscription.findOne(clerkUserId) → sub.lsSubscriptionId
    LS PATCH /v1/subscriptions/{lsSubscriptionId}
      attributes.variant_id = variantId
    Aggiorna UserSubscription { lsVariantId, plan, status }
FE: refresh() → context aggiornato → banner "aggiornato!"
```

Il webhook arriva comunque (eventi `subscription_updated`) e ri-aggiorna i campi: idempotente.

### 6.4 Sync (riconciliazione)

```
FE Pricing detecta ?checkout=success → fa subito syncSubscription (oltre al polling)
BE: getAuth → userId → email da Clerk
    LS GET /v1/subscriptions?filter[user_email]=...
    Sceglie la sub attiva (o la prima)
    findOneAndUpdate upsert
    Risponde con { status, plan, currentPeriodEnd }
```

Serve come **fallback** quando il webhook è in ritardo (Lemon Squeezy può accodare con latenza). Senza sync, il polling di Pricing potrebbe arrivare al timeout (40s) prima di vedere `isActive`.

### 6.5 Portale

```
Utente click "Gestisci abbonamento"
FE: getPortalUrl(token)
BE: UserSubscription.findOne(clerkUserId) → sub.lsCustomerId
    LS GET /v1/customers/{lsCustomerId}
    Estrae attributes.urls.customer_portal
    → ritorna portalUrl
FE: window.open(portalUrl)
```

## 7. Dipendenze

- **Clerk**: identità (`getAuth`, `clerkClient.users.getUser`).
- **MongoDB** (`user-subscriptions`).
- **Lemon Squeezy API** v1 (`api.lemonsqueezy.com`).
- **Webhook** registrato sul pannello Lemon Squeezy con URL `https://<railway>/webhooks/lemonsqueezy` e signing secret = `LEMONSQUEEZY_WEBHOOK_SECRET`.

## 8. Criticità note

- **Bind via `clerk_user_id` in `meta.custom_data`**: se il FE dimentica di passarlo nel checkout, il webhook **scarta** l'evento (manca `clerkUserId`). L'utente paga ma il piano non si attiva. Mitigato dal `/sync` di fallback ma vale la pena verificare in test che la riga `checkout_data.custom.clerk_user_id` sia sempre presente.
- **Idempotenza webhook**: `findOneAndUpdate` con upsert è idempotente. OK su retry. Ma niente lock: se due webhook concorrenti per la stessa sub arrivano insieme l'ordine di scrittura non è garantito.
- **Polling Pricing fragile**: 20 tentativi × 2s = 40s. Se LS è in ritardo oltre questa soglia, l'utente vede "verifica in corso" troncato. Il `/sync` mitiga ma non risolve sempre (se l'evento LS non è ancora stato registrato lato LS, il sync trova `[]`).
- **Nessun audit trail**: i cambi piano non sono loggati su `WorkflowLog`. Il `console.log` lato server è l'unica traccia.
- **Cambio piano richiede `lsSubscriptionId`**: se uno user ha solo una sub `cancelled`/`expired`, `change-plan` ritorna 404. Il flusso corretto è ri-checkout, ma la UI di Account non lo gestisce esplicitamente — solo il banner "Vedi i piani".
- **Mappa plan ↔ variant via env**: aggiungere un piano nuovo richiede 4 modifiche coordinate (env BE, mappa controller, `PLAN_OPTIONS` Account, `PLANS` Pricing).

## 9. Test

Nessun test automatico. Verifiche manuali:

- Webhook con firma errata → 403.
- Webhook con `event_name` sconosciuto → 200 (ignorato).
- Acquisto end-to-end con LS in modalità test mode.
- Cambio piano fra abbonato e bartleby (quando attivo).
- Cancellazione dal portale → ricezione `subscription_cancelled` → DB aggiornato.
