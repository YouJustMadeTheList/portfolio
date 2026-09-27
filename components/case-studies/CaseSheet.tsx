"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import styles from "./case-studies-mobile.module.css";

type CaseSheetProps = {
  open: boolean;
  onClose: () => void;
  /** id dell'intestazione del pannello attivo (aria-labelledby del dialog). */
  labelledBy?: string;
  headLabel: string;
  closeLabel: string;
  children: ReactNode;
};

/** Oltre questa distanza (px) o questa velocità (px/ms) il trascinamento chiude. */
const CLOSE_DISTANCE = 110;
const CLOSE_VELOCITY = 0.55;

const noopSubscribe = () => () => {};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet dei case study (variante mobile).
 *
 * Il contenuto è SEMPRE nel DOM (anche a sheet chiuso, `inert` + fuori schermo):
 * è il testo integrale dei case study e Google indicizza la versione mobile —
 * il testo si comprime dietro un'azione, non sparisce.
 *
 * - focus trap (Tab/Shift+Tab ciclano dentro il pannello), Esc chiude, il focus
 *   torna a chi ha aperto;
 * - chiusura da scrim o trascinando giù la maniglia (transform diretto sul
 *   pannello durante il gesto: nessun render React per frame);
 * - scroll lock del body "alla iOS" (position:fixed + ripristino della quota);
 * - safe-area inset in fondo (vedi CSS).
 *
 * Portale su <body> DOPO l'idratazione: nell'HTML servito il pannello sta al
 * suo posto nella sezione (testo indicizzabile), poi viene spostato sotto
 * <body> così nessun contesto di impilamento degli antenati (main, barre
 * fisse di altre sezioni) può finirgli sopra.
 */
export function CaseSheet({
  open,
  onClose,
  labelledBy,
  headLabel,
  closeLabel,
  children,
}: CaseSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const drag = useRef<{ id: number; y0: number; t0: number; dy: number } | null>(null);
  // false in SSR e durante l'idratazione, true subito dopo: nessun mismatch
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  /* scroll lock + focus + tastiera — solo mentre è aperto */
  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement as HTMLElement | null;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    // un tick: il pannello deve essere già visibile per ricevere il focus
    const raf = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => !n.closest("[hidden]") && !n.closest("[inert]"),
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.overflow = prev.overflow;
      // "instant": html ha scroll-behavior:smooth, il ripristino non deve animare
      window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [open]);

  /* ---------------------------------------------- trascina giù per chiudere */

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!open || (e.pointerType === "mouse" && e.button !== 0)) return;
    if ((e.target as HTMLElement).closest("button, a")) return;
    drag.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    panelRef.current?.setAttribute("data-dragging", "");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !panelRef.current) return;
    // verso l'alto resiste (rubber band), verso il basso segue il dito
    const raw = e.clientY - d.y0;
    d.dy = raw > 0 ? raw : raw * 0.2;
    panelRef.current.style.transform = `translate3d(0, ${d.dy}px, 0)`;
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const panel = panelRef.current;
    if (!panel) return;
    panel.removeAttribute("data-dragging");
    panel.style.transform = "";
    const v = d.dy / Math.max(1, performance.now() - d.t0);
    if (d.dy > CLOSE_DISTANCE || (d.dy > 24 && v > CLOSE_VELOCITY)) onCloseRef.current();
  };

  const node = (
    <div className={styles.sheetRoot} data-open={open ? "" : undefined} inert={!open}>
      <div className={styles.sheetScrim} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={styles.sheet}
      >
        <div
          className={styles.sheetGrab}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className={styles.sheetHandle} aria-hidden="true" />
          <div className={styles.sheetHead}>
            <p className={styles.label}>{headLabel}</p>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className={styles.sheetClose}
            >
              {closeLabel}
              <span aria-hidden="true">×</span>
            </button>
          </div>
        </div>
        <div className={styles.sheetScroll} data-lenis-prevent>
          {children}
        </div>
      </div>
    </div>
  );

  return hydrated ? createPortal(node, document.body) : node;
}

export default CaseSheet;
