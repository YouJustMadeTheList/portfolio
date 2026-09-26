// Copy editoriale del footer. Le label "di sistema" (colSections/colConnect/
// colLegal/backToTop/rights/tagline) vivono in messages/*.json; i recapiti
// NON vivono qui ma in content/contact.ts (unica fonte di verità), e sono
// riesportati per comodità dei consumer del footer.

export {
  contactEmail,
  linkedinUrl,
  instagramHandle,
  instagramUrl,
  phoneDisplay,
  phoneHref,
  whatsappUrl,
  isPlaceholderValue,
} from "@/content/contact";

type FooterCopy = {
  eyebrow: string;
  ctaText: string;
  placeholderNote: string; // micro-copy sotto un canale non ancora configurato
  emailLabel: string;
  legal: {
    privacy: string;
    cookie: string;
    /** Riapre il banner del consenso (evento `consent:open`). */
    cookiePreferences: string;
  };
};

export const footerCopy: Record<"it" | "en", FooterCopy> = {
  it: {
    eyebrow: "Parliamo",
    ctaText: "Hai un progetto in mente? Scrivimi.",
    placeholderNote: "Presto disponibile",
    emailLabel: "Email",
    legal: {
      privacy: "Privacy",
      cookie: "Cookie",
      cookiePreferences: "Preferenze cookie",
    },
  },
  en: {
    eyebrow: "Let's talk",
    ctaText: "Got a project in mind? Reach out.",
    placeholderNote: "Coming soon",
    emailLabel: "Email",
    legal: {
      privacy: "Privacy",
      cookie: "Cookies",
      cookiePreferences: "Cookie preferences",
    },
  },
};
