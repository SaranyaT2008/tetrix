import { reportLabel } from "@/components/ReportNaming";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";

import { displayTestName } from "@/lib/test-knowledge";
import { toast } from "sonner";
import { FileUp, Sparkles } from "lucide-react";

import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createDemoReport } from "@/lib/medilens.functions";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediLens" },
      { name: "description", content: "Your uploaded lab reports, observations and prepared questions." },
      { property: "og:title", content: "Dashboard — MediLens" },
      { property: "og:description", content: "Your uploaded lab reports, observations and prepared questions." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const runDemo = useServerFn(createDemoReport);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, custom_name, report_date, status, is_demo, created_at, lab_name")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const latest = reports?.[0];

  const { data: latestTests } = useQuery({
    queryKey: ["report-tests", latest?.id],
    enabled: Boolean(latest?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_tests")
        .select("id, test_name, value, unit, reference_range, status")
        .eq("report_id", latest!.id)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: questionCount } = useQuery({
    queryKey: ["question-count", language],
    queryFn: async () => {
      const { count } = await supabase
        .from("doctor_questions")
        .select("id", { count: "exact", head: true })
        .eq("language", language);
      return count ?? 0;
    },
  });

  const demo = useMutation({
    mutationFn: () => runDemo({}),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      navigate({ to: "/reports/$id", params: { id: result.reportId } });
    },
    onError: () => toast.error(t("common.error")),
  });

  const awaiting = (reports ?? []).filter((r) => r.status !== "verified").length;
  const observations = (latestTests ?? []).filter((r) => r.status !== "within_reported_range");
  const languageLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
  const displayName = (profile?.name ?? "").trim() || (user.email ?? "").split("@")[0] || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2">
            {t("dashboard.preferred_language")}: {languageLabel}
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] md:text-5xl">
            {t("dashboard.greeting", { name: displayName })}
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
            <Link to="/upload">
              <FileUp className="mr-2 size-4" />
              {t("dashboard.upload_new")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-xl bg-glass"
            disabled={demo.isPending}
            onClick={() => demo.mutate()}
          >
            <Sparkles className="mr-2 size-4" />
            {t("dashboard.try_demo")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t("dashboard.stat_analyzed"), value: reports?.length ?? 0 },
          { label: t("dashboard.stat_awaiting"), value: awaiting },
          { label: t("dashboard.stat_questions"), value: questionCount ?? 0 },
        ].map((card) => (
          <div key={card.label} className="glass-panel p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="glass-panel p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-bold">{t("dashboard.recent_reports")}</h2>
          {(reports ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("dashboard.no_reports")}</p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {(reports ?? []).slice(0, 6).map((report) => (
                <Link
                  key={report.id}
                  to="/reports/$id"
                  params={{ id: report.id }}
                  className="glass-row flex items-center justify-between gap-3 px-4 py-3 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{reportLabel(report)}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.report_date ?? new Date(report.created_at).toISOString().slice(0, 10)}
                      {report.lab_name ? ` · ${report.lab_name}` : ""}
                    </p>
                  </div>
                  <StatusChip status={report.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel p-6">
          <h2 className="font-display text-lg font-bold">{t("dashboard.observations")}</h2>
          {!latest ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("dashboard.no_reports")}</p>
          ) : observations.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("report.select_test")}</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {observations.slice(0, 5).map((test) => (
                <li key={test.id} className="glass-row px-4 py-3">
                  <p className="font-semibold">{displayTestName(test.test_name, i18n.language)}</p>
                  <p className="text-xs text-muted-foreground">
                    {test.value} {test.unit}
                    {test.reference_range ? <> · {t("report.reference_range")}: <strong className="text-foreground">{test.reference_range}</strong></> : ""}
                  </p>
                  <StatusChip status={test.status} className="mt-2" />
                </li>
              ))}
            </ul>
          )}
          {latest && (
            <Button asChild variant="ghost" size="sm" className="mt-4 text-brand">
              <Link to="/reports/$id" params={{ id: latest.id }}>
                {t("dashboard.view")}
              </Link>
            </Button>
          )}
        </section>
      </div>

      <p className="rounded-2xl bg-ink p-5 text-sm leading-relaxed text-ink-foreground/80">{t("app.safety_notice")}</p>
    </div>
  );
}
