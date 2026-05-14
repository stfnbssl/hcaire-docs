---
title: Stato applicativo
sidebar_position: 7
---

# Stato applicativo

L'app non usa uno store globale (Redux, Zustand, Jotai). Stato condiviso via **React Context** + custom hook esposti dai provider. Per fetch e cache lato server, **TanStack React Query**. Per stato locale, `useState`/`useEffect`.

## 1. Albero dei provider

`client/src/App.tsx`:

```
ClerkProvider                       (libreria Clerk)
└── ThemeProvider (MUI) + CssBaseline
    └── QueryClientProvider (TanStack React Query)
        └── BrowserRouter
            └── SiteConfigProvider     (siteStatus, isTestMode)
                └── SiteContentProvider (lang, t, refresh)
                    └── SubscriptionProvider (subscription, isActive, isAbbonato, ...)
                        └── AppLayout
```

L'ordine non è arbitrario: `SubscriptionProvider` ha bisogno di `useAuth()` di Clerk per chiamare `getToken()`, quindi sta dentro `ClerkProvider`. `QueryClientProvider` deve essere ovunque sia usato un hook di React Query.

## 2. `ClerkProvider`

Provider esterno (libreria `@clerk/clerk-react`). Espone:

- `useUser()` — sessione + profilo (`user.publicMetadata.role`).
- `useAuth()` — `isSignedIn`, `getToken()` per il JWT da inviare al backend.
- Componenti `<SignIn />`, `<UserButton />`, ecc.

Gating admin FE: `AdminRoute` in `App.tsx` controlla `user?.publicMetadata?.role === 'admin'`. Vedi [Autenticazione](./autenticazione.md).

## 3. `QueryClientProvider` (TanStack React Query)

Cache fetch + mutation. Usato dagli hook che fanno chiamate API:

- `useFetchContent`, `useFetchNavigation` — query con stale-time.
- `usePipelineOrchestration` — gestisce mutation per `run`/`cancel`/`verify`/`skip`/`reset` + invalidation della query dell'index.

Configurazione: default React Query (no retry config custom rilevante).

## 4. `SiteConfigProvider`

`client/src/context/SiteConfigContext.tsx`. Modalità globale del sito.

```ts
interface SiteConfigContextValue {
  siteStatus: 'test' | 'production';
  isTestMode: boolean;
  maintenanceMode: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}
```

- Fetch all'init: `getSiteConfig()` → `GET /api/site-config`.
- Fallback su errore: rimane `'test'` (modalità più permissiva).
- Hook: `useSiteConfig()`.

Le pagine consumano `isTestMode` per feature flag e contenuti in lavorazione, `maintenanceMode` per mostrare banner globali.

## 5. `SiteContentProvider`

`client/src/context/SiteContentContext.tsx`. Contenuti editabili slug-based + i18n.

```ts
interface SiteContentContextValue {
  contents: SiteContent[];
  getContent: (slug: string) => SiteContent | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
}
```

### Cache

- `localStorage`, TTL **1 ora**.
- All'init carica subito da cache se fresca, refresh in background.
- Se cache scaduta o assente: aspetta il fetch.
- In caso di errore di rete: tiene i default e l'eventuale cache vecchia.

Hook: `useSiteContent()`. Usato in pagine come `MetodoPage`, `HcairePage`, `SviluppoBambinoPage`, Footer, Disclaimer, Cookies.

## 6. `SubscriptionProvider`

`client/src/context/SubscriptionContext.tsx`. Stato dell'abbonamento Lemon Squeezy dell'utente loggato.

```ts
interface SubscriptionContextValue {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  isActive:        boolean;   // status === 'active' || 'on_trial'
  isAbbonato:      boolean;   // isActive && plan ∈ {abbonato, bartleby, bartleby_plus}
  isBartleby:      boolean;   // isActive && plan ∈ {bartleby, bartleby_plus}
  isBartlebyPlus:  boolean;   // isActive && plan === 'bartleby_plus'
  refresh: () => Promise<void>;
}
```

### Comportamento

- Scatta solo se `isSignedIn === true`.
- Su login: `getSubscriptionStatus(token)` → `GET /api/subscriptions/status`.
- Su logout: `setSubscription(null)`.
- Hook: `useSubscription()`.

I derivati `isAbbonato/isBartleby/isBartlebyPlus` sono i flag pratici per gating UX (pulsante "Acquista" se non abbonato, sezioni Bartleby Plus, ecc.).

## 7. Stato non globale

Pattern ricorrenti per stato locale:

- **Custom hook `useFetch*`** in `client/src/hooks/` per fetch + loading + error per pagina. Esempi: `useFetchContent(slug)`, `useFetchNavigation()`.
- **`usePipelineOrchestration`** — state machine per gestione step pipeline (selezione step, esecuzione, decisione umana, input esterni, refetch del context).
- **`useExecutionLogs`** — apre `EventSource` su `/api/pipeline/executions/:id/logs`; chiude e cleanup automatico sull'unmount.
- **`useState`/`useReducer`** per form e UI.
- **URL come stato** dove possibile (es. tab attiva derivata da `useParams`, query string per filtri admin).

## 8. Persistenza lato client

| Chiave localStorage | Scritta da | TTL |
|---------------------|------------|-----|
| `siteContent_v1` (e simili) | `SiteContentContext` | 1 h |
| (chiavi Clerk, prefisso `__clerk_*`) | libreria Clerk | gestito da Clerk |

Niente sessionStorage applicativo. Niente cookie applicativi (Clerk gestisce i suoi).

## 9. Quando aggiungere un nuovo provider vs un hook locale

Regola pratica:

- **Provider** se lo stato è **globale** (tre o più componenti non imparentati lo leggono/modificano) **e** ha un fetch iniziale o identità persistente. Esempi: subscription, site config.
- **Custom hook** se lo stato è derivato da un'API e usato in una pagina o famiglia di pagine. Esempi: `useFetchContent`, `useFetchNavigation`, `usePipelineOrchestration`.
- **`useState` locale** se lo stato vive solo nel componente.

Aggiungere un quarto context senza un caso d'uso chiaro porta a re-render e dipendenze incrociate. Quando uno stato locale "diventa globale", conviene prima passarlo via prop drilling per uno o due livelli e promuoverlo a context solo se diventa scomodo.
