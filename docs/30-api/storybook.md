---
title: Storybook
sidebar_position: 4
---

# Storybook

:::warning Non implementato in questa fase
Storybook è **proposto** ma **non integrato**. Questa pagina documenta come si farebbe e perché conviene aspettare. La decisione finale sull'introduzione spetta al proprietario del progetto.
:::

## Perché potrebbe servire

`client/src/components/` ha **24 componenti top-level** + sottocartelle (`bartleby/`, `letture/`, `pipeline/`, `corso-fase1/`, `corso-fase2/`, `corso-fase3/`). Un Storybook permetterebbe di:

- Sviluppare e testare componenti in isolamento (no app montata, no fetch necessari).
- Documentare i casi d'uso e gli stati di ciascun componente con story esplicite.
- Catturare regressioni visuali (con plugin tipo Chromatic).
- Avere un set vivente di esempi per riusabilità interna.

## Perché potrebbe non servire (oggi)

- **Componenti specialistici corso-fase\***: 13 componenti del corso F2 (`CEBuilder`, `FlipCards`, `InteractiveMatrix`, `NodeRelationsGraph`, `PipelineAnimator`, ...) sono fortemente legati al contesto della singola slide. Il loro valore in isolamento è basso.
- **Pochi componenti general-purpose**: la maggior parte dei componenti riutilizzabili veri (`MarkdownRenderer`, `Breadcrumb`, `TableOfContents`, `StubNotice`) sono semplici. Il rapporto costo/beneficio è marginale.
- **No design system**: l'app usa Tailwind + MUI in mix pragmatico. Non c'è una palette/spacing system formalizzato che Storybook possa esibire.
- **Il SPA è single-tenant**: oggi non c'è una seconda app che riusa i componenti. Il caso d'uso "showcase per altri sviluppatori" non si applica.

## Quando ha senso introdurlo

Almeno una di:

- **Cresce il team frontend**: > 1 sviluppatore tocca i componenti → utile per onboarding e lavoro parallelo.
- **Refactor verso design system**: si normalizzano spacings, colors, typography, e si estraggono primitive (Button, Card, Input). Storybook è il luogo naturale per esibirle.
- **Test visuali su regressione UI critica**: pagine `/letture/:slug`, `/blog/:slug`, viewer pipeline — se cambiano spesso e voglio screenshot diff.
- **Estrazione di una libreria**: alcuni componenti diventano un pacchetto npm interno. Storybook è obbligatorio.

## Setup proposto (riferimento)

Quando si vorrà introdurlo:

### Posizione

Storybook va **dentro `hcaire-blog/client/`**, non in `hcaire-docs/`. Motivazione: ha bisogno di accesso diretto al codice TS, ai tipi, ai service, ai context. Far leggere il codice client da `hcaire-docs/` come sibling sarebbe fragile.

### Installazione

```bash
cd hcaire-blog/client
npx storybook@latest init
```

Lo init di Storybook 8.x rileva Vite e configura automaticamente il builder. Output:

- `client/.storybook/main.ts` — config principale.
- `client/.storybook/preview.tsx` — wrapper globali (decorator per Tailwind, MUI ThemeProvider).
- `client/src/**/*.stories.tsx` — file story accanto ai componenti.

### Wrapper globali necessari

Per renderizzare correttamente:

- `<MemoryRouter>` (i componenti usano `useLocation`, `useParams`, ecc.).
- `<ThemeProvider theme={muiTheme}>` + `<CssBaseline />` (MUI).
- Stub di `ClerkProvider` con un user fittizio (per `useUser`/`useAuth`).
- Stub di `SubscriptionContext`, `SiteConfigContext`, `SiteContentContext` (se il componente li consuma).
- Import di `tailwind.css`.

Esempio `preview.tsx`:

```tsx
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import '../src/styles/tailwind.css';

const muiTheme = createTheme({ palette: { primary: { main: '#0284c7' } } });

export const decorators = [
  (Story) => (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    </ThemeProvider>
  ),
];
```

### Quali componenti coprire prima

Priorità (alta → bassa):

1. **`MarkdownRenderer`**: 3-4 story (con tabella, con codice, con immagini, con HTML inline).
2. **`Breadcrumb`**, **`TableOfContents`**, **`StubNotice`**: utility piccole, story semplici.
3. **`pipeline/orchestration/OrchestrationPanel`** se viene generalizzato.
4. **`letture/LettureOutputViewer`**: complessità media, utile per debug.
5. **Componenti corso-fase2 più riutilizzabili** (`FlipCards`, `ChipAccordion`, `ExpandableCards`): basso impatto ma showcase del design.

Da **non** coprire inizialmente (anti-priorità): `Sidebar`/`SlideRenderer` dei corsi (troppo accoppiati), navigazioni custom (`SviluppoBambinoNav`, `LaboratorioNav`...), notifier Bartleby (effetti collaterali).

### Integrazione con `hcaire-docs`

Tre opzioni:

1. **Storybook standalone**: si serve da `client/` con `npm run storybook`. Si linkano gli URL dalla pagina `30-api/storybook.md` (`http://localhost:6006` in dev, oppure deploy separato).
2. **Build statico embedded**: `npm run build-storybook` produce HTML in `client/storybook-static/`, lo si copia in `hcaire-docs/static/storybook/` via `sync-docs.mjs`. Stessa pattern di TypeDoc.
3. **MDX embedding**: usare `@storybook/addon-docs` per generare MDX direttamente, importarlo in Docusaurus. Più complesso, scoraggiato come prima iterazione.

Raccomandazione: **opzione 2** (allineata al pattern TypeDoc).

## Costo stimato

- Setup iniziale: 1 giornata (config + 5-6 story di base).
- Manutenzione: ~30 min per ogni componente nuovo. ~2h per refactor di un componente esistente.
- Build storybook + sync: ~30s (incluso nel `sync-docs` se aggiunto).
- Spazio in repo: storybook-static è ~10-20 MB (gitignored).

## Decisione attuale

**Non si fa adesso**. Argomenti contro: pochi componenti general-purpose, SPA single-tenant, no design system. Da rivalutare quando uno dei tre trigger (team, design system, library extraction) si presenta.

Se nel frattempo vuoi una "galleria di componenti" leggera senza tooling: una **pagina Docusaurus con esempi MDX** (sezione `30-api/components.md` con render diretti) costa molto meno e copre l'80% del valore informativo per il caso "documento i miei componenti".
