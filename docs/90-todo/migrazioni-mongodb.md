---
title: Migrazioni MongoDB
sidebar_position: 1
---

# Migrazioni MongoDB

> **Stato**: nessuna pratica adottata. Documento di lavoro per scegliere una strategia. Proposte alternative non ordinate per preferenza — la scelta dipende da fattori che vanno discussi (frequenza dei cambi schema, ampiezza del team, ambienti, tolleranza a downtime).

## 1. Problema

Lo stato attuale (vedi [Database §6](../10-architecture/database.md#6-backup-e-gestione)):

- **Nessuno strumento di migrazione** in repo: niente `migrate-mongo`, niente `Mongoose Migrations`, niente Prisma.
- Le evoluzioni di schema avvengono per **convention Mongoose**: nuovi campi sono `optional`, i documenti vecchi sopravvivono. Funziona finché le modifiche sono *additive*.
- Mongoose ha `autoIndex: true` di default, quindi gli indici vengono creati al primo bind del modello sull'app in esecuzione. In ambienti multi-instance questo è un comportamento implicito e a volte sgradito.

Le situazioni che oggi **non** abbiamo un modo strutturato per gestire:

| Caso | Oggi |
|------|------|
| Aggiungere un campo opzionale | Funziona (gli oggetti vecchi mancano del campo, l'app gestisce `undefined`) |
| Aggiungere un campo **obbligatorio** | Rischio: i documenti vecchi senza il campo violano lo schema. Va popolato con un valore di default su tutti |
| Rinominare un campo | Va fatto in due step: l'app legge entrambi i nomi → backfill → l'app scrive solo il nuovo nome → rimuovi il vecchio |
| Cambiare il tipo di un campo | Backfill cast (es. string → number) prima di deployare il codice nuovo |
| Aggiungere/cambiare un indice | Mongoose lo crea al boot. Su collection grandi può bloccare. Spesso meglio crearlo a mano `mongosh` con `background: true` (deprecato in 4.2+ ma ancora) o offline |
| Rimuovere una collection | Manuale su Atlas |
| Spostare dati fra collection | Nessuno strumento |
| Rollback di una migrazione | Nessun supporto |

## 2. Vincoli e desiderata

Prima di scegliere conviene fissare:

- **Ambienti**: oggi un solo db Atlas (`hcaire_db`). Probabile evoluzione: separare un `hcaire_db_dev`/`hcaire_db_prod`. Una strategia di migrazione deve poter girare contro entrambi.
- **Cadenza**: non c'è ancora un team con frequenti modifiche di schema. Le migrazioni saranno rare ma occasionalmente non triviali.
- **Coupling con il codice**: oggi non si può fare un atomic deploy "code + migration" tipo Rails — il server e il worker `local/` deployano separatamente (Railway / portatile). Una migrazione dovrebbe essere **safe-to-run-twice** e **ordinabile rispetto al codice**.
- **Tolleranza a downtime**: l'app non è critica, ma è preferibile evitarla.
- **Budget di tooling**: tutto in repo, niente servizi a pagamento dedicati.

## 3. Strategie candidate

### 3.1 `migrate-mongo`

Tool maturo, JS-based, file di migrazione numerati con `up`/`down`.

**Pro**:
- Standard de facto nell'ecosistema Node + MongoDB.
- File migrazioni in repo, versionati con git.
- Tracking automatico in collection dedicata (`changelog`).
- Supporta `up`/`down` (rollback) e batch.

**Contro**:
- Aggiunge una dipendenza e un comando (`migrate-mongo up`) da invocare nel deploy.
- I file migrazione sono separati dai modelli Mongoose: due fonti di verità.
- Su Railway servirebbe uno step di build/release esplicito che invoca `migrate-mongo up` prima di `node dist/index.js`.

**Esempio**:

```js
// migrations/20260601000000-add-content-language.js
module.exports = {
  async up(db) {
    await db.collection('hcaire-content').updateMany(
      { language: { $exists: false } },
      { $set: { language: 'it' } }
    );
  },
  async down(db) {
    await db.collection('hcaire-content').updateMany({}, { $unset: { language: '' } });
  },
};
```

### 3.2 Migrazioni custom + version field

Pattern a "self-migrating documents": ogni doc ha `schema_version: 1`, l'app al boot esegue le migrazioni necessarie (`for v from current to latest`).

**Pro**:
- Niente tool esterno, totalmente in JS/TS.
- Migrazioni vivono accanto ai modelli (single source of truth).
- Si può combinare con migrazione **lazy** (vedi 3.4).

**Contro**:
- Va scritto e mantenuto a mano.
- Migrazioni "globali" (es. spostare una collection) non si esprimono bene in questo schema.
- Senza tracking persistente in DB rischia ri-esecuzioni.

### 3.3 Atlas Triggers / scheduled functions

Atlas espone trigger DB-side (su event o schedule) eseguiti come Function lato Atlas.

**Pro**:
- Non richiede un processo applicativo che esegua la migrazione.
- Ottimo per task ripetuti (es. backfill mensile).

**Contro**:
- Lock-in con Atlas.
- Codice fuori repo (vive nel pannello Atlas) — versionamento difficile.
- Per migrazioni una-tantum è overkill.

Non lo userei come strategia primaria, eventualmente come complemento per task pianificati.

### 3.4 Lazy migration (migrazione su lettura)

L'app, quando legge un documento con `schema_version` vecchia, lo trasforma in memoria e (opzionalmente) lo riscrive.

```ts
function migrateContent(doc: any) {
  if (doc.schema_version === 1) {
    doc.language = doc.language ?? 'it';
    doc.schema_version = 2;
  }
  return doc;
}
```

**Pro**:
- Zero downtime.
- Costi distribuiti sull'uso reale.
- Nessun deploy speciale.

**Contro**:
- I documenti **mai più letti** non vengono mai migrati. Per cleanup serve comunque un job batch finale.
- Aumenta il codice del lettore.
- Richiede attenzione alla concorrenza (due process che migrano lo stesso doc in parallelo).

### 3.5 Script ad-hoc in `scripts/`

Quello che si farebbe oggi se servisse: un file `scripts/migrate-2026-06-add-language.mjs` con uno script `mongosh`-style, eseguito a mano.

**Pro**:
- Zero overhead.
- Adatto al primo step ("siamo solo io e Cowork, non ci serve un framework").

**Contro**:
- Nessun tracking di cosa è stato eseguito su quale ambiente.
- Rischio dimenticarsi una migrazione su un nuovo ambiente.
- Se si aggiunge un secondo dev diventa fragile.

## 4. Raccomandazione di partenza

Una via ibrida pragmatica:

1. **Subito**: introdurre la convenzione di tenere un `schema_version` sui documenti delle collection più "critiche" (`Content`, `UserSubscription`, `PipelineContext`, `Opera`). Mongoose `pre('save')` può iniettarlo automaticamente ai nuovi insert.
2. **Subito**: cominciare a tenere gli script di migrazione in `scripts/migrations/<YYYYMMDD>-<descrizione>.mjs`, anche se eseguiti a mano. Versionati in git, con un README che dice "esegui in ordine".
3. **Quando il volume di migrazioni cresce** (≥ 3-4 in un trimestre): adottare `migrate-mongo` e migrare gli script di `scripts/migrations/` come file `migrate-mongo` (cambio di forma minimale). Aggiungere uno step `migrate-mongo up` al deploy Railway.
4. **Per i backfill grandi e idempotenti**: usare la lazy migration al volo nel reader Mongoose, e un job di cleanup finale (uno degli script numerati) per ripulire i documenti orfani.

Conviene **non** introdurre Atlas Triggers come strategia primaria: il lock-in non vale per i task una tantum.

## 5. Domande aperte da rispondere prima di scegliere

- Quante migrazioni ci aspettiamo nei prossimi 6 mesi?
- Vogliamo separare `hcaire_db_dev` e `hcaire_db_prod` ora o quando capita?
- Chi ha le credenziali Atlas con permessi di scrittura su tutte le collection?
- Su Railway accettiamo un release command che fallisce → rollback automatico, oppure preferiamo un job esterno (es. `npx migrate-mongo up` lanciato a mano dopo il deploy verde)?
- Per le migrazioni che richiedono di fermare il bot Telegram (rare ma possibili: es. spostare `ArticleRequest` su una collection rinominata), abbiamo una procedura di "manutenzione"?
