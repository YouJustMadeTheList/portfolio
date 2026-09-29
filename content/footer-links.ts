/* Link alle pagine di contenuto mostrati nel footer (tutte le pagine del sito
   li hanno: collegamenti interni stabili per motori e persone). Percorsi
   completi con prefisso di lingua; devono esistere in content/pages. */

export type FooterLinkGroup = { title: string; links: { label: string; href: string }[] };

export const footerDirectory: Record<"it" | "en", FooterLinkGroup[]> = {
  it: [
    {
      title: "Servizi",
      links: [
        { label: "Chatbot e RAG sui documenti", href: "/it/servizi/chatbot-rag-documenti-aziendali" },
        { label: "LLM privati e on-premise", href: "/it/servizi/llm-privati-on-premise" },
        { label: "Agenti AI e automazione", href: "/it/servizi/agenti-ai-automazione-processi" },
        { label: "Sviluppatore LLM", href: "/it/servizi/sviluppatore-llm" },
        { label: "AI per fintech", href: "/it/servizi/ai-per-fintech" },
        { label: "AI per edtech", href: "/it/servizi/ai-per-edtech" },
      ],
    },
    {
      title: "Risorse",
      links: [
        { label: "Casi studio", href: "/it/casi-studio" },
        { label: "Guide", href: "/it/guide" },
        { label: "Bandi e incentivi AI", href: "/it/bandi-intelligenza-artificiale" },
        { label: "Chi è Davide De Sanctis", href: "/it/chi-sono" },
      ],
    },
    {
      title: "Dove",
      links: [
        { label: "Roma", href: "/it/consulente-intelligenza-artificiale/roma" },
        { label: "Milano", href: "/it/consulente-intelligenza-artificiale/milano" },
        { label: "Pescara", href: "/it/consulente-intelligenza-artificiale/pescara" },
        { label: "Teramo", href: "/it/consulente-intelligenza-artificiale/teramo" },
        { label: "Bologna", href: "/it/consulente-intelligenza-artificiale/bologna" },
      ],
    },
  ],
  en: [
    {
      title: "Services",
      links: [
        { label: "RAG chatbots on documents", href: "/en/services/rag-chatbot-company-documents" },
        { label: "Private LLMs", href: "/en/services/private-llm-on-premise" },
        { label: "AI agents & automation", href: "/en/services/ai-agents-process-automation" },
        { label: "LLM developer", href: "/en/services/llm-developer" },
        { label: "AI for fintech", href: "/en/services/ai-for-fintech" },
        { label: "AI for edtech", href: "/en/services/ai-for-edtech" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Case studies", href: "/en/case-studies" },
        { label: "About Davide De Sanctis", href: "/en/about" },
      ],
    },
  ],
};
