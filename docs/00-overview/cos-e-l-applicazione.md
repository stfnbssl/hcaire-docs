---
title: Cos'è l'applicazione
sidebar_position: 1
---

# Cos'è l'applicazione

**HCAIRE Blog** (codename `hcaire-blog`) è una webapp full-stack che pubblica e gestisce contenuti tematici legati al progetto **HCAIRE** (Human-Centred AI Research and Education) e al metodo **Sviluppo Bambino**.

Non è un blog generico: la pubblicazione di articoli markdown è solo **uno dei moduli**. Sopra al CMS vivono diversi **verticali tematici** dedicati a un dominio, ciascuno con pagine, layout e contenuti dedicati.

## Aree funzionali principali

| Area | Cosa fa |
|------|---------|
| **Blog/CMS** | Articoli markdown pubblici (`/blog/:slug`), creazione/modifica via dashboard admin, paywall a livello di articolo (`accessType: 'free' \| 'plus'`) |
| **Verticale HCAIRE** | Pagine narrative del progetto HCAIRE, manifesto, protocolli (`/hcaire/*`) |
| **Verticale Sviluppo Bambino** | Metodo, fasi, concetti, modello, assi strutturali, interlocuzioni interdisciplinari, **produzioni** (pipeline F2/F3 di costruzione dispositivi configurazionali) |
| **Letture critiche** | Sezione che ospita "letture" (opere) commentate, con back-office per esecuzione step di analisi |
| **Account utente** | Profilo Clerk + gestione abbonamento Lemon Squeezy |
| **Pricing** | Pagina commerciale con piani |
| **Admin CMS** | Dashboard amministrativa per: contenuti, configurazione sito, testi del sito, richieste articoli, letture, workflow log |

## Chi la usa

- **Lettori pubblici** — accedono ai contenuti `free` senza autenticazione.
- **Utenti registrati (free)** — autenticati Clerk, possono accedere a contenuti free e gestire profilo.
- **Utenti `plus`** — abbonati Lemon Squeezy, sbloccano i contenuti `accessType: 'plus'` e funzionalità Bartleby.
- **Admin** — utenti Clerk con `publicMetadata.role === 'admin'`, accedono alla dashboard CMS.

## Flussi di dati principali

1. **Articoli blog** → MongoDB Atlas, collection `hcaire-content`, modello `Content`.
2. **Contenuti narrativi dei verticali** (HCAIRE, Sviluppo Bambino, progetti) → file markdown con frontmatter sotto `server/content/`, letti da `staticContentReader.ts`.
3. **Pipeline produzioni Sviluppo Bambino** → file JSON statici sotto `client/public/pipeline/` (vedi modulo [Produzioni](../20-modules/sviluppo-bambino/produzioni.md)).
4. **Eventi pipeline e letture** → Redis Cloud (pub/sub), processati dal sidecar `local`.
5. **Notifiche eventi** → Telegram bot.
6. **Subscription / pagamenti** → webhook Lemon Squeezy → MongoDB `UserSubscription`.

## Quello che HCAIRE Blog **non** è

- Non è una piattaforma e-commerce: i pagamenti sono delegati a Lemon Squeezy.
- Non è una piattaforma video: i corsi pubblicati sono in formato slide React (componenti `corso-fase*`).
- Non gestisce esecuzioni della pipeline produzioni *dal sito*: oggi è in sola lettura. Vedi §8 di [Produzioni](../20-modules/sviluppo-bambino/produzioni.md) per i vincoli.

:::note Da confermare con il proprietario del prodotto
Le righe sopra sono ricostruite leggendo il codice. Una conferma esplicita su pubblico target, posizionamento commerciale e roadmap aiuterebbe a stabilizzare questa pagina.
:::
