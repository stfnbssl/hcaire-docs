---
title: Laboratorio D5b — note storiche
sidebar_position: 2
---

# Laboratorio D5b — note storiche

> **Stato**: documento di planning concluso. Il refactor backend del laboratorio è stato realizzato nei round D6–D8 (Archivio Temi separato, pipeline F2/F3 v3.x con 7+5 step lineari, bridge ambiti F2→F3 1→N). Le scelte definitive vivono ora nelle schede modulo correnti, non più qui.

## Dove guardare oggi

| Tema originale del piano D5b | Documento corrente |
|------------------------------|--------------------|
| Archivio temi come entità distinta | [Modulo Archivio Temi](../20-modules/archivio-temi.md) |
| Modello entità ricerca F2 | [Modulo Pipeline orchestrazione](../20-modules/pipeline-orchestrazione.md) |
| Visualizzazione dispositivi F3 | [Modulo Produzioni](../20-modules/sviluppo-bambino/produzioni.md) |
| Workbench admin per orchestrare step | [Admin CMS](../20-modules/admin-cms.md) + componenti `pipeline/orchestration/*` |
| Bridge F2 → F3 (tema → ambiti → dispositivi) | [Produzioni — bridge ambiti](../20-modules/sviluppo-bambino/produzioni.md) |

## Punti ancora aperti dal piano originale

Alcuni elementi del piano D5b non sono stati implementati e potrebbero tornare utili in futuro:

- **`SviluppoBambinoProduzioniTemiPage`** consuma ancora un JSON statico (`client/src/data/theme-discovery-v1.json`) duplicato rispetto all'[Archivio Temi](../20-modules/archivio-temi.md). Da unificare.
- **TimelineRail / Workbench UI** dedicata per l'orchestrazione: oggi l'admin usa `OrchestrationPanel` generico. Una UI più "horizontal timeline" per gli step potrebbe migliorare la lettura del flusso F2→F3.
- **Cleanup vecchie cartelle pipeline F2/F3 pre-v3.x** in Cowork: lo script `scripts/cleanup-obsolete-pipeline-folders.ps1` esiste, da eseguire dopo aver archiviato eventuali esecuzioni storiche.

## Perché tenere questo file

Memoria del fatto che il design corrente non è ovvio: l'unificazione `temi` (singola collection con lifecycle) vs. modello a 3 entità era una scelta deliberata. Se in futuro un refactor riapre la discussione, vale la pena rileggere lo storico via git per evitare di ripercorrere le stesse alternative.

Per il dettaglio storico originale, vedi la cronologia git di questo file in `hcaire-docs`.
