import { reportLabel } from "@/components/ReportNaming";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { displayTestName } from "@/lib/test-knowledge";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ChangeGuard } from "@/components/ChangeGuard";
import { ShieldCheck } from "lucide-react";
import { RefRange } from "@/components/RefRange";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/compare")({
  head: () => ({
    meta: [
      { title: "Compare reports — MediLens" },
      { name: "description", content: "See how each lab value changed between two of your reports, numbers only." },
      { property: "og:title", content: "Compare reports — MediLens" },
      { property: "og:description", content: "See how each lab value changed between two of your reports, numbers only." },
    ],
  }),
  component: ComparePage,
});

type TestRow = {
  id: string;
  test_name: string;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
};

function numeric(value: string | null) {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function ComparePage() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [previousId, setPreviousId] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [started, setStarted] = useState("");

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, custom_name, report_date, created_at, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const usable = (reports ?? []).filter((r) => r.status === "verified" || r.status === "verification_required");

  useEffect(() => {
    if (!currentId && usable[0]) setCurrentId(usable[0].id);
    if (!previousId && usable[1]) setPreviousId(usable[1].id);
  }, [currentId, previousId, usable]);

  const { data: previousTests } = useQuery({
    queryKey: ["report-tests", previousId],
    enabled: Boolean(previousId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_tests")
        .select("id, test_name, value, unit, reference_range")
        .eq("report_id", previousId)
        .order("position");
      if (error) throw error;
      return data as TestRow[];
    },
  });

  const { data: currentTests } = useQuery({
    queryKey: ["report-tests", currentId],
    enabled: Boolean(currentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_tests")
        .select("id, test_name, value, unit, reference_range")
        .eq("report_id", currentId)
        .order("position");
      if (error) throw error;
      return data as TestRow[];
    },
  });

  const addQuestion = useMutation({
    mutationFn: async (question: string) => {
      const { error } = await supabase.from("doctor_questions").insert({
        report_id: currentId,
        language,
        question,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(t("compare.question_added"));
      await queryClient.invalidateQueries({ queryKey: ["questions", currentId, language] });
    },
    onError: () => toast.error(t("common.error")),
  });

  const pairs = (currentTests ?? [])
    .map((current) => {
      const previous = (previousTests ?? []).find(
        (p) => p.test_name.toLowerCase() === current.test_name.toLowerCase(),
      );
      if (!previous) return null;
      const before = numeric(previous.value);
      const after = numeric(current.value);
      const delta = before !== null && after !== null ? Number((after - before).toFixed(4)) : null;
      return { current, previous, delta };
    })
    .filter((pair): pair is NonNullable<typeof pair> => pair !== null);

  const previousReport = usable.find((r) => r.id === previousId);
  const currentReport = usable.find((r) => r.id === currentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("compare.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("compare.body")}</p>
      </div>

      {usable.length < 2 ? (
        <div className="glass-panel p-6 text-sm text-muted-foreground">{t("compare.need_two")}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("compare.previous")}
              </Label>
              <select
                value={previousId}
                onChange={(e) => setPreviousId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {usable.map((report) => (
                  <option key={report.id} value={report.id}>
                    {reportLabel(report)} · {report.report_date ?? report.created_at.slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
            <div className="glass-panel p-5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("compare.current")}
              </Label>
              <select
                value={currentId}
                onChange={(e) => setCurrentId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                {usable.map((report) => (
                  <option key={report.id} value={report.id}>
                    {reportLabel(report)} · {report.report_date ?? report.created_at.slice(0, 10)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="rounded-xl bg-ink text-ink-foreground hover:bg-ink/90"
              disabled={!previousId || !currentId || previousId === currentId}
              onClick={() => setStarted(`${previousId}:${currentId}`)}
            >
              <ShieldCheck className="mr-2 size-4" />
              {t("changeguard.start")}
            </Button>
            {previousId === currentId && <p className="text-xs text-muted-foreground">{t("changeguard.same_report")}</p>}
          </div>

          {started === `${previousId}:${currentId}` && previousReport && currentReport && previousId !== currentId && (
            <ChangeGuard
              key={started}
              previous={{ id: previousReport.id, filename: reportLabel(previousReport), date: previousReport.report_date ?? previousReport.created_at.slice(0, 10) }}
              current={{ id: currentReport.id, filename: reportLabel(currentReport), date: currentReport.report_date ?? currentReport.created_at.slice(0, 10) }}
              onAddQuestion={(q) => addQuestion.mutate(q)}
              adding={addQuestion.isPending}
            />
          )}

          <section className="glass-panel p-6">
            {pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("compare.no_common")}</p>
            ) : (
              <div className="space-y-3">
                {pairs.map((pair) => (
                  <div key={pair.current.id} className="glass-row px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{displayTestName(pair.current.test_name, i18n.language)}</p>
                      <p
                        className={cn(
                          "rounded-full px-3 py-1 text-sm font-bold",
                          pair.delta === null || pair.delta === 0
                            ? "bg-muted text-muted-foreground"
                            : pair.delta > 0
                              ? "bg-up-soft text-up"
                              : "bg-low-soft text-low",
                        )}
                      >
                        {pair.delta === null
                          ? "—"
                          : `${pair.delta > 0 ? "+" : ""}${pair.delta} ${pair.current.unit ?? ""}`}
                      </p>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <div>
                        <dt>{t("compare.previous_value")}</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {pair.previous.value} {pair.previous.unit}
                        </dd>
                        <dd>{previousReport?.report_date ?? previousReport?.created_at.slice(0, 10)}</dd>
                      </div>
                      <div>
                        <dt>{t("compare.current_value")}</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {pair.current.value} {pair.current.unit}
                        </dd>
                        <dd>{currentReport?.report_date ?? currentReport?.created_at.slice(0, 10)}</dd>
                      </div>
                      <div>
                        <dt>{t("report.reference_range")}</dt>
                        <dd className="text-sm font-medium text-foreground">
                          <RefRange range={pair.current.reference_range} label={false} />
                        </dd>
                      </div>
                    </dl>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 rounded-full bg-brand/10 text-xs font-semibold text-brand hover:bg-brand/15"
                      disabled={addQuestion.isPending}
                      onClick={() =>
                        addQuestion.mutate(
                          `${pair.current.test_name}: ${pair.previous.value} ${pair.previous.unit ?? ""} → ${pair.current.value} ${pair.current.unit ?? ""}. ${t("compare.ask_about_change")}`,
                        )
                      }
                    >
                      {t("compare.ask_about_change")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{t("compare.color_note")}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("app.safety_notice")}</p>
    </div>
  );
}
