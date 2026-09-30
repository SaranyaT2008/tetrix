import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, FileSearch, HelpCircle, Minus, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RefRange } from "@/components/RefRange";
import { supabase } from "@/integrations/supabase/client";
import { compareReports, type CGReportMeta, type CGResult, type CGStatus, type CGTest } from "@/lib/changeguard";
import { displayTestName } from "@/lib/test-knowledge";
import { cn } from "@/lib/utils";

type Filter = "all" | "comparable" | "changed" | "verify" | "cannot";

const STATUS_STYLE: Record<CGStatus, string> = {
  COMPARABLE: "bg-teal-soft text-ink border-brand/30",
  UNIT_DIFFERENCE: "bg-warn-soft text-warn border-warn-border",
  REFERENCE_RANGE_CHANGED: "bg-warn-soft text-warn border-warn-border",
  TEST_MISMATCH: "bg-warn-soft text-warn border-warn-border",
  REQUIRES_VERIFICATION: "bg-warn-soft text-warn border-warn-border",
  DATA_UNAVAILABLE: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: CGStatus }) {
  const { t } = useTranslation();
  const Icon = status === "COMPARABLE" ? CheckCircle2 : status === "DATA_UNAVAILABLE" ? Minus : TriangleAlert;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>
      <Icon className="size-3.5" />
      {t(`changeguard.status.${status}`)}
    </span>
  );
}

async function fetchTests(reportId: string) {
  const { data, error } = await supabase
    .from("report_tests")
    .select("id, test_name, original_test_name, value, unit, reference_range, confidence, source_text, verified")
    .eq("report_id", reportId)
    .order("position");
  if (error) throw error;
  return (data ?? []).map((d) => ({ ...d, confidence: d.confidence === null ? null : Number(d.confidence) })) as CGTest[];
}

const fmt = (v: string | null | undefined, u: string | null | undefined) => (v ? `${v} ${u ?? ""}`.trim() : "—");

export function ChangeGuard({
  previous,
  current,
  onAddQuestion,
  adding,
}: {
  previous: CGReportMeta;
  current: CGReportMeta;
  onAddQuestion: (q: string) => void;
  adding: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const prevQ = useQuery({ queryKey: ["changeguard-tests", previous.id], queryFn: () => fetchTests(previous.id) });
  const currQ = useQuery({ queryKey: ["changeguard-tests", current.id], queryFn: () => fetchTests(current.id) });

  const comparison = useMemo(
    () => (prevQ.data && currQ.data ? compareReports(previous, current, prevQ.data, currQ.data, confirmed) : null),
    [prevQ.data, currQ.data, previous, current, confirmed],
  );

  if (prevQ.isLoading || currQ.isLoading) return <div className="glass-panel p-6 text-sm text-muted-foreground">{t("changeguard.validating")}</div>;
  if (!comparison) return <div className="glass-panel p-6 text-sm text-muted-foreground">{t("common.error")}</div>;

  const name = (n: string) => displayTestName(n, i18n.language);
  const visible = comparison.results.filter((r) => {
    if (filter === "comparable") return r.status === "COMPARABLE";
    if (filter === "changed") return r.status === "COMPARABLE" && r.changed;
    if (filter === "verify") return r.status === "REQUIRES_VERIFICATION" || r.status === "TEST_MISMATCH";
    if (filter === "cannot") return ["UNIT_DIFFERENCE", "REFERENCE_RANGE_CHANGED", "DATA_UNAVAILABLE"].includes(r.status);
    return true;
  });
  const graphable = comparison.results.filter((r) => r.status === "COMPARABLE" || r.status === "REFERENCE_RANGE_CHANGED");
  const selected =
    comparison.results.find((r) => r.key === selectedKey) ?? graphable[0] ?? comparison.results[0] ?? null;

  const s = comparison.summary;
  const FILTERS: Filter[] = ["all", "comparable", "changed", "verify", "cannot"];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand">
              <ShieldCheck className="size-4" /> ChangeGuard
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">{t("changeguard.summary_title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("changeguard.tagline")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {previous.filename} · {previous.date} <ArrowRight className="inline size-3" /> {current.filename} · {current.date}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [s.total_tests, "changeguard.sum_total"],
            [s.changed, "changeguard.sum_changed"],
            [s.requires_verification, "changeguard.sum_verify"],
            [s.not_comparable, "changeguard.sum_cannot"],
          ].map(([n, k]) => (
            <div key={k as string} className="glass-row px-4 py-3">
              <p className="font-display text-2xl font-bold">{n}</p>
              <p className="text-xs text-muted-foreground">{t(k as string)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Table */}
      <section className="glass-panel p-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "border-brand/50 bg-teal-soft font-semibold text-ink" : "border-glass-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`changeguard.filter.${f}`)}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2.5">
          {visible.length === 0 && <p className="text-sm text-muted-foreground">{t("changeguard.none_in_filter")}</p>}
          {visible.map((r) => (
            <ResultRow key={r.key} r={r} name={name} active={selected?.key === r.key} onSelect={() => setSelectedKey(r.key)}
              onConfirm={() => setConfirmed((prev) => new Set(prev).add(r.key))} />
          ))}
        </div>
      </section>

      {selected && <Detail r={selected} name={name} previous={previous} current={current} graphable={graphable}
        onPick={setSelectedKey} onAddQuestion={onAddQuestion} adding={adding} />}
    </div>
  );
}

function ResultRow({ r, name, active, onSelect, onConfirm }: { r: CGResult; name: (n: string) => string; active: boolean; onSelect: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  const [why, setWhy] = useState(false);
  const blocked = r.status !== "COMPARABLE";
  return (
    <div className={cn("glass-row px-4 py-3", active && "ring-1 ring-brand/40")}>
      <button type="button" onClick={onSelect} className="grid w-full gap-2 text-left sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
        <span className="font-semibold">
          {name(r.current?.test_name ?? r.test_name)}
          {r.match !== "exact" && r.previous && r.current && (
            <span className="block text-xs font-normal text-muted-foreground">{r.previous.test_name} ↔ {r.current.test_name}</span>
          )}
        </span>
        <span className="text-sm"><span className="text-xs text-muted-foreground sm:hidden">{t("compare.previous_value")}: </span>{fmt(r.previous?.value, r.previous?.unit)}</span>
        <span className="text-sm"><span className="text-xs text-muted-foreground sm:hidden">{t("compare.current_value")}: </span>{fmt(r.current?.value, r.current?.unit)}</span>
        <StatusBadge status={r.status} />
      </button>
      {blocked && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>{t(`changeguard.msg.${r.status}`)}</p>
          {r.status === "TEST_MISMATCH" && (
            <Button size="sm" variant="ghost" onClick={onConfirm} className="mt-2 h-7 rounded-full bg-brand/10 text-xs font-semibold text-brand hover:bg-brand/15">
              {t("changeguard.confirm_match")}
            </Button>
          )}
          <button type="button" onClick={() => setWhy((v) => !v)} className="mt-1 inline-flex items-center gap-1 font-semibold text-brand">
            <HelpCircle className="size-3.5" /> {t("changeguard.why_cant")}
          </button>
          {why && <p className="mt-1 rounded-lg bg-muted px-3 py-2 leading-relaxed">{t(`changeguard.why.${r.status}`)}</p>}
        </div>
      )}
    </div>
  );
}

function Detail({ r, name, previous, current, graphable, onPick, onAddQuestion, adding }: {
  r: CGResult; name: (n: string) => string; previous: CGReportMeta; current: CGReportMeta; graphable: CGResult[];
  onPick: (k: string) => void; onAddQuestion: (q: string) => void; adding: boolean;
}) {
  const { t } = useTranslation();
  const [evidence, setEvidence] = useState(false);
  const unit = r.current?.unit ?? r.previous?.unit ?? "";
  const canGraph = r.previous_value !== null && r.current_value !== null && (r.status === "COMPARABLE" || r.status === "REFERENCE_RANGE_CHANGED");
  const data = canGraph ? [
    { label: `${t("compare.previous")} · ${previous.date}`, value: r.previous_value },
    { label: `${t("compare.current")} · ${current.date}`, value: r.current_value },
  ] : [];
  const dir = r.change === null ? null : r.change > 0 ? "higher" : r.change < 0 ? "lower" : "same";
  const DirIcon = dir === "higher" ? ArrowUp : dir === "lower" ? ArrowDown : Minus;
  const testLabel = name(r.test_name);
  const questions = ["q1", "q2", "q3"].map((k) => t(`changeguard.${k}`));

  return (
    <section className="glass-panel space-y-6 p-6">
      {graphable.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {graphable.map((g) => (
            <button key={g.key} type="button" onClick={() => onPick(g.key)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium", g.key === r.key ? "border-brand/50 bg-teal-soft font-semibold text-ink" : "border-glass-border bg-card text-muted-foreground")}>
              {name(g.test_name)}
            </button>
          ))}
        </div>
      )}

      <div>
        <h3 className="font-display text-xl font-bold">{t("changeguard.graph_title", { test: testLabel })}</h3>
        <div className="mt-2"><StatusBadge status={r.status} /></div>
      </div>

      {canGraph ? (
        <div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 28, right: 32, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} padding={{ left: 40, right: 40 }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={["auto", "auto"]} width={56}
                  label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip formatter={(v: number) => `${v} ${unit}`} />
                <Line type="linear" dataKey="value" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 5, fill: "var(--brand)" }} isAnimationActive={false}>
                  <LabelList dataKey="value" position="top" formatter={(v: number) => `${v} ${unit}`} style={{ fontSize: 12, fontWeight: 700, fill: "var(--foreground)" }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">{t("changeguard.graph_note")}</p>
        </div>
      ) : (
        <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">{t("changeguard.no_graph")}</p>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field k={t("compare.previous_value")} v={fmt(r.previous?.value, r.previous?.unit)} />
        <Field k={t("compare.current_value")} v={fmt(r.current?.value, r.current?.unit)} />
        <Field k={t("changeguard.change")} v={r.change === null ? "—" : `${r.change > 0 ? "+" : ""}${r.change} ${unit}`} />
        <Field k={t("changeguard.pct_change")} v={r.percentage_change === null ? t("changeguard.not_calculated") : `${r.percentage_change > 0 ? "+" : ""}${r.percentage_change}%`} />
        <div className="glass-row px-4 py-3"><dt className="text-xs text-muted-foreground">{t("changeguard.range_prev")}</dt><dd><RefRange range={r.previous?.reference_range} label={false} /></dd></div>
        <div className="glass-row px-4 py-3"><dt className="text-xs text-muted-foreground">{t("changeguard.range_curr")}</dt><dd><RefRange range={r.current?.reference_range} label={false} /></dd></div>
      </dl>

      {r.status === "REFERENCE_RANGE_CHANGED" && (
        <p className="rounded-xl border border-warn-border bg-warn-soft px-4 py-3 text-sm text-warn">{t("changeguard.msg.REFERENCE_RANGE_CHANGED")}</p>
      )}

      {r.status === "COMPARABLE" && dir && (
        <div>
          <h4 className="font-display text-lg font-bold">{t("changeguard.whats_changed")}</h4>
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
            {r.previous?.value} <ArrowRight className="size-4" /> {r.current?.value} {unit}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"><DirIcon className="size-3" />{r.change === 0 ? "0" : Math.abs(r.change!)} {unit}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`changeguard.explain_${dir}`, { test: testLabel })}</p>
        </div>
      )}

      {r.status === "COMPARABLE" && (
        <div>
          <h4 className="font-display text-lg font-bold">{t("changeguard.questions_title")}</h4>
          <ul className="mt-2 space-y-2">
            {questions.map((q) => (
              <li key={q} className="glass-row flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>{q}</span>
                <Button size="sm" variant="ghost" disabled={adding}
                  onClick={() => onAddQuestion(`${r.test_name}: ${r.previous?.value} ${unit} → ${r.current?.value} ${unit}. ${q}`)}
                  className="h-7 rounded-full bg-brand/10 text-xs font-semibold text-brand hover:bg-brand/15">
                  {t("changeguard.add_question")}
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("changeguard.questions_note")}</p>
        </div>
      )}

      <div>
        <button type="button" onClick={() => setEvidence((v) => !v)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
          <FileSearch className="size-4" /> {t("changeguard.view_evidence")}
        </button>
        {evidence && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([[previous, r.previous, "compare.previous"], [current, r.current, "compare.current"]] as const).map(([meta, test, label]) => (
              <div key={label} className="glass-row space-y-1 px-4 py-3 text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">{t(label)}</p>
                <p>{meta.filename} · {meta.date}</p>
                <p>{t("changeguard.source_page")}</p>
                {test ? (
                  <>
                    <p>{test.original_test_name ?? test.test_name}: <span className="font-medium text-foreground">{fmt(test.value, test.unit)}</span></p>
                    <p><RefRange range={test.reference_range} /></p>
                    {test.confidence !== null && <p>{t("changeguard.confidence")}: {Math.round(test.confidence * 100)}%</p>}
                    <p>{test.verified ? t("changeguard.verified") : t("changeguard.not_verified")}</p>
                    {test.source_text && <p className="rounded bg-muted px-2 py-1 font-mono">{test.source_text}</p>}
                  </>
                ) : (
                  <p>{t("changeguard.not_in_report")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="glass-row px-4 py-3">
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
