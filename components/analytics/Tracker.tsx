"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { TrackEvent, TrackPayload } from "@/lib/analytics/payload";
import { getIdentity, isExcluded, privacySignal, readConsent } from "@/lib/analytics/consent";

/**
 * Tracker first-party, senza librerie. Montato una volta in app/[locale]/layout.tsx.
 *
 * Senza consenso: solo pageview + sezioni viste (permanenza), nessun id, niente
 * scritto nel browser. Con consenso: + id visitatore/sessione, click, scroll, durata.
 *
 * Costo: un IntersectionObserver, un listener di click delegato (solo con
 * consenso), uno di scroll passivo throttled a rAF, un timer da 15s. Avvio in
 * requestIdleCallback, invio con sendBeacon: zero impatto sul rendering WebGL.
 */

const ENDPOINT = "/api/t";
const MIN_VIEW_MS = 1000; // una sezione "conta" dopo 1s di visibilita' cumulata
const FLUSH_EVERY_MS = 15000;

type SectionState = {
  name: string;
  index: number;
  visible: boolean;
  since: number | null;
  acc: number;
  reported: number;
  viewed: boolean;
};

function viewportBucket(): TrackPayload["vp"] {
  const w = window.innerWidth;
  if (w < 480) return "xs";
  if (w < 768) return "sm";
  if (w < 1024) return "md";
  if (w < 1440) return "lg";
  return "xl";
}

function externalReferrer(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const host = new URL(document.referrer).hostname.toLowerCase();
    return host && host !== location.hostname ? host.slice(0, 120) : undefined;
  } catch {
    return undefined;
  }
}

function sectionName(el: Element, index: number): string {
  if (el.id) return el.id.toLowerCase().slice(0, 40);
  const cls = typeof el.className === "string" ? el.className.match(/([a-z0-9]+)-section\b/i) : null;
  if (cls) return cls[1]!.toLowerCase();
  return index === 0 ? "hero" : `section-${index}`;
}

function clickLabel(el: Element): string {
  const data = el.getAttribute("data-track");
  if (data) return data.trim().slice(0, 60);
  const aria = el.getAttribute("aria-label");
  if (aria) return aria.trim().slice(0, 60);
  // innerText rispetta i confini dei blocchi ("Scrivimi" + "email" non si incollano).
  const raw = el instanceof HTMLElement ? el.innerText : el.textContent;
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  if (text) return text.length > 60 ? `${text.slice(0, 59)}…` : text;
  const title = el.getAttribute("title");
  return title ? title.trim().slice(0, 60) : "(senza testo)";
}

function clickHref(el: Element): string | undefined {
  if (el.tagName !== "A") return undefined;
  const raw = el.getAttribute("href");
  if (!raw) return undefined;
  if (/^mailto:/i.test(raw)) return "mailto:";
  if (/^tel:/i.test(raw)) return "tel:";
  if (raw.startsWith("#")) return raw.slice(0, 200);
  try {
    const u = new URL(raw, location.href);
    if (u.origin !== location.origin) return u.hostname;
    return (u.pathname + u.hash).slice(0, 200);
  } catch {
    return undefined;
  }
}

function clickArea(el: Element): string | undefined {
  const section = el.closest("main section");
  if (section) {
    const all = topLevelSections();
    const idx = all.indexOf(section);
    return sectionName(section, Math.max(0, idx));
  }
  if (el.closest("header, nav")) return "nav";
  if (el.closest("footer")) return "footer";
  if (el.closest("[data-consent-banner]")) return "consent";
  return undefined;
}

/** Sezioni di primo livello dentro <main> (ignora le sezioni annidate). */
function topLevelSections(): Element[] {
  return Array.from(document.querySelectorAll("main section")).filter(
    (s) => !s.parentElement?.closest("main section"),
  );
}

class Engine {
  private queue: TrackEvent[] = [];
  private sections = new Map<Element, SectionState>();
  private observer: IntersectionObserver | null = null;
  private maxScroll = 0;
  private sentScroll = 0;
  private path = "/";
  private locale = "it";
  private ref: string | undefined;
  private timer: number | undefined;
  private rescan: number | undefined;
  private scrollTicking = false;

  start(path: string, locale: string) {
    this.ref = externalReferrer();
    this.beginPage(path, locale);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("pagehide", this.onPageHide);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("click", this.onClick, { capture: true, passive: true });
    window.addEventListener("consent:change", this.onConsent);
    this.timer = window.setInterval(() => this.flush(false), FLUSH_EVERY_MS);
  }

  stop() {
    this.endPage();
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("pagehide", this.onPageHide);
    window.removeEventListener("scroll", this.onScroll);
    document.removeEventListener("click", this.onClick, { capture: true });
    window.removeEventListener("consent:change", this.onConsent);
    window.clearInterval(this.timer);
  }

  /** Navigazione client-side fra pagine (es. home -> /privacy). */
  navigate(path: string, locale: string) {
    if (path === this.path && locale === this.locale) return;
    this.endPage();
    this.ref = undefined;
    this.beginPage(path, locale);
  }

  private beginPage(path: string, locale: string) {
    this.path = path;
    this.locale = locale;
    this.maxScroll = 0;
    this.sentScroll = 0;
    this.queue.push({ t: "pageview" });
    this.observeSections();
    // Alcune sezioni (dynamic import) montano dopo: una seconda scansione basta.
    this.rescan = window.setTimeout(() => this.observeSections(), 2500);
    // Se il banner e' ancora aperto (nessuna scelta), la pageview resta in coda:
    // parte con il consenso appena l'utente sceglie, oppure anonima al primo
    // flush periodico / all'uscita. Cosi' una sessione accettata ha la sua pageview.
    if (readConsent() !== "unset" || privacySignal()) this.flush(false);
  }

  private endPage() {
    window.clearTimeout(this.rescan);
    this.flush(true);
    this.observer?.disconnect();
    this.observer = null;
    this.sections.clear();
  }

  private observeSections() {
    if (!("IntersectionObserver" in window)) return;
    if (!this.observer) {
      this.observer = new IntersectionObserver(this.onIntersect, {
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      });
    }
    topLevelSections().forEach((el, index) => {
      if (this.sections.has(el)) return;
      this.sections.set(el, {
        name: sectionName(el, index),
        index,
        visible: false,
        since: null,
        acc: 0,
        reported: 0,
        viewed: false,
      });
      this.observer!.observe(el);
    });
  }

  private onIntersect = (entries: IntersectionObserverEntry[]) => {
    const now = performance.now();
    const vh = window.innerHeight || 1;
    for (const entry of entries) {
      const s = this.sections.get(entry.target);
      if (!s) continue;
      // Visibile = meta' sezione in vista, oppure (sezioni alte) meta' viewport occupato.
      const visible =
        entry.isIntersecting && (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= vh * 0.5);
      if (visible && !s.visible) {
        s.visible = true;
        s.since = document.visibilityState === "visible" ? now : null;
      } else if (!visible && s.visible) {
        if (s.since != null) s.acc += now - s.since;
        s.visible = false;
        s.since = null;
      }
    }
  };

  /** Consolida i tempi delle sezioni visibili in questo momento. */
  private settle(pause: boolean) {
    const now = performance.now();
    for (const s of this.sections.values()) {
      if (s.since != null) s.acc += now - s.since;
      s.since = s.visible && !pause ? now : null;
    }
  }

  private collectSections() {
    for (const s of this.sections.values()) {
      const acc = Math.round(s.acc);
      if (!s.viewed && acc >= MIN_VIEW_MS) {
        s.viewed = true;
        s.reported = acc;
        this.queue.push({ t: "section_view", s: s.name, i: Math.min(99, s.index), d: Math.min(acc, 3_600_000) });
      } else if (s.viewed && acc - s.reported >= 500) {
        this.queue.push({ t: "section_dwell", s: s.name, i: Math.min(99, s.index), d: Math.min(acc - s.reported, 3_600_000) });
        s.reported = acc;
      }
    }
  }

  private flush(final: boolean) {
    this.settle(final && document.visibilityState !== "visible");
    this.collectSections();
    const identity = readConsent() === "granted" ? getIdentity() : null;
    if (identity) {
      if (this.maxScroll > this.sentScroll) {
        this.queue.push({ t: "scroll_depth", p: this.maxScroll });
        this.sentScroll = this.maxScroll;
      }
      if (final) this.queue.push({ t: "session_end", d: Math.min(Date.now() - identity.startedAt, 24 * 3_600_000) });
    }
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0, this.queue.length);
    for (let i = 0; i < events.length; i += 50) {
      this.send(events.slice(i, i + 50), identity);
    }
  }

  private send(events: TrackEvent[], identity: { vid: string; sid: string } | null) {
    const payload: TrackPayload = {
      v: 1,
      c: Boolean(identity),
      ...(identity ? { vid: identity.vid, sid: identity.sid } : {}),
      path: this.path,
      locale: this.locale === "en" ? "en" : "it",
      ...(this.ref ? { ref: this.ref } : {}),
      vp: viewportBucket(),
      e: events,
    };
    const body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
    } catch {
      /* fallback sotto */
    }
    fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(
      () => {},
    );
  }

  private onVisibility = () => {
    if (document.visibilityState === "hidden") this.flush(true);
    else this.settle(false);
  };

  private onPageHide = () => this.flush(true);

  /** Scelta appena fatta: invia subito la coda (con o senza identificativi). */
  private onConsent = () => this.flush(false);

  private onScroll = () => {
    if (this.scrollTicking) return;
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      this.scrollTicking = false;
      const doc = document.documentElement;
      const total = doc.scrollHeight;
      if (total <= 0) return;
      const depth = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / total) * 100));
      if (depth > this.maxScroll) this.maxScroll = depth;
    });
  };

  private onClick = (ev: MouseEvent) => {
    if (readConsent() !== "granted") return; // i click si misurano solo con consenso
    const target = ev.target instanceof Element ? ev.target : null;
    const el = target?.closest("a, button, [data-track], [role='button']");
    if (!el || el.closest("[data-no-track]")) return;
    const href = clickHref(el);
    const area = clickArea(el);
    this.queue.push({
      t: "click",
      l: clickLabel(el),
      ...(href ? { h: href } : {}),
      ...(area ? { s: area } : {}),
    });
    if (this.queue.length >= 20) this.flush(false);
  };
}

export function Tracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const engine = useRef<Engine | null>(null);
  const latest = useRef({ pathname, locale });

  useEffect(() => {
    latest.current = { pathname, locale };
    engine.current?.navigate(pathname, locale);
  }, [pathname, locale]);

  useEffect(() => {
    if (isExcluded()) return;
    const ric =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200) as unknown as number);
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = ric(
      () => {
        const e = new Engine();
        engine.current = e;
        e.start(latest.current.pathname, latest.current.locale);
      },
      { timeout: 4000 },
    );
    return () => {
      cancel(handle);
      engine.current?.stop();
      engine.current = null;
    };
  }, []);

  return null;
}

export default Tracker;
