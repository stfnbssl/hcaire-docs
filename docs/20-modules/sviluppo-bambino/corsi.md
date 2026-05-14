---
title: Corsi didattica F1/F2/F3
sidebar_label: Corsi didattica
sidebar_position: 3
---

# Modulo Corsi didattica

Scheda funzionale dei tre **corsi didattici** del metodo: F1 (fondazione ontologica), F2 (traduzione interdisciplinare), F3 (strumenti operativi contestualizzati). Sono **slide React** completamente lato client — niente backend, niente DB, niente Cowork.

> Storicamente i corsi vivevano sotto `/sviluppo-bambino/{fondazione-ontologica, traduzione-interdisciplinare, strumenti-operativi-contestualizzati}/*`. Con la promozione di **Metodo** a sezione top-level, le route attuali sono sotto **`/metodo/didattica/*`**. I redirect legacy sono attivi in `App.tsx`.

## 1. Scopo

Esporre i tre corsi come slide deck navigabili in browser, integrati nel sito senza dipendere da PowerPoint/Keynote. Ogni slide è un componente React che può includere animazioni, grafi interattivi, builder, accordion, ecc.

## 2. Struttura

```
client/src/
├── data/corso-fase1/
│   ├── caso-guida.ts
│   ├── sei-assi.ts
│   ├── types.ts
│   └── modules/                 # un file .ts per modulo, ogni modulo = N slide
├── data/corso-fase2/
│   ├── caso-guida.ts
│   ├── pipeline-steps.ts
│   ├── types.ts
│   └── modules/
├── data/corso-fase3/
│   ├── types.ts
│   └── modules/
├── components/corso-fase1/
│   ├── Sidebar.tsx
│   ├── SlideRenderer.tsx
│   └── AnnotatedScene.tsx
├── components/corso-fase2/
│   ├── Sidebar.tsx, SlideRenderer.tsx
│   ├── CEBuilder.tsx, ChipAccordion.tsx, ComparisonPanel.tsx, ExpandableCards.tsx, FlipCards.tsx
│   ├── GuardrailBadge.tsx, InteractiveMatrix.tsx, NodeRelationsGraph.tsx, PipelineAnimator.tsx
│   ├── ProgressiveReveal.tsx, TemplateTable.tsx
└── components/corso-fase3/
    ├── Sidebar.tsx, SlideRenderer.tsx
    ├── DecisionCycle.tsx
    └── F3Builder.tsx
```

I **moduli** sono dichiarati come array TS importati staticamente. Ogni modulo espone:

```ts
{
  id: string;          // es. 'm01-introduzione'
  title: string;
  slides: Slide[];     // ogni slide ha kind, content, props specifici
}
```

`SlideRenderer` discrimina sul `kind` di ciascuna slide e renderizza il componente appropriato.

## 3. Pagine e routing

| Path FE | Componente | Modulo dati |
|---------|------------|-------------|
| `/metodo/didattica` | `DidatticaLanding` (lazy) | — |
| `/metodo/didattica/fondazione-ontologica[/:moduleId[/:slideId]]` | `CorsoFase1Page` (lazy) | `data/corso-fase1/modules` |
| `/metodo/didattica/traduzione-interdisciplinare[/:moduleId[/:slideId]]` | `CorsoFase2Page` (lazy) | `data/corso-fase2/modules` |
| `/metodo/didattica/strumenti-operativi-contestualizzati[/:moduleId[/:slideId]]` | `CorsoFase3Page` (lazy) | `data/corso-fase3/modules` |

Tutte lazy-loaded in `App.tsx`. Redirect legacy `/sviluppo-bambino/{fondazione-ontologica, traduzione-interdisciplinare, strumenti-operativi-contestualizzati}/*` → `/metodo/didattica/...` attivi.

## 4. UX delle slide

Pattern condiviso fra i tre corsi:

- **`Sidebar`**: lista dei moduli con highlight su quello corrente. Click → naviga al primo slide.
- **`SlideRenderer`**: area centrale, slide attuale.
- **Navigazione**:
  - URL slide è **1-based**, indice interno **0-based**.
  - Frecce `←` / `→` su tastiera.
  - Tasti `0` ... `9` per saltare al modulo n-esimo.
  - Bottoni Prev/Next che attraversano i confini di modulo.
- **Fullscreen**: bottone toggle che entra in fullscreen sull'elemento root del corso.
- **Posizione assoluta**: il corso calcola `flatPosition.absolute / .total` per mostrare "slide 23 di 87".

## 5. Componenti specializzati

### Corso F1

- `AnnotatedScene` — scene annotata con immagini + annotazioni puntuali.

### Corso F2 (libreria più ricca)

| Componente | Cosa fa |
|------------|---------|
| `CEBuilder` | Costruttore interattivo di concept embedding |
| `ChipAccordion` | Accordion con chip-tag |
| `ComparisonPanel` | Confronto a due colonne |
| `ExpandableCards` | Card espandibili al click |
| `FlipCards` | Card con flip 3D |
| `GuardrailBadge` | Badge per evidenziare un guardrail |
| `InteractiveMatrix` | Matrice riga × colonna interattiva |
| `NodeRelationsGraph` | Grafo nodi/relazioni |
| `PipelineAnimator` | Animazione step della pipeline F2 |
| `ProgressiveReveal` | Rivelazione progressiva di contenuto |
| `TemplateTable` | Tabella di template |

### Corso F3

| Componente | Cosa fa |
|------------|---------|
| `DecisionCycle` | Diagramma del ciclo decisionale (4 funzioni del dispositivo) |
| `F3Builder` | Builder interattivo di un dispositivo F3 a partire da selezioni F2 |

## 6. Stato e dati

- **Stato globale**: niente. Il corso non legge dal DB, non fa fetch.
- **Stato locale**: `useState` per `isFullscreen`, posizione corrente.
- **Stato URL**: `:moduleId` e `:slideId` sono la fonte di verità. Ricaricare mantiene la posizione.
- **Dati**: tutto in `data/corso-fase{1,2,3}/modules/*.ts`, bundled nel build Vite. Aggiornare il corso = modificare i file TS + redeploy.

## 7. File coinvolti

### Frontend (esclusivo, niente backend)

| File | Ruolo |
|------|-------|
| `pages/corso-fase1/CorsoFase1Page.tsx` | Container + routing slide F1 |
| `pages/corso-fase2/CorsoFase2Page.tsx` | Container + routing slide F2 |
| `pages/corso-fase3/CorsoFase3Page.tsx` | Container + routing slide F3 |
| `pages/metodo/DidatticaLanding.tsx` | Landing che presenta i tre corsi |
| `components/corso-fase{1,2,3}/*` | Componenti specifici per corso |
| `data/corso-fase{1,2,3}/{modules, types}.ts` | Dati slide |
| `styles/corso.css` | Stili dedicati |

## 8. Dipendenze

- **React Router**: `useParams` per moduleId/slideId, `useNavigate` per Prev/Next.
- **Tailwind + CSS custom** (`styles/corso.css`): tipografia slide, fullscreen.
- **`MetodoNav`**: sotto-nav del verticale Metodo, sopra la sidebar del corso.

## 9. Criticità note

- **Bundle pesante**: i moduli con componenti specializzati aumentano il bundle. La lazy load mitiga.
- **Modifica del corso = redeploy**: nessuna possibilità di editare slide a runtime. Per un corso "vivo" che cambia spesso conviene una sorgente esterna (JSON in MongoDB).
- **Niente test**: i componenti specialistici sono complessi senza copertura.
- **Accesso libero**: i corsi sono pubblici, non gated da abbonamento. Se si volesse paywall, aggiungere `useSubscription()` sul container.
- **F1 più povero di F2/F3**: per uniformare conviene estendere F1 con componenti F2 (es. `FlipCards`, `ChipAccordion`).

## 10. Test

Niente test automatici. Verifiche manuali:

- Navigazione `←/→` attraverso i confini di modulo.
- Tasti `0-9` saltano al modulo corretto.
- Fullscreen toggle funziona su Chrome/Firefox.
- URL diretto a `/metodo/didattica/traduzione-interdisciplinare/m05-pipeline/12` ricarica nella posizione giusta.
- `:moduleId` non valido → fallback al primo modulo, URL aggiornato.
- Redirect legacy `/sviluppo-bambino/fondazione-ontologica/...` → `/metodo/didattica/fondazione-ontologica/...`.
