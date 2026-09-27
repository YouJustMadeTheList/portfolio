/* ============================================================================
   CANALI DI CONTATTO — unica fonte di verità
   ----------------------------------------------------------------------------
   Ogni recapito vive qui, una volta sola. Footer, DirectChannels, testi di
   errore del form e app/api/contact/route.ts (destinatario: `contactEmail`)
   leggono da queste costanti: cambiare l'email quando arriva il dominio
   definitivo è una modifica di UNA riga.
   ========================================================================== */

/** Email di contatto. TEMPORANEA: sostituire quando viene acquistato il dominio. */
export const contactEmail = "dds@businessinquires.com";

export const linkedinUrl = "https://www.linkedin.com/in/davide-de-sanctis-85b810271/";

export const instagramHandle = "davidedesanctiis";
export const instagramUrl = `https://www.instagram.com/${instagramHandle}/`;

/** Telefono: forma leggibile per lo schermo, forma E.164 per i link. */
export const phoneDisplay = "+39 329 423 0076";
const phoneE164 = "393294230076";
export const phoneHref = `tel:+${phoneE164}`;
export const whatsappUrl = `https://wa.me/${phoneE164}`;

/**
 * Pagina di prenotazione di Google Calendar (appointment schedule).
 * Placeholder finché non viene creata: `isPlaceholderValue` lo rende una nota
 * inerte ("Presto disponibile"), mai un link rotto.
 */
export const bookingUrl = "TODO_GOOGLE_CALENDAR_BOOKING_URL";

/**
 * Un valore è ancora un placeholder da compilare se contiene il marker
 * "TODO_" o è vuoto. Un placeholder non deve MAI renderizzare come link
 * cliccabile funzionante (niente `href="TODO_..."`).
 */
export function isPlaceholderValue(value: string): boolean {
  return !value || value.includes("TODO_");
}

export type ProjectType = "data-ai" | "fintech" | "edtech" | "custom";

type ContactCopy = {
  /** Label del campo honeypot: invisibile, ma gli screen reader la leggono —
   *  va quindi tradotta come qualunque altra stringa. */
  honeypotLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  fields: {
    name: { label: string; placeholder: string };
    email: { label: string; placeholder: string };
    projectType: { label: string; placeholder: string };
    message: { label: string; placeholder: string };
  };
  projectTypeOptions: { value: ProjectType; label: string }[];
  submitIdle: string;
  submitLoading: string;
  reassurance: string;
  trustRecall: string;
  channelsTitle: string;
  channelEmailLabel: string;
  channelPhoneLabel: string;
  channelWhatsappLabel: string;
  channelBookingLabel: string;
  channelBookingSubtext: string;
  channelSocialLabel: string;
  placeholderNote: string;
  successTitle: string;
  successBody: (firstName: string | null) => string;
  errorGeneric: string;
  errorRateLimit: string;
  noJsFallback: string;
  /** Barra d'azione fissa della variante mobile (ContactActionBar). */
  actionBar: {
    label: string;
    call: string;
    whatsapp: string;
    write: string;
  };
  validation: {
    nameRequired: string;
    nameTooShort: string;
    emailInvalid: string;
    projectTypeRequired: string;
    messageTooShort: string;
    messageTooLong: string;
  };
};

export const contactCopy: Record<"it" | "en", ContactCopy> = {
  it: {
    honeypotLabel: "Non compilare questo campo",
    eyebrow: "Contatti",
    title: "Parliamo ⟨del tuo progetto⟩.",
    subtitle:
      "Raccontami cosa devi costruire. Rispondo entro 24-48h, di persona — non un form automatico.",
    fields: {
      name: { label: "Nome e cognome", placeholder: "Come ti chiami" },
      email: { label: "Email", placeholder: "nome@azienda.com" },
      projectType: { label: "Tipo di progetto", placeholder: "Seleziona un'area" },
      message: {
        label: "Messaggio",
        placeholder:
          "Di cosa si tratta, che problema risolve, tempistiche indicative — anche due righe bastano per iniziare.",
      },
    },
    projectTypeOptions: [
      { value: "data-ai", label: "Data & AI" },
      { value: "fintech", label: "Fintech" },
      { value: "edtech", label: "EdTech" },
      { value: "custom", label: "Custom / altro" },
    ],
    submitIdle: "Invia messaggio",
    submitLoading: "Invio in corso…",
    reassurance:
      "Rispondo entro 24-48h. Nessuna newsletter, nessun follow-up commerciale non richiesto.",
    trustRecall:
      "Stesso processo di lavoro con cui ho consegnato i progetti qui sopra — 4 step, zero sorprese.",
    channelsTitle: "Oppure, più diretto",
    channelEmailLabel: "Scrivimi direttamente",
    channelPhoneLabel: "Chiamami",
    channelWhatsappLabel: "WhatsApp",
    channelBookingLabel: "Prenota 20 minuti di call",
    channelBookingSubtext: "Scegli uno slot libero sul mio Google Calendar: 20 minuti, senza impegno.",
    channelSocialLabel: "Anche qui",
    placeholderNote: "Presto disponibile",
    successTitle: "Messaggio ricevuto.",
    successBody: (firstName) =>
      firstName
        ? `Grazie, ${firstName}. Ti rispondo entro 24-48h all'indirizzo che mi hai lasciato. Nel frattempo, se è urgente, scrivimi su LinkedIn.`
        : "Grazie. Ti rispondo entro 24-48h all'indirizzo che mi hai lasciato. Nel frattempo, se è urgente, scrivimi su LinkedIn.",
    errorGeneric: `Qualcosa non ha funzionato nell'invio. Riprova, oppure scrivimi direttamente a ${contactEmail} — arrivo comunque.`,
    errorRateLimit: `Troppi messaggi in poco tempo. Riprova tra qualche minuto, oppure scrivimi direttamente a ${contactEmail}.`,
    noJsFallback: `Il form richiede JavaScript per funzionare correttamente. Scrivimi direttamente a ${contactEmail} — rispondo entro 24-48h.`,
    actionBar: {
      label: "Contatto rapido",
      call: "Chiama",
      whatsapp: "WhatsApp",
      write: "Scrivi",
    },
    validation: {
      nameRequired: "Inserisci il tuo nome.",
      nameTooShort: "Nome troppo corto.",
      emailInvalid: "Inserisci un'email valida.",
      projectTypeRequired: "Seleziona il tipo di progetto.",
      messageTooShort: "Il messaggio è troppo breve — anche due righe bastano, ma servono.",
      messageTooLong: "Messaggio troppo lungo, prova a sintetizzare.",
    },
  },
  en: {
    honeypotLabel: "Do not fill in this field",
    eyebrow: "Contact",
    title: "Let's talk ⟨about your project⟩.",
    subtitle: "Tell me what you need to build. I reply within 24-48h, in person — not an automated form.",
    fields: {
      name: { label: "Full name", placeholder: "Your name" },
      email: { label: "Email", placeholder: "name@company.com" },
      projectType: { label: "Project type", placeholder: "Select an area" },
      message: {
        label: "Message",
        placeholder: "What it's about, what problem it solves, rough timeline — even a couple of lines is enough to start.",
      },
    },
    projectTypeOptions: [
      { value: "data-ai", label: "Data & AI" },
      { value: "fintech", label: "Fintech" },
      { value: "edtech", label: "EdTech" },
      { value: "custom", label: "Custom / other" },
    ],
    submitIdle: "Send message",
    submitLoading: "Sending…",
    reassurance: "I reply within 24-48h. No newsletter, no unsolicited follow-up.",
    trustRecall: "Same process I used to deliver the projects above — 4 steps, no surprises.",
    channelsTitle: "Or, more direct",
    channelEmailLabel: "Email me directly",
    channelPhoneLabel: "Call me",
    channelWhatsappLabel: "WhatsApp",
    channelBookingLabel: "Book a 20-minute call",
    channelBookingSubtext: "Pick a free slot on my Google Calendar: 20 minutes, no commitment.",
    channelSocialLabel: "Also here",
    placeholderNote: "Coming soon",
    successTitle: "Message received.",
    successBody: (firstName) =>
      firstName
        ? `Thanks, ${firstName}. I'll reply within 24-48h at the address you left. If it's urgent in the meantime, reach me on LinkedIn.`
        : "Thanks. I'll reply within 24-48h at the address you left. If it's urgent in the meantime, reach me on LinkedIn.",
    errorGeneric: `Something went wrong sending this. Try again, or email me directly at ${contactEmail} — I'll get it either way.`,
    errorRateLimit: `Too many messages in a short time. Try again in a few minutes, or email me directly at ${contactEmail}.`,
    noJsFallback: `This form needs JavaScript to work properly. Email me directly at ${contactEmail} — I reply within 24-48h.`,
    actionBar: {
      label: "Quick contact",
      call: "Call",
      whatsapp: "WhatsApp",
      write: "Write",
    },
    validation: {
      nameRequired: "Enter your name.",
      nameTooShort: "Name is too short.",
      emailInvalid: "Enter a valid email.",
      projectTypeRequired: "Select a project type.",
      messageTooShort: "Message is too short — a couple of lines is enough, but it needs those.",
      messageTooLong: "Message is too long, try to summarize.",
    },
  },
};
