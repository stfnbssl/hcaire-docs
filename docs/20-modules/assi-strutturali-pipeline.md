---
title: Assi strutturali — pipeline editoriale
sidebar_position: 10
---

# Pipeline editoriale degli assi strutturali

Procedura operativa per il ciclo di vita dei contenuti del modulo [Assi strutturali](./assi-strutturali.md): conversione markdown → JSON, gestione del catalogo autori/libri, applicazione di revisioni editoriali via roundtrip Google Docs.

Tutta la pipeline è composta da **script ts-node idempotenti** registrati come `npm run` in `hcaire-blog/server/package.json`. Nessuno tocca i `.md` sorgente in modo distruttivo (il flusso usa file temporanei `- merged.md` + backup `.md.bak`).

## 1. Sintesi degli script

| Script | Cosa fa | Quando si usa |
|--------|---------|---------------|
| `npm run assi:inventory` | Read-only. Walk dei 44 `.md`, conta marker `[^N]`, footnote, `<img>`, ricava il catalogo autori/libri citati, segnala anomalie (img orfane, marker senza def, asset/rilevanza mancanti) | Diagnostica iniziale, dopo cambi al pattern dei file |
| `npm run catalogo:build` | Genera `authors.json` e `books.json` derivandoli da `client/public/data/sviluppo-bambino-rilevanza-giorno-1.json`. Risolve i path immagine guardando `/assets/{autori,libri}/`. Preserva eventuali campi opzionali aggiunti a mano (`birthYear`, `authorIds`, ecc.) | Dopo aver aggiunto/modificato voci nel rilevanza JSON |
| `npm run assi:convert -- [--write] [--asse <slug>] [--verbose] [--force]` | Converte i 44 `.md` in `ChapterDocument` JSON. Default = dry-run (stampa solo statistiche). `--write` salva su disco. Valida ogni `authorId`/`bookId` contro il catalogo; rifiuta `--write` se ci sono errori a meno di `--force` | Dopo qualsiasi modifica al sorgente `.md` o al catalogo |
| `npm run assi:merge-revision [-- --file <path>]` | Applica revisioni Caso B (roundtrip Google Docs): re-inietta `<img>` persi usando il residuo testuale come ancora, dis-escape Docs, ricostruisce il frontmatter dal sorgente. Genera `* - merged.md` accanto a `* - rev.md`, lascia intatti i canonici. Default = tutti i `* - rev.md`, `--file` per uno specifico | Dopo aver salvato il `.md` revisionato da Google Docs |
| `npm run assi:fix-img-ext` | Scansiona i `.md`, completa l'estensione dei `<img src>` per i quali l'asset è ora presente in `/assets/`. Idempotente. Segnala asset ancora mancanti | Dopo aver caricato nuovi file immagine |
| `npx ts-node src/scripts/decorateMarkers.ts` (no npm script) | Decora marker nudi `[^N]` con `<img>` bibliografici secondo una mappa hardcoded. Idempotente | Solo dopo una tornata di revisioni che ha aggiunto nuove footnote: si edita la mappa nello script con `(file, marker, authorIds, bookIds)` e si lancia |

## 2. Procedura completa: revisione editoriale

Documenta il flusso end-to-end testato sul primo lotto (5 capitoli, 2026-05-09).

### Convenzione su Google Docs (importante)

Quando si carica un `.md` su Google Docs:

> **Caricalo come testo non convertito** (Apri con → Google Docs senza "convert", oppure incolla in un Doc come "testo non formattato" via Ctrl+Shift+V).

Modifica la prosa lasciando i tag `<img>` e i marker `[^N]` come testo letterale. Quando esporti, ottieni indietro il `.md` con tag e marker intatti — siamo nel Caso A (banale).

Se invece carichi con conversione formattata:
- Google Docs **mangia i tag `<img>`** ma lascia come **testo letterale** gli `alt`/`title` che erano dentro
- **Squasha il frontmatter YAML** in una singola riga
- **Escapa caratteri speciali**: `\*`, `\-`, `\.`, `\(`, `\)`, ecc.
- I marker `[^N]` invece **sopravvivono** e mantengono la numerazione

Questo è il Caso B. Lo script `assi:merge-revision` lo gestisce automaticamente.

### Sequenza operativa

```
1. Tu (offline)
   └─ revisione su Google Docs, salvataggio come "Capitolo X - title - rev.md"
      accanto al canonico "Capitolo X - title.md" sotto normalized/

2. npm run assi:merge-revision
   ├─ produce "Capitolo X - title - merged.md"
   ├─ re-inietta <img> persi nei marker che esistevano nell'orig
   ├─ dis-escape Docs (\*, \-, \., \(, \), ecc.)
   ├─ ricostruisce il frontmatter copiandolo dal canonico
   └─ stampa: img re-iniettati, escape rimossi, NUOVI marker (con la def text)

3. Tu
   └─ apri il merged.md e verifica visivamente che il diff col canonico
      sia coerente con le revisioni che hai voluto fare

4. Insieme: decisione sui nuovi marker
   ├─ quali autori/libri vanno mostrati come <img> bibliografica per ciascuno?
   └─ se servono autori/libri non in catalogo:
      a. Aggiungi voci a client/public/data/sviluppo-bambino-rilevanza-giorno-1.json
      b. npm run catalogo:build
      c. (eventualmente) carica i file immagine in /assets/{autori,libri}/

5. Aggiorna l'array DECORATIONS in
   server/src/scripts/decorateMarkers.ts e lancialo:
   └─ npx ts-node server/src/scripts/decorateMarkers.ts
      (idempotente: marker già decorati vengono skippati)

6. Promozione (per ogni capitolo):
   ├─ mv "Capitolo X - title.md"          "Capitolo X - title.md.bak"
   ├─ mv "Capitolo X - title - merged.md" "Capitolo X - title.md"
   └─ rm "Capitolo X - title - rev.md"

7. npm run assi:convert -- --write
   └─ rigenera tutti i 44 JSON sotto json/

8. Verifica nel browser sui capitoli revisionati
```

I `.md.bak` restano sul filesystem come backup locale. **Non sono in git** (esclusi a mano dal commit) — git history fa già da audit trail.

## 3. Algoritmo di re-iniezione `<img>` (Caso B)

L'idea chiave dello script `assi:merge-revision`:

Quando Google Docs cancella un tag come

```html
<img src="/assets/autori/alasdair-macintyre.jpg" alt="Alasdair MacIntyre" title="Alasdair MacIntyre" class="ref-portrait" style="...">
```

lascia nel testo "Alasdair MacIntyre" (l'attributo `title` o `alt`). Quindi:

```
Originale:    non arbitrario[^1] <img portrait MacIntyre> <img cover After Virtue>.
Dopo Docs:    non arbitrario[^1] Alasdair MacIntyre After Virtue.
```

Lo script:

1. Parsa il `.md` originale, costruisce mappa `[^N] → { imgTags: string, residualText: " Alasdair MacIntyre After Virtue" }` per ogni marker che ha `<img>` annessi
2. Nel `.md` revisionato, cerca per ogni `[^N]` la stringa `[^N]` + `residualText`. Se trova match unico, sostituisce con `[^N]` + `imgTags` originali
3. Se non trova (revisore ha riscritto la frase), lascia intatto e segnala come **da risolvere a mano**
4. Il marker viene ancorato dal `[^N]` (che sopravvive sempre) più dal residuo (che è il testo dei `title`/`alt`)

L'algoritmo è **conservativo**: ogni warning va guardato, niente decorazione silenziosa.

## 4. Validazione catalogo

Lo script `assi:convert` valida ogni reference contro il catalogo derivato:

- `authorId` da `<img class="ref-portrait">` → deve esistere in `authors.json`
- `bookId` da `<img class="ref-cover">` → deve esistere in `books.json`

Errori bloccano la scrittura JSON (`--write`) a meno di `--force`. La modalità default `dry-run` fa il check senza scrivere — utile per validare prima di committare.

## 5. Idempotenza e sicurezza

Tutti gli script sono **rieseguibili senza danni**:

- `assi:inventory` è read-only
- `catalogo:build` rigenera deterministicamente; `_meta.generatedAt` cambia ad ogni run, il resto è stabile a parità di input
- `assi:convert` rigenera tutti i 44 JSON; idempotente modulo `_meta.generatedAt`
- `assi:merge-revision` scrive solo `* - merged.md` accanto al `* - rev.md`; non tocca i canonici
- `assi:fix-img-ext` riscrive un file solo se ha trovato fix da applicare; non tocca path con estensione già presente né asset mancanti
- `decorateMarkers.ts` riconosce marker già decorati (seguiti da `<img>`) e li skippa; può essere lanciato N volte

## 6. File di stato

Output prodotti dalla pipeline (in `server/content/progetti/sviluppo bambino/assi strutturali/`):

| File | Descrizione | In git? |
|------|-------------|---------|
| `_inventory-report.json` | Output dettagliato di `assi:inventory` (per ogni capitolo: marker, def, img, asset/rilevanza mancanti, frequenze) | No (transient) |
| `_conversion-report.json` | Output dettagliato di `assi:convert` (totali, errori, warning per capitolo) | No (transient) |
| `json/<asse>/<capitolo>.json` | I 44 ChapterDocument convertiti | Sì (sono il "build product" che il server serve a runtime) |
| `normalized/<asse>/*.md.bak` | Backup creati dalla promozione di una revisione | No (locali) |

## 7. Asset mancanti — gestione del debito

Le voci di catalogo possono esistere senza il loro file immagine. Stato al 2026-05-09:

- **10 autori** in catalogo senza foto in `/assets/autori/`: Bowlby, Winnicott, Ricoeur, Kohlberg, Trevarthen, Stern, Tommaso d'Aquino, Tronick, Schutz, Illich
- **2 libri** in catalogo senza copertina in `/assets/libri/`: Kohlberg-Essays-on-moral-development, Dilthey-Costruzione-mondo-storico

Per ognuno il path nel catalogo è il placeholder `/assets/{autori|libri}/<id>` (senza estensione). Il browser mostra "broken image", ma il pannello rilevanza apre regolarmente al click. Quando carichi l'immagine:

```bash
# Nuova immagine in client/public/assets/{autori|libri}/<id>.<ext>
npm run catalogo:build      # aggiorna il catalogo con il path completo
npm run assi:fix-img-ext    # completa l'estensione nei <img src> dei .md
npm run assi:convert -- --write   # rigenera i JSON
```

## 8. Riferimenti

- Script: `hcaire-blog/server/src/scripts/`
- Tipi: `hcaire-blog/server/src/shared/types/assi.d.ts` e `hcaire-blog/client/src/shared/types/assi.d.ts` (due copie sincronizzate, una per app, perché gli hosting di server e client non condividono il filesystem)
- Memoria operativa Claude: `project_assi_json.md` (procedura roundtrip salvata per le sessioni future)
