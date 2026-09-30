import { reportLabel, SaveReportCard } from "@/components/ReportNaming";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Loader2, Pencil, RefreshCw } from "lucide-react";

import { RefRange } from "@/components/RefRange";
import { StatusChip } from "@/components/StatusChip";
import { TestDetails } from "@/components/TestDetails";
import { displayTestName } from "@/lib/test-knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getDoctorQuestions, getExplanations, saveTestEdit } from "@/lib/medilens.functions";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

type Level = "simple" | "standard";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  head: () => ({
    meta: [
      { title: "Report — MediLens" },
      { name: "description", content: "Verify extracted values, read plain-language explanations with evidence, and prepare questions." },
      { property: "og:title", content: "Report — MediLens" },
      { property: "og:description", content: "Verify extracted values, read plain-language explanations with evidence, and prepare questions." },
    ],
  }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const [level, setLevel] = useState<Level>("simple");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ value: "", unit: "", reference_range: "" });

  const saveEdit = useServerFn(saveTestEdit);
  const loadExplanations = useServerFn(getExplanations);
  const loadQuestions = useServerFn(getDoctorQuestions);

  const { data: report } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, custom_name, report_type, report_date, lab_name, status, is_demo, created_at, raw_text")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: tests } = useQuery({
    queryKey: ["report-tests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_tests")
        .select("*")
        .eq("report_id", id)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const isVerified = report?.status === "verified";

  const { data: explanations, isFetching: explaining } = useQuery({
    queryKey: ["explanations", id, language, level],
    enabled: isVerified,
    staleTime: Infinity,
    queryFn: () => loadExplanations({ data: { reportId: id, language, level } }),
  });

  const { data: questions } = useQuery({
    queryKey: ["questions", id, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_questions")
        .select("*")
        .eq("report_id", id)
        .eq("language", language)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const prepareQuestions = useMutation({
    mutationFn: (refresh: boolean) => loadQuestions({ data: { reportId: id, language, refresh } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["questions", id, language] }),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const confirmTest = useMutation({
    mutationFn: (input: { testId: string; value: string; unit: string; reference_range: string }) =>
      saveEdit({ data: input }),
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["report-tests", id] });
      await queryClient.invalidateQueries({ queryKey: ["explanations", id] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const confirmAll = useMutation({
    mutationFn: async () => {
      // Confirm every displayed row (including any edited values) through the existing save path.
      for (const row of (tests ?? []).filter((r) => !r.verified)) {
        await saveEdit({
          data: {
            testId: row.id,
            value: row.value ?? "",
            unit: row.unit ?? "",
            reference_range: row.reference_range ?? "",
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["report-tests", id] });
      const { error } = await supabase
        .from("reports")
        .update({ status: "verified", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["report", id] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => toast.error(t("common.error")),
  });

  useEffect(() => {
    if (selectedId || !tests || tests.length === 0) return;
    const target = tests.find((x) => x.status !== "within_reported_range") ?? tests[0];
    if (target) setSelectedId(target.id);
  }, [selectedId, tests]);

  const rows = tests ?? [];
  const verifiedCount = rows.filter((r) => r.verified).length;
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const explanation = (explanations?.explanations ?? []).find((e) => e.report_test_id === selected?.id) ?? null;
  const flaggedRows = rows.filter((r) => r.status !== "within_reported_range");

  if (report?.status === "failed") {
    return (
      <div className="glass-panel mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl font-bold">{t("upload.failed")}</h1>
        <Button asChild className="mt-6 rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
          <Link to="/upload">{t("dashboard.upload_new")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">{t("report.title")}</p>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{report ? reportLabel(report) : t("common.loading")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("report.report_date")}: {report?.report_date ?? "—"} · {t("report.uploaded")}:{" "}
            {report ? new Date(report.created_at).toISOString().slice(0, 10) : "—"}
            {report?.lab_name ? ` · ${report.lab_name}` : ""}
          </p>
          {report?.is_demo && (
            <p className="mt-3 inline-flex rounded-full bg-warn-soft px-3 py-1 text-xs font-semibold text-warn">
              {t("report.demo_badge")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("report.verification_status")}</span>
          {report && <StatusChip status={report.status} />}
        </div>
      </div>

      {report && (report.status === "verified" || report.status === "verification_required") && (
        <SaveReportCard key={`${report.id}:${report.custom_name ?? ""}`} report={report} />
      )}

      {!isVerified && (
        <section className="glass-panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">{t("report.verify_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("report.verify_body")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("report.review_note")}</p>
            </div>
            <span className="rounded-full bg-teal-soft px-3 py-1 text-xs font-semibold text-teal">
              {t("report.verified_count", { verified: verifiedCount, total: rows.length })}
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {rows.map((row) => {
              const lowConfidence = (row.confidence ?? 1) < 0.85;
              const isEditing = editing === row.id;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "rounded-2xl border px-4 py-4",
                    row.verified
                      ? "border-teal/30 bg-teal-soft"
                      : lowConfidence
                        ? "border-warn-border bg-warn-soft"
                        : "border-glass-border bg-glass",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{displayTestName(row.test_name, language)}</p>
                      {row.original_test_name && row.original_test_name !== row.test_name && (
                        <p className="text-xs text-muted-foreground">{row.original_test_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t("report.confidence")}: {Math.round((row.confidence ?? 0) * 100)}%
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-2.5">
                      <div className="space-y-1">
                        <Label className="text-xs">{t("report.value")}</Label>
                        <Input
                          value={draft.value}
                          onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("report.unit")}</Label>
                        <Input
                          value={draft.unit}
                          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t("report.reference_range")}</Label>
                        <Input
                          value={draft.reference_range}
                          onChange={(e) => setDraft({ ...draft, reference_range: e.target.value })}
                          className="h-9 bg-background"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="rounded-lg"
                          disabled={confirmTest.isPending}
                          onClick={() => confirmTest.mutate({ testId: row.id, ...draft })}
                        >
                          {t("report.save")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          {t("report.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-3 font-display text-xl font-bold">
                        {row.value} {row.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <RefRange range={row.reference_range} />
                      </p>
                      {lowConfidence && !row.verified && (
                        <p className="mt-2 text-xs font-medium text-warn">⚠ {t("report.verify_low_confidence")}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        {row.verified && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal/15 px-2.5 py-1.5 text-xs font-semibold text-teal">
                            <Check className="size-3.5" />
                            {t("status.verified")}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          onClick={() => {
                            setEditing(row.id);
                            setDraft({
                              value: row.value ?? "",
                              unit: row.unit ?? "",
                              reference_range: row.reference_range ?? "",
                            });
                          }}
                        >
                          <Pencil className="mr-1.5 size-3.5" />
                          {t("report.edit")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            className="mt-6 w-full rounded-xl sm:w-auto"
            disabled={rows.length === 0 || editing !== null || confirmAll.isPending}
            onClick={() => confirmAll.mutate()}
          >
            {confirmAll.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("report.confirm_all")}
          </Button>
        </section>
      )}

      {isVerified && (
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="glass-panel p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-bold">{t("report.structured_results")}</h2>
            <div className="mt-4 space-y-2.5">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-shadow",
                    row.id === selectedId ? "bg-brand/10 ring-1 ring-brand/30" : "glass-row hover:shadow-md",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{displayTestName(row.test_name, language)}</p>
                    <p className="text-xs text-muted-foreground">
                      <RefRange range={row.reference_range} />
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">
                      {row.value} {row.unit}
                    </p>
                    <StatusChip status={row.status} className="mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="glass-panel p-6 lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">{t("report.plain_language")}</h2>
              <div className="flex rounded-full bg-muted p-1 text-xs font-semibold">
                {(["simple", "standard"] as Level[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLevel(option)}
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      level === option ? "bg-brand text-brand-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t(`report.level_${option}`)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              {!selected ? (
                <p className="text-sm text-muted-foreground">{t("report.select_test")}</p>
              ) : (
                <TestDetails
                  key={selected.id}
                  row={selected}
                  allRows={rows}
                  explanation={explanation}
                  loading={explaining}
                  language={language}
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-ink p-6 text-ink-foreground lg:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">{t("report.questions_title")}</h2>
              {(questions ?? []).length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                  disabled={prepareQuestions.isPending}
                  onClick={() => prepareQuestions.mutate(true)}
                >
                  {prepareQuestions.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
                  {t("report.regenerate_questions")}
                </Button>
              )}
            </div>
            {(questions ?? []).length === 0 ? (
              <Button
                className="mt-4 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={prepareQuestions.isPending}
                onClick={() => prepareQuestions.mutate(false)}
              >
                {prepareQuestions.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t("report.generate_questions")}
              </Button>
            ) : (
              <ol className="mt-4 grid gap-2.5 text-sm md:grid-cols-2">
                {(questions ?? []).map((question, index) => (
                  <li key={question.id} className="flex gap-2.5 rounded-xl bg-ink-foreground/5 p-3">
                    <span className="font-bold text-teal">{index + 1}.</span>
                    <span>{question.question}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-3xl border-2 border-brand/40 bg-card p-6 shadow-sm lg:col-span-5" aria-labelledby="discussion-summary">
            <h2 id="discussion-summary" className="font-display text-2xl font-extrabold uppercase tracking-wide text-ink">
              {t("report.summary_title")}
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border-l-4 border-l-brand bg-teal-soft p-4">
                <p className="text-sm font-extrabold uppercase tracking-wider text-ink">{t("report.summary_observations")}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                  {flaggedRows.length === 0 ? (
                    <li>• {t("report.obs_none")}</li>
                  ) : (
                    flaggedRows.map((row) => {
                      const key =
                        row.status === "below_reported_range"
                          ? "report.obs_below"
                          : row.status === "above_reported_range"
                            ? "report.obs_above"
                            : row.status === "needs_verification"
                              ? "report.obs_needs"
                              : "report.obs_unknown";
                      return (
                        <li key={row.id}>
                          • <strong>{t(key, { test: displayTestName(row.test_name, language) })}</strong>{" "}
                          <span className="text-muted-foreground">
                            ({row.value} {row.unit}
                            {row.reference_range ? <> · <strong className="text-foreground">{row.reference_range}</strong></> : null})
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border-l-4 border-l-up bg-up-soft p-4">
                <p className="text-sm font-extrabold uppercase tracking-wider text-ink">{t("report.summary_changes")}</p>
                <p className="mt-2 text-sm text-foreground">{t("report.summary_changes_body")}</p>
                <Link to="/compare" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
                  {t("nav.compare")} →
                </Link>
              </div>
              <div className="rounded-2xl border-l-4 border-l-ink bg-mist p-4">
                <p className="text-sm font-extrabold uppercase tracking-wider text-ink">{t("report.summary_questions")}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                  {(questions ?? []).length === 0 ? (
                    <li className="text-muted-foreground">{t("report.summary_no_questions")}</li>
                  ) : (
                    (questions ?? []).slice(0, 4).map((q) => <li key={q.id}>• {q.question}</li>)
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border-l-4 border-l-warn bg-warn-soft p-4">
                <p className="text-sm font-extrabold uppercase tracking-wider text-ink">{t("report.summary_details")}</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  <li>• {t("report.report_date")}: <strong>{report?.report_date ?? "—"}</strong></li>
                  {report?.lab_name && <li>• {t("report.lab")}: <strong>{report.lab_name}</strong></li>}
                  <li>• {t("report.tests_count")}: <strong>{rows.length}</strong></li>
                  {flaggedRows.slice(0, 3).map((row) => (
                    <li key={row.id}>
                      • {displayTestName(row.test_name, language)}: <strong>{row.value} {row.unit}</strong> · <RefRange range={row.reference_range} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border-2 border-low-border bg-low-soft p-4">
              <p className="text-sm font-extrabold uppercase tracking-wider text-low">{t("report.summary_safety")}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{t("report.summary_safety_body")}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
