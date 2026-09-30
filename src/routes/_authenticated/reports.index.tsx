import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileText, FileUp } from "lucide-react";

import { ReportMenu, reportLabel } from "@/components/ReportNaming";

import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({
    meta: [
      { title: "Your reports — MediLens" },
      { name: "description", content: "Every lab report you have uploaded to MediLens, with its verification status." },
      { property: "og:title", content: "Your reports — MediLens" },
      { property: "og:description", content: "Every lab report you have uploaded to MediLens, with its verification status." },
    ],
  }),
  component: ReportsList,
});

function ReportsList() {
  const { t } = useTranslation();
  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, custom_name, report_type, report_date, lab_name, status, is_demo, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold">{t("saved_reports.my_reports")}</h1>
        <Button asChild className="rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
          <Link to="/upload">
            <FileUp className="mr-2 size-4" />
            {t("dashboard.upload_new")}
          </Link>
        </Button>
      </div>

      <div className="glass-panel p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (reports ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.no_reports")}</p>
        ) : (
          <div className="space-y-2.5">
            {(reports ?? []).map((report) => (
              <div key={report.id} className="glass-row flex items-center gap-2 pr-2 transition-shadow hover:shadow-md">
                <Link
                  to="/reports/$id"
                  params={{ id: report.id }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-semibold">
                      <FileText className="size-4 shrink-0 text-brand" />
                      {reportLabel(report)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("report.report_date")}: {report.report_date ?? "—"}
                      {report.report_type ? ` · ${t(`saved_reports.types.${report.report_type}`)}` : ""} · {t("report.uploaded")}:{" "}
                      {new Date(report.created_at).toISOString().slice(0, 10)}
                    </p>
                    {report.custom_name && <p className="truncate text-xs text-muted-foreground">{report.filename}</p>}
                  </div>
                  <StatusChip status={report.status} />
                </Link>
                <ReportMenu report={report} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
