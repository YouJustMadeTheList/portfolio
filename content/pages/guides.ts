import type { ContentPage } from "@/lib/seo/pages";
import { PAGES_DATE } from "./shared";

const base = { kind: "guide" as const, locale: "it" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };

export const guidesPages: ContentPage[] = [
  {
    ...base,
    key: "guide-costi-chatbot",
    path: "/it/guide/quanto-costa-chatbot-ai-aziendale",
    metaTitle: "Quanto costa un chatbot AI aziendale nel 2026",
    metaDescription:
      "Quanto costa un chatbot AI per un'azienda: SaaS, su misura o RAG sui documenti. Voci di costo, costo mensile delle API, esempi di calcolo e come evitare sorprese.",
    eyebrow: "Guida · Costi",
    title: "Quanto costa un chatbot AI aziendale nel 2026.",
    emphasis: "Quanto costa",
    shortTitle: "Quanto costa un chatbot AI aziendale",
    summary: "SaaS, su misura o RAG: le voci di costo e come stimare la spesa mensile.",
    intro:
      "Un chatbot AI aziendale costa da poche decine di euro al mese per un servizio pronto a decine di migliaia di euro per un sistema su misura integrato con i documenti e i gestionali. Sul mercato italiano i progetti vanno indicativamente da 3.500 euro per un assistente base a oltre 50.000 per quelli complessi. La cifra giusta dipende da tre scelte: pronto o su misura, su quali dati risponde, quante domande riceve.",
    sections: [
      {
        id: "tre-strade",
        title: "Le tre strade, a confronto",
        blocks: [
          {
            type: "table",
            head: ["Soluzione", "Come si paga", "Adatta quando", "Limiti"],
            rows: [
              ["Chatbot SaaS pronto", "Abbonamento mensile", "Domande frequenti semplici sul sito", "Poca integrazione con i tuoi sistemi, dati sul fornitore"],
              ["Chatbot su misura", "Progetto una tantum + costi di utilizzo", "Processi specifici, integrazioni, controllo del comportamento", "Serve un progetto fatto bene"],
              ["Assistente RAG sui documenti", "Progetto + utilizzo + manutenzione dell'indice", "Risposte su manuali, contratti, procedure, con le fonti", "La qualità dipende dalla preparazione dei documenti"],
            ],
          },
        ],
      },
      {
        id: "voci",
        title: "Le voci di costo di un progetto su misura",
        blocks: [
          {
            type: "list",
            items: [
              "**Analisi e progettazione**: capire il processo, i dati e cosa deve fare l'assistente. È la voce che evita di rifare tutto dopo.",
              "**Preparazione dei dati**: estrazione, pulizia e suddivisione dei documenti. Con PDF scansionati, tabelle e immagini cresce molto.",
              "**Sviluppo e integrazioni**: interfaccia, collegamento a CRM, gestionale, sito, permessi per utente.",
              "**Valutazione**: domande di prova e metriche per misurare la qualità prima del rilascio.",
              "**Utilizzo del modello**: si paga per quantità di testo elaborato (token), ogni mese.",
              "**Hosting e manutenzione**: server, database vettoriale, aggiornamento dei documenti, monitoraggio.",
            ],
          },
        ],
      },
      {
        id: "costo-mensile",
        title: "Come stimare il costo mensile del modello",
        blocks: [
          {
            type: "p",
            text: "Il costo di utilizzo si stima con una moltiplicazione: **domande al mese × token per domanda × prezzo per token**. Una domanda a un assistente RAG consuma più token di una chat semplice, perché al modello vengono passati anche i passaggi dei documenti recuperati.",
          },
          {
            type: "p",
            text: "I prezzi per token cambiano spesso e variano molto tra un modello e l'altro: per compiti semplici (classificare, estrarre, riassumere) un modello piccolo costa una frazione di quello di punta e basta. Scegliere il modello per ogni compito, invece di usare sempre il più potente, è la leva principale sui costi.",
          },
        ],
      },
      {
        id: "sorprese",
        title: "Come evitare sorprese",
        blocks: [
          {
            type: "list",
            items: [
              "partire da un prototipo sui tuoi dati reali prima del progetto completo;",
              "fissare limiti di spesa e di richieste per utente;",
              "misurare la qualità con domande di prova: un assistente che sbaglia costa più di uno che non c'è;",
              "chiarire chi possiede codice, dati e indice, per non restare legati a un fornitore.",
            ],
          },
          {
            type: "p",
            text: "Se il sistema viene acquistato come bene e integrato nei tuoi sistemi, può rientrare nell'iperammortamento 2026: vedi [bandi e incentivi per l'AI](/it/bandi-intelligenza-artificiale).",
          },
        ],
      },
    ],
    faq: [
      {
        q: "Quanto costa al mese un chatbot AI?",
        a: "Un servizio pronto parte da poche decine di euro al mese. Un sistema su misura ha un costo di progetto iniziale e poi costi mensili di utilizzo del modello e di hosting, che dipendono dal numero di domande e dal modello scelto.",
      },
      {
        q: "Conviene un chatbot pronto o su misura?",
        a: "Pronto se servono risposte semplici a domande frequenti. Su misura se l'assistente deve lavorare sui tuoi documenti, collegarsi ai tuoi sistemi o seguire regole precise.",
      },
      {
        q: "Quanto costa un chatbot che risponde sui documenti aziendali?",
        a: "È un progetto RAG: al costo di sviluppo si aggiungono la preparazione dei documenti e un costo di utilizzo un po' più alto per domanda. Il prezzo si definisce dopo aver visto quantità e formato dei documenti.",
      },
    ],
    sources: [{ label: "SOS-AI: quanto costa un chatbot AI (28/04/2026)", href: "https://sos-ai.eu/quanto-costa-chatbot/" }],
    related: ["svc-rag", "guide-ai-documenti", "guide-chatgpt-business", "funding"],
  },

  {
    ...base,
    key: "guide-ai-documenti",
    path: "/it/guide/ai-documenti-aziendali-senza-chatgpt",
    metaTitle: "Usare l'AI sui documenti aziendali senza darli a ChatGPT",
    metaDescription:
      "Come far rispondere l'AI sui documenti della tua azienda tenendo i dati sotto controllo: RAG, API aziendali, cloud europeo o modello privato. Pro, contro e GDPR.",
    eyebrow: "Guida · Privacy",
    title: "Usare l'AI sui documenti aziendali senza darli a ChatGPT.",
    emphasis: "senza darli a ChatGPT",
    shortTitle: "AI sui documenti senza esporli",
    summary: "RAG, API aziendali, cloud UE o modello privato: come scegliere e cosa cambia per il GDPR.",
    intro:
      "Si può far rispondere un'AI sui documenti aziendali senza incollarli in una chat pubblica: con un sistema RAG i documenti restano in un archivio controllato da te e il modello legge solo i passaggi necessari a ogni domanda. Resta da decidere dove gira il modello, e ci sono tre opzioni.",
    sections: [
      {
        id: "problema",
        title: "Qual è il rischio vero",
        blocks: [
          {
            type: "p",
            text: "Il rischio non è l'AI in sé, ma dove finiscono i dati. Incollare contratti o dati di clienti in un account personale di un chatbot significa affidarli a un servizio con condizioni pensate per i consumatori, fuori dai controlli aziendali. Per un'azienda serve sapere chi vede cosa, dove sono conservati i dati e se vengono usati per addestrare modelli.",
          },
        ],
      },
      {
        id: "come-funziona-rag",
        title: "Come funziona il RAG, in breve",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "i documenti vengono divisi in passaggi e indicizzati in un archivio sotto il tuo controllo;",
              "a ogni domanda il sistema recupera solo i passaggi pertinenti, rispettando i permessi dell'utente;",
              "il modello risponde basandosi su quei passaggi e cita le fonti;",
              "ogni domanda e risposta viene registrata per controllo.",
            ],
          },
        ],
      },
      {
        id: "dove-gira",
        title: "Dove può girare il modello",
        blocks: [
          {
            type: "table",
            head: ["Opzione", "Dati", "Qualità", "Costo"],
            rows: [
              ["API aziendale di un grande fornitore", "Escono verso il fornitore, con impegni contrattuali di non addestramento", "La più alta", "A consumo"],
              ["Modello in cloud europeo", "Restano in UE, presso il cloud scelto", "Alta", "A consumo o a noleggio"],
              ["Modello privato sui tuoi server", "Non escono mai", "Buona, un gradino sotto sui compiti più complessi", "Hardware e gestione"],
            ],
          },
          {
            type: "p",
            text: "Spesso si combinano: modello privato per i documenti più riservati, API per il resto. Approfondimento in [LLM privati e on-premise](/it/servizi/llm-privati-on-premise).",
          },
        ],
      },
      {
        id: "gdpr",
        title: "GDPR e regole italiane",
        blocks: [
          {
            type: "list",
            items: [
              "serve una base giuridica e un'informativa che citi il trattamento con strumenti di AI;",
              "con un fornitore esterno serve un accordo sul trattamento dei dati e attenzione ai trasferimenti fuori UE;",
              "dal 10 ottobre 2025 la legge italiana sull'AI (L. 132/2025) chiede ai professionisti di informare i clienti quando usano sistemi di AI ([Il Diritto](https://ildiritto.it/professioni/legge-ai-e-professionisti-dal-10-ottobre-obbligo-di-informare-i-clienti/));",
              "dal 2 agosto 2026 l'AI Act chiede di dichiarare agli utenti che stanno parlando con un sistema di AI: vedi [la checklist per PMI](/it/guide/ai-act-checklist-pmi).",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: "ChatGPT usa i miei documenti per addestrarsi?",
        a: "Dipende dal piano e dalle impostazioni: i piani aziendali e le API dei principali fornitori prevedono che i dati non vengano usati per l'addestramento, i piani personali possono farlo salvo opt-out. Per dati aziendali serve comunque un piano aziendale o una soluzione controllata.",
      },
      {
        q: "Un sistema RAG è sicuro?",
        a: "È sicuro quanto è progettato: permessi per utente, registrazione degli accessi, archivio sotto il tuo controllo e scelta consapevole del modello. Il vantaggio è che ogni risposta è verificabile sulle fonti.",
      },
    ],
    sources: [
      { label: "Il Diritto: legge AI e professionisti, obbligo di informare i clienti", href: "https://ildiritto.it/professioni/legge-ai-e-professionisti-dal-10-ottobre-obbligo-di-informare-i-clienti/" },
      { label: "OpenAI: piani e impostazioni sui dati (pagina prezzi)", href: "https://chatgpt.com/pricing" },
    ],
    related: ["svc-rag", "svc-private-llm", "guide-ai-act", "guide-chatgpt-business"],
  },

  {
    ...base,
    key: "guide-ai-act",
    path: "/it/guide/ai-act-checklist-pmi",
    metaTitle: "AI Act dopo il 2 agosto 2026: checklist pratica per PMI",
    metaDescription:
      "Cosa chiede l'AI Act alle PMI nel 2026: obblighi già in vigore, trasparenza per chatbot e contenuti generati, cosa slitta al 2027 con il Digital Omnibus. Checklist.",
    eyebrow: "Guida · AI Act",
    title: "AI Act dopo il 2 agosto 2026: la checklist per PMI.",
    emphasis: "la checklist",
    shortTitle: "AI Act: checklist per PMI",
    summary: "Obblighi in vigore, trasparenza dal 2 agosto 2026, cosa slitta al 2027.",
    intro:
      "Dal 2 agosto 2026 una PMI che usa un chatbot o pubblica contenuti generati con l'AI deve dichiararlo agli utenti: sono gli obblighi di trasparenza dell'articolo 50 dell'AI Act. Gli obblighi per i sistemi ad alto rischio, invece, sono slittati al 2 dicembre 2027 con il Digital Omnibus. Questa guida non è una consulenza legale: è la lista di controllo tecnica di chi costruisce questi sistemi.",
    sections: [
      {
        id: "calendario",
        title: "Il calendario aggiornato",
        blocks: [
          {
            type: "table",
            head: ["Data", "Cosa si applica"],
            rows: [
              ["2 febbraio 2025", "Divieto delle pratiche a rischio inaccettabile; obbligo di alfabetizzazione del personale (art. 4)"],
              ["2 agosto 2025", "Obblighi per i modelli di AI per finalità generali (GPAI)"],
              ["2 agosto 2026", "Trasparenza (art. 50): avvisi sui chatbot, etichette per deepfake e contenuti sintetici"],
              ["2 dicembre 2026", "Marcatura tecnica (watermarking, art. 50.2) per i sistemi già sul mercato; nuovi divieti su immagini intime non consensuali e CSAM"],
              ["2 dicembre 2027", "Sistemi ad alto rischio dell'allegato III (rinviati dal Digital Omnibus)"],
              ["2 agosto 2028", "Sistemi ad alto rischio integrati in prodotti regolamentati (allegato I)"],
            ],
          },
          {
            type: "p",
            text: "Il Digital Omnibus sull'AI è stato pubblicato il 24 luglio 2026 ed è in vigore dal 27 luglio 2026 ([Digitalic](https://www.digitalic.it/intelligenza-artificiale/ai-act-2-agosto-2026-digital-omnibus-cosa-cambia), [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/)).",
          },
        ],
      },
      {
        id: "checklist",
        title: "La checklist",
        blocks: [
          {
            type: "list",
            items: [
              "**Inventario**: elenca i sistemi di AI che usi o offri (chatbot sul sito, assistenti interni, generazione di testi e immagini, automazioni).",
              "**Chatbot**: l'utente deve sapere fin dal primo messaggio che parla con un'AI, a meno che non sia evidente.",
              "**Contenuti generati**: immagini, audio e video realistici generati o manipolati vanno dichiarati; per i testi pubblicati su temi di interesse pubblico vale lo stesso, salvo revisione editoriale umana.",
              "**Alto rischio**: verifica se qualche uso ricade nell'allegato III (per esempio selezione del personale, credito, istruzione). Se sì, prepara documentazione e gestione del rischio in vista del 2 dicembre 2027.",
              "**Formazione**: l'obbligo dell'art. 4 è stato ammorbidito, ma resta il dovere di sostenere l'alfabetizzazione del personale che usa l'AI.",
              "**Registri**: conserva log di funzionamento e decisioni rilevanti; sono utili anche per GDPR e audit interni.",
              "**Legge italiana**: la L. 132/2025 aggiunge obblighi informativi verso clienti (professionisti) e lavoratori.",
            ],
          },
          {
            type: "callout",
            text: "Le sanzioni per la violazione degli obblighi di trasparenza arrivano fino a 15 milioni di euro o al 3% del fatturato mondiale, con importi ridotti per le PMI.",
          },
        ],
      },
      {
        id: "progettazione",
        title: "Come la risolvo quando costruisco un sistema",
        blocks: [
          {
            type: "p",
            text: "Nei sistemi che sviluppo l'avviso all'utente, la registrazione delle interazioni e la marcatura dei contenuti generati sono parte del progetto dall'inizio, non una toppa finale. Vedi [chatbot e RAG sui documenti](/it/servizi/chatbot-rag-documenti-aziendali) e [agenti AI](/it/servizi/agenti-ai-automazione-processi).",
          },
        ],
      },
    ],
    faq: [
      {
        q: "L'AI Act si applica anche alle piccole imprese?",
        a: "Sì, ma con obblighi proporzionati: per la maggior parte delle PMI che usano chatbot o generano contenuti gli obblighi principali sono di trasparenza. Il Digital Omnibus ha esteso alcune semplificazioni a tutte le PMI.",
      },
      {
        q: "Il mio chatbot sul sito deve dire che è un'AI?",
        a: "Sì, dal 2 agosto 2026: l'utente deve essere informato che sta interagendo con un sistema di AI, salvo che sia evidente dal contesto.",
      },
    ],
    sources: [
      { label: "Digitalic: AI Act, cosa è scattato dal 2 agosto 2026 e cosa slitta al 2027", href: "https://www.digitalic.it/intelligenza-artificiale/ai-act-2-agosto-2026-digital-omnibus-cosa-cambia" },
      { label: "Gibson Dunn: EU AI Act Omnibus agreement", href: "https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/" },
      { label: "Il Diritto: legge 132/2025 e professionisti", href: "https://ildiritto.it/professioni/legge-ai-e-professionisti-dal-10-ottobre-obbligo-di-informare-i-clienti/" },
    ],
    related: ["guide-ai-documenti", "svc-rag", "svc-agents", "funding"],
  },

  {
    ...base,
    key: "guide-chatgpt-business",
    path: "/it/guide/chatgpt-business-o-soluzione-su-misura",
    metaTitle: "ChatGPT Business o soluzione AI su misura: quando conviene",
    metaDescription:
      "ChatGPT Business ed Enterprise o un sistema AI su misura per la tua azienda? Differenze su dati, integrazioni, controllo e costi, con i casi in cui conviene l'uno o l'altro.",
    eyebrow: "Guida · Scelte",
    title: "ChatGPT Business o una soluzione su misura: quando conviene cosa.",
    emphasis: "quando conviene cosa",
    shortTitle: "ChatGPT Business o su misura",
    summary: "Dati, integrazioni, controllo e costi: come scegliere tra un piano pronto e un sistema tuo.",
    intro:
      "Se il bisogno è dare a ogni dipendente un assistente per scrivere, riassumere e ragionare, un piano aziendale pronto come ChatGPT Business o Enterprise è quasi sempre la scelta più rapida ed economica. Una soluzione su misura conviene quando l'AI deve lavorare dentro un processo preciso: sui tuoi documenti con permessi, collegata ai tuoi sistemi, con regole e costi sotto controllo.",
    sections: [
      {
        id: "confronto",
        title: "Il confronto",
        blocks: [
          {
            type: "table",
            head: ["", "Piano aziendale pronto", "Soluzione su misura"],
            rows: [
              ["Tempo per partire", "Giorni", "Settimane"],
              ["Costo", "Per utente al mese", "Progetto iniziale + utilizzo"],
              ["Uso tipico", "Assistente generico per le persone", "Un processo o un prodotto specifico"],
              ["Integrazione con gestionali e CRM", "Limitata ai connettori disponibili", "Quella che serve"],
              ["Controllo del comportamento", "Istruzioni e impostazioni del fornitore", "Regole, controlli e valutazioni tue"],
              ["Dove stanno i dati", "Presso il fornitore, con impegni contrattuali", "Dove decidi tu, fino al server in sede"],
              ["Automazione senza una persona davanti", "No", "Sì"],
            ],
          },
          {
            type: "p",
            text: "Prezzi e funzioni dei piani cambiano spesso: verificali sulla [pagina ufficiale di OpenAI](https://chatgpt.com/pricing) prima di decidere.",
          },
        ],
      },
      {
        id: "quando",
        title: "Quando conviene la soluzione su misura",
        blocks: [
          {
            type: "list",
            items: [
              "l'AI deve eseguire un lavoro (leggere fatture, aggiornare il CRM, preparare report) e non solo rispondere a una persona: vedi [agenti AI](/it/servizi/agenti-ai-automazione-processi);",
              "le risposte devono basarsi sui tuoi documenti con permessi per utente e fonti citate: vedi [chatbot RAG](/it/servizi/chatbot-rag-documenti-aziendali);",
              "i dati non possono uscire dall'azienda: vedi [LLM privati](/it/servizi/llm-privati-on-premise);",
              "l'AI è parte di un tuo prodotto venduto ai clienti;",
              "il volume è alto e il costo per utente di un piano pronto supera quello di un sistema dedicato.",
            ],
          },
          {
            type: "p",
            text: "Le due strade non si escludono: molte aziende danno un piano pronto a tutti e costruiscono su misura solo i due o tre processi dove l'AI fa risparmiare più ore.",
          },
        ],
      },
    ],
    faq: [
      {
        q: "ChatGPT Business basta per una PMI?",
        a: "Per l'uso individuale dei dipendenti spesso sì. Non basta quando serve automatizzare un processo, integrare i sistemi aziendali o controllare in dettaglio dati e comportamento.",
      },
    ],
    sources: [{ label: "OpenAI: piani ChatGPT", href: "https://chatgpt.com/pricing" }],
    related: ["guide-costi-chatbot", "guide-ai-documenti", "svc-agents", "svc-rag"],
  },
];
