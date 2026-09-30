import { useTranslation } from "react-i18next";

/** Shows the reference range exactly as printed on the report, with the range itself in bold. */
export function RefRange({ range, label = true }: { range: string | null | undefined; label?: boolean }) {
  const { t } = useTranslation();
  if (!range) return <>{t("report.no_range")}</>;
  return (
    <>
      {label ? `${t("report.reference_range")}: ` : null}
      <strong className="font-bold text-foreground">{range}</strong>
    </>
  );
}
