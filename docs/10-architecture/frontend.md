---
title: Frontend
sidebar_position: 2
---

# Frontend

Architettura della SPA `client/`. Riferimento principale: `client/src/App.tsx` e `client/src/main.tsx`.

## 1. Bootstrap

`client/src/main.tsx` monta l'app dentro `<React.StrictMode>` e importa il bundle CSS Tailwind:

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`App.tsx` compone i provider in quest'ordine — significativo perché i provider interni dipendono dalla sessione Clerk:

```
ClerkProvider                       (publishableKey da VITE_CLERK_PUBLISHABLE_KEY)
└── ThemeProvider (MUI) + CssBaseline
    └── QueryClientProvider (TanStack React Query)
        └── BrowserRouter
            └── SiteConfigProvider     (siteStatus 'test' | 'production' da /api/site-config)
                └── SiteContentProvider (i18n con cache localStorage 1 h)
                    └── SubscriptionProvider (status + plan, richiede getToken Clerk)
                        └── AppLayout
```

Vedi [Stato applicativo](./stato-applicativo.md) per il dettaglio dei context provider.

## 2. Layout principale

```
<Navigation />
<Routes> ... </Routes>     ← tutte le route dell'app
<Footer />
<BartlebyNotifier />        ← componente di sistema sempre montato (notifiche traces)
```

`Navigation` e `Footer` sono globali. Le route admin vengono renderizzate dentro `<AdminLayout>` da `AdminRoute`.

## 3. Routing

`react-router-dom` 6.x con `BrowserRouter`. Vedi [Routing](./routing.md) per la mappa completa. Punti di forma:

- **Catch-all 404** in fondo (`<Route path="*" element={<NotFound />} />`).
- **Redirect storici** dichiarativi per ex-path Sviluppo Bambino → Metodo (didattica e fasi promosse a top-level).
- **Gating admin** via componente `AdminRoute` (vedi §5).

## 4. Lazy loading

Pagine pesanti o ad accesso ristretto importate con `React.lazy()`:

| Categoria | Pagine lazy |
|-----------|-------------|
| Admin | `AdminDashboard`, `AdminRequests`, `AdminLetture*`, `AdminSiteConfig`, `AdminSiteContent`, `AdminServices`, `AdminSkills`, `AdminPlugins`, `AdminJobDefinitions`, `AdminJobs`, `AdminAssi`, `AdminAssiRebuild`, `AdminAssiChapters`, `AdminAssiChapterEdit`, `AdminCatalogo`, `WorkflowLog`, `WorkInProgress` |
| Bartleby | `KnowledgeBase` |
| Letture | `LettureCriticheLanding`, `LettureLanding`, `LetturaDetail` |
| Corsi didattica | `CorsoFase1Page`, `CorsoFase2Page`, `CorsoFase3Page`, `DidatticaLanding` |
| Archivio | `ArchivioTemiIndexPage`, `ArchivioTemaFormPage` |

Le pagine core (`Home`, `BlogPost`, `About`, `Pricing`, `Account`, landing dei verticali) sono import statici.

## 5. Gating admin (`AdminRoute`)

Wrapper in `App.tsx`:

```tsx
function AdminRoute({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  if (!isLoaded) return <Spinner />;
  if (!isSignedIn || user?.publicMetadata?.role !== 'admin') {
    return <p>Accesso riservato agli amministratori.</p>;
  }
  return <AdminLayout><AdminSuspense>{children}</AdminSuspense></AdminLayout>;
}
```

Check **solo lato client** (UX). Le rotte `/api/admin/*` ripetono il controllo con `requireAdmin` (vedi [Autenticazione](./autenticazione.md)).

## 6. Stato globale

Provider basati su React Context + React Query (niente Redux/Zustand):

| Provider | File | Scopo |
|----------|------|-------|
| `ClerkProvider` | libreria | Sessione utente, token JWT |
| `QueryClientProvider` | TanStack React Query | Cache fetch, mutation, refetch automatico |
| `SiteConfigProvider` | `context/SiteConfigContext.tsx` | Modalità sito (`test`/`production`) — fetch `/api/site-config` |
| `SiteContentProvider` | `context/SiteContentContext.tsx` | Contenuti editabili slug-based — cache localStorage TTL 1 h |
| `SubscriptionProvider` | `context/SubscriptionContext.tsx` | Stato abbonamento (`active`/`on_trial`, `plan`) — chiama `/api/subscriptions/status` con token Clerk |

Vedi [Stato applicativo](./stato-applicativo.md) per le API.

## 7. Styling

Pattern: **Tailwind di default, MUI per componenti complessi**.

- Tailwind 3.4 con `tailwind.css` importato in `main.tsx`.
- MUI 5 con tema custom (`createTheme` in `App.tsx`): `typography.fontFamily: 'Inter, system-ui, sans-serif'`, `palette.primary.main: '#0284c7'`.
- `<CssBaseline />` MUI per reset.
- `@emotion/react` + `@emotion/styled` come engine MUI.

## 8. Markdown rendering

Per articoli e contenuti dei verticali:

- `react-markdown` 9.x.
- Plugin remark: `remark-gfm`, `remark-footnotes`.
- Plugin rehype: `rehype-raw` (HTML inline), `rehype-slug`, `rehype-autolink-headings`.
- Componenti custom mappano `h1/h2/p/ul/...` a classi Tailwind.

`gray-matter` lato server estrae frontmatter; il rendering del body è interamente client-side.

Per i capitoli degli assi strutturali esiste un renderer dedicato `StructuredChapterRenderer` che gestisce `body` markdown + `{{ref:rN}}` mapping → `references[]` + `footnotes[]` + `sections[]`.

## 9. Servizi e fetch

`client/src/services/` raccoglie 16 service. Pattern:

```ts
const API_URL = import.meta.env.VITE_API_URL;  // default http://localhost:3018/api

async function getFoo(token?: string) {
  const res = await fetch(`${API_URL}/foo`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(...);
  return res.json();
}
```

`apiClient.ts` centralizza il pattern. Token Clerk da `useAuth().getToken()` quando serve. Vedi [Autenticazione](./autenticazione.md).

Hooks dedicati per casi complessi:

- `usePipelineOrchestration` — state machine per esecuzione step pipeline (run/cancel/verify/skip/reset/decisione).
- `useExecutionLogs` — apre `EventSource` su `/api/pipeline/executions/:id/logs` per streaming SSE.
- `useFetchNavigation`, `useFetchContent` — React Query con stale-time configurato.

## 10. Build e deploy

| Comando | Cosa fa |
|---------|---------|
| `npm run dev` | Vite dev server su `:5173`, proxy `/api → :3018` |
| `npm run build` | `tsc` (type-check) + `vite build` (bundle in `dist/`) |
| `npm run preview` | Build + `wrangler dev` (Cloudflare locale) |
| `npm run deploy` | Build + `wrangler deploy` (Cloudflare Pages) |
| `npm run type-check` | `tsc --noEmit` |

`vite.config.ts` ha `@vitejs/plugin-react` e `@cloudflare/vite-plugin`. Proxy `/api` solo in dev. Vedi [Deployment](./deployment.md) per `wrangler.jsonc`.
