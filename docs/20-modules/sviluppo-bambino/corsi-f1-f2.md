---
title: Corsi F1 e F2
sidebar_label: Corsi F1/F2
sidebar_position: 3
---

# Modulo Corsi F1 e F2

Scheda funzionale dei **due corsi narrativi stabili** del verticale Sviluppo Bambino: F1 (fondazione ontologica) e F2 (traduzione interdisciplinare). Sono **slide React** completamente lato client — niente backend, niente DB, niente Cowork.

:::note Corso F3
Il corso F3 (`strumenti-operativi-contestualizzati`) è in lavorazione e **fuori scope B**. La struttura di codice esiste (`pages/sviluppo-bambino/corso-fase3/`, `components/corso-fase3/`, `data/corso-fase3/modules/`) ma alcuni file sono untracked. Verrà documentato quando converge.
:::

## 1. Scopo

Esporre i due corsi come slide deck navigabili in browser, integrate nel sito senza dipendere da PowerPoint/Keynote. Ogni slide è un componente React che può includere animazioni, grafi interattivi, builder, accordion, ecc.

## 2. Struttura

```
client/src/
├── data/corso-fase1/
│   ├── caso-guida.ts            # esempio narrativo trasversale
│   ├── sei-assi.ts              # i sei assi del modello
│   ├── types.ts
│   └── modules/                 # un file .ts per modulo, ogni modulo = N slide
├── data/corso-fase2/
│   ├── caso-guida.ts
│   ├── pipeline-steps.ts        # gli step della pipeline F2
│   ├── types.ts
│   └── modules/                 # idem
├── components/corso-fase1/
│   ├── Sidebar.tsx              # barra laterale moduli
│   ├── SlideRenderer.tsx        # renderer slide
│   └── AnnotatedScene.tsx       # componente specialistico
└── components/corso-fase2/
    ├── Sidebar.tsx, SlideRenderer.tsx
    ├── CEBuilder.tsx            # builder concept embedding
    ├── ChipAccordion.tsx
    ├── ComparisonPanel.tsx
    ├── ExpandableCards.tsx
    ├── FlipCards.tsx
    ├── GuardrailBadge.tsx
    ├── InteractiveMatrix.tsx
    ├── NodeRelationsGraph.tsx
    ├── PipelineAnimator.tsx
    ├── ProgressiveReveal.tsx
    └── TemplateTable.tsx
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
| `/sviluppo-bambino/fondazione-ontologica` | `CorsoFase1Page` | `data/corso-fase1/modules` |
| `/sviluppo-bambino/fondazione-ontologica/:moduleId` | `CorsoFase1Page` | idem |
| `/sviluppo-bambino/fondazione-ontologica/:moduleId/:slideId` | `CorsoFase1Page` | idem |
| `/sviluppo-bambino/traduzione-interdisciplinare` | `CorsoFase2Page` | `data/corso-fase2/modules` |
| `/sviluppo-bambino/traduzione-interdisciplinare/:moduleId` | `CorsoFase2Page` | idem |
| `/sviluppo-bambino/traduzione-interdisciplinare/:moduleId/:slideId` | `CorsoFase2Page` | idem |

Tutte **lazy-loaded** in `App.tsx` (vedi [Architettura → Frontend §4](../../10-architecture/frontend.md#4-lazy-loading)).

## 4. UX delle slide

Pattern condiviso fra i due corsi (la pagina F2 è quella più rifinita e fa da riferimento):

- **`Sidebar`**: lista dei moduli con highlight su quello corrente. Click → naviga al primo slide.
- **`SlideRenderer`**: area centrale, slide attuale.
- **Navigazione**:
  - URL slide è **1-based**, indice interno **0-based**.
  - Frecce `←` / `→` su tastiera.
  - Tasti `0` ... `9` per saltare al modulo n-esimo.
  - Bottoni Prev/Next che attraversano i confini di modulo (ultima slide del modulo X → prima slide del modulo X+1).
- **Fullscreen**: bottone toggle che entra in fullscreen sull'elemento root del corso (non su tutto il browser).
- **Posizione assoluta**: il corso calcola `flatPosition.absolute` / `flatPosition.total` per mostrare "slide 23 di 87".

## 5. Componenti specializzati (F2)

Il corso F2 ha una libreria ricca di componenti per spiegare concetti specifici. Ognuno è progettato per un sotto-tipo di slide:

| Componente | Cosa fa |
|------------|---------|
| `CEBuilder` | Costruttore interattivo di un concept embedding |
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

I componenti sono importati staticamente nei moduli (`data/corso-fase2/modules/m0X.ts`) e referenziati dal renderer.

Il corso F1 è più semplice: `AnnotatedScene` è il componente principale, oltre al renderer e alla sidebar.

## 6. Stato e dati

- **Stato globale**: niente. Il corso non legge dal DB, non fa fetch.
- **Stato locale**: `useState` per `isFullscreen`, posizione corrente, ecc.
- **Stato URL**: `:moduleId` e `:slideId` sono la fonte di verità di "dove sei". Ricaricare la pagina mantiene la posizione.
- **Dati**: tutto in `data/corso-fase{1,2}/modules/*.ts`, bundled nel build Vite. Aggiornare il corso = modificare i file TS + ridepoyare il client.

## 7. File coinvolti

### Frontend (esclusivo)

| File | Ruolo |
|------|-------|
| `pages/sviluppo-bambino/corso-fase1/CorsoFase1Page.tsx` | Container + routing slide F1 |
| `pages/sviluppo-bambino/corso-fase2/CorsoFase2Page.tsx` | Container + routing slide F2 |
| `pages/sviluppo-bambino/PresentazioneCorsi.tsx` | Pagina riepilogo dei tre corsi |
| `components/corso-fase1/*` | Componenti F1 (3 file) |
| `components/corso-fase2/*` | Componenti F2 (13 file) |
| `data/corso-fase1/{modules,caso-guida,sei-assi,types}.ts` | Dati F1 |
| `data/corso-fase2/{modules,caso-guida,pipeline-steps,types}.ts` | Dati F2 |
| `styles/corso.css` | Stili dedicati |

Niente file lato server, niente endpoint dedicato.

## 8. Dipendenze

- **React Router**: `useParams` per moduleId/slideId, `useNavigate` per Prev/Next.
- **Tailwind + CSS custom** (`styles/corso.css`): tipografia slide, fullscreen.
- **`SviluppoBambinoNav`**: sotto-nav del verticale, mantenuta sopra la sidebar del corso.

## 9. Criticità note

- **Bundle pesante**: i moduli del corso F2 con tutti i componenti specializzati aumentano il bundle del client. La lazy load mitiga (entra solo se l'utente apre il corso).
- **Modifica del corso = redeploy**: nessuna possibilità di editare slide a runtime. Per un corso "vivo" che cambia spesso conviene una sorgente esterna (markdown + frontmatter, JSON in collection MongoDB, ecc.). Per ora i corsi sono editoriali e cambiano poco.
- **Niente test**: i componenti specialistici (es. `InteractiveMatrix`, `NodeRelationsGraph`) sono complessi ma non hanno test. Refactor è rischioso.
- **Accesso libero**: i corsi sono pubblici, non gated da abbonamento. Se in futuro si volesse paywall, va aggiunto un check `useSubscription()` sul `CorsoFaseXPage`.
- **F1 vs F2 asymmetric**: F1 è più povero di componenti. Se si volesse uniformare lo stile, F1 potrebbe ereditare alcuni componenti F2 (es. `FlipCards`, `ChipAccordion`).

## 10. Test

Niente test automatici. Verifiche manuali:

- Navigazione `←/→` attraversa correttamente i confini di modulo.
- Tasti `0-9` saltano al modulo corretto.
- Fullscreen toggle funziona su Chrome/Firefox.
- URL diretto a `/sviluppo-bambino/traduzione-interdisciplinare/m05-pipeline/12` ricarica nella posizione giusta.
- `:moduleId` non valido → fallback al primo modulo, URL aggiornato.
