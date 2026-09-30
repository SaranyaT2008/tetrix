import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, HelpCircle, Loader2 } from "lucide-react";

import { RefRange } from "@/components/RefRange";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { displayTestName, findKnowledge, type Lang } from "@/lib/test-knowledge";

type Row = {
  id: string;
  test_name: string;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
  status: string;
  source_text: string | null;
};

type Explanation = {
  summary: string | null;
  what_is_this_test: string | null;
  general_context: string | null;
  possible_significance?: string | null;
  common_factors?: string | null;
} | null;

function Section({ label, children, tone = "card" }: { label: string; children: React.ReactNode; tone?: "card" | "mist" | "teal" }) {
  const toneClass = tone === "mist" ? "bg-mist" : tone === "teal" ? "bg-teal-soft border-brand/25" : "bg-card";
  return (
    <div className={`rounded-2xl border border-glass-border p-4 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink">{label}</p>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function TestDetails({
  row,
  allRows,
  explanation,
  loading,
  language,
}: {
  row: Row;
  allRows: Row[];
  explanation: Explanation;
  loading: boolean;
  language: string;
}) {
  const { t } = useTranslation();
  const [whyOpen, setWhyOpen] = useState(false);
  const lang = language as Lang;
  const k = findKnowledge(row.test_name);
  const name = displayTestName(row.test_name, language);
  const shortName = k ? k.name[lang] : row.test_name;
  const value = `${row.value ?? ""} ${row.unit ?? ""}`.trim();
  const below = row.status === "below_reported_range";
  const above = row.status === "above_reported_range";
  const outside = below || above;

  const resultKey =
    row.status === "below_reported_range"
      ? "report.result_below"
      : row.status === "above_reported_range"
        ? "report.result_above"
        : row.status === "within_reported_range"
          ? "report.result_within"
          : row.status === "needs_verification"
            ? "report.result_needs"
            : "report.result_unknown";
  const thereforeKey = below
    ? "report.why_therefore_below"
    : above
      ? "report.why_therefore_above"
      : row.status === "within_reported_range"
        ? "report.why_therefore_within"
        : "report.why_therefore_unknown";

  const significance = k
    ? below
      ? k.below_range_possible_significance[lang]
      : above
        ? k.above_range_possible_significance[lang]
        : t("report.within_significance")
    : explanation?.possible_significance || t("report.significance_note");

  const factors = k ? (above ? k.above_range_common_factors[lang] : k.below_range_common_factors[lang]) : [];
  const whatIs = k ? k.what_is_this_test[lang] : explanation?.what_is_this_test ?? "";
  const whyTested = k ? k.why_is_it_tested[lang] : explanation?.general_context ?? "";

  const questions = [
    t("report.q_meaning", { test: shortName }),
    t("report.q_together"),
    outside ? t("report.q_why_outside") : t("report.q_factors"),
    t("report.q_followup"),
  ];

  const present = new Set(allRows.map((r) => findKnowledge(r.test_name)?.id).filter(Boolean));

  return (
    <div className="space-y-3">
      {/* A. My report */}
      <div className="rounded-2xl border border-brand/25 bg-teal-soft p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink">{t("report.sec_my_report")}</p>
        <p className="mt-1 font-display text-lg font-bold text-ink">{name}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("report.your_result")}</dt>
            <dd className="font-display text-xl font-bold text-ink">{value}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("report.reference_range")}</dt>
            <dd className="font-bold text-ink">{row.reference_range || <span className="text-xs font-normal">{t("report.no_range")}</span>}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{t("report.status_label")}</dt>
            <dd className="mt-1"><StatusChip status={row.status} /></dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("report.source")}: {t("report.source_value")}
        </p>
        {row.source_text && (
          <p className="mt-1.5 rounded-lg bg-background/70 p-2 font-mono text-[11px] text-muted-foreground">“{row.source_text}”</p>
        )}
      </div>

      {loading && !explanation ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("report.generating")}
        </p>
      ) : explanation?.summary ? (
        <p className="px-1 text-sm leading-relaxed">{explanation.summary}</p>
      ) : null}

      <Button
        size="sm"
        variant="ghost"
        className="rounded-full bg-brand/10 text-xs font-semibold text-brand hover:bg-brand/15"
        onClick={() => setWhyOpen(!whyOpen)}
        aria-expanded={whyOpen}
      >
        <HelpCircle className="mr-1.5 size-3.5" />
        {t("report.why")}
      </Button>

      {whyOpen && (
        <div className="space-y-3 rounded-2xl border-2 border-brand/30 bg-card p-4">
          <div>
            <p className="text-sm font-bold text-ink">{t("report.why_title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("report.why_your_result")}: <strong className="text-ink">{value}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              {t("report.why_range")}: <strong className="text-ink">{row.reference_range || "—"}</strong>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("report.why_therefore")}: <strong className="text-ink">{t(thereforeKey, { value: row.value ?? "" })}</strong>
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-sm font-bold text-ink">{t("report.why_what_means", { test: shortName })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{whatIs}</p>
          </div>
          {factors.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-sm font-bold text-ink">{t("report.why_affect")}</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                {factors.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}
          <div className="border-t border-border pt-3">
            <p className="text-sm font-bold text-ink">{t("report.why_ask")}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              {questions.slice(0, 3).map((q) => <li key={q}>{q}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* B. What this test means */}
      <Section label={t("report.sec_what_means")}>
        <p>{whatIs}</p>
        {whyTested && (
          <p className="mt-2">
            <span className="font-semibold text-foreground">{t("report.why_tested")}</span> {whyTested}
          </p>
        )}
      </Section>

      {/* C. What my result shows */}
      <Section label={t("report.sec_result_shows")}>
        <p className="font-medium text-foreground">{t(resultKey)}</p>
        <p className="mt-1">
          {value} · <RefRange range={row.reference_range} />
        </p>
      </Section>

      {/* D. Possible significance */}
      <Section label={t("report.possible_significance")}>
        <p>{significance}</p>
        {outside && <p className="mt-2">{t("report.varies_note")}</p>}
      </Section>

      {/* E. Common factors */}
      <Section label={t("report.common_factors")}>
        {factors.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-5">
            {factors.map((f) => <li key={f}>{f}</li>)}
          </ul>
        ) : (
          <p>{explanation?.common_factors ?? ""}</p>
        )}
        <p className="mt-2 text-xs">{t("report.factors_note")}</p>
      </Section>

      {/* F. Related tests */}
      {k && k.related_tests.length > 0 && (
        <Section label={t("report.sec_related")}>
          <div className="flex flex-wrap gap-1.5">
            {k.related_tests.map((rt) => {
              const inReport = present.has(findKnowledge(rt)?.id);
              return (
                <span
                  key={rt}
                  className={
                    inReport
                      ? "rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-brand-foreground"
                      : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                  title={inReport ? t("report.in_report") : undefined}
                >
                  {displayTestName(rt, language)}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-xs">{t("report.related_note")}</p>
        </Section>
      )}

      {/* G. Questions */}
      <Section label={t("report.sec_questions")} tone="mist">
        <ul className="list-disc space-y-1 pl-5 text-foreground">
          {questions.map((q) => <li key={q}>{q}</li>)}
        </ul>
      </Section>

      {/* H. Medical reference */}
      <Section label={t("report.sec_reference")}>
        {k ? (
          <a href={k.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            {t("report.educational_reference")}: MedlinePlus
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="text-xs">{t("report.no_knowledge")}</p>
        )}
        <p className="mt-2 text-xs font-medium text-foreground">{t("app.safety_notice")}</p>
      </Section>
    </div>
  );
}
