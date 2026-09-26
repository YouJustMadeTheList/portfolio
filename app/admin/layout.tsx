import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fontVariables } from "@/lib/fonts";
import { verifyGate } from "@/lib/auth/gate";
import "../globals.css";
import "./admin.css";

// Root layout separato: niente shader, cursore, Lenis, nav o footer del sito.
// Raggiungibile SOLO tramite il rewrite di proxy.ts da /<ADMIN_PATH>.

export const metadata: Metadata = {
  title: { default: "Console", template: "%s · Console" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "same-origin",
};

export const viewport: Viewport = { themeColor: "#03070a", colorScheme: "dark" };

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  if (!(await verifyGate(await headers()))) notFound();
  return (
    <html lang="it" className={fontVariables}>
      <body className="admin-body">{children}</body>
    </html>
  );
}
