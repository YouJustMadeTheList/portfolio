import type { ContentPage } from "@/lib/seo/pages";
import { CASE_LINKS } from "@/content/case-studies";
import { GITHUB_URL } from "@/lib/seo/site";
import { instagramUrl, linkedinUrl } from "@/content/contact";
import { PAGES_DATE } from "./shared";

/* Fatti presi da content/about.ts (timeline e riconoscimenti già pubblicati
   in home). Qui non si aggiunge nulla che non sia già confermato. */

export const aboutPages: ContentPage[] = [
  {
    key: "about",
    kind: "about",
    locale: "it",
    path: "/it/chi-sono",
    publishedAt: PAGES_DATE,
    updatedAt: "2026-09-29",
    metaTitle: "Davide De Sanctis — sviluppatore di soluzioni AI su misura",
    metaDescription:
      "Chi è Davide De Sanctis: sviluppatore di soluzioni di intelligenza artificiale su misura per aziende, AI Automation Specialist in Conio, studente al Politecnico di Milano, fondatore. Lavora con aziende a Roma, Milano, Pescara, Teramo e Bologna.",
    eyebrow: "Chi sono",
    title: "Davide De Sanctis, sviluppatore di soluzioni AI su misura.",
    emphasis: "soluzioni AI su misura",
    shortTitle: "Chi sono",
    summary: "Percorso, riconoscimenti e profili di Davide De Sanctis.",
    intro:
      "Sono Davide De Sanctis, ho 20 anni e sviluppo soluzioni di intelligenza artificiale su misura per aziende. Lavoro come AI Automation Specialist in Conio, azienda fintech italiana, studio Ingegneria Informatica al Politecnico di Milano e ho fondato una mia società, da cui nasceranno anche altre startup.",
    sections: [
      {
        id: "in-breve",
        title: "Chi è Davide De Sanctis",
        blocks: [
          {
            type: "table",
            head: ["Voce", "Dettaglio"],
            rows: [
              ["Nome", "Davide De Sanctis"],
              ["Cosa fa", "Sviluppatore di soluzioni di intelligenza artificiale su misura per aziende"],
              ["Ruolo", "AI Automation Specialist in [Conio](https://www.conio.com), azienda fintech; fondatore di una propria società"],
              ["Studi", "Ingegneria Informatica, Politecnico di Milano"],
              ["Dove lavora", "Roma, Milano, Pescara, Teramo, Bologna e da remoto in tutta Italia"],
              ["Sito", "[davidedesanctis.com](https://davidedesanctis.com)"],
            ],
          },
          {
            type: "p",
            text: "Esistono altre persone con il mio stesso nome. Questa pagina riguarda Davide De Sanctis che sviluppa sistemi di intelligenza artificiale per le aziende, con i profili ufficiali elencati in fondo.",
          },
        ],
      },
      {
        id: "cosa-faccio",
        title: "Cosa faccio",
        blocks: [
          {
            type: "p",
            text: "Tengo insieme tre cose che di solito stanno in persone diverse: architettura del software, intelligenza artificiale e gestione dei dati. Costruisco [assistenti sui documenti aziendali](/it/servizi/chatbot-rag-documenti-aziendali), [agenti che automatizzano processi](/it/servizi/agenti-ai-automazione-processi), sistemi dati per il [fintech](/it/servizi/ai-per-fintech) e piattaforme di [apprendimento adattivo](/it/servizi/ai-per-edtech).",
          },
        ],
      },
      {
        id: "percorso",
        title: "Percorso",
        blocks: [
          {
            type: "table",
            head: ["Quando", "Cosa"],
            rows: [
              ["Oggi", "AI Automation Specialist in [Conio](https://www.conio.com), azienda fintech"],
              ["Oggi", "Politecnico di Milano, Ingegneria Informatica: primo anno completato, media 28,57/30, 60 CFU"],
              ["Oggi", "Fondatore della mia società"],
              ["2026", "Il motore che genera le prove del Premio Di Nicola, 18ª edizione ([caso studio](/it/casi-studio/percorsi-apprendimento-adattivi))"],
              ["Anni da indipendente", "Primi clienti e primi sistemi in produzione"],
              ["Liceo scientifico", "Primi progetti di sviluppo e IA"],
            ],
          },
        ],
      },
      {
        id: "riconoscimenti",
        title: "Riconoscimenti",
        blocks: [
          {
            type: "list",
            items: [
              "Olimpiadi dell'Informatica: 1° posto a squadre (Università dell'Aquila) nel 2023 e nel 2024;",
              "Romanae Disputationes 2023: menzione d'onore, tra le migliori di oltre 150 squadre;",
              "Olimpiadi di Problem Solving 2022: menzione d'onore nazionale;",
              "Certificazioni di inglese C1 (Cambridge English, Goldsmiths University of London);",
              "Business Program, Concordia University (Los Angeles).",
            ],
          },
          { type: "p", text: "Fuori dal lavoro sono arbitro di calcio AIA/FIGC dal 2022." },
        ],
      },
      {
        id: "stampa",
        title: "Stampa e scritti",
        blocks: [
          {
            type: "list",
            items: [
              `Citato da [CertaStampa](${CASE_LINKS.press.certaStampa}), [NotizieDAbruzzo](${CASE_LINKS.press.notizieDAbruzzo}) e [Abruzzo Popolare](${CASE_LINKS.press.abruzzoPopolare}) per l'introduzione dell'IA nelle prove del Premio Di Nicola;`,
              `[A different test for every student, and a reason to trust it](${CASE_LINKS.article}), articolo tecnico sull'adaptive testing;`,
              "[87° con le mani legate](https://youjustmadethelist.github.io/polimi_qs/polimi-qs-2027), analisi del Politecnico di Milano nel QS Ranking 2027.",
            ],
          },
        ],
      },
      {
        id: "profili",
        title: "Profili",
        blocks: [
          {
            type: "list",
            items: [`[LinkedIn](${linkedinUrl})`, `[GitHub](${GITHUB_URL})`, `[Instagram](${instagramUrl})`],
          },
        ],
      },
    ],
    related: ["svc-rag", "svc-agents", "case-data", "case-edtech"],
  },
  {
    key: "about",
    kind: "about",
    locale: "en",
    path: "/en/about",
    publishedAt: PAGES_DATE,
    updatedAt: "2026-09-29",
    metaTitle: "Davide De Sanctis — custom AI solutions developer",
    metaDescription:
      "Who is Davide De Sanctis: custom artificial intelligence solutions developer for businesses, AI Automation Specialist at Conio, Politecnico di Milano student, founder. Working in Italy.",
    eyebrow: "About",
    title: "Davide De Sanctis, custom AI solutions developer.",
    emphasis: "custom AI solutions",
    shortTitle: "About",
    summary: "Background, recognitions and profiles of Davide De Sanctis.",
    intro:
      "I'm Davide De Sanctis, 20, and I build custom artificial intelligence solutions for businesses. I work as AI Automation Specialist at Conio, an Italian fintech company, study Computer Engineering at Politecnico di Milano, and founded my own company, which will also launch other startups.",
    sections: [
      {
        id: "at-a-glance",
        title: "Who is Davide De Sanctis",
        blocks: [
          {
            type: "table",
            head: ["Item", "Detail"],
            rows: [
              ["Name", "Davide De Sanctis"],
              ["What he does", "Builds custom artificial intelligence solutions for businesses"],
              ["Role", "AI Automation Specialist at [Conio](https://www.conio.com), a fintech company; founder of his own company"],
              ["Studies", "Computer Engineering, Politecnico di Milano"],
              ["Based", "Italy (Rome, Milan, Pescara, Teramo, Bologna), remote worldwide"],
              ["Website", "[davidedesanctis.com](https://davidedesanctis.com)"],
            ],
          },
          {
            type: "p",
            text: "Other people share this name. This page is about the Davide De Sanctis who builds AI systems for businesses; his official profiles are listed below.",
          },
        ],
      },
      {
        id: "path",
        title: "Path",
        blocks: [
          {
            type: "list",
            items: [
              "AI Automation Specialist at [Conio](https://www.conio.com);",
              "Politecnico di Milano, Computer Engineering: first year completed, 28.57/30 average, 60 credits;",
              "Founder of my own company;",
              "2026: the engine generating the exams of the Premio Di Nicola, 18th edition ([case study](/en/case-studies/adaptive-learning-paths));",
              "Informatics Olympics: 1st place (team, University of L'Aquila) in 2023 and 2024;",
              "Romanae Disputationes 2023 honorable mention; Problem Solving Olympiad 2022 national honorable mention;",
              "C1 English (Cambridge, Goldsmiths); Business Program, Concordia University (Los Angeles).",
            ],
          },
        ],
      },
      {
        id: "profiles",
        title: "Profiles",
        blocks: [{ type: "list", items: [`[LinkedIn](${linkedinUrl})`, `[GitHub](${GITHUB_URL})`, `[Instagram](${instagramUrl})`] }],
      },
    ],
    related: ["svc-rag", "svc-llm-dev", "case-data"],
  },
];
