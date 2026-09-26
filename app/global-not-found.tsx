import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { NotFoundView } from "@/components/not-found/NotFoundView";
import it from "@/messages/it.json";
import en from "@/messages/en.json";
import "./globals.css";

/**
 * Fallback 404 GLOBALE, per gli URL che non corrispondono ad alcuna rotta e
 * non passano dal layout di locale (es. /qualcosa.xyz, escluso dal matcher
 * del middleware). Next 16: il layout radice qui è app/[locale]/layout.tsx,
 * un segmento dinamico — un app/not-found.tsx non avrebbe un root layout in
 * cui rendersi (next-app-loader fallisce in build e in dev prova a crearne
 * uno). Per questo si usa `global-not-found`, abilitato con
 * `experimental.globalNotFound` in next.config.ts: bypassa il rendering
 * normale, quindi importa da sé CSS globale e font.
 *
 * La lingua non è nota: italiano come lingua di default, inglese a seguire.
 */
export const metadata: Metadata = {
  title: it.notFound.metaTitle,
  robots: { index: false },
};

// Riga inglese: titolo senza marcatura d'enfasi + prima frase del corpo.
const englishLine = `${en.notFound.title.replace(/[⟨⟩]/g, "")} ${en.notFound.body.split(". ")[0]}.`;

export default function GlobalNotFound() {
  return (
    <html lang="it" className={fontVariables}>
      <body>
        <main>
          <NotFoundView copy={it.notFound} homeHref="/it" extra={englishLine} />
        </main>
      </body>
    </html>
  );
}
