import type { ContentPage } from "@/lib/seo/pages";
import { PAGES_DATE } from "./shared";

/* Fatti verificati il 27/09/2026 sulle fonti elencate in `sources`.
   Da ricontrollare a ogni aggiornamento: bandi e scadenze cambiano. */

export const fundingPages: ContentPage[] = [
  {
    key: "funding",
    kind: "funding",
    locale: "it",
    path: "/it/bandi-intelligenza-artificiale",
    publishedAt: PAGES_DATE,
    updatedAt: PAGES_DATE,
    metaTitle: "Bandi e incentivi per progetti di intelligenza artificiale 2026",
    metaDescription:
      "Come finanziare un progetto AI nel 2026: iperammortamento su software e sistemi di AI, voucher regionali, requisiti e scadenze. Riepilogo con fonti ufficiali.",
    eyebrow: "Bandi e incentivi",
    title: "Come finanziare un progetto di intelligenza artificiale nel 2026.",
    emphasis: "finanziare",
    shortTitle: "Bandi e incentivi per l'AI",
    summary: "Iperammortamento 2026, voucher regionali, requisiti e scadenze, con le fonti.",
    intro:
      "Nel 2026 la misura nazionale più rilevante per un progetto di AI è l'iperammortamento, che sostituisce Transizione 5.0 e include software, sistemi e modelli di intelligenza artificiale acquistati come investimento. I voucher regionali esistono ma si esauriscono in fretta. In ogni caso la verifica finale spetta al tuo commercialista.",
    sections: [
      {
        id: "iperammortamento",
        title: "Iperammortamento 2026",
        blocks: [
          {
            type: "p",
            text: "Permette di dedurre più del costo effettivo dei beni agevolabili. La piattaforma del GSE per prenotare l'agevolazione è operativa dal 12 giugno 2026 ([MIMIT](https://www.mimit.gov.it/it/incentivi/piano-transizione-5-0)).",
          },
          {
            type: "table",
            head: ["Investimento", "Maggiorazione del costo"],
            rows: [
              ["Fino a 2,5 milioni di euro", "+180%"],
              ["Da 2,5 a 10 milioni", "+100%"],
              ["Da 10 a 20 milioni", "+50%"],
            ],
          },
          {
            type: "list",
            items: [
              "**Periodo**: investimenti dal 1° gennaio 2026 al 30 settembre 2028 ([Rete Agevolazioni](https://www.reteagevolazioni.it/iperammortamento-2026/)).",
              "**Cosa rientra**: i beni immateriali dell'allegato V includono software, sistemi, piattaforme e modelli di intelligenza artificiale ([Baker Tilly](https://www.bakertilly.it/insights/iperammortamento-2026-esteso-ai-sistemi-e-modelli-di-intelligenza-artificiale)).",
              "**Cosa non rientra**: software e modelli di AI usati in abbonamento, \"as a service\"; conta l'investimento ammortizzabile.",
              "**Requisiti**: perizia tecnica asseverata per ogni investimento, interconnessione con i sistemi aziendali documentata, comunicazioni al GSE (preventiva, di conferma con acconto del 20% entro 60 giorni, di completamento) ([Incentivimpresa](https://www.incentivimpresa.it/transizione-5-0-software-ai-spese-ammissibili-2026/)).",
            ],
          },
          {
            type: "callout",
            text: "Cosa significa per un progetto su misura: un sistema di AI sviluppato e consegnato come bene dell'azienda, integrato con i suoi sistemi, può essere valutato per l'agevolazione; un abbonamento a un servizio no. Conviene deciderlo prima di firmare, perché cambia come si imposta il contratto.",
          },
        ],
      },
      {
        id: "voucher",
        title: "Voucher regionali",
        blocks: [
          {
            type: "p",
            text: "Le Camere di commercio e le Regioni pubblicano voucher per la digitalizzazione che spesso includono l'AI. Esempio: il Voucher Doppia Transizione Lombardia 2026 copriva il 50% delle spese fino a 10.000 euro per progetto, con un investimento minimo di 4.000 euro; lo sportello si è chiuso il 29 luglio 2026 per esaurimento dei fondi ([Unioncamere Lombardia](https://www.unioncamerelombardia.it/bandi-e-incentivi-alle-imprese/dettaglio-bando/bando-voucher-doppia-transizione-lombardia-2026)).",
          },
          {
            type: "list",
            items: [
              "gli sportelli aprono con poco preavviso e si chiudono in ore o giorni: conviene avere il progetto già definito;",
              "spesso consulenza e formazione devono arrivare da fornitori qualificati (Competence Center, EDIH, manager dell'innovazione certificati), mentre la tecnologia può arrivare da altri fornitori;",
              "i bandi escludono di solito chi ha già ricevuto misure simili nell'anno precedente.",
            ],
          },
        ],
      },
      {
        id: "come-mi-preparo",
        title: "Come preparare il progetto",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "Definire il processo da migliorare e come misurare il risultato: è quello che rende il progetto finanziabile e difendibile.",
              "Chiedere al commercialista quale misura si applica all'azienda e con quali tempi.",
              "Impostare contratto e consegna coerenti con la misura (bene acquistato e integrato, non abbonamento, per l'iperammortamento).",
              "Tenere documentazione tecnica e di interconnessione dall'inizio: servirà alla perizia.",
            ],
          },
          {
            type: "p",
            text: "Posso preparare la parte tecnica del progetto (perimetro, architettura, integrazione, documentazione). La valutazione fiscale e la domanda restano al tuo commercialista o consulente. Parliamone dalla [pagina contatti](/it#contatti).",
          },
        ],
      },
    ],
    faq: [
      {
        q: "Un chatbot in abbonamento rientra nell'iperammortamento?",
        a: "No: software e modelli di AI fruiti \"as a service\" sono esclusi. Rientra un sistema acquistato come bene, ammortizzabile e interconnesso con i sistemi aziendali, con perizia asseverata.",
      },
      {
        q: "Transizione 5.0 è ancora attiva?",
        a: "No, i termini per le domande sono chiusi. Il MIMIT indica come successore il nuovo piano basato sull'iperammortamento, con piattaforma GSE aperta dal 12 giugno 2026.",
      },
      {
        q: "Garantisci che il progetto verrà agevolato?",
        a: "No. Nessun fornitore può garantirlo: dipende dai requisiti dell'azienda, della spesa e della procedura. Posso rendere il progetto tecnicamente in linea con i requisiti.",
      },
    ],
    sources: [
      { label: "MIMIT: Piano Transizione 5.0 e nuovo iperammortamento", href: "https://www.mimit.gov.it/it/incentivi/piano-transizione-5-0" },
      { label: "Rete Agevolazioni: Iperammortamento 2026", href: "https://www.reteagevolazioni.it/iperammortamento-2026/" },
      { label: "Baker Tilly: iperammortamento esteso ai sistemi di AI", href: "https://www.bakertilly.it/insights/iperammortamento-2026-esteso-ai-sistemi-e-modelli-di-intelligenza-artificiale" },
      { label: "Incentivimpresa: software AI e spese ammissibili", href: "https://www.incentivimpresa.it/transizione-5-0-software-ai-spese-ammissibili-2026/" },
      { label: "Unioncamere Lombardia: Voucher Doppia Transizione 2026", href: "https://www.unioncamerelombardia.it/bandi-e-incentivi-alle-imprese/dettaglio-bando/bando-voucher-doppia-transizione-lombardia-2026" },
    ],
    related: ["svc-agents", "svc-rag", "guide-costi-chatbot", "guide-ai-act"],
  },
];
