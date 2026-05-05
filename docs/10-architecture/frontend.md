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

`App.tsx` compone i provider in quest'ordine — l'ordine è significativo perché i provider interni dipendono dalla sessione Clerk:

```
ClerkProvider                       (publishableKey da VITE_CLERK_PUBLISHABLE_KEY)
└── ThemeProvider (MUI) + CssBaseline
    └── BrowserRouter
        └── SiteConfigProvider     (siteStatus 'test' | 'live' da /api/site-config)
            └── SiteContentProvider (i18n con cache localStorage 1h)
                └── SubscriptionProvider (status + plan, richiede getToken Clerk)
                    └── AppLayout
```

Vedi [Stato applicativo](./stato-applicativo.md) per il dettaglio dei tre context provider.

## 2. Layout principale

`AppLayout` in `App.tsx`:

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
- **Redirect storici** dichiarativi:
  - `/hcaire/ia-centrata-sull-umano` → `/hcaire/manifesto`
  - `/sviluppo-bambino/assi/*` → `/assi-strutturali/*` (4 redirect, alcuni con `useParams` per propagare `:asseSlug`/`:chapterSlug`)
- **Gating admin** via componente `AdminRoute` (vedi §5).

## 4. Lazy loading

Tutte le pagine "pesanti" o ad accesso ristretto sono importate con `React.lazy()` e wrappate in `<AdminSuspense>` (spinner Tailwind):

| Categoria | Pagine lazy |
|-----------|-------------|
| Admin | `AdminDashboard`, `AdminRequests`, `AdminLetture*`, `AdminSiteConfig`, `AdminSiteContent`, `WorkflowLog` |
| Bartleby | `KnowledgeBase` |
| Letture | `LettureCriticheLanding`, `LettureLanding`, `LetturaDetail` |
| Corsi | `CorsoFase1Page`, `CorsoFase2Page`, `CorsoFase3Page`, `PresentazioneCorsi` |

Le pagine core (`Home`, `BlogPost`, `About`, `Pricing`, `Account`, verticali HCAIRE e Sviluppo Bambino base) sono import statici.

## 5. Gating admin (`AdminRoute`)

Wrapper definito in `App.tsx`:

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

Il check è **solo lato client** (UX): le rotte protette `/api/admin/*` ripetono il controllo lato server con `requireAdmin`. Vedi [Autenticazione](./autenticazione.md).

## 6. Stato globale

Quattro provider, tutti basati su React Context (niente Redux, Zustand, ecc.):

| Provider | File | Scopo |
|----------|------|-------|
| `ClerkProvider` | (libreria) | Sessione utente, token JWT |
| `SiteConfigProvider` | `context/SiteConfigContext.tsx` | Modalità sito (`test`/`live`) — fetch da `/api/site-config` |
| `SiteContentProvider` | `context/SiteContentContext.tsx` | i18n: default JSON in `public/locales/{lang}/common.json` + overlay DB con cache localStorage TTL 1h |
| `SubscriptionProvider` | `context/SubscriptionContext.tsx` | Stato abbonamento Lemon Squeezy (`active`, `on_trial`, plan) — chiama `/api/subscriptions/me` con token Clerk |

Vedi [Stato applicativo](./stato-applicativo.md) per le API esposte.

## 7. Styling

Pattern: **Tailwind di default, MUI per componenti complessi**.

- Tailwind 3.x con `tailwind.css` importato in `main.tsx`. Classi usate ovunque per layout (`flex`, `grid`, `min-h-screen`, ecc.).
- MUI 5 con tema custom (`createTheme` in `App.tsx`):
  - `typography.fontFamily: 'Inter, system-ui, sans-serif'`
  - `palette.primary.main: '#0284c7'` (sky-600 di Tailwind)
- `<CssBaseline />` MUI applicato per reset.
- `@emotion/react` + `@emotion/styled` come engine MUI.

## 8. Markdown rendering

Per gli articoli del blog e i contenuti dei verticali:

- `react-markdown` 9.x come renderer.
- Plugin remark: `remark-gfm` (tabelle, task list), `remark-footnotes`.
- Plugin rehype: `rehype-raw` (HTML inline nel markdown — usato in alcuni contenuti HCAIRE).
- Componenti custom in più punti per applicare classi Tailwind a `h1/h2/p/ul/...`.

`gray-matter` lato server estrae il frontmatter, ma il rendering del corpo markdown è interamente client-side.

## 9. Servizi e fetch

`client/src/services/` raccoglie tutte le chiamate HTTP. Pattern ricorrente:

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

I service usano `fetch` nativo (no Axios). Il token Clerk arriva da `useAuth().getToken()` quando serve. Vedi [Autenticazione §3](./autenticazione.md).

## 10. Build e deploy

| Comando | Cosa fa |
|---------|---------|
| `npm run dev` | Vite dev server su `:5173`, proxy `/api → :3018` |
| `npm run build` | `tsc` (type-check) + `vite build` (bundle in `dist/`) |
| `npm run preview` | Build + `wrangler dev` (simula Cloudflare locale) |
| `npm run deploy` | Build + `wrangler deploy` (Cloudflare Workers SPA) |
| `npm run type-check` | `tsc --noEmit` |

`vite.config.ts` ha due plugin: `@vitejs/plugin-react` e `@cloudflare/vite-plugin`. Il proxy `/api` è dichiarato a livello Vite (solo dev), non a livello Cloudflare.

Vedi [Deployment](./deployment.md) per la configurazione `wrangler.jsonc`.
