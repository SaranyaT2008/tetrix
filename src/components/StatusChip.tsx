import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  within_reported_range: "bg-teal-soft text-teal",
  below_reported_range: "bg-low-soft text-low",
  above_reported_range: "bg-low-soft text-low",
  needs_verification: "bg-warn-soft text-warn",
  unknown: "bg-muted text-muted-foreground",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        TONE[status] ?? TONE["unknown"],
        className,
      )}
    >
      {t(`status.${status}`, { defaultValue: t("status.unknown") })}
    </span>
  );
}
