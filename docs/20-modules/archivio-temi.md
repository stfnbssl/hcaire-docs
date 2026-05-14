---
title: Archivio Temi (D5)
sidebar_position: 13
---

# Modulo Archivio Temi

Scheda funzionale dell'**Archivio Temi** (D5): backoffice per i temi che alimentano la pipeline F2/F3 di Sviluppo Bambino. Sostituisce/precede il vecchio "discovery temi" (`f2_step_1`) che è stato rimosso dalla pipeline.

## 1. Scopo

Permettere all'admin/ricercatore di:

- Curare un elenco di **temi candidati** descritti narrativamente.
- Maturare ogni tema attraverso stati (`bozza` → `in_lavorazione` → `maturo` → `promosso`).
- Promuovere un tema a una **ricerca F2**, popolando automaticamente l'input esterno `scelta_tema` di `f2_step_2`.

## 2. Aree

| Area | URL FE | Endpoint BE |
|------|--------|-------------|
| Index temi | `/archivio/temi` | `GET /api/archivio/temi` |
| Nuovo tema | `/archivio/temi/nuovo` | `POST /api/archivio/temi` |
| Edit tema | `/archivio/temi/:temaId` | `GET/PATCH/DELETE /api/archivio/temi/:temaId` |

Tutte gated da `<AdminRoute>` lato FE (rotta `/archivio/*` è sotto gating admin).

## 3. Modello dati

```ts
{
  slug: string;                       // unique
  label: string;                      // titolo breve
  descrizione: string;                // testo libero per descrivere il tema
  asse_dominante_presunto: string;    // es. 'asse-2-affettivo-morale'
  note_ricercatore: string;
  motivazione: string;
  fonti: { title: string; url?: string; note?: string }[];
  intro_markdown: string;             // intro lunga in markdown
  has_background: boolean;
  has_protocol: boolean;
  sections: Array<{ heading: string; body: string }>;
  references: Array<{ id: string; citation: string }>;
  status: 'bozza' | 'in_lavorazione' | 'maturo' | 'promosso';
  promoted_at?: Date;
  promoted_ricerca_id?: string;
  createdAt, updatedAt
}
```

Modello: `Tema`. Collection: `temi`. Index unique su `slug`.

## 4. File coinvolti

### Backend

| File | Ruolo |
|------|-------|
| `server/src/models/Tema.ts` | Schema |
| `server/src/routes/archivioTemi.ts` | Route mounted su `/api/archivio/temi` |
| `server/src/controllers/archivioTemiController.ts` | CRUD + `promuoveTema` |

### Frontend

| File | Ruolo |
|------|-------|
| `pages/archivio/ArchivioTemiIndexPage.tsx` (lazy) | Index con filtri (status, asse) |
| `pages/archivio/ArchivioTemaFormPage.tsx` (lazy) | Form crea/edit |
| `services/archivioTemiService.ts` | Wrapper fetch |
| `types/tema.ts` | Tipo `Tema` |

## 5. Endpoint

| Verb | Path | Auth | Funzione |
|------|------|------|----------|
| `GET` | `/api/archivio/temi` | public (read) | Lista (filtri: `status`, `asse`) |
| `GET` | `/api/archivio/temi/:id` | public | Dettaglio |
| `POST` | `/api/archivio/temi` | admin | Crea |
| `PATCH` | `/api/archivio/temi/:id` | admin | Aggiorna |
| `DELETE` | `/api/archivio/temi/:id` | admin | Elimina |
| `POST` | `/api/archivio/temi/:id/promote` | admin | Promuove → ricerca F2 |

## 6. Flusso di promozione

```
Admin → /archivio/temi/:id (status='maturo') → click "Promuovi a ricerca"
  ↓ POST /api/archivio/temi/:id/promote
  ↓ archivioTemiController.promuoveTema:
    1. Verifica status='maturo'
    2. Crea PipelineContext { context_type: 'ricerca', context_id: nuovo, ... }
    3. Crea PipelineExternalInput per f2_step_2:
         input_id: 'scelta_tema',
         data: {
           tema_label: tema.label,
           descrizione: tema.descrizione,
           motivazione: tema.note_ricercatore,
           asse_dominante_presunto: ...,
           fonti: ...,
           tema_id: tema.slug
         }
    4. Update Tema { status: 'promosso', promoted_at, promoted_ricerca_id }
  ↓ ritorna { ricerca_id }
  ↓ FE redirect → /sviluppo-bambino/produzioni/pipeline/ricerche/<ricerca_id>
```

L'input `scelta_tema` pre-popolato fa partire `f2_step_2` senza richiesta di compilazione: vedi [Produzioni — bridge ambiti](./sviluppo-bambino/produzioni.md).

## 7. Componenti UI

### `ArchivioTemiIndexPage`

Tabella con:

- Filtri: status (chip filter), asse dominante presunto, search per label.
- Colonne: label, status (chip), asse dominante, data creazione, azioni (Edit, Promote se maturo, Delete).
- Bottone "+ Nuovo tema".

### `ArchivioTemaFormPage`

Form a sezioni:

- Metadati: slug (autogenerato dal label), label, asse dominante presunto, status.
- Descrizione: textarea breve + textarea lunga.
- Note ricercatore + motivazione.
- Fonti (lista CRUD).
- Intro markdown + flag `has_background` / `has_protocol`.
- Sections (heading + body markdown).
- References (id + citation).
- Bottoni: Salva, Promuovi (se status='maturo'), Elimina.

## 8. Dipendenze

- **MongoDB** (`temi`).
- **`PipelineContext`** + **`PipelineExternalInput`**: target della promozione.
- **Modulo [Pipeline orchestrazione](./pipeline-orchestrazione.md)**: consumer dell'input `scelta_tema`.
- **Script** `scripts/heal-archivio-bridge.mjs`: ripara incoerenze (temi promossi ma senza `PipelineContext`/`scelta_tema`).
- **Script** `scripts/seed-archivio.mjs`: seed iniziale da file.

## 9. Criticità note

- **Heal manuale**: se la promozione fallisce a metà (ad es. `PipelineContext` creato ma `PipelineExternalInput` no), il tema resta `promosso` ma la ricerca non parte correttamente. `heal:archivio-bridge` ripara.
- **Niente lock**: due admin che promuovono lo stesso tema in contemporanea possono creare due `PipelineContext`. Improbabile in single-tenant.
- **Slug non riusabile**: una volta promosso, lo slug del tema viene riusato come `context_id` della ricerca. Cambiarlo dopo la promozione spezza il binding.
- **`SviluppoBambinoProduzioniTemiPage`** (FE) consuma un JSON statico (`theme-discovery-v1.json`) duplicato rispetto all'Archivio. Da unificare.

## 10. Test

Niente test automatici. Verifiche manuali:

- Crea tema → status `bozza` → modifica → `maturo` → promuovi → presenza in `pipeline_contexts` + `pipeline_external_inputs` + status `promosso`.
- `heal:archivio-bridge --dry-run` su un tema rotto deliberatamente → mostra le riparazioni proposte.
- Lista filtrata per asse.
