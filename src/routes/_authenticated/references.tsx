import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language";
import { TEST_KNOWLEDGE, type Lang } from "@/lib/test-knowledge";

export const Route = createFileRoute("/_authenticated/references")({
  head: () => ({
    meta: [
      { title: "Medical references — MediLens" },
      { name: "description", content: "MedlinePlus-based educational information MediLens uses for supported lab tests." },
      { property: "og:title", content: "Medical references — MediLens" },
      { property: "og:description", content: "Educational test information from MedlinePlus, kept separate from your own results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReferencesPage,
});

function ReferencesPage() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const lang = language as Lang;
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEST_KNOWLEDGE;
    return TEST_KNOWLEDGE.filter(
      (k) => k.name.en.toLowerCase().includes(q) || k.name[lang].toLowerCase().includes(q) || k.aliases.some((a) => a.includes(q)),
    );
  }, [query, lang]);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold">{t("references.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("references.body")}</p>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("references.search")}
        className="h-11 max-w-md rounded-xl bg-card"
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("references.empty")}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((k) => (
            <article key={k.id} className="glass-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold">{k.name[lang]}</h2>
                  {lang !== "en" && <p className="text-xs text-muted-foreground">{k.name.en}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-teal-soft px-2.5 py-0.5 text-xs font-semibold text-teal">{k.category}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{k.what_is_this_test[lang]}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{k.why_is_it_tested[lang]}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-mist p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink">{t("references.below_factors")}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {k.below_range_common_factors[lang].map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl bg-mist p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink">{t("references.above_factors")}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {k.above_range_common_factors[lang].map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{t("report.sec_related")}:</span> {k.related_tests.join(", ")}
              </p>
              <a href={k.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                {t("references.open")}
                <ExternalLink className="size-3.5" />
              </a>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("report.factors_note")}</p>
    </div>
  );
}
