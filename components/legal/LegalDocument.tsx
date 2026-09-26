import Link from "next/link";
import type { ReactNode } from "react";
import {
  consentCopy,
  legalPlaceholders,
  legalUpdatedAt,
  type LegalBlock,
  type LegalDoc,
  type LegalLocale,
} from "@/content/legal";
import { Container } from "@/components/ui/Container";
import { ConsentPreferencesButton } from "./ConsentPreferencesButton";
import { HashLinkBridge } from "./HashLinkBridge";

/**
 * Pagina legale (privacy / cookie). Server component, nessun WebGL proprio:
 * eredita solo fondo, nav e footer dal layout del locale.
 */

const PLACEHOLDER = "⟦"; // ⟦KEY⟧ = segnaposto ancora da compilare

function substitute(text: string, locale: LegalLocale): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (key === "LOCALE") return locale;
    const p = legalPlaceholders[key];
    if (!p) return key;
    return p.value.includes("TODO_") ? `${PLACEHOLDER}${key}⟧` : p.value;
  });
}

function Placeholder({ k, locale }: { k: string; locale: LegalLocale }) {
  const label = legalPlaceholders[k]?.label[locale] ?? k;
  return (
    <mark
      title={locale === "it" ? "Da completare" : "To be completed"}
      className="rounded-[var(--radius-xs)] border border-dashed border-[var(--line-hi)] bg-[rgb(var(--aqua-rgb)/0.07)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.82em] text-[var(--aqua-200)]"
    >
      [{label}]
    </mark>
  );
}

/** Inline: **grassetto**, [testo](href), ⟦SEGNAPOSTO⟧. */
function Rich({ text, locale }: { text: string; locale: LegalLocale }) {
  const src = substitute(text, locale);
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|⟦(\w+)⟧/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    if (m[1]) {
      out.push(
        <strong key={key++} className="font-medium text-[var(--text-hi)]">
          {m[1]}
        </strong>,
      );
    } else if (m[2]) {
      const href = m[3]!;
      const cls =
        "text-[var(--aqua-300)] underline decoration-[var(--line-hi)] underline-offset-4 transition-colors hover:decoration-[var(--aqua-400)] hover:text-[var(--aqua-200)]";
      out.push(
        href.startsWith("/") ? (
          <Link key={key++} href={href} className={cls}>
            {m[2]}
          </Link>
        ) : (
          <a key={key++} href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {m[2]}
          </a>
        ),
      );
    } else if (m[4]) {
      out.push(<Placeholder key={key++} k={m[4]} locale={locale} />);
    }
    last = re.lastIndex;
  }
  if (last < src.length) out.push(src.slice(last));
  return <>{out}</>;
}

function Block({ block, locale }: { block: LegalBlock; locale: LegalLocale }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-[length:var(--fs-body)] leading-[var(--lh-body)] text-[var(--text-mid)]">
          <Rich text={block.text} locale={locale} />
        </p>
      );
    case "callout":
      return (
        <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--aqua-rgb)/0.05)] p-4 text-[var(--text-mid)]">
          <Rich text={block.text} locale={locale} />
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="relative pl-6 text-[var(--text-mid)]">
              <span aria-hidden="true" className="absolute left-0 top-[0.8em] h-px w-3 bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
              <Rich text={item} locale={locale} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <>
          {/* Desktop: tabella vera */}
          <div className="glass-surface hidden !rounded-[var(--radius-md)] md:block">
            <table className="w-full border-collapse text-left text-[13.5px] leading-[1.5]">
              <thead>
                <tr>
                  {block.head.map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="border-b border-[var(--line)] px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] font-normal uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="align-top [&:not(:last-child)>td]:border-b [&>td]:border-[var(--line)]">
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={
                          c === 0
                            ? "px-4 py-3.5 font-medium text-[var(--text-hi)] [overflow-wrap:anywhere]"
                            : "px-4 py-3.5 text-[var(--text-mid)]"
                        }
                      >
                        {c === 0 && /^[a-z_][\w.:-]*$/i.test(cell) ? (
                          <code className="font-[family-name:var(--font-mono)] text-[12.5px] text-[var(--aqua-200)]">{cell}</code>
                        ) : (
                          <Rich text={cell} locale={locale} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile: una scheda per riga, niente scroll orizzontale */}
          <div className="space-y-3 md:hidden">
            {block.rows.map((row, r) => (
              <dl key={r} className="glass-surface !rounded-[var(--radius-md)] p-4 text-[13.5px] leading-[1.5]">
                {row.map((cell, c) => (
                  <div key={c} className={c === 0 ? "mb-2" : "mt-2"}>
                    <dt className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
                      {block.head[c]}
                    </dt>
                    <dd className={c === 0 ? "m-0 font-medium text-[var(--text-hi)]" : "m-0 text-[var(--text-mid)]"}>
                      <Rich text={cell} locale={locale} />
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </>
      );
    case "consent-button":
      return <ConsentPreferencesButton copy={consentCopy[locale]} />;
  }
}

function formatDate(iso: string, locale: LegalLocale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(`${iso}T12:00:00Z`));
}

export function LegalDocument({ doc, locale }: { doc: LegalDoc; locale: LegalLocale }) {
  const [before, after] = doc.title.split(doc.emphasis);
  return (
    <div className="relative overflow-x-clip pb-24 sm:pb-32" style={{ paddingTop: "calc(var(--nav-h) + clamp(3rem, 8vw, 7rem))" }}>
      <HashLinkBridge locale={locale} />
      <span aria-hidden="true" className="aurora" style={{ width: 820, height: 620, left: "-18%", top: -120 }} />
      <span
        aria-hidden="true"
        className="aurora"
        style={{ width: 700, height: 700, right: "-22%", top: "38%", background: "var(--aurora-deep)", opacity: 0.3 }}
      />
      <Container>
        <header className="max-w-[58rem]">
          <p className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
            {doc.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[20ch] font-[family-name:var(--font-display)] text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)] text-[var(--text-hi)]">
            {before}
            <em className="font-[family-name:var(--font-serif)] font-normal italic text-[var(--aqua-400)] [text-shadow:var(--glow-text)]">
              {doc.emphasis}
            </em>
            {after}
          </h1>
          <p className="mt-6 max-w-[var(--measure-prose)] text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-mid)]">
            {doc.intro}
          </p>
          <p className="mt-6 font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-[0.12em] text-[var(--text-low)]">
            {doc.updatedLabel} ·{" "}
            <time dateTime={legalUpdatedAt} className="text-[var(--text-mid)]">
              {formatDate(legalUpdatedAt, locale)}
            </time>
          </p>
        </header>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={doc.tocLabel} className="hidden lg:block">
            <div className="sticky" style={{ top: "calc(var(--nav-h) + 32px)" }}>
              <p className="mb-4 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low)]">
                {doc.tocLabel}
              </p>
              <ol className="space-y-1 border-l border-[var(--line)]">
                {doc.sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-[13px] leading-snug text-[var(--text-mid)] transition-colors hover:border-[var(--aqua-400)] hover:text-[var(--aqua-300)]"
                    >
                      <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-low)] tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="max-w-[68ch] min-w-0">
            {doc.sections.map((s, i) => (
              <div
                key={s.id}
                id={s.id}
                className="scroll-mt-[calc(var(--nav-h)+24px)] border-t border-[var(--line)] py-10 first:border-t-0 first:pt-0"
              >
                <h2 className="flex items-baseline gap-4 font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] leading-[var(--lh-h3)] tracking-[var(--ls-h3)] text-[var(--text-hi)]">
                  <span className="font-[family-name:var(--font-mono)] text-[12px] font-normal tracking-normal text-[var(--aqua-400)] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.title}
                </h2>
                <div className="mt-5 space-y-4">
                  {s.blocks.map((b, j) => (
                    <Block key={j} block={b} locale={locale} />
                  ))}
                </div>
              </div>
            ))}
          </article>
        </div>
      </Container>
    </div>
  );
}
