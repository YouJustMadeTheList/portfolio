import { STATUS_LABELS } from "../_lib/format";

const STYLES: Record<string, string> = {
  new: "border-[var(--aqua-400)] text-[var(--aqua-300)] bg-[rgb(var(--aqua-rgb)/0.1)]",
  replied: "border-[var(--line-hi)] text-[var(--text-hi)]",
  archived: "border-[var(--line)] text-[var(--text-low)]",
};

const ICONS: Record<string, string> = { new: "●", replied: "✓", archived: "▪" };

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.08em] ${STYLES[status] ?? STYLES.archived}`}
    >
      <span aria-hidden="true">{ICONS[status] ?? "·"}</span>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
