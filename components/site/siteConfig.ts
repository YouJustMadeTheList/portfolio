import type { Metadata, Viewport } from "next";
import { routing } from "@/lib/i18n/routing";

/* Condiviso dai due root layout delle varianti (app/[locale]/d e app/[locale]/m). */

export function localeParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/* viewport-fit=cover: la barra d'azione mobile usa env(safe-area-inset-bottom). */
export const siteViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#03070A",
};

export const siteMetadata: Metadata = {
  title: "Davide De Sanctis — Software Architecture · AI · Data Systems",
  description:
    "Progetto il futuro e lo cucio su misura, per te e la tua azienda. Data engineering, IA, fintech e soluzioni custom.",
};
