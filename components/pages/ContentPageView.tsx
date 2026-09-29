import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageGraph } from "@/lib/seo/jsonld";
import type { Block as BlockT, ContentPage, PageLocale } from "@/lib/seo/pages";
import { getPageByKey, pagesOfKind } from "@/content/pages";

/**
 * Pagina di contenuto (servizi, città, casi studio, chi sono, bandi, guide,
 * hub). Server component senza JavaScript proprio: testo nell'HTML, leggibile
 * da motori e assistenti AI, veloce su qualunque telefono. Eredita fondo, nav e
 * footer dal layout della variante.
 */

const UI = {
  it: {
    updated: "Aggiornato il",
    toc: "In questa pagina",
    faq: "Domande frequenti",
    sources: "Fonti",
    related: "Da leggere anche",
    ctaTitle: "Parliamo del tuo progetto",
    ctaBody: "Una call gratuita per capire se l'AI è la risposta giusta, quanto è grande il progetto e da dove partire.",
    ctaLabel: "Scrivimi",
    home: "Home",
    by: "di Davide De Sanctis",
  },
  en: {
    updated: "Updated",
    toc: "On this page",
    faq: "FAQ",
    sources: "Sources",
    related: "Related",
    ctaTitle: "Let's talk about your project",
    ctaBody: "A free call to understand whether AI is the right answer, how big the project is and where to start.",
    ctaLabel: "Get in touch",
    home: "Home",
    by: "by Davide De Sanctis",
  },
} as const;

const linkCls =
  "text-[var(--aqua-300)] underline decoration-[var(--line-hi)] underline-offset-4 transition-colors hover:text-[var(--aqua-200)] hover:decoration-[var(--aqua-400)]";

/** Inline: **grassetto** e [testo](href). */
function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      out.push(
        <strong key={k++} className="font-medium text-[var(--text-hi)]">
          {m[1]}
        </strong>,
      );
    } else {
      const href = m[3]!;
      out.push(
        href.startsWith("/") ? (
          <Link key={k++} href={href} className={linkCls}>
            {m[2]}
          </Link>
        ) : (
          <a key={k++} href={href} className={linkCls} target="_blank" rel="noopener noreferrer">
            {m[2]}
          </a>
        ),
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

function Block({ block }: { block: BlockT }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-[length:var(--fs-body)] leading-[var(--lh-body)] text-[var(--text-mid)]">
          <Rich text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="pt-2 font-[family-name:var(--font-display)] text-[1.15rem] font-medium text-[var(--text-hi)]">
          {block.text}
        </h3>
      );
    case "callout":
      return (
        <p className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[rgb(var(--aqua-rgb)/0.05)] p-4 text-[var(--text-mid)]">
          <Rich text={block.text} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="relative pl-7 text-[var(--text-mid)]">
              {block.ordered ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-[0.15em] font-[family-name:var(--font-mono)] text-[12px] text-[var(--aqua-400)] tabular-nums"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              ) : (
                <span aria-hidden="true" className="absolute left-0 top-[0.8em] h-px w-3.5 bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
              )}
              <Rich text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return (
        <>
          <div className="glass-surface hidden overflow-hidden !rounded-[var(--radius-md)] md:block">
            <table className="w-full border-collapse text-left text-[14px] leading-[1.5]">
              <thead>
                <tr>
                  {block.head.map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="border-b border-[var(--line)] px-4 py-3 font-[family-name:var(--font-mono)] text-[10.5px] font-normal uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]"
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
                      <td key={c} className={c === 0 ? "px-4 py-3.5 font-medium text-[var(--text-hi)]" : "px-4 py-3.5 text-[var(--text-mid)]"}>
                        <Rich text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {block.rows.map((row, r) => (
              <dl key={r} className="glass-surface !rounded-[var(--radius-md)] p-4 text-[14px] leading-[1.5]">
                {row.map((cell, c) => (
                  <div key={c} className={c === 0 ? "mb-2" : "mt-2"}>
                    {block.head[c] ? (
                      <dt className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
                        {block.head[c]}
                      </dt>
                    ) : null}
                    <dd className={c === 0 ? "m-0 font-medium text-[var(--text-hi)]" : "m-0 text-[var(--text-mid)]"}>
                      <Rich text={cell} />
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </>
      );
  }
}

function formatDate(iso: string, locale: PageLocale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function Card({ page }: { page: ContentPage }) {
  return (
    <Link
      href={page.path}
      className="glass-surface group block !rounded-[var(--radius-md)] p-5 transition-colors hover:border-[var(--line-hi)]"
    >
      <span className="block font-[family-name:var(--font-display)] text-[1.05rem] font-medium leading-snug text-[var(--text-hi)] transition-colors group-hover:text-[var(--aqua-300)]">
        {page.shortTitle}
      </span>
      <span className="mt-2 block text-[14px] leading-[1.55] text-[var(--text-mid)]">{page.summary}</span>
      <span aria-hidden="true" className="mt-3 block font-[family-name:var(--font-mono)] text-[12px] text-[var(--aqua-400)]">
        →
      </span>
    </Link>
  );
}

/** Briciole di pane: Home › hub (se esiste) › pagina. */
export function breadcrumbsFor(page: ContentPage): { name: string; path: string }[] {
  const hubKey =
    page.kind === "service" ? "hub-services" : page.kind === "case" ? "hub-cases" : page.kind === "guide" ? "hub-guides" : undefined;
  const hub = hubKey ? getPageByKey(hubKey, page.locale) : undefined;
  const crumbs = hub && hub.path !== page.path ? [{ name: hub.shortTitle, path: hub.path }] : [];
  return [...crumbs, { name: page.shortTitle, path: page.path }];
}

export function ContentPageView({ page }: { page: ContentPage }) {
  const ui = UI[page.locale];
  const crumbs = breadcrumbsFor(page);
  const [before, after] = page.emphasis && page.title.includes(page.emphasis) ? page.title.split(page.emphasis) : [page.title, undefined];
  const listed = page.lists ? pagesOfKind(page.lists, page.locale) : [];
  const cities = page.key === "hub-services" && page.locale === "it" ? pagesOfKind("city", "it") : [];
  const related = (page.related ?? [])
    .map((k) => getPageByKey(k, page.locale))
    .filter((p): p is ContentPage => Boolean(p));
  const showToc = page.sections.length >= 3;

  return (
    <div className="content-page relative overflow-x-clip pb-24 sm:pb-32" style={{ paddingTop: "calc(var(--nav-h) + clamp(2.5rem, 7vw, 6rem))" }}>
      <JsonLd data={pageGraph(page, crumbs)} />
      <span aria-hidden="true" className="aurora" style={{ width: 820, height: 620, left: "-18%", top: -120 }} />
      <span
        aria-hidden="true"
        className="aurora"
        style={{ width: 700, height: 700, right: "-22%", top: "40%", background: "var(--aurora-deep)", opacity: 0.3 }}
      />
      <Container>
        <nav aria-label="Breadcrumb" className="font-[family-name:var(--font-mono)] text-[11.5px] tracking-[0.04em] text-[var(--text-low-aa)]">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href={`/${page.locale}`} className="hover:text-[var(--aqua-300)]">
                {ui.home}
              </Link>
            </li>
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-2">
                <span aria-hidden="true">›</span>
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="text-[var(--text-mid)]">
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.path} className="hover:text-[var(--aqua-300)]">
                    {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <header className="mt-8 max-w-[58rem]">
          <p className="flex items-center gap-3 font-[family-name:var(--font-mono)] text-[length:var(--fs-micro)] uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
            <span aria-hidden="true" className="h-px w-6 bg-[var(--aqua-400)] shadow-[var(--glow-xs)]" />
            {page.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[22ch] font-[family-name:var(--font-display)] text-[length:var(--fs-h2)] leading-[var(--lh-h2)] tracking-[var(--ls-h2)] text-[var(--text-hi)]">
            {before}
            {after !== undefined ? (
              <>
                <em className="font-[family-name:var(--font-serif)] font-normal italic text-[var(--aqua-400)] [text-shadow:var(--glow-text)]">
                  {page.emphasis}
                </em>
                {after}
              </>
            ) : null}
          </h1>
          <p className="mt-6 max-w-[var(--measure-prose)] text-[length:var(--fs-lead)] leading-[var(--lh-lead)] text-[var(--text-mid)]">
            <Rich text={page.intro} />
          </p>
          {page.kind !== "hub" ? (
            <p className="mt-6 font-[family-name:var(--font-mono)] text-[11.5px] uppercase tracking-[0.12em] text-[var(--text-low-aa)]">
              {ui.updated}{" "}
              <time dateTime={page.updatedAt} className="text-[var(--text-mid)]">
                {formatDate(page.updatedAt, page.locale)}
              </time>{" "}
              ·{" "}
              {page.kind === "about" ? (
                ui.by
              ) : (
                <Link href={page.locale === "en" ? "/en/about" : "/it/chi-sono"} className="text-[var(--text-mid)] underline decoration-[var(--line-hi)] underline-offset-4 hover:text-[var(--aqua-200)]">
                  {ui.by}
                </Link>
              )}
            </p>
          ) : null}
        </header>

        {listed.length > 0 ? (
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listed.map((p) => (
              <Card key={p.path} page={p} />
            ))}
          </div>
        ) : null}

        {cities.length > 0 ? (
          <div className="mt-14">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] text-[var(--text-hi)]">
              Dove incontro i clienti
            </h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {cities.map((c) => (
                <li key={c.path}>
                  <Link href={c.path} className="glass-surface inline-block !rounded-[var(--radius-full)] px-4 py-2 text-[14px] text-[var(--text-mid)] hover:text-[var(--aqua-300)]">
                    {c.city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {page.sections.length > 0 ? (
          <div className={showToc ? "mt-14 grid gap-12 lg:mt-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16" : "mt-14"}>
            {showToc ? (
              <nav aria-label={ui.toc} className="hidden lg:block">
                <div className="sticky" style={{ top: "calc(var(--nav-h) + 32px)" }}>
                  <p className="mb-4 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
                    {ui.toc}
                  </p>
                  <ol className="space-y-1 border-l border-[var(--line)]">
                    {page.sections.map((s, i) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-[13px] leading-snug text-[var(--text-mid)] transition-colors hover:border-[var(--aqua-400)] hover:text-[var(--aqua-300)]"
                        >
                          <span className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-low-aa)] tabular-nums">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              </nav>
            ) : null}

            <article className="max-w-[70ch] min-w-0">
              {page.sections.map((s, i) => (
                <section
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
                      <Block key={j} block={b} />
                    ))}
                  </div>
                </section>
              ))}

              {page.faq?.length ? (
                <section id="faq" className="scroll-mt-[calc(var(--nav-h)+24px)] border-t border-[var(--line)] py-10">
                  <h2 className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] leading-[var(--lh-h3)] text-[var(--text-hi)]">
                    {ui.faq}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {page.faq.map((f) => (
                      <details key={f.q} className="glass-surface group !rounded-[var(--radius-md)] p-5 [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-[var(--text-hi)]">
                          <h3 className="text-[1rem] leading-snug">{f.q}</h3>
                          <span aria-hidden="true" className="mt-0.5 font-[family-name:var(--font-mono)] text-[var(--aqua-400)] transition-transform group-open:rotate-45">
                            +
                          </span>
                        </summary>
                        <p className="mt-3 text-[15px] leading-[1.65] text-[var(--text-mid)]">
                          <Rich text={f.a} />
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

              {page.sources?.length ? (
                <section className="border-t border-[var(--line)] py-10">
                  <h2 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[var(--ls-micro)] text-[var(--text-low-aa)]">
                    {ui.sources}
                  </h2>
                  <ul className="mt-4 space-y-2 text-[14px]">
                    {page.sources.map((s) => (
                      <li key={s.href}>
                        <a href={s.href} className={linkCls} target="_blank" rel="noopener noreferrer">
                          {s.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </article>
          </div>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-10 border-t border-[var(--line)] pt-10">
            <h2 className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] text-[var(--text-hi)]">{ui.related}</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <Card key={p.path} page={p} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="glass-surface mt-14 !rounded-[var(--radius-lg)] p-7 sm:p-10">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--fs-h3)] text-[var(--text-hi)]">{ui.ctaTitle}</h2>
          <p className="mt-3 max-w-[56ch] text-[var(--text-mid)]">{ui.ctaBody}</p>
          <Link
            href={`/${page.locale}#contatti`}
            className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-full)] bg-[var(--aqua-400)] px-6 font-medium text-[#03070A] shadow-[var(--glow-sm)] transition-colors hover:bg-[var(--aqua-300)]"
          >
            {ui.ctaLabel} →
          </Link>
        </section>
      </Container>
    </div>
  );
}
