// Testi di Privacy Policy, Cookie Policy e banner del consenso (IT/EN).
//
// BOZZA DA FAR REVISIONARE a un professionista prima della pubblicazione:
// descrive fedelmente cio' che fa il codice (lib/analytics/*, app/api/*,
// db/retention.mjs) ma non costituisce parere legale ne' certificazione.
//
// Segnaposto: i token {{CHIAVE}} sono sostituiti dal renderer
// (components/legal/LegalDocument.tsx). Quelli in `legalPlaceholders` con
// valore "TODO_..." compaiono evidenziati come "da completare".
// L'email arriva da content/contact.ts (fonte unica): cambia la', cambia qui.
import { contactEmail } from "@/content/contact";
import { RETENTION } from "@/db/retention.mjs";
import { SERVICES_HANDOFF_KEY } from "@/content/services";

export type LegalLocale = "it" | "en";

/** Data dell'ultimo aggiornamento, ISO. */
export const legalUpdatedAt = "2026-09-26";

export const legalPlaceholders: Record<string, { value: string; label: Record<LegalLocale, string> }> = {
  EMAIL: { value: contactEmail, label: { it: "email di contatto", en: "contact email" } },
  ADDRESS: { value: "TODO_INDIRIZZO", label: { it: "indirizzo / domicilio professionale", en: "business address" } },
  VAT: { value: "TODO_PARTITA_IVA", label: { it: "Partita IVA", en: "VAT number" } },
  HOSTING: { value: "Vercel Inc.", label: { it: "hosting", en: "hosting" } },
  DATABASE: { value: "Neon Inc.", label: { it: "database", en: "database" } },
  ANALYTICS_MONTHS: { value: String(RETENTION.analyticsMonths), label: { it: "mesi", en: "months" } },
  DB_REGION: { value: "TODO_REGIONE_DATABASE", label: { it: "regione del database (es. UE - Francoforte)", en: "database region (e.g. EU - Frankfurt)" } },
};

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "callout"; text: string }
  | { type: "consent-button" };

export type LegalSection = { id: string; title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  /** Porzione del titolo resa in Instrument Serif italic aqua (ART-DIRECTION §2). */
  emphasis: string;
  intro: string;
  updatedLabel: string;
  tocLabel: string;
  sections: LegalSection[];
};

const R = RETENTION;

// ------------------------------------------------------------------ PRIVACY

const privacyIt: LegalDoc = {
  metaTitle: "Privacy Policy — Davide De Sanctis",
  metaDescription: "Come vengono trattati i dati personali su questo sito: form contatti, statistiche, conservazione e diritti.",
  eyebrow: "Informativa privacy",
  title: "Come tratto i tuoi dati, in modo chiaro",
  emphasis: "in modo chiaro",
  intro:
    "Questa informativa spiega quali dati personali raccoglie questo sito, perché, per quanto tempo e quali diritti hai, ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e del D.lgs. 196/2003 (Codice Privacy).",
  updatedLabel: "Ultimo aggiornamento",
  tocLabel: "In questa pagina",
  sections: [
    {
      id: "titolare",
      title: "Titolare del trattamento",
      blocks: [
        {
          type: "p",
          text: "Il titolare del trattamento è Davide De Sanctis, {{ADDRESS}}, P.IVA {{VAT}}. Per qualsiasi domanda sulla privacy o per esercitare i tuoi diritti scrivi a [{{EMAIL}}](mailto:{{EMAIL}}).",
        },
        { type: "p", text: "Non è stato nominato un Responsabile della protezione dei dati (DPO), non essendo obbligatorio per questa attività." },
      ],
    },
    {
      id: "dati",
      title: "Quali dati tratto",
      blocks: [
        { type: "p", text: "**Richieste di contatto.** Quando usi il modulo contatti raccolgo: nome, indirizzo email, tipologia di progetto, testo del messaggio, lingua della pagina, data e ora dell'invio. Lo stesso vale per le email che mi scrivi direttamente." },
        {
          type: "p",
          text: "**Statistiche anonime (sempre attive, senza cookie).** Per capire come viene usato il sito registro eventi aggregati privi di qualsiasi identificativo: pagina visitata, sezioni della pagina effettivamente visualizzate e tempo di permanenza su ciascuna, lingua, dominio del sito di provenienza (solo il dominio, mai l'indirizzo completo), paese (fornito dall'infrastruttura di hosting), tipo di dispositivo, browser e sistema operativo in forma generica (es. \"mobile\", \"Chrome\", \"iOS\") e una fascia di larghezza dello schermo. In questa modalità nulla viene salvato nel tuo browser e gli eventi non possono essere collegati fra loro né ricondotti a te.",
        },
        {
          type: "p",
          text: "**Statistiche con il tuo consenso.** Solo se accetti nel banner, il sito genera un identificativo casuale del browser e uno della sessione (salvati nel tuo browser, vedi la [Cookie Policy](/{{LOCALE}}/cookie)). Servono a contare visitatori unici e di ritorno, la durata delle visite, la profondità di scorrimento e i click su link e bottoni (testo del link o del bottone, destinazione e sezione in cui si trova). Non vengono mai registrati i contenuti che scrivi nei campi dei moduli, né raccolti nome, email o altri dati che ti identifichino direttamente.",
        },
        {
          type: "p",
          text: "**Indirizzo IP.** Il tuo indirizzo IP non viene mai salvato nel database di questo sito. Viene trattato in modo transitorio dal fornitore di hosting per consegnare le pagine (e da questo usato per ricavare il solo paese), e dal sito, solo in memoria e sotto forma di hash con sale casuale, per limitare gli abusi (troppe richieste in poco tempo). Questo dato temporaneo non viene scritto da nessuna parte e scompare entro pochi minuti.",
        },
        { type: "p", text: "Il traffico generato da bot e crawler riconoscibili viene scartato. Il sito non usa strumenti di profilazione, pubblicità, pixel di social network o servizi di analisi di terze parti." },
      ],
    },
    {
      id: "finalita",
      title: "Finalità, basi giuridiche e conservazione",
      blocks: [
        {
          type: "table",
          head: ["Finalità", "Base giuridica", "Conservazione"],
          rows: [
            [
              "Rispondere alle richieste di contatto e di preventivo",
              "Misure precontrattuali adottate su tua richiesta (art. 6.1.b GDPR); per richieste generiche, legittimo interesse a rispondere (art. 6.1.f)",
              `${R.contactMonths} mesi dalla ricezione. Se la richiesta diventa un incarico, per la durata del rapporto e per i termini previsti dalla legge (es. obblighi fiscali)`,
            ],
            [
              "Statistiche anonime e aggregate sull'uso del sito",
              "Legittimo interesse a migliorare il sito (art. 6.1.f GDPR); nessuna informazione viene salvata o letta sul tuo dispositivo",
              `${R.analyticsMonths} mesi, poi cancellazione automatica`,
            ],
            [
              "Statistiche con identificativo (visitatori di ritorno, click, durata)",
              "Consenso (art. 6.1.a GDPR e art. 122 Codice Privacy), revocabile in ogni momento",
              `${R.analyticsMonths} mesi dall'ultima attività; la scelta viene richiesta di nuovo dopo ${R.consentMonths} mesi`,
            ],
            [
              "Sicurezza e prevenzione degli abusi",
              "Legittimo interesse alla sicurezza del sito (art. 6.1.f GDPR)",
              "Solo in memoria, pochi minuti",
            ],
          ],
        },
        { type: "p", text: "La cancellazione avviene tramite una procedura automatica eseguita periodicamente sul database." },
      ],
    },
    {
      id: "conferimento",
      title: "Obbligatorietà del conferimento",
      blocks: [
        { type: "p", text: "I dati del modulo contatti sono necessari per risponderti: senza, non posso dar seguito alla richiesta. Il consenso alle statistiche è del tutto facoltativo: rifiutarlo non limita in alcun modo l'uso del sito." },
      ],
    },
    {
      id: "sicurezza",
      title: "Come proteggo i dati",
      blocks: [
        { type: "p", text: "I dati viaggiano su connessioni cifrate (HTTPS/TLS). L'accesso al database e al pannello di consultazione è riservato al titolare e alle sole persone da lui espressamente autorizzate, ciascuna con credenziali personali; le password sono conservate solo in forma di hash." },
      ],
    },
    {
      id: "destinatari",
      title: "Chi riceve i dati",
      blocks: [
        { type: "p", text: "I dati non vengono venduti né ceduti a terzi per finalità di marketing. Sono trattati, per mio conto e in qualità di responsabili del trattamento (art. 28 GDPR), dai fornitori tecnici necessari al funzionamento del sito:" },
        {
          type: "list",
          items: [
            "hosting e distribuzione del sito: {{HOSTING}} (fornitore da confermare);",
            "database: {{DATABASE}} (fornitore da confermare), regione {{DB_REGION}};",
            "invio delle notifiche email del modulo contatti: Resend, Inc.",
          ],
        },
        { type: "p", text: "L'elenco aggiornato dei responsabili è disponibile su richiesta. I dati possono inoltre essere comunicati alle autorità quando previsto dalla legge." },
      ],
    },
    {
      id: "trasferimenti",
      title: "Trasferimenti fuori dall'UE",
      blocks: [
        { type: "p", text: "Alcuni fornitori hanno sede negli Stati Uniti. Dove possibile scelgo server nell'Unione europea; negli altri casi il trasferimento avviene sulla base della decisione di adeguatezza UE-USA (EU-U.S. Data Privacy Framework), se il fornitore vi aderisce, oppure delle Clausole contrattuali standard approvate dalla Commissione europea (art. 46 GDPR)." },
      ],
    },
    {
      id: "diritti",
      title: "I tuoi diritti",
      blocks: [
        { type: "p", text: "In qualunque momento puoi esercitare i diritti previsti dagli artt. 15-22 GDPR:" },
        {
          type: "list",
          items: [
            "accesso ai tuoi dati e copia degli stessi (art. 15);",
            "rettifica dei dati inesatti (art. 16);",
            "cancellazione (art. 17);",
            "limitazione del trattamento (art. 18);",
            "portabilità dei dati forniti (art. 20);",
            "opposizione al trattamento basato sul legittimo interesse (art. 21);",
            "revoca del consenso in ogni momento, senza pregiudicare i trattamenti già svolti (art. 7.3);",
            "non essere sottoposto a decisioni basate unicamente su trattamenti automatizzati (art. 22): questo sito non ne prende.",
          ],
        },
        { type: "p", text: "Scrivi a [{{EMAIL}}](mailto:{{EMAIL}}): rispondo entro un mese, come previsto dall'art. 12 GDPR. Per le statistiche anonime non è possibile individuare i dati riferiti a una persona, proprio perché privi di identificativi." },
      ],
    },
    {
      id: "reclamo",
      title: "Reclamo al Garante",
      blocks: [
        { type: "p", text: "Se ritieni che il trattamento violi la normativa puoi proporre reclamo al Garante per la protezione dei dati personali (art. 77 GDPR), Piazza Venezia 11, 00187 Roma, [www.garanteprivacy.it](https://www.garanteprivacy.it), o all'autorità di controllo dello Stato UE in cui risiedi o lavori." },
      ],
    },
    {
      id: "minori",
      title: "Minori",
      blocks: [{ type: "p", text: "Il sito si rivolge a professionisti e aziende e non è destinato a minori di 14 anni." }],
    },
    {
      id: "modifiche",
      title: "Modifiche a questa informativa",
      blocks: [{ type: "p", text: "L'informativa può essere aggiornata, ad esempio al cambiare dei fornitori. La data dell'ultimo aggiornamento è indicata in cima alla pagina." }],
    },
  ],
};

const privacyEn: LegalDoc = {
  metaTitle: "Privacy Policy — Davide De Sanctis",
  metaDescription: "How personal data is processed on this site: contact form, analytics, retention and your rights.",
  eyebrow: "Privacy notice",
  title: "How I handle your data, plainly",
  emphasis: "plainly",
  intro:
    "This notice explains what personal data this site collects, why, for how long and what rights you have, under Articles 13 and 14 of Regulation (EU) 2016/679 (GDPR) and the Italian Privacy Code (Legislative Decree 196/2003).",
  updatedLabel: "Last updated",
  tocLabel: "On this page",
  sections: [
    {
      id: "controller",
      title: "Data controller",
      blocks: [
        { type: "p", text: "The data controller is Davide De Sanctis, {{ADDRESS}}, VAT no. {{VAT}}. For any privacy question or to exercise your rights, write to [{{EMAIL}}](mailto:{{EMAIL}})." },
        { type: "p", text: "No Data Protection Officer has been appointed, as one is not required for this activity." },
      ],
    },
    {
      id: "data",
      title: "What data I process",
      blocks: [
        { type: "p", text: "**Contact requests.** When you use the contact form I collect: name, email address, project type, message, page language, and the date and time of submission. The same applies to emails you send me directly." },
        {
          type: "p",
          text: "**Anonymous statistics (always on, no cookies).** To understand how the site is used I record aggregate events that carry no identifier at all: page visited, which sections of the page were actually viewed and for how long, language, referring site (domain only, never the full address), country (provided by the hosting infrastructure), and generic device type, browser and operating system (e.g. \"mobile\", \"Chrome\", \"iOS\"), plus a screen-width bucket. In this mode nothing is stored in your browser, and events cannot be linked to each other or to you.",
        },
        {
          type: "p",
          text: "**Statistics with your consent.** Only if you accept in the banner, the site generates a random browser identifier and a session identifier (stored in your browser, see the [Cookie Policy](/{{LOCALE}}/cookie)). They are used to count unique and returning visitors, visit duration, scroll depth and clicks on links and buttons (the link or button text, its destination and the section it sits in). What you type into form fields is never recorded, and no name, email or other directly identifying data is collected.",
        },
        {
          type: "p",
          text: "**IP address.** Your IP address is never stored in this site's database. It is processed transiently by the hosting provider to deliver pages (and used by it to derive your country only), and by the site, in memory only and as a salted hash, to limit abuse (too many requests in a short time). This temporary value is never written anywhere and disappears within minutes.",
        },
        { type: "p", text: "Traffic from recognisable bots and crawlers is discarded. The site uses no profiling, advertising, social media pixels or third-party analytics services." },
      ],
    },
    {
      id: "purposes",
      title: "Purposes, legal bases and retention",
      blocks: [
        {
          type: "table",
          head: ["Purpose", "Legal basis", "Retention"],
          rows: [
            [
              "Replying to contact and quote requests",
              "Pre-contractual steps taken at your request (Art. 6(1)(b) GDPR); for general enquiries, legitimate interest in replying (Art. 6(1)(f))",
              `${R.contactMonths} months from receipt. If the request becomes an engagement, for the duration of the relationship and the periods required by law (e.g. tax obligations)`,
            ],
            [
              "Anonymous, aggregate statistics on site usage",
              "Legitimate interest in improving the site (Art. 6(1)(f) GDPR); nothing is stored on or read from your device",
              `${R.analyticsMonths} months, then automatic deletion`,
            ],
            [
              "Statistics with an identifier (returning visitors, clicks, duration)",
              "Consent (Art. 6(1)(a) GDPR and Art. 122 Italian Privacy Code), which you can withdraw at any time",
              `${R.analyticsMonths} months from last activity; your choice is asked again after ${R.consentMonths} months`,
            ],
            ["Security and abuse prevention", "Legitimate interest in site security (Art. 6(1)(f) GDPR)", "In memory only, a few minutes"],
          ],
        },
        { type: "p", text: "Deletion is carried out by an automatic procedure that runs periodically on the database." },
      ],
    },
    {
      id: "provision",
      title: "Is providing data mandatory?",
      blocks: [
        { type: "p", text: "Contact form data is needed to reply to you: without it I cannot follow up. Consent to statistics is entirely optional: declining does not limit your use of the site in any way." },
      ],
    },
    {
      id: "security",
      title: "How data is protected",
      blocks: [
        { type: "p", text: "Data travels over encrypted connections (HTTPS/TLS). Access to the database and to the reporting panel is restricted to the controller and to people he has expressly authorised, each with personal credentials; passwords are stored only as hashes." },
      ],
    },
    {
      id: "recipients",
      title: "Who receives the data",
      blocks: [
        { type: "p", text: "Data is not sold or shared with third parties for marketing. It is processed on my behalf, as processors (Art. 28 GDPR), by the technical providers the site needs to run:" },
        {
          type: "list",
          items: [
            "site hosting and delivery: {{HOSTING}} (provider to be confirmed);",
            "database: {{DATABASE}} (provider to be confirmed), region {{DB_REGION}};",
            "contact-form email notifications: Resend, Inc.",
          ],
        },
        { type: "p", text: "The current list of processors is available on request. Data may also be disclosed to authorities where required by law." },
      ],
    },
    {
      id: "transfers",
      title: "Transfers outside the EU",
      blocks: [
        { type: "p", text: "Some providers are based in the United States. Where possible I choose servers in the European Union; otherwise transfers rely on the EU-U.S. Data Privacy Framework adequacy decision, where the provider is certified, or on the Standard Contractual Clauses approved by the European Commission (Art. 46 GDPR)." },
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      blocks: [
        { type: "p", text: "At any time you can exercise the rights under Articles 15-22 GDPR:" },
        {
          type: "list",
          items: [
            "access to your data and a copy of it (Art. 15);",
            "rectification of inaccurate data (Art. 16);",
            "erasure (Art. 17);",
            "restriction of processing (Art. 18);",
            "portability of the data you provided (Art. 20);",
            "objection to processing based on legitimate interest (Art. 21);",
            "withdrawal of consent at any time, without affecting processing already carried out (Art. 7(3));",
            "not being subject to decisions based solely on automated processing (Art. 22): this site makes none.",
          ],
        },
        { type: "p", text: "Write to [{{EMAIL}}](mailto:{{EMAIL}}): I reply within one month, as required by Art. 12 GDPR. Anonymous statistics cannot be traced back to a person precisely because they carry no identifier." },
      ],
    },
    {
      id: "complaint",
      title: "Complaints",
      blocks: [
        { type: "p", text: "If you believe the processing breaches the law you can lodge a complaint with the Italian Data Protection Authority (Garante per la protezione dei dati personali, Art. 77 GDPR), Piazza Venezia 11, 00187 Rome, [www.garanteprivacy.it](https://www.garanteprivacy.it), or with the supervisory authority of the EU country where you live or work." },
      ],
    },
    {
      id: "minors",
      title: "Minors",
      blocks: [{ type: "p", text: "The site is aimed at professionals and businesses and is not intended for children under 14." }],
    },
    {
      id: "changes",
      title: "Changes to this notice",
      blocks: [{ type: "p", text: "This notice may be updated, for example when providers change. The date of the last update is shown at the top of the page." }],
    },
  ],
};

// ------------------------------------------------------------------ COOKIE

const cookieIt: LegalDoc = {
  metaTitle: "Cookie Policy — Davide De Sanctis",
  metaDescription: "Cookie e strumenti di archiviazione del browser usati dal sito, e come cambiare le tue preferenze.",
  eyebrow: "Cookie policy",
  title: "Pochi cookie, tutti dichiarati",
  emphasis: "tutti dichiarati",
  intro:
    "Questa pagina elenca tutti i cookie e gli altri strumenti di archiviazione nel browser (localStorage e sessionStorage, equiparati ai cookie dall'art. 122 del Codice Privacy e dalle Linee guida del Garante del 10 giugno 2021) usati da questo sito.",
  updatedLabel: "Ultimo aggiornamento",
  tocLabel: "In questa pagina",
  sections: [
    {
      id: "in-breve",
      title: "In breve",
      blocks: [
        {
          type: "list",
          items: [
            "Nessun cookie di profilazione o pubblicitario, nessun cookie di terze parti, nessun pixel di social network.",
            "I font sono ospitati sul sito stesso: nessuna richiesta a servizi esterni come Google Fonts.",
            "Senza il tuo consenso il sito conta solo visite anonime e aggregate e non salva nulla nel tuo browser, a parte la tua scelta e la lingua.",
            "Con il tuo consenso salva un identificativo casuale per statistiche più accurate (visitatori di ritorno, click, durata). Nessun dato viene condiviso con terzi per fini commerciali.",
            "Se il browser invia i segnali Do Not Track o Global Privacy Control, il sito li tratta come un rifiuto e non mostra il banner.",
          ],
        },
      ],
    },
    {
      id: "elenco",
      title: "Elenco completo",
      blocks: [
        {
          type: "table",
          head: ["Nome", "Tipo", "Finalità", "Durata", "Consenso"],
          rows: [
            ["NEXT_LOCALE", "Cookie tecnico, prima parte", "Ricorda la lingua scelta (italiano/inglese)", "Sessione del browser", "Non richiesto"],
            ["dds.consent", "localStorage, tecnico", "Ricorda la tua scelta sulle statistiche, per non riproporre il banner", `${R.consentMonths} mesi, poi la scelta viene richiesta di nuovo`, "Non richiesto"],
            ["dds.vid", "localStorage, statistico", "Identificativo casuale del browser: visitatori unici e di ritorno", `Fino alla revoca, al massimo ${R.consentMonths} mesi (durata della scelta)`, "Richiesto"],
            ["dds.sid", "sessionStorage, statistico", "Identificativo casuale della visita: durata, pagine e click della sessione", "Chiusura della scheda o 30 minuti di inattività", "Richiesto"],
            [SERVICES_HANDOFF_KEY, "localStorage, tecnico", "Porta il pacchetto scelto nella sezione Servizi dentro il modulo contatti", "Rimosso appena il modulo lo legge", "Non richiesto"],
            ["dds.notrack", "localStorage, tecnico", "Esclude dalle statistiche i dispositivi degli amministratori del sito", "Fino alla cancellazione", "Non richiesto (solo amministratori)"],
            ["dds_adm", "Cookie tecnico, httpOnly", "Sessione di accesso all'area riservata (solo persone autorizzate, mai per i visitatori)", `${R.adminSessionDays} giorni`, "Non richiesto"],
          ],
        },
        { type: "p", text: "I dati statistici raccolti con il consenso sono conservati sul server per {{ANALYTICS_MONTHS}} mesi e poi cancellati automaticamente. Maggiori dettagli nella [Privacy Policy](/{{LOCALE}}/privacy)." },
      ],
    },
    {
      id: "preferenze",
      title: "Cambiare le preferenze",
      blocks: [
        { type: "p", text: "Puoi cambiare idea in qualsiasi momento, con la stessa facilità con cui hai scelto: usa il bottone qui sotto o il link \"Preferenze cookie\" nel footer di ogni pagina. Se revochi il consenso, gli identificativi vengono rimossi subito dal tuo browser." },
        { type: "consent-button" },
        { type: "p", text: "Puoi anche cancellare cookie e dati dei siti dalle impostazioni del browser (Chrome, Firefox, Safari, Edge: sezione Privacy / Dati dei siti). In questo caso il banner comparirà di nuovo alla visita successiva." },
      ],
    },
    {
      id: "contatti",
      title: "Contatti",
      blocks: [{ type: "p", text: "Per domande su questa pagina scrivi a [{{EMAIL}}](mailto:{{EMAIL}})." }],
    },
  ],
};

const cookieEn: LegalDoc = {
  metaTitle: "Cookie Policy — Davide De Sanctis",
  metaDescription: "Cookies and browser storage used by this site, and how to change your preferences.",
  eyebrow: "Cookie policy",
  title: "Few cookies, all of them declared",
  emphasis: "all of them declared",
  intro:
    "This page lists every cookie and every other browser storage mechanism (localStorage and sessionStorage, treated like cookies by Art. 122 of the Italian Privacy Code and the Garante's Guidelines of 10 June 2021) used by this site.",
  updatedLabel: "Last updated",
  tocLabel: "On this page",
  sections: [
    {
      id: "summary",
      title: "In short",
      blocks: [
        {
          type: "list",
          items: [
            "No profiling or advertising cookies, no third-party cookies, no social media pixels.",
            "Fonts are hosted on the site itself: no requests to external services such as Google Fonts.",
            "Without your consent the site only counts anonymous, aggregate visits and stores nothing in your browser apart from your choice and your language.",
            "With your consent it stores a random identifier for more accurate statistics (returning visitors, clicks, duration). No data is shared with third parties for commercial purposes.",
            "If your browser sends Do Not Track or Global Privacy Control signals, the site treats them as a refusal and does not show the banner.",
          ],
        },
      ],
    },
    {
      id: "list",
      title: "Full list",
      blocks: [
        {
          type: "table",
          head: ["Name", "Type", "Purpose", "Duration", "Consent"],
          rows: [
            ["NEXT_LOCALE", "Technical first-party cookie", "Remembers your language (Italian/English)", "Browser session", "Not required"],
            ["dds.consent", "localStorage, technical", "Remembers your statistics choice so the banner is not shown again", `${R.consentMonths} months, then you are asked again`, "Not required"],
            ["dds.vid", "localStorage, analytics", "Random browser identifier: unique and returning visitors", `Until withdrawal, at most ${R.consentMonths} months (lifetime of your choice)`, "Required"],
            ["dds.sid", "sessionStorage, analytics", "Random visit identifier: session duration, pages and clicks", "Tab closed or 30 minutes of inactivity", "Required"],
            [SERVICES_HANDOFF_KEY, "localStorage, technical", "Carries the package chosen in the Services section into the contact form", "Removed as soon as the form reads it", "Not required"],
            ["dds.notrack", "localStorage, technical", "Excludes the site administrators' devices from statistics", "Until deleted", "Not required (administrators only)"],
            ["dds_adm", "Technical cookie, httpOnly", "Sign-in session for the restricted area (authorised people only, never set for visitors)", `${R.adminSessionDays} days`, "Not required"],
          ],
        },
        { type: "p", text: "Statistics collected with consent are kept on the server for {{ANALYTICS_MONTHS}} months and then deleted automatically. More details in the [Privacy Policy](/{{LOCALE}}/privacy)." },
      ],
    },
    {
      id: "preferences",
      title: "Changing your preferences",
      blocks: [
        { type: "p", text: "You can change your mind at any time, as easily as you chose: use the button below or the \"Cookie preferences\" link in the footer of every page. If you withdraw consent, the identifiers are removed from your browser immediately." },
        { type: "consent-button" },
        { type: "p", text: "You can also delete cookies and site data from your browser settings (Chrome, Firefox, Safari, Edge: Privacy / Site data). The banner will then appear again on your next visit." },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [{ type: "p", text: "For questions about this page write to [{{EMAIL}}](mailto:{{EMAIL}})." }],
    },
  ],
};

export const privacyPolicy: Record<LegalLocale, LegalDoc> = { it: privacyIt, en: privacyEn };
export const cookiePolicy: Record<LegalLocale, LegalDoc> = { it: cookieIt, en: cookieEn };

// ------------------------------------------------------------------ BANNER

export type ConsentCopy = {
  label: string;
  title: string;
  body: string;
  policyLink: string;
  accept: string;
  decline: string;
  preferences: string;
  back: string;
  detailsTitle: string;
  necessaryTitle: string;
  necessaryBody: string;
  analyticsTitle: string;
  analyticsBody: string;
  alwaysOn: string;
  save: string;
  close: string;
  consentButton: string;
  statusGranted: string;
  statusDenied: string;
  statusUnset: string;
};

export const consentCopy: Record<LegalLocale, ConsentCopy> = {
  it: {
    label: "Preferenze sulla privacy",
    title: "Statistiche, solo se vuoi",
    body: "Conto le visite in forma anonima, senza cookie. Se accetti, uso anche un identificativo casuale per capire meglio cosa ti è utile. Niente pubblicità, niente terze parti.",
    policyLink: "Cookie policy",
    accept: "Accetta",
    decline: "Rifiuta",
    preferences: "Preferenze",
    back: "Indietro",
    detailsTitle: "Le tue preferenze",
    necessaryTitle: "Tecnici e statistiche anonime",
    necessaryBody: "Lingua, la tua scelta e un conteggio anonimo delle visite, senza nulla salvato sul dispositivo.",
    analyticsTitle: "Statistiche con identificativo",
    analyticsBody: `Visitatori di ritorno, click e durata delle visite, tramite un id casuale nel browser. Conservate ${R.analyticsMonths} mesi.`,
    alwaysOn: "Sempre attivi",
    save: "Salva scelta",
    close: "Chiudi",
    consentButton: "Apri le preferenze cookie",
    statusGranted: "Stato attuale: statistiche con identificativo accettate.",
    statusDenied: "Stato attuale: solo statistiche anonime.",
    statusUnset: "Stato attuale: nessuna scelta (solo statistiche anonime).",
  },
  en: {
    label: "Privacy preferences",
    title: "Statistics, only if you want",
    body: "I count visits anonymously, without cookies. If you accept, I also use a random identifier to better understand what's useful to you. No ads, no third parties.",
    policyLink: "Cookie policy",
    accept: "Accept",
    decline: "Decline",
    preferences: "Preferences",
    back: "Back",
    detailsTitle: "Your preferences",
    necessaryTitle: "Technical and anonymous statistics",
    necessaryBody: "Language, your choice and an anonymous visit count, with nothing stored on your device.",
    analyticsTitle: "Statistics with an identifier",
    analyticsBody: `Returning visitors, clicks and visit duration, via a random ID in your browser. Kept for ${R.analyticsMonths} months.`,
    alwaysOn: "Always on",
    save: "Save choice",
    close: "Close",
    consentButton: "Open cookie preferences",
    statusGranted: "Current status: statistics with an identifier accepted.",
    statusDenied: "Current status: anonymous statistics only.",
    statusUnset: "Current status: no choice yet (anonymous statistics only).",
  },
};
