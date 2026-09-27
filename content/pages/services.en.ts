import type { ContentPage } from "@/lib/seo/pages";
import { methodSection, pricingSection, PAGES_DATE } from "./shared";

const base = { kind: "service" as const, locale: "en" as const, publishedAt: PAGES_DATE, updatedAt: PAGES_DATE };

export const servicesEn: ContentPage[] = [
  {
    ...base,
    key: "svc-rag",
    path: "/en/services/rag-chatbot-company-documents",
    serviceType: "RAG chatbots on company documents",
    metaTitle: "Custom RAG chatbots on your company documents",
    metaDescription:
      "Assistants that answer from your company's documents and cite the source of every answer. Custom RAG systems with your data under control. Italy-based, working in Italian and English.",
    eyebrow: "Services · RAG",
    title: "An assistant that answers from your documents, and cites them.",
    emphasis: "and cites them",
    shortTitle: "RAG chatbots on company documents",
    summary: "Assistants that answer from manuals, contracts, procedures and internal data, citing sources.",
    intro:
      "I build RAG (Retrieval-Augmented Generation) systems: the assistant searches your documents for the relevant passages and answers only from those, showing where every statement comes from. That is the difference between a chatbot that makes things up and a tool your team can trust.",
    sections: [
      {
        id: "what-it-solves",
        title: "What it solves",
        blocks: [
          {
            type: "list",
            items: [
              "support teams answering the same questions that are already written in manuals nobody reads;",
              "new hires spending weeks learning procedures and technical documentation;",
              "sales and engineering searching clauses, prices or specs across hundreds of files;",
              "asking business data questions in plain language and getting numbers you can verify.",
            ],
          },
        ],
      },
      {
        id: "how-it-works",
        title: "How a solid RAG system works",
        blocks: [
          {
            type: "list",
            ordered: true,
            items: [
              "**Collection and cleaning** of documents, split into passages that make sense on their own.",
              "**Indexing** in a vector database, combined with keyword search: hybrid retrieval fails far less often.",
              "**Retrieval and answer** grounded only in the retrieved passages, with references.",
              "**Permissions**: each user only sees documents they can already access.",
              "**Evaluation**: a test set of questions with expected answers measures quality before every release.",
            ],
          },
        ],
      },
      {
        id: "experience",
        title: "Where I have done it",
        blocks: [
          {
            type: "p",
            text: "I built a natural-language query layer over more than 2 million documents spread across dozens of indices, with a schema catalog of 2,000+ fields in a vector database. Full story: [AI-augmented analytics at document scale](/en/case-studies/ai-analytics-documents).",
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "volume and format of the documents (scanned PDFs, tables and images take more work);",
        "how many sources to connect and whether they update in real time;",
        "permission and logging requirements;",
        "where the model runs: API, EU cloud or your own servers;",
        "expected query volume, which sets the monthly running cost.",
      ]),
    ],
    faq: [
      {
        q: "Are my documents used to train the model?",
        a: "No. In RAG, documents are read at question time and never train a model. With business APIs from the major providers or with a private model, your data stays out of training.",
      },
      {
        q: "Does it work in Italian?",
        a: "Yes. Current models handle Italian well; quality depends mostly on how documents are prepared and split.",
      },
    ],
    related: ["svc-private-llm", "svc-agents", "case-data"],
  },
  {
    ...base,
    key: "svc-private-llm",
    path: "/en/services/private-llm-on-premise",
    serviceType: "Private and on-premise LLMs for companies",
    metaTitle: "Private LLMs for companies: on-premise and EU cloud",
    metaDescription:
      "Language models running on your servers or in an EU cloud: when it pays off, what it takes, and how to run it. Custom design and development.",
    eyebrow: "Services · Private LLMs",
    title: "A language model of your own, where you decide.",
    emphasis: "where you decide",
    shortTitle: "Private and on-premise LLMs",
    summary: "Open-source models on your servers or in an EU cloud, when data cannot leave.",
    intro:
      "A private LLM runs on your own servers or in an EU cloud you choose, without sending data to external services. It pays off when data is too sensitive for a public API, or when request volume makes the API more expensive than the infrastructure.",
    sections: [
      {
        id: "when",
        title: "When it makes sense",
        blocks: [
          {
            type: "table",
            head: ["Situation", "Provider API", "Private model"],
            rows: [
              ["Health, legal, financial data or trade secrets", "Possible with the right contracts, but data leaves", "Data never leaves"],
              ["Few requests per day", "Cheaper", "Fixed hardware cost"],
              ["High continuous volume", "Cost grows with usage", "Predictable cost"],
              ["You need the most capable model available", "Better", "A step behind on the hardest tasks"],
              ["Air-gapped environments", "Not usable", "Works offline"],
            ],
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "model size and concurrent users, which set the hardware;",
        "on-site servers or EU cloud;",
        "integration with existing systems and permissions;",
        "support level after release.",
      ]),
    ],
    related: ["svc-rag", "svc-llm-dev"],
  },
  {
    ...base,
    key: "svc-agents",
    path: "/en/services/ai-agents-process-automation",
    serviceType: "AI agents and business process automation",
    metaTitle: "Custom AI agents and business process automation",
    metaDescription:
      "AI agents that do repetitive work inside your systems: documents, email, invoices, CRM, reports. Custom automation with human control where it matters.",
    eyebrow: "Services · AI agents",
    title: "AI agents that do the repetitive work, not just answer.",
    emphasis: "do the repetitive work",
    shortTitle: "AI agents and process automation",
    summary: "Automations that read documents, update systems and prepare decisions, with human review where needed.",
    intro:
      "An AI agent takes concrete steps inside your tools: it reads a document, extracts the data, checks it, updates your system of record and only escalates unclear cases to a person. I build them around the processes that eat hours of manual work today.",
    sections: [
      {
        id: "principles",
        title: "How I make them reliable",
        blocks: [
          {
            type: "list",
            items: [
              "**Deterministic parts stay deterministic.** Calculations, checks and business rules are code, not prompts.",
              "**Every step is logged**, like an audit trail.",
              "**Confidence thresholds** route uncertain cases to a person.",
              "**Measure before extending**: start with one process, measure time saved and errors, then widen.",
            ],
          },
          {
            type: "p",
            text: "I work as AI Automation Specialist at [Conio](https://www.conio.com), an Italian fintech company, where automation runs under strict control requirements.",
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "number and complexity of the processes;",
        "systems to connect (ERP, CRM, email, shared drives, external APIs);",
        "quality and variety of incoming documents;",
        "required level of human review and traceability.",
      ]),
    ],
    related: ["svc-rag", "svc-llm-dev", "case-fintech"],
  },
  {
    ...base,
    key: "svc-llm-dev",
    path: "/en/services/llm-developer",
    serviceType: "LLM software development",
    metaTitle: "LLM developer for companies and startups",
    metaDescription:
      "LLM developer for custom projects: RAG, agents, evaluation, integration into your products. From prototype to production, with code and documentation you own.",
    eyebrow: "Services · LLM development",
    title: "An LLM developer who takes prototypes to production.",
    emphasis: "to production",
    shortTitle: "LLM developer",
    summary: "LLM-based products and features, with measurable quality and code you own.",
    intro:
      "If you have a product or a team and need someone to design and write the LLM-based part, I work as an LLM developer in your codebase: from architecture to production, with measurable quality tests and documentation that stays with your team.",
    sections: [
      {
        id: "what",
        title: "What I build",
        blocks: [
          {
            type: "list",
            items: [
              "RAG and semantic search with hybrid retrieval and citations;",
              "multi-step agents with tools, memory and guardrails;",
              "structured extraction from text and documents into JSON, databases and business systems;",
              "evaluation suites and automated regressions;",
              "cost and latency optimization: the right model per task, caching, fewer tokens.",
            ],
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "fixed-scope project or time-boxed team augmentation;",
        "maturity of the existing code and data;",
        "quality, security and logging requirements;",
        "expected users and volumes.",
      ]),
    ],
    related: ["svc-rag", "svc-agents", "case-data"],
  },
  {
    ...base,
    key: "svc-fintech",
    path: "/en/services/ai-for-fintech",
    serviceType: "AI and data systems for fintech",
    metaTitle: "AI for fintech: financial data, scoring and signals",
    metaDescription:
      "Data and AI systems for fintech and financial services: scoring, signals, market analysis, automation with a full audit trail. Hands-on experience inside a fintech company.",
    eyebrow: "Services · Fintech",
    title: "AI for fintech, where a mistake costs more than a delay.",
    emphasis: "costs more than a delay",
    shortTitle: "AI for fintech",
    summary: "Scoring, signals and automation for financial services, fully traceable.",
    intro:
      "In financial services a model nobody can explain is a liability. I build data and AI systems for fintech with a full audit trail and a clean split between deterministic logic (rules, calculations, limits) and probabilistic logic (models, estimates).",
    sections: [
      {
        id: "experience",
        title: "Experience",
        blocks: [
          {
            type: "p",
            text: "I work as AI Automation Specialist at [Conio](https://www.conio.com). I designed a [volatility and liquidity engine on XAU/USD](/en/case-studies/xauusd-signal-engine); a validation bot trading only on its signals recorded a 54% win rate at a 1.4:1 risk/reward ratio. That is an engine result, not financial advice.",
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "number and quality of data sources;",
        "regulatory and audit requirements;",
        "update frequency (daily, hourly, real time);",
        "integration with existing systems and reporting.",
      ]),
    ],
    related: ["case-fintech", "case-data", "svc-agents"],
  },
  {
    ...base,
    key: "svc-edtech",
    path: "/en/services/ai-for-edtech",
    serviceType: "Adaptive learning platforms with AI",
    metaTitle: "AI for edtech: adaptive learning and generated tests",
    metaDescription:
      "E-learning platforms with AI: personalized paths, generated and verified exercises, adaptive tests. Already in production in a regional student competition in Italy.",
    eyebrow: "Services · EdTech",
    title: "A different study path for every student, and a correct one.",
    emphasis: "and a correct one",
    shortTitle: "AI for edtech",
    summary: "Personalized paths, generated and verified exercises, adaptive tests.",
    intro:
      "I build systems that read each student's performance, find the gaps and generate exercises at the right level. What matters is verification: an AI-generated exercise is only worth something if it is correct, so each one passes an independent check before reaching the student.",
    sections: [
      {
        id: "in-production",
        title: "Already in production",
        blocks: [
          {
            type: "p",
            text: "The engine that generates the tests of the Premio Di Nicola 2026, a maths and logic competition for students in Abruzzo now in its 18th edition, comes from this work. See [Generated learning paths](/en/case-studies/adaptive-learning-paths) and the [technical article](https://youjustmadethelist.github.io/adaptive_test_article/).",
          },
        ],
      },
      methodSection("en", "method"),
      pricingSection("en", [
        "subjects and levels to cover;",
        "exercise types (closed, open, multi-step problems);",
        "integration with existing platforms (LMS, accounts);",
        "number of students and privacy requirements, especially for minors.",
      ]),
    ],
    related: ["case-edtech", "svc-rag"],
  },
];
