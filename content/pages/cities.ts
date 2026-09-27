import type { ContentPage, Section } from "@/lib/seo/pages";
import { PAGES_DATE } from "./shared";

/* Pagine locali: SOLO le città dove Davide incontra davvero i clienti di
   persona (decisione del 27/09/2026). Ognuna ha un angolo proprio: pagine
   fotocopia per città sono "doorway pages" e Google le penalizza. */

const base = { kind: "city" as const, locale: "it" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };

const servicesSection: Section = {
  id: "servizi",
  title: "Cosa posso costruire per la tua azienda",
  blocks: [
    {
      type: "list",
      items: [
        "[Chatbot e assistenti sui documenti aziendali](/it/servizi/chatbot-rag-documenti-aziendali), con le fonti citate;",
        "[Agenti AI che automatizzano processi ripetitivi](/it/servizi/agenti-ai-automazione-processi): fatture, email, report, CRM;",
        "[LLM privati](/it/servizi/llm-privati-on-premise) quando i dati non possono uscire dall'azienda;",
        "[Sviluppo LLM](/it/servizi/sviluppatore-llm) dentro i tuoi prodotti, con codice e documentazione tuoi;",
        "sistemi dati e AI per [fintech](/it/servizi/ai-per-fintech) ed [edtech](/it/servizi/ai-per-edtech).",
      ],
    },
  ],
};

const howSection = (city: string): Section => ({
  id: "come-lavoriamo",
  title: `Come lavoriamo a ${city}`,
  blocks: [
    {
      type: "p",
      text: `Il primo incontro può essere in presenza a ${city} o in videochiamata: serve a capire il processo, vedere i dati e decidere se l'AI è davvero la risposta. Analisi e workshop con il team si fanno di persona quando aiutano; sviluppo e rilasci procedono da remoto, con demo funzionanti a cadenza breve.`,
    },
  ],
});

export const citiesPages: ContentPage[] = [
  {
    ...base,
    key: "city-pescara",
    city: "Pescara",
    path: "/it/consulente-intelligenza-artificiale/pescara",
    serviceType: "Sviluppo di soluzioni di intelligenza artificiale su misura",
    metaTitle: "Consulente e sviluppatore AI a Pescara",
    metaDescription:
      "Soluzioni di intelligenza artificiale su misura per aziende di Pescara e dell'Abruzzo: chatbot sui documenti, agenti AI, automazione dei processi. Incontri in presenza.",
    eyebrow: "Intelligenza artificiale · Pescara",
    title: "Soluzioni AI su misura per le aziende di Pescara.",
    emphasis: "su misura",
    shortTitle: "Pescara",
    summary: "Sviluppo AI per aziende di Pescara e dell'Abruzzo, con incontri in presenza.",
    intro:
      "Sviluppo soluzioni di intelligenza artificiale su misura per aziende di Pescara e dell'Abruzzo: assistenti che rispondono sui documenti aziendali, agenti che automatizzano il lavoro ripetitivo, sistemi dati. Sono abruzzese, e con le imprese del territorio lavoro anche di persona.",
    sections: [
      {
        id: "abruzzo",
        title: "Perché un riferimento in Abruzzo",
        blocks: [
          {
            type: "p",
            text: "In Abruzzo ho già progetti in produzione: il motore che genera le prove del Premio Di Nicola, concorso regionale di matematica e logica che nel 2026 si è svolto tra Teramo e il Liceo Galilei di Pescara, e il sito della [Locanda Camilla](/it/casi-studio/locanda-camilla), dimora storica nel Parco Nazionale della Majella con 100/100 su SEO.",
          },
          {
            type: "p",
            text: "Turismo e ospitalità, commercio, studi professionali e PMI manifatturiere hanno processi simili: documenti da leggere, richieste da smistare, dati sparsi. È lì che l'AI fa risparmiare ore, non nelle demo.",
          },
        ],
      },
      servicesSection,
      howSection("Pescara"),
    ],
    faq: [
      {
        q: "Lavori in presenza a Pescara?",
        a: "Sì: incontri iniziali, analisi e workshop possono essere in presenza a Pescara e dintorni. Lo sviluppo procede da remoto con demo frequenti.",
      },
      {
        q: "Un progetto AI è alla portata di una piccola impresa?",
        a: "Spesso sì, se si parte da un processo preciso e misurabile invece che da \"mettere l'AI in azienda\". La prima call serve a capire proprio questo, ed è gratuita.",
      },
    ],
    related: ["city-teramo", "case-custom", "case-edtech", "funding"],
  },
  {
    ...base,
    key: "city-teramo",
    city: "Teramo",
    path: "/it/consulente-intelligenza-artificiale/teramo",
    serviceType: "Sviluppo di soluzioni di intelligenza artificiale su misura",
    metaTitle: "Consulente e sviluppatore AI a Teramo",
    metaDescription:
      "Intelligenza artificiale su misura per aziende, scuole ed enti della provincia di Teramo: automazione, assistenti sui documenti, piattaforme di apprendimento. Incontri in presenza.",
    eyebrow: "Intelligenza artificiale · Teramo",
    title: "Intelligenza artificiale su misura, dalla provincia di Teramo.",
    emphasis: "su misura",
    shortTitle: "Teramo",
    summary: "AI su misura per aziende, scuole ed enti della provincia di Teramo.",
    intro:
      "Per aziende, scuole ed enti della provincia di Teramo sviluppo soluzioni di intelligenza artificiale su misura: automazione dei processi, assistenti sui documenti, piattaforme di apprendimento personalizzato. Il primo incontro può essere in presenza.",
    sections: [
      {
        id: "territorio",
        title: "Un progetto già nato qui",
        blocks: [
          {
            type: "p",
            text: "Il Premio Di Nicola, concorso di matematica e logica per studenti abruzzesi fondato nel 2008, usa dal 2026 il motore che ho sviluppato per generare le prove: esercizi diversi, verificati uno per uno. La stampa locale ha raccontato il progetto; i dettagli sono in [Percorsi di apprendimento adattivi](/it/casi-studio/percorsi-apprendimento-adattivi).",
          },
          {
            type: "p",
            text: "Lo stesso approccio (generare contenuti solo se verificati, dati personali separati) vale per la formazione aziendale e per qualunque processo in cui un errore dell'AI non è accettabile.",
          },
        ],
      },
      servicesSection,
      howSection("Teramo"),
    ],
    faq: [
      {
        q: "Lavori anche con scuole ed enti di formazione?",
        a: "Sì. Oltre alle aziende, sviluppo [piattaforme di apprendimento con AI](/it/servizi/ai-per-edtech) per scuole, enti e concorsi, con attenzione particolare alla privacy degli studenti.",
      },
      {
        q: "Serve un'infrastruttura particolare?",
        a: "No. Si può partire con servizi cloud a consumo e passare a soluzioni più strutturate solo quando i risultati lo giustificano.",
      },
    ],
    related: ["city-pescara", "case-edtech", "svc-edtech", "funding"],
  },
  {
    ...base,
    key: "city-milano",
    city: "Milano",
    path: "/it/consulente-intelligenza-artificiale/milano",
    serviceType: "Sviluppo di soluzioni di intelligenza artificiale su misura",
    metaTitle: "Consulente e sviluppatore AI e LLM a Milano",
    metaDescription:
      "Sviluppo di soluzioni AI e LLM su misura a Milano: RAG, agenti, automazione, sistemi dati per fintech e startup. Incontri in presenza, codice e documentazione tuoi.",
    eyebrow: "Intelligenza artificiale · Milano",
    title: "Sviluppo AI e LLM a Milano, per aziende e startup.",
    emphasis: "per aziende e startup",
    shortTitle: "Milano",
    summary: "Sviluppo AI e LLM per aziende, fintech e startup a Milano.",
    intro:
      "Studio Ingegneria Informatica al Politecnico di Milano e lavoro come AI Automation Specialist in Conio, azienda fintech italiana. Per aziende e startup milanesi sviluppo soluzioni AI e LLM su misura: RAG sui documenti, agenti che automatizzano processi, sistemi dati per il fintech.",
    sections: [
      {
        id: "startup-fintech",
        title: "Startup e fintech",
        blocks: [
          {
            type: "p",
            text: "Per una startup il rischio è costruire una demo brillante che non regge in produzione. Lavoro sul passaggio dal prototipo al sistema: valutazioni automatiche della qualità, costi per richiesta sotto controllo, tracciabilità. Per il fintech, con la separazione tra logica deterministica e probabilistica che richiedono audit e compliance: vedi [AI per fintech](/it/servizi/ai-per-fintech).",
          },
          {
            type: "p",
            text: "Posso lavorare a progetto chiuso o affiancare il tuo team per un periodo definito come [sviluppatore LLM](/it/servizi/sviluppatore-llm).",
          },
        ],
      },
      servicesSection,
      howSection("Milano"),
    ],
    faq: [
      {
        q: "Affianchi team tecnici già esistenti?",
        a: "Sì, per periodi definiti: progettazione dell'architettura LLM, valutazioni, messa in produzione e passaggio di consegne al team interno.",
      },
    ],
    related: ["svc-llm-dev", "svc-fintech", "case-data", "case-fintech"],
  },
  {
    ...base,
    key: "city-roma",
    city: "Roma",
    path: "/it/consulente-intelligenza-artificiale/roma",
    serviceType: "Sviluppo di soluzioni di intelligenza artificiale su misura",
    metaTitle: "Consulente e sviluppatore AI a Roma, soluzioni su misura",
    metaDescription:
      "Soluzioni di intelligenza artificiale su misura per aziende e studi professionali di Roma: assistenti sui documenti, agenti AI, automazione, conformità all'AI Act. Incontri in presenza.",
    eyebrow: "Intelligenza artificiale · Roma",
    title: "Soluzioni AI su misura per aziende e studi di Roma.",
    emphasis: "su misura",
    shortTitle: "Roma",
    summary: "AI su misura per aziende e studi professionali di Roma, con attenzione a privacy e AI Act.",
    intro:
      "Per aziende e studi professionali di Roma sviluppo soluzioni di intelligenza artificiale su misura: assistenti che lavorano sui documenti interni senza esporli, agenti che automatizzano pratiche ripetitive, sistemi progettati tenendo conto di GDPR e AI Act.",
    sections: [
      {
        id: "documenti-e-regole",
        title: "Tanti documenti, regole precise",
        blocks: [
          {
            type: "p",
            text: "Studi legali, commercialisti, consulenti e aziende che lavorano con la pubblica amministrazione vivono di documenti: contratti, pratiche, normative, capitolati. Un [assistente RAG](/it/servizi/chatbot-rag-documenti-aziendali) risponde su quei documenti citando le fonti, e un [LLM privato](/it/servizi/llm-privati-on-premise) tiene i dati riservati dentro l'azienda.",
          },
          {
            type: "p",
            text: "Dal 2 agosto 2026 valgono gli obblighi di trasparenza dell'AI Act per chatbot e contenuti generati: li progetto dentro il sistema fin dall'inizio. Riepilogo pratico in [AI Act: checklist per PMI](/it/guide/ai-act-checklist-pmi).",
          },
        ],
      },
      servicesSection,
      howSection("Roma"),
    ],
    faq: [
      {
        q: "Lavori con studi professionali?",
        a: "Sì. Il caso tipico è un assistente sui documenti dello studio, con permessi per utente e dati che non escono dall'infrastruttura scelta.",
      },
    ],
    related: ["svc-rag", "svc-private-llm", "guide-ai-act", "guide-ai-documenti"],
  },
  {
    ...base,
    key: "city-bologna",
    city: "Bologna",
    path: "/it/consulente-intelligenza-artificiale/bologna",
    serviceType: "Sviluppo di soluzioni di intelligenza artificiale su misura",
    metaTitle: "Consulente e sviluppatore AI a Bologna per PMI",
    metaDescription:
      "Intelligenza artificiale su misura per PMI di Bologna e dell'Emilia-Romagna: automazione documentale, agenti AI, assistenti su manuali e schede tecniche. Incontri in presenza.",
    eyebrow: "Intelligenza artificiale · Bologna",
    title: "AI su misura per le PMI di Bologna.",
    emphasis: "su misura",
    shortTitle: "Bologna",
    summary: "Automazione documentale e assistenti tecnici per PMI di Bologna e dell'Emilia-Romagna.",
    intro:
      "Per le PMI di Bologna e dell'Emilia-Romagna sviluppo soluzioni di intelligenza artificiale su misura, pensate per chi produce e vende: automazione di ordini, fatture e documenti di trasporto, assistenti su manuali e schede tecniche, report che si compilano da soli.",
    sections: [
      {
        id: "pmi",
        title: "Dove l'AI aiuta una PMI che produce",
        blocks: [
          {
            type: "list",
            items: [
              "**Documenti in ingresso**: ordini, fatture e DDT letti ed estratti automaticamente, confrontati con gli ordini, con le anomalie segnalate a una persona.",
              "**Assistenza tecnica**: un assistente che risponde su manuali, schede prodotto e storico interventi, per il team interno o per i clienti.",
              "**Offerte e preventivi**: bozze preparate a partire da richieste, listini e casi simili.",
              "**Report**: dati raccolti da gestionale e fogli di calcolo e riassunti ogni settimana.",
            ],
          },
          {
            type: "p",
            text: "Si parte da un processo, si misura il tempo risparmiato, poi si allarga. Per i costi e le possibili agevolazioni vedi [bandi e incentivi per l'AI](/it/bandi-intelligenza-artificiale).",
          },
        ],
      },
      servicesSection,
      howSection("Bologna"),
    ],
    faq: [
      {
        q: "Il progetto si può agevolare fiscalmente?",
        a: "Alcuni investimenti in software e sistemi di AI possono rientrare nell'iperammortamento 2026, con requisiti precisi. È una valutazione da fare con il proprio commercialista: trovi il riepilogo nella pagina sui bandi.",
      },
    ],
    related: ["svc-agents", "guide-costi-chatbot", "funding", "svc-rag"],
  },
];
