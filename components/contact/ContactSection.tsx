"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import { DirectChannels } from "@/components/contact/DirectChannels";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { ensureGsapRegistered, gsap, ScrollTrigger } from "@/lib/animation/gsap";
import { contactCopy } from "@/content/contact";

// Sezione 08 — ultima prima del footer, il punto di conversione vero e proprio.
// Vedi specs/08-contatti.md. Reveal minimo e lineare (§5.1) — non è una sezione
// da "spettacolarizzare" come l'Hero, l'utente qui sta per agire, non da intrattenere.
export function ContactSection() {
  const locale = useLocale() as "it" | "en";
  const reducedMotion = usePrefersReducedMotion();
  const copy = contactCopy[locale];

  const sectionRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const formColRef = useRef<HTMLDivElement | null>(null);
  const channelsColRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    ensureGsapRegistered();
    const section = sectionRef.current;
    if (!section) return;

    const targets = [headingRef.current, formColRef.current, channelsColRef.current].filter(
      (el): el is HTMLDivElement => Boolean(el),
    );
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(targets, { opacity: 0 });
        ScrollTrigger.create({
          trigger: section,
          start: "top 78%",
          once: true,
          onEnter: () => {
            gsap.to(targets, { opacity: 1, duration: 0.2, ease: "power1.out" });
          },
        });
        return;
      }

      gsap.set(headingRef.current, { opacity: 0, y: 16 });
      gsap.set([formColRef.current, channelsColRef.current], { opacity: 0, y: 20 });

      ScrollTrigger.create({
        trigger: section,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(headingRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
          gsap.to(formColRef.current, { opacity: 1, y: 0, duration: 0.6, delay: 0.1, ease: "power3.out" });
          gsap.to(channelsColRef.current, { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: "power3.out" });
        },
      });
    }, section);

    return () => ctx.revert();
  }, [reducedMotion]);

  // Fallback no-JS (§7): se l'utente arriva qui dopo un submit senza JS, la route
  // ha già fatto il redirect 303 a /?contact=success|error#contatti — con JS attivo
  // possiamo comunque leggere il query param una volta, per coerenza, e ripulirlo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("contact")) {
      params.delete("contact");
      const query = params.toString();
      const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  return (
    <section
      id="contatti"
      ref={sectionRef}
      className="contact-section section-padding relative overflow-x-clip"
    >
      {/* L2 — aurora di sezione, asimmetrica (ART-DIRECTION §3): l'ultima
          sezione prima del footer non deve leggersi come nero piatto. */}
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          top: "-8%",
          left: "-14%",
          width: "min(760px, 90vw)",
          height: "min(620px, 64vh)",
          background: "var(--aurora-deep)",
          opacity: 0.38,
        }}
      />
      <span
        aria-hidden="true"
        className="aurora"
        style={{
          bottom: "-6%",
          right: "-10%",
          width: "min(620px, 82vw)",
          height: "min(520px, 54vh)",
          background: "var(--aurora-aqua)",
          opacity: 0.3,
        }}
      />

      <div className="relative mx-auto w-full max-w-[1120px] px-5 sm:px-8 lg:px-10">
        <div ref={headingRef} className="contact-heading">
          <SectionHeader eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 min-[760px]:grid-cols-[3fr_2fr] lg:gap-12">
          <div ref={formColRef} className="contact-form-col">
            <ContactForm locale={locale} reducedMotion={reducedMotion} />
          </div>
          <div ref={channelsColRef} className="contact-channels-col">
            <DirectChannels locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
