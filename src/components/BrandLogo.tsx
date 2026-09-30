import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/** MediLens logo: teal rounded square with a plus inside a circle, name and tagline. */
export function BrandLogo({ className, compact = false, tone = "default" }: { className?: string; compact?: boolean; tone?: "default" | "inverse" }) {
  const { t } = useTranslation();
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-sm sm:size-11">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </span>
      <span className="min-w-0 leading-none">
        <span className="block font-display text-xl tracking-tight">
          <span className={cn("font-bold", tone === "inverse" ? "text-ink-foreground" : "text-ink")}>Medi</span>
          <span className={cn("font-semibold", tone === "inverse" ? "text-teal" : "text-brand")}>Lens</span>
        </span>
        {!compact && (
          <span className="mt-1 hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:block">
            {t("brand.tagline")}
          </span>
        )}
      </span>
    </span>
  );
}
