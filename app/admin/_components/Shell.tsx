import Link from "next/link";
import type { ReactNode } from "react";
import { NoTrack } from "./NoTrack";

export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="grid size-7 place-items-center rounded-full border border-[var(--line-hi)] shadow-[var(--glow-xs)]">
        <span className="size-1.5 rounded-full bg-[var(--aqua-400)] shadow-[var(--glow-sm)]" />
      </span>
      <span className="font-[family-name:var(--font-display)] text-[15px] font-medium tracking-[-0.01em] text-[var(--text-hi)]">
        DDS <span className="font-[family-name:var(--font-serif)] italic text-[var(--aqua-400)]">console</span>
      </span>
    </span>
  );
}

export function Shell({
  base,
  email,
  active,
  newRequests,
  children,
}: {
  base: string;
  email?: string;
  active: "dashboard" | "richieste";
  newRequests?: number;
  children: ReactNode;
}) {
  const tab = (key: typeof active, href: string, label: ReactNode) => (
    <Link
      href={href}
      prefetch={false}
      aria-current={active === key ? "page" : undefined}
      className={
        "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors " +
        (active === key
          ? "bg-[rgb(var(--aqua-rgb)/0.12)] text-[var(--aqua-300)] shadow-[inset_0_0_0_1px_var(--line-hi)]"
          : "text-[var(--text-mid)] hover:text-[var(--text-hi)]")
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-svh">
      <NoTrack />
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgb(var(--void-rgb)/0.72)] backdrop-blur-[14px]">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href={base} prefetch={false} aria-label="Dashboard">
            <Brand />
          </Link>
          <nav aria-label="Sezioni" className="flex items-center gap-1">
            {tab("dashboard", base, "Dashboard")}
            {tab(
              "richieste",
              `${base}/richieste`,
              <>
                Richieste
                {newRequests ? (
                  <span className="ml-1.5 rounded-full bg-[var(--aqua-400)] px-1.5 py-px font-[family-name:var(--font-mono)] text-[10px] text-[var(--void)] tabular-nums">
                    {newRequests}
                  </span>
                ) : null}
              </>,
            )}
          </nav>
          {email ? (
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--text-low)] sm:inline">{email}</span>
              <form action={`${base}/api/logout`} method="post">
                <button type="submit" className="admin-btn admin-btn--ghost">
                  Esci
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-8 sm:px-6">{children}</main>
    </div>
  );
}

export function NoDatabase({ base }: { base: string }) {
  return (
    <Shell base={base} active="dashboard">
      <div className="admin-card mx-auto mt-10 max-w-xl p-8">
        <p className="admin-eyebrow">Configurazione</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--text-hi)]">Database non configurato</h1>
        <p className="mt-3 text-[var(--text-mid)]">
          Il pannello ha bisogno di un database PostgreSQL. Il sito pubblico funziona comunque: il tracking è disattivato e il
          form contatti continua a inviare email.
        </p>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--text-mid)]">
          <li>
            Imposta <code className="text-[var(--aqua-200)]">DATABASE_URL</code> nelle variabili d&apos;ambiente (es. Neon).
          </li>
          <li>
            Esegui <code className="text-[var(--aqua-200)]">npm run db:migrate</code>.
          </li>
          <li>
            Crea un utente: <code className="text-[var(--aqua-200)]">npm run admin:add -- tua@email.it</code>.
          </li>
        </ol>
      </div>
    </Shell>
  );
}
