---
title: Navigation
sidebar_position: 3
---

# Modulo Navigation

Scheda funzionale del **menu di navigazione principale**. È un sistema **misto**: una struttura statica hardcoded nel componente React + un set dinamico di voci caricate da MongoDB.

## 1. Scopo

Esporre nella `<Navigation>` sticky:

- Le aree principali del sito (statiche): Laboratorio, Assi Strutturali, Progetti, Letture critiche.
- Voci dinamiche promosse dal CMS (link a articoli speciali o sezioni custom).
- Voci condizionali in base allo stato utente: Bartleby (se abbonato Bartleby o admin), Admin (se admin), Pricing/Abbonati/Account in base a sessione + piano.

## 2. Responsabilità

- Caricare al boot la lista di voci visibili da `GET /api/navigation`, ordinate per `order` ASC.
- Distinguere voci speciali (`isSpecial: true`, link diretto a `/<slug>`) da voci normali (link a `/blog/<slug>`).
- Renderizzare versione desktop (riga orizzontale) e mobile (hamburger con drawer).
- Integrare `UserNav` per l'identità (vedi modulo [Autenticazione](./autenticazione.md)).

## 3. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/Navigation.ts` | Schema Mongoose, collection `navigation` |
| `server/src/routes/nav.ts` | `GET /api/navigation` (pubblica) + `POST/PUT/DELETE` admin |

### Frontend

| File | Ruolo |
|------|-------|
| `client/src/components/Navigation.tsx` | Componente top-level |
| `client/src/components/UserNav.tsx` | Sotto-componente identità |
| `client/src/hooks/useFetchNavigation.ts` | Hook fetch |
| `client/src/types/navigation.ts` | Tipo `NavigationItem` |

## 4. Rotte

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET` | `/api/navigation` | pubblica | Lista delle voci con `isVisible: true`, sort `order` ASC |
| `POST` | `/api/navigation` | `requireAdmin` | Crea voce |
| `PUT` | `/api/navigation/:id` | `requireAdmin` | Aggiorna voce |
| `DELETE` | `/api/navigation/:id` | `requireAdmin` | Elimina voce |

## 5. Componenti UI

`Navigation.tsx` espone il menu sticky in cima a tutte le pagine (montato in `AppLayout`). Struttura:

- **Logo / brand** (link `/`).
- **Aree statiche** (sempre visibili): HCAIRE laboratorio (`/hcaire`), Metodo (`/metodo`), Assi Strutturali (`/assi-strutturali`), Progetti (`/progetti`), Letture critiche (`/letture`), Sviluppo Bambino (`/sviluppo-bambino`).
- **Voci dinamiche** (da DB): mappate da `items.map(...)` come `NavLink`.
- **Bartleby**: condizionale (`isBartleby || isAdmin`).
- **Admin**: condizionale (solo admin).
- **`UserNav`**: bottoni identità + badge piano + Pricing/Abbonati.

Sotto la riga principale (desktop): un piccolo badge "Contenuti generati da Agenti AI — Scopri di più →" linkato a `/hcaire/agentic-shift`.

Su mobile (`< md`): hamburger con drawer che replica la stessa struttura + voci utente in fondo (Account / Pricing / SignIn).

## 6. Flussi

### 6.1 Caricamento iniziale

```
mount Navigation
  ↓
useFetchNavigation()
  ↓ fetch GET /api/navigation
  ↓
items = NavigationItem[]
  ↓
render statiche + dinamiche + condizionali
```

In caso di errore di rete: `error` è settato ma il componente continua a renderizzare le voci statiche; le dinamiche risultano `[]`. Nessun retry automatico.

### 6.2 Resolver del link

```ts
function navPath(item) {
  return item.isSpecial ? `/${item.slug}` : `/blog/${item.slug}`;
}
```

Convenzione:

- **`isSpecial: true`** → il link punta direttamente a `/${slug}`. Usato per pagine top-level fuori da `/blog/...` (es. una landing tematica), ma di fatto la route `/${slug}` deve esistere già nel `<Routes>` di `App.tsx` (altrimenti cade su `NotFound`).
- **`isSpecial: false`** → il link punta a `/blog/${slug}`, ovvero un articolo del CMS [Contenuti](./contenuti.md).

## 7. Dati

### Schema `Navigation`

```ts
{
  titolo:    string;    // testo visualizzato
  slug:      string;    // unique
  isSpecial: boolean;   // default false
  order:     number;    // default 0
  isVisible: boolean;   // default true
}
```

Collection: `navigation`. Indice unico su `slug`.

Nessun `timestamps: true`: i record di nav non tracciano createdAt/updatedAt.

## 8. Dipendenze

- **Modulo [Contenuti](./contenuti.md)**: per il pattern `/blog/${slug}` quando `isSpecial: false`.
- **Modulo [Autenticazione](./autenticazione.md)**: per `useAuth`, `useUser`, `useIsAdmin`.
- **`SubscriptionContext`**: per `isBartleby`, `isActive` (gating Bartleby + CTA Abbonati).
- **`SiteConfigContext`**: per `isTestMode` (nasconde "Abbonati").
- **Nav modulari per sezione** (`AssiStrutturaliNav`, `MetodoNav`, `LaboratorioNav`, `SviluppoBambinoNav*`, `BartlebyNav`): rendono il sotto-menu specifico una volta entrati nella sezione, indipendenti dalla `<Navigation>` globale.

## 9. Criticità note

- **Niente UI admin dedicata** per gestire le voci di nav, pur essendoci gli endpoint REST `POST/PUT/DELETE`. La tabella `navigation` oggi si edita via mongosh/Atlas o chiamate API dirette. Da valutare una pagina admin se evolve.
- **Mix statico/dinamico** può confondere: aggiungere "Letture critiche" come voce dinamica non avrebbe effetto (è già hardcoded). Le voci statiche prevalgono nel layout.
- **`isSpecial` richiede una route preesistente in `App.tsx`**. Non c'è validazione: se si crea un `Navigation` con `slug: 'foo'` e `isSpecial: true` ma `/foo` non è una route, il link va su 404.
- **No fallback se `/api/navigation` è giù**: il menu mostra solo le voci statiche, comportamento accettabile ma silenzioso.
- **Order = 0 di default**: due voci con order 0 hanno ordine indeterministico (Mongo `find().sort({order:1})` con tie-break implicito). Se servono > 2 dinamiche, dare order esplicito.

## 10. Test

Nessun test automatico. Verifica manuale al cambio di layout:

- Render con `items = []`: solo voci statiche.
- Render con utente admin / non-admin / loggato non-abbonato / abbonato Bartleby.
- Mobile menu apertura/chiusura.
- Test mode on/off (CTA "Abbonati" visibile/nascosto).
