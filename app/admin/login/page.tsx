import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/session";
import { Brand } from "../_components/Shell";

export const metadata: Metadata = { title: "Accesso" };

const MESSAGES: Record<string, string> = {
  invalid: "Credenziali non valide.",
  rate: "Troppi tentativi. Riprova tra qualche minuto.",
  nodb: "Database non configurato: impossibile accedere.",
  server: "Errore temporaneo. Riprova.",
  out: "Sei uscito.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getAdminContext();
  if (ctx.state === "authenticated") redirect(ctx.base);
  const sp = await searchParams;
  const code = typeof sp.e === "string" ? sp.e : undefined;
  const message = code ? MESSAGES[code] : ctx.state === "no-db" ? MESSAGES.nodb : undefined;
  const isInfo = code === "out";

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-16">
      <span aria-hidden="true" className="aurora" style={{ width: 760, height: 560, left: "-12%", top: "-10%" }} />
      <span aria-hidden="true" className="aurora" style={{ width: 620, height: 620, right: "-14%", bottom: "-18%", background: "var(--aurora-deep)" }} />
      <div className="admin-card w-full max-w-[400px] p-7 sm:p-8">
        <Brand />
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-[1.6rem] leading-tight tracking-[-0.02em] text-[var(--text-hi)]">
          Area <span className="font-[family-name:var(--font-serif)] italic text-[var(--aqua-400)] [text-shadow:var(--glow-text)]">riservata</span>
        </h1>
        <p className="mt-2 text-[13px] text-[var(--text-mid)]">Accesso consentito solo alle persone autorizzate.</p>

        {message ? (
          <p
            role={isInfo ? "status" : "alert"}
            className={
              "mt-5 rounded-[var(--radius-sm)] border px-3 py-2.5 text-[13px] " +
              (isInfo
                ? "border-[var(--line)] text-[var(--text-mid)]"
                : "border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.06)] text-[#ffb3b3]")
            }
          >
            {message}
          </p>
        ) : null}

        <form action={`${ctx.base}/api/login`} method="post" className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="admin-eyebrow mb-1.5 block">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="username" required className="admin-input" autoFocus />
          </div>
          <div>
            <label htmlFor="password" className="admin-eyebrow mb-1.5 block">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="admin-input" />
          </div>
          <button type="submit" className="admin-btn admin-btn--primary mt-2 w-full !min-h-11" disabled={ctx.state === "no-db"}>
            Accedi
          </button>
        </form>
      </div>
    </main>
  );
}
