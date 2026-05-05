---
title: Stato applicativo
sidebar_position: 7
---

# Stato applicativo

L'app non usa un store globale (Redux, Zustand, Jotai, Pinia). Tutto lo stato condiviso passa per **React Context** + i custom hook esposti dai provider. Le pagine usano `useState`/`useEffect` per stato locale e i custom hook `useFetch*` per i dati remoti.

## 1. Albero dei provider

`client/src/App.tsx`:

```
ClerkProvider                       (libreria Clerk)
└── ThemeProvider (MUI) + CssBaseline
    └── BrowserRouter
        └── SiteConfigProvider     (siteStatus, isTestMode)
            └── SiteContentProvider (lang, t, refresh)
                └── SubscriptionProvider (subscription, isActive, isAbbonato, ...)
                    └── AppLayout
```

L'ordine non è arbitrario: `SubscriptionProvider` ha bisogno di `useAuth()` di Clerk per chiamare `getToken()`, quindi sta dentro `ClerkProvider`. `SiteConfigProvider` invece non dipende da Clerk e potrebbe stare fuori — è dentro per simmetria.

## 2. `ClerkProvider`

Provider esterno (libreria `@clerk/clerk-react`). Espone:

- `useUser()` — sessione + profilo Clerk (`user.publicMetadata.role`).
- `useAuth()` — `isSignedIn`, `getToken()` per il JWT da inviare al backend.
- Componenti `<SignIn />`, `<UserButton />`, ecc. (usati in pagine specifiche).

Gating admin lato FE: `AdminRoute` in `App.tsx` controlla `user?.publicMetadata?.role === 'admin'` (vedi [Autenticazione §3](./autenticazione.md#3-frontend-clerkprovider-e-hook)).

## 3. `SiteConfigProvider`

`client/src/context/SiteConfigContext.tsx`. Modalità globale del sito.

```ts
interface SiteConfigContextValue {
  siteStatus: 'test' | 'live';
  isTestMode: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}
```

- Fetch all'init: `getSiteConfig()` → `GET /api/site-config`.
- Fallback su errore: rimane `'test'` (modalità più permissiva).
- Hook: `useSiteConfig()`.

Le pagine consumano `isTestMode` per mostrare/nascondere feature flag e contenuti in lavorazione.

## 4. `SiteContentProvider`

`client/src/context/SiteContentContext.tsx`. i18n con override DB.

```ts
interface SiteContentContextValue {
  lang:    'it' | 'en' | ...;
  setLang: (lang) => void;
  t:       (key: string, fallback?: string) => string;
  loading: boolean;
  refresh: () => Promise<void>;
}
```

### Strategia di lookup di `t(key)`

1. **Override DB** per la lingua corrente (caricato da `GET /api/site-content`, modificabile dall'admin).
2. **Default JSON bundled** in `public/locales/{lang}/common.json` (caricato via `fetch('/locales/...')`).
3. **Fallback** passato come secondo argomento, oppure la chiave stessa.

### Cache

- `localStorage`, key `siteContent_v1`, TTL **1 ora**.
- All'init carica subito da cache se fresca, e fa un refresh in background.
- Se la cache è scaduta o assente: aspetta il fetch.
- In caso di errore di rete: tiene i default JSON e l'eventuale cache vecchia.

Hook esposti:
- `useT()` — solo la funzione `t`.
- `useSiteContent()` — accesso completo.

## 5. `SubscriptionProvider`

`client/src/context/SubscriptionContext.tsx`. Stato dell'abbonamento Lemon Squeezy dell'utente loggato.

```ts
interface SubscriptionContextValue {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  isActive:        boolean;     // status === 'active' || 'on_trial'
  isAbbonato:      boolean;     // isActive && plan ∈ {abbonato, bartleby, bartleby_plus}
  isBartleby:      boolean;     // isActive && plan ∈ {bartleby, bartleby_plus}
  isBartlebyPlus:  boolean;     // isActive && plan === 'bartleby_plus'
  refresh: () => Promise<void>;
}
```

### Comportamento

- Scatta solo se `isSignedIn === true` (Clerk).
- Su login: chiama `getSubscriptionStatus(token)` → `GET /api/subscriptions/me`.
- Su logout: `setSubscription(null)`.
- Hook: `useSubscription()`.

I tre boolean `isAbbonato/isBartleby/isBartlebyPlus` sono i derivati pratici usati nei gating UX (es. nascondere il pulsante "Acquista" se già abbonato, mostrare le feature Bartleby Plus).

## 6. Stato non globale

Tutto il resto dello stato è locale. Pattern ricorrenti:

- **Custom hook `useFetch*`** in `client/src/hooks/` per fetch + loading + error per pagina/componente. Esempio: `useFetchContent(slug)` ritorna `{ data, loading, error }`.
- **`useState`/`useReducer`** per form e UI.
- **URL come stato** dove possibile (es. tab attiva nei viewer pipeline è derivata da `useParams`).

## 7. Persistenza lato client

| Chiave localStorage | Scritta da | TTL |
|---------------------|------------|-----|
| `siteContent_v1` | `SiteContentContext` | 1h (controllato da `CACHE_TTL_MS`) |
| (chiavi Clerk, prefisso `__clerk_*`) | libreria Clerk | gestito da Clerk |

Niente sessionStorage applicativo. Niente cookie applicativi (Clerk gestisce i suoi).

## 8. Quando aggiungere un nuovo provider vs un hook locale

Regola pratica usata finora:

- **Provider** se lo stato è **globale** (cioè tre o più componenti non imparentati lo leggono o lo modificano) **e** ha un fetch iniziale o un'identità persistente. Esempi: subscription, site config.
- **Custom hook** se lo stato è derivato da un'API e usato in **una pagina o famiglia di pagine**. Esempi: `useFetchContent`, `useFetchNavigation`.
- **`useState` locale** se lo stato vive solo nel componente.

Aggiungere un quarto context senza un caso d'uso chiaro porta a re-render e dipendenze incrociate. Quando uno stato locale "diventa globale", spesso conviene prima passarlo via prop drilling per uno o due livelli e promuoverlo a context solo se diventa scomodo.
