import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FileUp, ShieldCheck, Languages, GitCompare, MessageCircleQuestion, ScanText, Quote } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { displayTestName } from "@/lib/test-knowledge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediLens — Understand your medical reports, in your language" },
      {
        name: "description",
        content:
          "Upload a lab report and read every value in plain English, Tamil or Hindi, with the exact report line behind each explanation. Not a diagnostic tool.",
      },
      { property: "og:title", content: "MediLens — Understand your medical reports, in your language" },
      {
        property: "og:description",
        content:
          "Verify extracted report values, read plain-language explanations with evidence, and prepare questions for your healthcare professional.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, i18n } = useTranslation();

  const steps = [
    { icon: FileUp, title: t("landing.step_upload"), body: t("landing.step_upload_body") },
    { icon: ShieldCheck, title: t("landing.step_verify"), body: t("landing.step_verify_body") },
    { icon: ScanText, title: t("landing.step_understand"), body: t("landing.step_understand_body") },
    { icon: MessageCircleQuestion, title: t("landing.step_discuss"), body: t("landing.step_discuss_body") },
  ];

  const features = [
    { icon: Quote, label: t("landing.f_evidence") },
    { icon: ScanText, label: t("landing.f_ocr") },
    { icon: ShieldCheck, label: t("landing.f_range") },
    { icon: Languages, label: t("landing.f_multi") },
    { icon: GitCompare, label: t("landing.f_compare") },
    { icon: MessageCircleQuestion, label: t("landing.f_questions") },
    { icon: ShieldCheck, label: t("landing.f_safety") },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-glass-border bg-glass backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/auth">{t("nav.sign_in")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="hero-navy -mx-4 mt-6 grid items-center gap-10 rounded-none px-6 py-14 sm:mx-0 sm:rounded-3xl sm:px-10 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal">{t("brand.tagline")}</p>
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              {t("landing.hero_line1")}
              <br />
              <span className="text-teal">{t("landing.hero_line2")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed opacity-80">
              {t("landing.hero_body")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-xl">
                <Link to="/auth" search={{ mode: "signup" }}>
                  {t("landing.cta_primary")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl border-ink-foreground/30 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
                <Link to="/auth" search={{ mode: "signup", demo: true }}>
                  {t("landing.cta_demo")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="glass-panel p-6 text-foreground">
            <p className="eyebrow">{t("report.structured_results")}</p>
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="glass-row flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold">{displayTestName("Hemoglobin", i18n.language)}</p>
                  <p className="text-xs text-muted-foreground">{t("report.reference_range")}: <strong className="text-foreground">12–16 g/dL</strong></p>
                </div>
                <div className="text-right">
                  <p className="font-bold">11.2 g/dL</p>
                  <span className="rounded-full bg-low-soft px-2 py-0.5 text-[11px] font-semibold text-low">
                    {t("status.below_reported_range")}
                  </span>
                </div>
              </div>
              <div className="glass-row flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-semibold">TSH</p>
                  <p className="text-xs text-muted-foreground">{t("report.reference_range")}: <strong className="text-foreground">0.4–4.0 µIU/mL</strong></p>
                </div>
                <div className="text-right">
                  <p className="font-bold">4.9 µIU/mL</p>
                  <span className="rounded-full bg-low-soft px-2 py-0.5 text-[11px] font-semibold text-low">
                    {t("status.above_reported_range")}
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-mist p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{t("report.report_evidence")}:</span>{" "}
                “Haemoglobin (Hb) .......... 11.2 g/dL Ref: 12–16 g/dL”
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-14">
          <h2 className="font-display text-2xl font-bold">{t("landing.how_title")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="glass-panel p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                    <step.icon className="size-4" />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
                </div>
                <p className="mt-3 font-display text-lg font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16 pt-14">
          <h2 className="font-display text-2xl font-bold">{t("landing.features_title")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.label} className="glass-row flex items-center gap-3 px-4 py-3.5">
                <feature.icon className="size-4 shrink-0 text-teal" />
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-16 pt-14">
          <div className="rounded-3xl bg-ink p-6 text-ink-foreground sm:p-8">
            <p className="text-sm leading-relaxed opacity-80">{t("app.disclaimer")}</p>
          </div>
        </section>
      </main>
    </div>
  );
}
