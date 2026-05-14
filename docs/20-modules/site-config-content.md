---
title: SiteConfig & SiteContent
sidebar_position: 16
---

# Modulo SiteConfig & SiteContent

Scheda funzionale dei due meccanismi di **configurazione runtime** del sito:

- **`SiteConfig`** — singleton con flag globali (modalità test/production, maintenance, branding base).
- **`SiteContent`** — contenuti editabili slug-based (footer, disclaimer, cookies, pagine narrative dei verticali HCAIRE/Metodo/Sviluppo Bambino).

## 1. Scopo

Permettere modifiche a configurazione e testi senza redeploy. `SiteConfig` governa comportamenti globali (paywall in modalità test, banner manutenzione); `SiteContent` ospita i contenuti narrativi prima serviti dal filesystem.

## 2. `SiteConfig` (singleton)

### Modello

```ts
{
  status: 'test' | 'production';      // default 'test'
  siteTitle: string;
  siteUrl: string;
  maintenanceMode: boolean;
  updatedBy: string;                  // clerkUserId
  createdAt, updatedAt
}
```

Collection: `site_config`. Singolo documento.

### Modalità

- **`test`** (default): paywall come banner ma contenuto sempre leggibile, CTA "Abbonati" nascosti, sezione abbonamento su `/account` nascosta. Utile per testare la UX paywall senza piano attivo.
- **`production`**: paywall pieno, tutti i CTA Lemon Squeezy attivi.
- **`maintenanceMode`**: banner globale di manutenzione + eventuale lock di alcune sezioni.

### Endpoint

| Verb | Path | Auth |
|------|------|------|
| `GET` | `/api/site-config` | public (letto al boot dal `SiteConfigProvider` FE) |
| `PUT` | `/api/site-config` | `requireAdmin` |

### File

- Backend: `models/SiteConfig.ts`, `routes/siteConfig.ts`, `controllers/siteConfigController.ts`.
- Frontend: `context/SiteConfigContext.tsx`, `services/siteConfigService.ts`, `pages/AdminSiteConfig.tsx` (admin editor).

### Consumo lato FE

`useSiteConfig()`:

```ts
const { siteStatus, isTestMode, maintenanceMode, refresh } = useSiteConfig();
```

Esempi d'uso:

- `Account.tsx` nasconde la sezione abbonamento se `isTestMode`.
- `BlogPost.tsx` mostra banner sobrio se `locked && isTestMode`, altrimenti paywall ambra.
- Componente globale potrebbe mostrare un banner se `maintenanceMode`.

⚠️ **Refresh manuale**: dopo `PUT /api/site-config` il context FE non aggiorna in real-time. Serve ricaricare la pagina o esporre `refresh()` come trigger globale (oggi non c'è).

## 3. `SiteContent` (slug-based)

### Modello

```ts
{
  slug: string;          // unique, es. 'metodo/introduzione', 'footer/copyright', 'sviluppo-bambino/concetti'
  title: string;
  body: string;          // markdown
  namespace?: string;    // es. 'hcaire', 'metodo', 'sviluppo-bambino', 'footer'
  updatedBy: string;
  createdAt, updatedAt
}
```

Collection: `site_contents`. Index unique su `slug`, index su `namespace`.

### Convenzione slug

Slug gerarchici separati da `/`:

- `footer/...` — testi del footer (copyright, link, social).
- `disclaimer`, `cookies` — pagine legali.
- `metodo/...` — pagine sezione Metodo.
- `hcaire/...` — pagine sezione HCAIRE.
- `sviluppo-bambino/...` — pagine sezione SB.

Il `namespace` (opzionale) è un raggruppamento per filtri admin; lo slug stesso codifica la gerarchia.

### Endpoint

Split tra public e admin:

| Verb | Path | Auth |
|------|------|------|
| `GET` | `/api/site-content` | public (lista con filtri `namespace`, `slug`, paginazione) |
| `GET` | `/api/site-content/:slug` | public (singolo) |
| `GET` | `/api/admin/site-content` | admin (lista completa) |
| `POST` | `/api/admin/site-content` | admin (crea) |
| `PUT` | `/api/admin/site-content/:slug` | admin (aggiorna) |
| `DELETE` | `/api/admin/site-content/:slug` | admin (elimina) |

### File

- Backend: `models/SiteContent.ts`, `routes/siteContent.ts` (`siteContentPublicRouter` + `siteContentAdminRouter`), `controllers/siteContentController.ts`.
- Frontend: `context/SiteContentContext.tsx`, `services/siteContentService.ts`, `pages/AdminSiteContent.tsx`.

### Consumo lato FE

`useSiteContent()`:

```ts
const { contents, getContent, refresh } = useSiteContent();
const footer = getContent('footer/copyright');
```

Cache: `localStorage`, TTL 1 h. All'init carica subito da cache se fresca, refresh in background.

Le pagine narrative (`MetodoPage`, `HcairePage`, `SviluppoBambinoPage`) usano `getContent(slug)` come **sorgente primaria** e cadono sul fallback FS (`staticContentReader`) solo se assente.

## 4. Editor admin (`/admin/testi`)

`AdminSiteContent`:

- Tabella con colonne: slug, title, namespace, updated_at, azioni.
- Filtri per namespace.
- Dialog editor: campo slug (immutabile dopo create), title, markdown editor per body, select namespace.
- Bottoni: Salva, Elimina.

⚠️ Nessuna **preview live** del markdown; solo TextField. Per stringhe lunghe, un editor markdown completo migliorerebbe l'esperienza.

## 5. Sezione "Sync da default" (storica, non implementata)

In versioni precedenti era previsto un endpoint `POST /api/admin/site-content/sync` per popolare le slug mancanti da file JSON default bundled. Oggi il contenuto vive interamente in MongoDB; la migrazione dal filesystem è stata fatta manualmente. Il fallback FS resta per backward compatibility.

## 6. Dipendenze

- **MongoDB** (`site_config`, `site_contents`).
- **Clerk** (admin gating).
- **Context FE**: `SiteConfigProvider`, `SiteContentProvider`.
- **Fallback FS** (`staticContentReader`): solo se SiteContent vuoto per quello slug.

## 7. Criticità note

- **Refresh non-real-time del SiteConfig**: dopo un cambio admin serve reload manuale.
- **Cache localStorage 1 h** del SiteContent: contenuti modificati possono apparire fino a 1 h dopo per chi ha già caricato il sito. Per rendere immediato, esporre un `refresh()` triggerato da un evento.
- **Niente versioning** dei testi: l'update sovrascrive.
- **Niente preview markdown** nell'editor admin.
- **Slug immutabile**: cambiare la slug richiede crea + delete; tutti i riferimenti vanno aggiornati.

## 8. Test

Niente test automatici. Verifiche manuali:

- Toggle `test/production` in `/admin/site-config` → reload → comportamento paywall cambia.
- Editor `SiteContent`: crea slug `test/foo` con body → reload pubblico → contenuto visibile.
- Fallback FS: rimuovi slug da Mongo, popola file `.md` in `CONTENT_BASE_PATH` → pagina mostra il fallback.
- Maintenance mode: attiva → banner globale visibile su tutto il sito.
