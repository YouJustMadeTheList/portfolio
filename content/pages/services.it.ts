import type { ContentPage } from "@/lib/seo/pages";
import { methodSection, pricingSection, PAGES_DATE } from "./shared";

const base = { kind: "service" as const, locale: "it" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };

export const servicesIt: ContentPage[] = [
  {
    ...base,
    key: "svc-rag",
    path: "/it/servizi/chatbot-rag-documenti-aziendali",
    serviceType: "Sviluppo chatbot e sistemi RAG sui documenti aziendali",
    metaTitle: "Chatbot sui documenti aziendali (RAG) su misura",
    metaDescription:
      "Sviluppo chatbot e assistenti che rispondono sui documenti della tua azienda con le fonti citate: RAG su misura, dati sotto controllo, GDPR. Preventivo dopo una call gratuita.",
    eyebrow: "Servizi · RAG",
    title: "Un assistente che risponde sui tuoi documenti, citando le fonti.",
    emphasis: "citando le fonti",
    shortTitle: "Chatbot e RAG sui documenti aziendali",
    summary: "Assistenti che rispondono su manuali, contratti, procedure e dati interni, con la fonte di ogni risposta.",
    intro:
      "Costruisco sistemi RAG (Retrieval-Augmented Generation): l'assistente cerca nei tuoi documenti i passaggi pertinenti e risponde solo sulla base di quelli, indicando da dove arriva ogni affermazione. È la differenza tra un ChatGPT che inventa e uno strumento di cui il tuo team si può fidare.",
    sections: [
      {
        id: "cosa-risolve",
        title: "Cosa risolve",
        blocks: [
          { type: "p", text: "Le informazioni ci sono, ma nessuno le trova in tempo: sono sparse tra PDF, cartelle condivise, ticket, email e gestionali. Un assistente RAG serve quando:" },
          {
            type: "list",
            items: [
              "il supporto clienti risponde ogni giorno alle stesse domande scritte in manuali che nessuno legge;",
              "chi entra in azienda impiega settimane a capire procedure e documentazione tecnica;",
              "commerciali e tecnici cercano clausole, prezzi o specifiche in centinaia di documenti;",
              "vuoi fare domande in linguaggio naturale su dati aziendali (\"quanti clienti attivi a marzo?\") e avere numeri verificabili.",
            ],
          },
        ],
      },
      {
        id: "come-funziona",
        title: "Come funziona un sistema RAG fatto bene",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Raccolta e pulizia.** Documenti e dati vengono estratti, ripuliti e divisi in parti che abbiano senso da sole (non a taglio fisso di caratteri).",
              "**Indicizzazione.** Ogni parte diventa un vettore in un database vettoriale, affiancato dalla ricerca per parole chiave: le due ricerche insieme sbagliano molto meno di una sola.",
              "**Recupero e risposta.** Per ogni domanda il sistema recupera i passaggi migliori e il modello risponde solo su quelli, con i riferimenti.",
              "**Permessi.** Ogni utente vede solo i documenti a cui ha accesso anche fuori dall'assistente.",
              "**Valutazione.** Un insieme di domande di prova con risposte attese misura la qualità prima di ogni rilascio, così i miglioramenti si vedono in numeri e non in impressioni.",
            ],
          },
        ],
      },
      {
        id: "privacy",
        title: "Privacy e dove stanno i dati",
        blocks: [
          {
            type: "p",
            text: "Si può scegliere tra modelli via API con impegni contrattuali di non addestramento, modelli ospitati in cloud europeo o [modelli privati sui tuoi server](/it/servizi/llm-privati-on-premise). La scelta dipende da quanto sono sensibili i dati e da quanto devono costare le risposte. In ogni caso i documenti restano nella tua infrastruttura o in quella che scegli, e il sistema registra chi ha chiesto cosa.",
          },
        ],
      },
      {
        id: "esperienza",
        title: "Dove l'ho già fatto",
        blocks: [
          {
            type: "p",
            text: "Ho costruito un livello di interrogazione in linguaggio naturale su oltre 2 milioni di documenti distribuiti su decine di indici, con un catalogo di oltre 2.000 campi in un database vettoriale per il RAG. Il caso completo è in [Analytics aumentata da IA su scala documentale](/it/casi-studio/analytics-ai-documenti).",
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "quantità e formato dei documenti (PDF scansionati, tabelle e immagini richiedono più lavoro);",
        "numero di fonti da collegare e se devono aggiornarsi in tempo reale;",
        "requisiti di permessi e di registrazione delle attività;",
        "dove deve girare il modello: API, cloud europeo o server tuoi;",
        "volume di domande previsto, che determina il costo di utilizzo mensile.",
      ]),
    ],
    faq: [
      {
        q: "Qual è la differenza tra un chatbot RAG e ChatGPT?",
        a: "ChatGPT risponde con quello che ha imparato in addestramento e può inventare. Un sistema RAG prima cerca nei tuoi documenti e poi risponde solo su quei passaggi, citandoli: se l'informazione non c'è, lo dice.",
      },
      {
        q: "I miei documenti vengono usati per addestrare il modello?",
        a: "No. Nel RAG i documenti non addestrano nessun modello: vengono letti al momento della domanda. Con le API aziendali dei principali fornitori o con un modello privato i dati non finiscono nell'addestramento.",
      },
      {
        q: "Quanto tempo serve per un primo prototipo?",
        a: "Dipende da quanti e quali documenti, ma un prototipo su un sottoinsieme reale dei tuoi dati è l'obiettivo delle prime settimane: serve a misurare la qualità prima di investire nella versione completa.",
      },
      {
        q: "Funziona con documenti in italiano?",
        a: "Sì. I modelli attuali lavorano bene in italiano; la qualità dipende soprattutto da come vengono preparati e divisi i documenti, ed è lì che va messo il lavoro.",
      },
    ],
    related: ["svc-private-llm", "guide-ai-documenti", "case-data", "guide-costi-chatbot"],
  },

  {
    ...base,
    key: "svc-private-llm",
    path: "/it/servizi/llm-privati-on-premise",
    serviceType: "LLM privati e on-premise per aziende",
    metaTitle: "LLM privato per aziende: AI on-premise e GDPR",
    metaDescription:
      "Modelli linguistici privati sui tuoi server o in cloud europeo: quando conviene, cosa serve e quanto costa gestirlo. Progettazione e sviluppo su misura.",
    eyebrow: "Servizi · LLM privati",
    title: "Un modello linguistico tutto tuo, dove decidi tu.",
    emphasis: "dove decidi tu",
    shortTitle: "LLM privati e on-premise",
    summary: "Modelli open source sui tuoi server o in cloud UE, quando i dati non possono uscire.",
    intro:
      "Un LLM privato è un modello linguistico che gira su server tuoi o in un cloud europeo scelto da te, senza inviare dati a servizi esterni. Conviene quando i dati sono troppo sensibili per un'API pubblica o quando il volume di richieste rende l'API più cara dell'infrastruttura.",
    sections: [
      {
        id: "quando-conviene",
        title: "Quando conviene davvero",
        blocks: [
          {
            type: "table",
            head: ["Situazione", "API di un fornitore", "Modello privato"],
            rows: [
              ["Dati sanitari, legali, finanziari o segreti industriali", "Possibile con contratti adeguati, ma i dati escono", "I dati non escono mai"],
              ["Poche richieste al giorno", "Più economica", "Costo fisso dell'hardware"],
              ["Molte richieste continue", "Il costo cresce con l'uso", "Costo prevedibile"],
              ["Serve il modello più capace in assoluto", "Migliore", "Un gradino sotto sui compiti più complessi"],
              ["Ambienti senza internet", "Non utilizzabile", "Funziona offline"],
            ],
          },
          {
            type: "p",
            text: "Spesso la risposta giusta è mista: un modello privato per i dati sensibili e un'API per il resto, dietro la stessa interfaccia.",
          },
        ],
      },
      {
        id: "cosa-serve",
        title: "Cosa serve per farlo funzionare",
        blocks: [
          {
            type: "list",
            items: [
              "**Scelta del modello** tra quelli open source, in base alla lingua, al compito e all'hardware disponibile. Non sempre serve il più grande.",
              "**Hardware o cloud**: una GPU dimensionata sul modello e sul numero di utenti contemporanei, oppure un fornitore cloud con sede e dati in UE.",
              "**Server di inferenza** ottimizzato, con coda delle richieste e limiti per utente.",
              "**RAG sui documenti** se il modello deve rispondere su dati aziendali: vedi [Chatbot e RAG sui documenti](/it/servizi/chatbot-rag-documenti-aziendali).",
              "**Monitoraggio**: tempi di risposta, errori, costi e qualità misurata nel tempo.",
            ],
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "dimensione del modello e numero di utenti contemporanei, che decidono l'hardware;",
        "server in sede o cloud europeo;",
        "integrazione con i sistemi esistenti e con i permessi aziendali;",
        "esigenze di adattamento del modello al tuo linguaggio o ai tuoi documenti;",
        "livello di assistenza dopo il rilascio.",
      ]),
    ],
    faq: [
      {
        q: "Un LLM privato è conforme al GDPR?",
        a: "Tenere i dati sui propri server semplifica molto la conformità, ma non la garantisce da sola: servono comunque base giuridica, informative, registrazione degli accessi e misure di sicurezza. Il vantaggio è che nessun dato passa a terzi.",
      },
      {
        q: "Un modello open source è all'altezza di quelli commerciali?",
        a: "Per molti compiti aziendali (riassunti, estrazione di dati, risposte su documenti) sì. Sui ragionamenti più complessi i modelli commerciali di punta restano avanti: per questo la valutazione si fa sui tuoi casi reali, non sulle classifiche.",
      },
      {
        q: "Serve comprare una GPU?",
        a: "Non necessariamente. Si può partire in cloud europeo pagando a consumo e passare all'hardware in sede solo quando i numeri lo giustificano.",
      },
    ],
    related: ["svc-rag", "guide-ai-documenti", "guide-ai-act", "guide-chatgpt-business"],
  },

  {
    ...base,
    key: "svc-agents",
    path: "/it/servizi/agenti-ai-automazione-processi",
    serviceType: "Sviluppo agenti AI e automazione dei processi aziendali",
    metaTitle: "Agenti AI su misura e automazione dei processi aziendali",
    metaDescription:
      "Sviluppo agenti AI che eseguono lavoro ripetitivo nei tuoi sistemi: documenti, email, fatture, CRM, report. Automazione su misura con controllo umano dove serve.",
    eyebrow: "Servizi · Agenti AI",
    title: "Agenti AI che fanno il lavoro ripetitivo, non solo che rispondono.",
    emphasis: "fanno il lavoro",
    shortTitle: "Agenti AI e automazione dei processi",
    summary: "Automazioni che leggono documenti, compilano sistemi e preparano decisioni, con controllo umano dove serve.",
    intro:
      "Un agente AI è un sistema che, invece di limitarsi a rispondere, esegue passaggi concreti nei tuoi strumenti: legge un documento, estrae i dati, li verifica, aggiorna il gestionale e segnala a una persona solo i casi dubbi. Lo costruisco su misura sui processi che oggi occupano ore di lavoro manuale.",
    sections: [
      {
        id: "processi",
        title: "Processi che si prestano bene",
        blocks: [
          {
            type: "table",
            head: ["Processo", "Cosa fa l'agente", "Dove resta la persona"],
            rows: [
              ["Fatture e documenti di trasporto", "Estrae importi, fornitori e righe, li confronta con ordini e ricezioni", "Approva le anomalie"],
              ["Email e richieste in entrata", "Classifica, prepara la risposta, apre la pratica nel CRM", "Invia le risposte delicate"],
              ["Report ricorrenti", "Raccoglie i dati da più fonti e scrive il riepilogo", "Legge e decide"],
              ["Onboarding clienti", "Controlla documenti ricevuti e completezza", "Gestisce le eccezioni"],
              ["Ricerca e monitoraggio", "Segue fonti, filtra, riassume le novità rilevanti", "Sceglie cosa approfondire"],
            ],
          },
        ],
      },
      {
        id: "principi",
        title: "Come lo rendo affidabile",
        blocks: [
          {
            type: "list",
            items: [
              "**La parte deterministica resta deterministica.** Calcoli, controlli e regole di business sono codice, non richieste al modello. L'AI fa ciò in cui è brava: leggere, classificare, scrivere.",
              "**Ogni passaggio è registrato.** Si vede cosa ha fatto l'agente, su quali dati e perché, come in un audit trail.",
              "**Soglie di fiducia.** Sotto una certa sicurezza il caso va a una persona invece di procedere.",
              "**Si misura prima di estendere.** Si parte da un processo, si misurano tempo risparmiato ed errori, poi si allarga.",
            ],
          },
        ],
      },
      {
        id: "esperienza",
        title: "Esperienza",
        blocks: [
          {
            type: "p",
            text: "Lavoro come AI Automation Specialist in Conio, un'azienda fintech, dove l'automazione tocca processi con requisiti di controllo stringenti. Lo stesso approccio (componenti deterministici separati da quelli probabilistici, tracciabilità completa) è alla base del [motore di segnali](/it/casi-studio/motore-segnali-xauusd) e dei [percorsi di apprendimento generati](/it/casi-studio/percorsi-apprendimento-adattivi).",
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "numero e complessità dei processi da automatizzare;",
        "sistemi da collegare (gestionale, CRM, email, cartelle, API esterne);",
        "qualità e varietà dei documenti in ingresso;",
        "livello di controllo umano e di tracciabilità richiesto;",
        "volume mensile di pratiche, che determina il costo di utilizzo.",
      ]),
    ],
    faq: [
      {
        q: "Che differenza c'è tra un agente AI e una normale automazione?",
        a: "Un'automazione classica segue regole fisse e si blocca davanti a un documento diverso dal previsto. Un agente AI sa leggere contenuti non strutturati (email, PDF, testo libero) e decidere il passo successivo, sempre dentro limiti e controlli definiti.",
      },
      {
        q: "L'agente può sbagliare?",
        a: "Sì, come una persona. Per questo le regole critiche restano nel codice, i casi incerti vanno a un operatore e ogni azione è registrata e reversibile. La percentuale di errori si misura prima di dare più autonomia.",
      },
      {
        q: "Si integra con il gestionale che uso già?",
        a: "Nella maggior parte dei casi sì, tramite API, database, esportazioni o, come ultima risorsa, automazione dell'interfaccia. Si verifica nella fase di analisi.",
      },
    ],
    related: ["svc-rag", "guide-costi-chatbot", "funding", "guide-ai-act"],
  },

  {
    ...base,
    key: "svc-llm-dev",
    path: "/it/servizi/sviluppatore-llm",
    serviceType: "Sviluppo software basato su LLM",
    metaTitle: "Sviluppatore LLM per aziende e startup",
    metaDescription:
      "Sviluppatore LLM per progetti su misura: RAG, agenti, valutazione della qualità, integrazione nei tuoi prodotti. Dal prototipo alla produzione, con codice e documentazione tuoi.",
    eyebrow: "Servizi · Sviluppo LLM",
    title: "Uno sviluppatore LLM che porta i prototipi in produzione.",
    emphasis: "in produzione",
    shortTitle: "Sviluppatore LLM",
    summary: "Sviluppo di prodotti e funzionalità basate su LLM, con valutazione della qualità e codice consegnato.",
    intro:
      "Se hai un prodotto o un team e ti serve qualcuno che progetti e scriva la parte basata sui modelli linguistici, lavoro come sviluppatore LLM sul tuo codice: dall'architettura alla messa in produzione, con test di qualità misurabili e documentazione che resta al tuo team.",
    sections: [
      {
        id: "cosa-sviluppo",
        title: "Cosa sviluppo",
        blocks: [
          {
            type: "list",
            items: [
              "**RAG e ricerca semantica** su documenti e basi dati, con ricerca ibrida e citazione delle fonti.",
              "**Agenti e flussi a più passaggi** con strumenti, memoria e controlli.",
              "**Estrazione strutturata** da testi e documenti verso JSON, database e gestionali.",
              "**Valutazione (eval)**: insiemi di prova, metriche e regressioni automatiche per sapere se una modifica migliora o peggiora il sistema.",
              "**Ottimizzazione di costi e tempi**: scelta del modello per ogni compito, cache, riduzione dei token.",
              "**Integrazione** in applicazioni web, backend e pipeline dati esistenti.",
            ],
          },
        ],
      },
      {
        id: "stack",
        title: "Strumenti",
        blocks: [
          {
            type: "p",
            text: "Lavoro con i modelli dei principali fornitori via API e con modelli open source, database vettoriali (per esempio Qdrant), motori di ricerca come Elasticsearch, Redis, Python e TypeScript. Lo stack si sceglie sul progetto, non per abitudine.",
          },
        ],
      },
      {
        id: "collaborazione",
        title: "Come collaboriamo",
        blocks: [
          {
            type: "p",
            text: "Posso lavorare a progetto (consegna di un sistema completo) o affiancare il tuo team per un periodo definito. In entrambi i casi il codice è tuo, versionato nel tuo repository, con documentazione e passaggio di consegne.",
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "progetto chiuso o affiancamento a tempo;",
        "maturità del codice e dei dati esistenti;",
        "requisiti di qualità, sicurezza e registrazione;",
        "quanto il sistema deve reggere in termini di utenti e volumi.",
      ]),
    ],
    faq: [
      {
        q: "Lavori anche su codice già esistente?",
        a: "Sì. Spesso il lavoro più utile è rendere misurabile e stabile un prototipo nato in fretta: aggiungere valutazioni, gestione degli errori, costi sotto controllo.",
      },
      {
        q: "Firmi accordi di riservatezza?",
        a: "Sì, di norma. La maggior parte dei progetti che seguo è coperta da NDA: per questo nei casi studio i numeri sono arrotondati e senza nomi.",
      },
    ],
    related: ["svc-rag", "svc-agents", "svc-private-llm", "case-data"],
  },

  {
    ...base,
    key: "svc-fintech",
    path: "/it/servizi/ai-per-fintech",
    serviceType: "Intelligenza artificiale e sistemi dati per il fintech",
    metaTitle: "AI per fintech: dati finanziari, scoring e segnali",
    metaDescription:
      "Sistemi di dati e intelligenza artificiale per fintech e servizi finanziari: scoring, segnali, analisi di mercato, automazione con audit trail. Esperienza diretta in un'azienda fintech.",
    eyebrow: "Servizi · Fintech",
    title: "AI per il fintech, dove un errore costa più di un ritardo.",
    emphasis: "costa più di un ritardo",
    shortTitle: "AI per fintech",
    summary: "Scoring, segnali e automazione per servizi finanziari, con tracciabilità completa.",
    intro:
      "Nei servizi finanziari un modello che non si sa spiegare è un rischio, non un vantaggio. Costruisco sistemi di dati e AI per il fintech con audit trail completo e con una separazione netta tra la parte deterministica (regole, calcoli, limiti) e quella probabilistica (modelli, stime).",
    sections: [
      {
        id: "ambiti",
        title: "Ambiti",
        blocks: [
          {
            type: "list",
            items: [
              "**Ingestion e normalizzazione** di dati di mercato, macroeconomici e transazionali da più fonti.",
              "**Motori di scoring e segnali** con punteggi continui e scomponibili nei fattori che li compongono.",
              "**Analisi di clienti e attività** con clustering, coorti e interrogazione in linguaggio naturale.",
              "**Automazione dei processi operativi** con controlli e registrazione per la compliance interna.",
              "**Validazione** su campioni indipendenti prima di mettere in produzione un'ipotesi.",
            ],
          },
        ],
      },
      {
        id: "esperienza",
        title: "Esperienza",
        blocks: [
          {
            type: "p",
            text: "Lavoro come AI Automation Specialist in [Conio](https://www.conio.com), azienda fintech italiana. Ho progettato un [motore di volatilità e liquidità su XAU/USD](/it/casi-studio/motore-segnali-xauusd) che fonde più famiglie di dati in punteggi per ogni timeframe; un bot di validazione basato solo su quei segnali ha registrato un win rate del 54% a un rapporto rischio/rendimento di 1,4:1. È un risultato del motore, non una consulenza finanziaria.",
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "numero e qualità delle fonti di dati;",
        "requisiti regolamentari e di audit;",
        "frequenza di aggiornamento (giornaliera, oraria, in tempo reale);",
        "integrazione con sistemi esistenti e con la reportistica interna.",
      ]),
    ],
    faq: [
      {
        q: "Sviluppi bot di trading da vendere al pubblico?",
        a: "No. Sviluppo sistemi di dati e segnali per aziende e professionisti. Diffida di chi promette guadagni garantiti con l'AI: la CONSOB segnala spesso truffe di questo tipo.",
      },
      {
        q: "Come si gestisce la spiegabilità dei modelli?",
        a: "Ogni punteggio deve essere scomponibile nei fattori che lo producono, e le decisioni critiche restano in regole esplicite. Così un revisore può ricostruire perché il sistema ha dato un certo risultato.",
      },
    ],
    related: ["case-fintech", "case-data", "svc-agents", "guide-ai-act"],
  },

  {
    ...base,
    key: "svc-edtech",
    path: "/it/servizi/ai-per-edtech",
    serviceType: "Piattaforme di apprendimento adattivo con intelligenza artificiale",
    metaTitle: "AI per edtech: apprendimento adattivo e test su misura",
    metaDescription:
      "Piattaforme e-learning con intelligenza artificiale: percorsi personalizzati, esercizi generati e verificati, test adattivi. Già in produzione in un concorso regionale per studenti.",
    eyebrow: "Servizi · EdTech",
    title: "Un percorso di studio diverso per ogni studente, e corretto.",
    emphasis: "e corretto",
    shortTitle: "AI per edtech",
    summary: "Percorsi personalizzati, esercizi generati e verificati, test adattivi.",
    intro:
      "Costruisco sistemi che leggono le prestazioni di ogni studente, individuano le lacune e generano esercizi calibrati sul suo livello. La parte che conta è la verifica: un esercizio generato dall'AI vale qualcosa solo se è corretto, quindi ognuno passa un controllo indipendente prima di arrivare allo studente.",
    sections: [
      {
        id: "per-chi",
        title: "Per chi",
        blocks: [
          {
            type: "list",
            items: [
              "scuole, enti di formazione e università che vogliono esercitazioni personalizzate;",
              "aziende con percorsi di formazione interna da adattare al livello di ciascuno;",
              "piattaforme e-learning che vogliono aggiungere personalizzazione e generazione di contenuti;",
              "concorsi e certificazioni che hanno bisogno di prove diverse per ogni candidato ma equivalenti per difficoltà.",
            ],
          },
        ],
      },
      {
        id: "come-funziona",
        title: "Come funziona",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Profilo di apprendimento**: le risposte dello studente vengono lette per capire dove sbaglia e perché.",
              "**Piano personalizzato**: il sistema sceglie argomenti e difficoltà del passo successivo.",
              "**Generazione**: nuovi esercizi calibrati sul livello, non presi da un archivio fisso.",
              "**Verifica indipendente**: ogni esercizio viene controllato prima di essere mostrato.",
              "**Privacy per progetto**: i dati personali restano separati dal profilo di apprendimento.",
            ],
          },
        ],
      },
      {
        id: "esperienza",
        title: "Già in produzione",
        blocks: [
          {
            type: "p",
            text: "Il motore che genera le prove del Premio Di Nicola 2026, concorso di matematica e logica per studenti abruzzesi giunto alla 18ª edizione, nasce da questo lavoro. Il caso è raccontato in [Percorsi di apprendimento generati](/it/casi-studio/percorsi-apprendimento-adattivi) e nell'[articolo tecnico](https://youjustmadethelist.github.io/adaptive_test_article/).",
          },
        ],
      },
      methodSection("it"),
      pricingSection("it", [
        "materie e livelli da coprire;",
        "tipo di esercizi (risposta chiusa, aperta, problemi a più passaggi);",
        "integrazione con piattaforme esistenti (LMS, registri, account);",
        "numero di studenti e requisiti di privacy, in particolare per i minori.",
      ]),
    ],
    faq: [
      {
        q: "Come si evita che l'AI generi esercizi sbagliati?",
        a: "Con una verifica indipendente dalla generazione: l'esercizio viene risolto e controllato separatamente, e scartato se il controllo fallisce. Nessun esercizio arriva allo studente senza averlo superato.",
      },
      {
        q: "È adatto a studenti minorenni?",
        a: "Sì, con le cautele necessarie: dati personali separati, minimizzazione dei dati raccolti e accordi chiari con la scuola o l'ente titolare del trattamento.",
      },
    ],
    related: ["case-edtech", "svc-rag", "guide-ai-act", "funding"],
  },
];
