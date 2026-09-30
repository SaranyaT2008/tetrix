import { reportLabel } from "@/components/ReportNaming";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { askMediLens } from "@/lib/medilens.functions";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/_authenticated/ask")({
  head: () => ({
    meta: [
      { title: "Ask MediLens — questions about your report" },
      { name: "description", content: "Ask plain-language questions about your verified lab report, answered only from your report and labelled educational information." },
      { property: "og:title", content: "Ask MediLens — questions about your report" },
      { property: "og:description", content: "Plain-language answers grounded in your own verified report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AskPage,
});

type Message = { role: "user" | "assistant"; text: string };

function AskPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const ask = useServerFn(askMediLens);
  const [reportId, setReportId] = useState<string>("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", "verified"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, custom_name, report_date, created_at")
        .eq("status", "verified")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!reportId && reports && reports[0]) setReportId(reports[0].id);
  }, [reports, reportId]);

  const send = useMutation({
    mutationFn: (question: string) => ask({ data: { reportId, question, language } }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", text: res.answer }]),
    onError: (error) =>
      setMessages((m) => [...m, { role: "assistant", text: error instanceof Error ? error.message : t("common.error") }]),
  });

  function submit(question: string) {
    const q = question.trim();
    if (!q || !reportId || send.isPending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    send.mutate(q);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(input);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("ask.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("ask.body")}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (reports ?? []).length === 0 ? (
        <div className="glass-panel p-6">
          <p className="text-sm text-muted-foreground">{t("ask.no_verified")}</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link to="/reports">{t("nav.reports")}</Link>
          </Button>
        </div>
      ) : (
        <section className="glass-panel space-y-4 p-6">
          <label className="block text-sm font-semibold">
            {t("ask.choose_report")}
            <select
              value={reportId}
              onChange={(e) => {
                setReportId(e.target.value);
                setMessages([]);
              }}
              className="mt-1.5 block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-normal"
            >
              {(reports ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {reportLabel(r)} · {r.report_date ?? new Date(r.created_at).toISOString().slice(0, 10)}
                </option>
              ))}
            </select>
          </label>

          <div className="min-h-40 space-y-3 rounded-2xl bg-mist p-4">
            {messages.length === 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("ask.suggestions")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["ask.s1", "ask.s2", "ask.s3"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => submit(t(key))}
                      className="rounded-full border border-glass-border bg-card px-3 py-1.5 text-xs font-medium hover:border-brand/40 hover:bg-teal-soft"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl bg-ink px-4 py-2.5 text-sm text-ink-foreground"
                      : "max-w-[85%] whitespace-pre-line rounded-2xl border border-glass-border bg-card px-4 py-2.5 text-sm leading-relaxed"
                  }
                >
                  {m.role === "assistant" && <p className="mb-1 text-xs font-bold text-brand">MediLens</p>}
                  {m.text}
                </div>
              </div>
            ))}
            {send.isPending && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                {t("ask.thinking")}
              </p>
            )}
          </div>

          <form onSubmit={onSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ask.placeholder")}
              className="h-11 rounded-xl bg-background"
              maxLength={600}
            />
            <Button type="submit" className="h-11 shrink-0 rounded-xl" disabled={!input.trim() || send.isPending}>
              <Send className="mr-1.5 size-4" />
              {t("ask.send")}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">{t("app.safety_notice")}</p>
        </section>
      )}
    </div>
  );
}
