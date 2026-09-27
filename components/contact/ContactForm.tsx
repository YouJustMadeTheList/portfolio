"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Tactile } from "@/components/ui/Tactile";
import { contactCopy, type ProjectType } from "@/content/contact";
import { contactRules } from "@/lib/validation/contactRules";
import { ensureGsapRegistered, gsap } from "@/lib/animation/gsap";
import { SERVICES_HANDOFF_KEY } from "@/content/services";
import { cn } from "@/lib/utils/cn";
import { useIsMobileVariant } from "@/components/variant/VariantProvider";

type ContactFormProps = {
  locale: "it" | "en";
  reducedMotion: boolean;
};

type ContactFormValues = {
  name: string;
  email: string;
  projectType: ProjectType | "";
  message: string;
  honeypot: string;
};

type FieldName = "name" | "email" | "projectType" | "message";

type ContactFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; firstName: string | null }
  | { status: "error"; kind: "network" | "rate-limit" | "server"; message: string };

const FIELD_ORDER: FieldName[] = ["name", "email", "projectType", "message"];
const FETCH_TIMEOUT_MS = 10_000;
const MIN_PERCEIVED_LOADING_MS = 500;

/** Orologio per la durata minima percepita del caricamento (usato solo negli handler). */
function nowMs(): number {
  return Date.now();
}

const initialValues: ContactFormValues = {
  name: "",
  email: "",
  projectType: "",
  message: "",
  honeypot: "",
};

/**
 * Estrae il primo token del nome per l'interpolazione nel messaggio di conferma
 * (§1 nota copy): se il parsing fallisce (un solo carattere, emoji, solo simboli...)
 * si ricade sul testo generico senza nome.
 */
function extractFirstName(name: string): string | null {
  const first = name.trim().split(/\s+/)[0];
  if (!first || first.length < 2) return null;
  if (!/^[\p{L}][\p{L}'-]*$/u.test(first)) return null;
  return first;
}

function getFieldError(
  field: FieldName,
  value: string,
  copy: (typeof contactCopy)["it"],
): string | undefined {
  const trimmed = value.trim();

  switch (field) {
    case "name": {
      if (trimmed.length === 0) return copy.validation.nameRequired;
      return contactRules.name(value)
        ? undefined
        : copy.validation.nameTooShort;
    }
    case "email": {
      return contactRules.email(value)
        ? undefined
        : copy.validation.emailInvalid;
    }
    case "projectType": {
      return contactRules.projectType(value)
        ? undefined
        : copy.validation.projectTypeRequired;
    }
    case "message": {
      if (contactRules.message(value)) return undefined;
      return trimmed.length > 2000 ? copy.validation.messageTooLong : copy.validation.messageTooShort;
    }
    default:
      return undefined;
  }
}

/**
 * ContactForm v2 — art direction §6 "Contatti": label flottanti, bordo aqua
 * che si disegna da sinistra al focus, bottone magnetico con stato di
 * caricamento fluido, pannello di successo che vale il momento.
 *
 * NON TOCCATO in questo restyle (contratto esplicito del brief):
 *  - lo schema Zod condiviso client/server (lib/validation/contact.ts);
 *  - l'ordine honeypot-first lato server (invariato in app/api/contact/route.ts,
 *    qui il campo honeypot resta comunque il PRIMO campo nel markup, prima dei
 *    campi visibili — stesso ordine DOM della v1);
 *  - il fallback no-JS (`<form action="/api/contact" method="post">` +
 *    submit nativo se JS è disabilitato);
 *  - l'handoff Servizi→Contatti (SERVICES_HANDOFF_KEY + CustomEvent
 *    "servizi:project-type-selected", stesso shape `{ projectType, packageId }`).
 */
export function ContactForm({ locale, reducedMotion }: ContactFormProps) {
  const copy = contactCopy[locale];
  // Variante mobile: campi a 16px (niente zoom automatico di iOS), tastiere e
  // tasto Invio adatti a ogni campo, contenitore senza blur né altezza minima.
  const mobile = useIsMobileVariant();

  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [focused, setFocused] = useState<Partial<Record<FieldName, boolean>>>({});
  const [formState, setFormState] = useState<ContactFormState>({ status: "idle" });

  const fieldRefs = useRef<Partial<Record<FieldName, HTMLElement>>>({});
  const fieldsContainerRef = useRef<HTMLDivElement | null>(null);
  const successPanelRef = useRef<HTMLDivElement | null>(null);
  const successIconRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    ensureGsapRegistered();
  }, []);

  // Handoff da Servizi (vedi content/services.ts accanto a SERVICES_HANDOFF_KEY):
  // un click su una pricing card scrive il projectType in localStorage e spedisce
  // un CustomEvent — leggiamo entrambi i canali, in caso il form sia già montato
  // (evento) o venga montato dopo lo scroll (localStorage al mount).
  useEffect(() => {
    const isValidProjectType = (v: unknown): v is ProjectType =>
      v === "data-ai" || v === "fintech" || v === "edtech" || v === "custom";

    const applyProjectType = (projectType: unknown) => {
      if (!isValidProjectType(projectType)) return;
      setValues((prev) => (prev.projectType ? prev : { ...prev, projectType }));
    };

    try {
      const stored = window.localStorage.getItem(SERVICES_HANDOFF_KEY);
      if (stored) {
        applyProjectType(stored);
        window.localStorage.removeItem(SERVICES_HANDOFF_KEY);
      }
    } catch {
      // localStorage indisponibile — non bloccante, resta il listener sotto.
    }

    const handleHandoffEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ projectType?: string }>).detail;
      applyProjectType(detail?.projectType);
    };

    window.addEventListener("servizi:project-type-selected", handleHandoffEvent);
    return () => window.removeEventListener("servizi:project-type-selected", handleHandoffEvent);
  }, []);

  // Entrata del pannello di successo — parte quando lo stato passa a "success"
  // (il fade-out dei campi è già avvenuto prima, vedi handleSubmit).
  useEffect(() => {
    if (formState.status !== "success") return;
    if (reducedMotion || !successPanelRef.current) return;

    const tl = gsap.timeline();
    tl.fromTo(
      successPanelRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
    );
    if (successIconRef.current) {
      tl.fromTo(
        successIconRef.current,
        { opacity: 0, scale: 0.6, rotate: -8 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.9)" },
        "-=0.3",
      );
    }
  }, [formState.status, reducedMotion]);

  // Un solo callback-ref stabile per tutti i campi: l'attributo `name` di
  // ogni controllo coincide con il suo FieldName.
  const registerField = useCallback(
    (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      if (el) fieldRefs.current[el.name as FieldName] = el;
    },
    [],
  );

  function updateValue(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // On-change: ricalcola solo se il campo è già in stato di errore (§6.2) —
    // per dare feedback immediato di correzione senza dover uscire dal campo.
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const error = getFieldError(field, value, copy);
      return { ...prev, [field]: error };
    });
  }

  function handleFocus(field: FieldName) {
    setFocused((prev) => ({ ...prev, [field]: true }));
  }

  function handleBlur(field: FieldName) {
    setFocused((prev) => ({ ...prev, [field]: false }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: getFieldError(field, values[field], copy) }));
  }

  async function playFieldsExit(): Promise<void> {
    if (reducedMotion || !fieldsContainerRef.current) return;
    return new Promise((resolve) => {
      gsap.to(fieldsContainerRef.current, {
        opacity: 0,
        y: -8,
        duration: 0.3,
        ease: "power3.out",
        onComplete: () => resolve(),
      });
    });
  }

  function focusFirstError(fieldsWithErrors: FieldName[]) {
    const first = fieldsWithErrors[0];
    if (!first) return;
    const el = fieldRefs.current[first];
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    el.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formState.status === "submitting") return;

    const newErrors: Partial<Record<FieldName, string>> = {};
    for (const field of FIELD_ORDER) {
      newErrors[field] = getFieldError(field, values[field], copy);
    }
    setErrors(newErrors);
    setTouched({ name: true, email: true, projectType: true, message: true });

    const fieldsWithErrors = FIELD_ORDER.filter((f) => newErrors[f]);
    if (fieldsWithErrors.length > 0) {
      focusFirstError(fieldsWithErrors);
      return;
    }

    setFormState({ status: "submitting" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const start = nowMs();

    const waitOutMinDuration = async () => {
      const elapsed = nowMs() - start;
      const remaining = MIN_PERCEIVED_LOADING_MS - elapsed;
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, locale }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      await waitOutMinDuration();

      if (res.status === 429) {
        setFormState({ status: "error", kind: "rate-limit", message: copy.errorRateLimit });
        return;
      }

      if (!res.ok) {
        try {
          const data = (await res.json()) as { fields?: Partial<Record<FieldName, string>> };
          if (data?.fields) setErrors((prev) => ({ ...prev, ...data.fields }));
        } catch {
          // risposta non-JSON o vuota: ignorata, si mostra comunque l'errore generico
        }
        setFormState({ status: "error", kind: "server", message: copy.errorGeneric });
        return;
      }

      await playFieldsExit();
      setFormState({ status: "success", firstName: extractFirstName(values.name) });
    } catch {
      clearTimeout(timeoutId);
      await waitOutMinDuration();
      setFormState({ status: "error", kind: "network", message: copy.errorGeneric });
    }
  }

  function handleReset() {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setFocused({});
    setFormState({ status: "idle" });
  }

  /** Tasto "Avanti" della tastiera (enterkeyhint="next"): passa al campo
   *  successivo invece di inviare il form a metà compilazione. */
  function handleEnterNext(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!mobile || e.key !== "Enter" || e.nativeEvent.isComposing) return;
    const field = e.currentTarget.name as FieldName;
    const next = FIELD_ORDER[FIELD_ORDER.indexOf(field) + 1];
    const el = next ? fieldRefs.current[next] : undefined;
    if (!el) return;
    e.preventDefault();
    el.focus();
  }

  const isSubmitting = formState.status === "submitting";
  const showSuccess = formState.status === "success";

  const fieldBaseClass =
    "peer w-full rounded-[var(--radius-sm)] border border-white/10 bg-[var(--raised)]/60 px-[14px] pb-[9px] pt-[21px] font-[family-name:var(--font-body)] text-[15px] text-[var(--text-hi)] outline-none transition-colors duration-200 [transition-timing-function:var(--ease-out)] placeholder:text-[var(--text-low)] hover:border-white/[0.18] disabled:pointer-events-none disabled:opacity-60";
  const fieldErrorClass = "border-[var(--state-error)]";

  function fieldClass(field: FieldName) {
    return cn(fieldBaseClass, mobile && "min-h-[56px] text-[16px]", errors[field] && fieldErrorClass);
  }

  const floated = (field: FieldName) => Boolean(focused[field]) || values[field].length > 0;

  return (
    <div
      className={
        mobile
          ? "relative rounded-[var(--radius-lg)] border border-[var(--line)] bg-[rgba(11,20,26,0.72)] p-4"
          : "relative min-h-[560px] rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--raised)]/40 p-6 backdrop-blur-[6px] sm:p-8"
      }
    >
      {!showSuccess ? (
        <form
          action="/api/contact"
          method="post"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col"
        >
          {/* Fallback no-JS: senza JavaScript questo submit è un POST tradizionale con
              full-page reload verso la route, che fa il redirect con ?contact=success|error.
              Con JS attivo, handleSubmit intercetta e gestisce tutto in-place. */}
          <input type="hidden" name="locale" value={locale} />

          {/* Honeypot anti-spam — PRIMO campo del form, prima di qualunque campo
              visibile (stesso ordine DOM della v1, non toccato): nascosto
              visivamente e agli screen reader, un utente reale non lo compila mai —
              se arriva valorizzato la route lo scarta silenziosamente. */}
          <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
            <label htmlFor="contact-honeypot">{copy.honeypotLabel}</label>
            <input
              id="contact-honeypot"
              type="text"
              name="honeypot"
              tabIndex={-1}
              autoComplete="off"
              value={values.honeypot}
              onChange={(e) => setValues((prev) => ({ ...prev, honeypot: e.target.value }))}
            />
          </div>

          <div ref={fieldsContainerRef} className={cn("contact-form-fields flex flex-col", mobile ? "gap-2.5" : "gap-5")}>
            <div className={cn("grid grid-cols-1 sm:grid-cols-2", mobile ? "gap-2.5" : "gap-5")}>
              <FloatingField
                label={copy.fields.name.label}
                htmlFor="contact-name"
                error={errors.name}
                floated={floated("name")}
                focused={Boolean(focused.name)}
              >
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  onKeyDown={handleEnterNext}
                  ref={registerField}
                  value={values.name}
                  placeholder={focused.name ? copy.fields.name.placeholder : ""}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "contact-name-error" : undefined}
                  onChange={(e) => updateValue("name", e.target.value)}
                  onFocus={() => handleFocus("name")}
                  onBlur={() => handleBlur("name")}
                  className={fieldClass("name")}
                />
              </FloatingField>

              <FloatingField
                label={copy.fields.email.label}
                htmlFor="contact-email"
                error={errors.email}
                floated={floated("email")}
                focused={Boolean(focused.email)}
              >
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  onKeyDown={handleEnterNext}
                  ref={registerField}
                  value={values.email}
                  placeholder={focused.email ? copy.fields.email.placeholder : ""}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "contact-email-error" : undefined}
                  onChange={(e) => updateValue("email", e.target.value)}
                  onFocus={() => handleFocus("email")}
                  onBlur={() => handleBlur("email")}
                  className={fieldClass("email")}
                />
              </FloatingField>
            </div>

            <FloatingField
              label={copy.fields.projectType.label}
              htmlFor="contact-project-type"
              error={errors.projectType}
              /* Un <select> mostra SEMPRE il testo dell'option selezionata —
                 anche il placeholder disabilitato. La label va quindi tenuta
                 sempre in alto: con lo stato "non flottato" (label centrata
                 verticalmente) "Tipo di progetto" finiva stampata sopra
                 "Seleziona un'area". */
              floated
              focused={Boolean(focused.projectType)}
            >
              <select
                id="contact-project-type"
                name="projectType"
                ref={registerField}
                value={values.projectType}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.projectType)}
                aria-describedby={errors.projectType ? "contact-project-type-error" : undefined}
                onChange={(e) => updateValue("projectType", e.target.value)}
                onFocus={() => handleFocus("projectType")}
                onBlur={() => handleBlur("projectType")}
                className={cn(fieldClass("projectType"), "appearance-none")}
              >
                <option value="" disabled>
                  {copy.fields.projectType.placeholder}
                </option>
                {copy.projectTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-mid)]"
              >
                <svg width="11" height="7" viewBox="0 0 11 7" fill="none">
                  <path d="M1 1l4.5 4.5L10 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </FloatingField>

            <FloatingField
              label={copy.fields.message.label}
              htmlFor="contact-message"
              error={errors.message}
              floated={floated("message")}
              focused={Boolean(focused.message)}
              variant="textarea"
            >
              <textarea
                id="contact-message"
                name="message"
                ref={registerField}
                value={values.message}
                placeholder={focused.message ? copy.fields.message.placeholder : ""}
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "contact-message-error" : undefined}
                onChange={(e) => updateValue("message", e.target.value)}
                onFocus={() => handleFocus("message")}
                onBlur={() => handleBlur("message")}
                autoCapitalize="sentences"
                className={cn(fieldClass("message"), mobile ? "min-h-[128px]" : "min-h-[140px]", "resize-y pt-[26px]")}
              />
            </FloatingField>

            <div className="mt-1 flex flex-col items-start gap-3">
              <Tactile
                as="button"
                type="submit"
                intensity="default"
                magnetic
                magneticMax={10}
                disabled={isSubmitting}
                className="relative isolate inline-flex min-w-[220px] w-full items-center justify-center gap-2 overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,var(--aqua-300),var(--aqua-500))] px-7 py-[14px] text-[15px] font-semibold text-[var(--void)] shadow-[var(--glow-sm)] transition-[filter,box-shadow] duration-200 hover:shadow-[var(--glow-md)] hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner reducedMotion={reducedMotion} />
                    {copy.submitLoading}
                  </>
                ) : (
                  copy.submitIdle
                )}
              </Tactile>
              <p className="text-[13px] leading-[1.5] text-[var(--text-mid)]">{copy.reassurance}</p>
            </div>

            {formState.status === "error" ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[var(--state-error)]/40 bg-[var(--state-error)]/10 px-4 py-3 text-[13px] leading-[1.5] text-[var(--state-error)]"
              >
                <WarningIcon />
                <ErrorMessageWithMailto text={formState.message} locale={locale} />
              </div>
            ) : null}
          </div>
        </form>
      ) : (
        <div
          ref={successPanelRef}
          className="contact-success-panel flex min-h-[400px] flex-col items-start justify-center gap-4"
        >
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(63,233,204,0.08)] shadow-[var(--glow-md)]">
            <SuccessIcon ref={successIconRef} />
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-[24px] font-medium text-[var(--text-hi)]">
            {copy.successTitle}
          </h3>
          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-[var(--text-mid)]">
            {copy.successBody(formState.firstName)}
          </p>
          <Tactile
            as="button"
            type="button"
            intensity="subtle"
            magnetic
            magneticMax={6}
            onClick={handleReset}
            className="text-[14px] font-medium text-[var(--aqua-300)] underline underline-offset-4 hover:[text-shadow:var(--glow-text)]"
          >
            {locale === "it" ? "Invia un altro messaggio" : "Send another message"}
          </Tactile>
        </div>
      )}
    </div>
  );
}

/**
 * Campo con label flottante + linea aqua che si disegna da sinistra al focus
 * (ART-DIRECTION §6 "Contatti"). Lo stato "floated" (label piccola in alto)
 * è deciso dal chiamante: focus O valore presente — così select e textarea
 * si comportano allo stesso modo di un input di testo.
 */
function FloatingField({
  label,
  htmlFor,
  error,
  floated,
  focused,
  variant = "input",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  floated: boolean;
  focused: boolean;
  variant?: "input" | "textarea";
  children: ReactNode;
}) {
  return (
    <div>
      <div className="relative">
        {children}
        <label
          htmlFor={htmlFor}
          className={cn(
            "pointer-events-none absolute left-[14px] font-[family-name:var(--font-body)] transition-all duration-200 [transition-timing-function:var(--ease-out)]",
            floated
              ? cn("text-[11px] tracking-[0.02em]", focused ? "text-[var(--aqua-300)]" : "text-[var(--text-mid)]")
              : "text-[15px] text-[var(--text-low)]",
            floated ? "top-[8px]" : variant === "textarea" ? "top-[15px]" : "top-1/2 -translate-y-1/2",
          )}
        >
          {label}
        </label>
        {/* Bordo animato al focus: linea aqua che si disegna da sinistra. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-xs)] transition-transform duration-300 [transition-timing-function:var(--ease-out)]",
            focused ? "scale-x-100" : "scale-x-0",
          )}
        />
      </div>
      {/* Spazio riservato per il messaggio d'errore: evita layout shift alla sua comparsa/scomparsa. */}
      <div className="min-h-[22px] pt-1.5">
        {error ? (
          <p
            id={`${htmlFor}-error`}
            className="flex items-center gap-1.5 text-[13px] text-[var(--state-error)]"
          >
            <WarningIcon />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function LoadingSpinner({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--void)"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={reducedMotion ? "" : "animate-spin"}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

function SuccessIcon({ ref }: { ref: React.Ref<SVGSVGElement> }) {
  return (
    <svg
      ref={ref}
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--aqua-400)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="[filter:drop-shadow(var(--glow-sm))]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12.5 2.5 2.5L16 9" />
    </svg>
  );
}

function ErrorMessageWithMailto({ text }: { text: string; locale: "it" | "en" }) {
  // Estrae l'indirizzo email dal testo per renderlo un vero <a href="mailto:...">
  // cliccabile inline, non solo menzionato (§7).
  const match = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (!match) return <span>{text}</span>;

  const email = match[0];
  const [before, after] = text.split(email);
  return (
    <span>
      {before}
      <a href={`mailto:${email}`} className="font-medium underline underline-offset-2">
        {email}
      </a>
      {after}
    </span>
  );
}
