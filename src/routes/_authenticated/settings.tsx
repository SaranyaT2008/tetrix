import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MediLens" },
      { name: "description", content: "Choose the language MediLens uses for explanations and questions." },
      { property: "og:title", content: "Settings — MediLens" },
      { property: "og:description", content: "Choose the language MediLens uses for explanations and questions." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { user } = Route.useRouteContext();

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">{t("settings.title")}</h1>

      <section className="glass-panel p-6">
        <h2 className="font-display text-lg font-bold">{t("settings.language")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("settings.language_body")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              className={
                language === option.code
                  ? "rounded-2xl bg-brand px-4 py-4 text-left font-semibold text-brand-foreground"
                  : "glass-row px-4 py-4 text-left font-medium transition-shadow hover:shadow-md"
              }
            >
              <span className="block text-lg">{option.label}</span>
              <span className="text-xs opacity-70">{option.code}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="font-display text-lg font-bold">{t("settings.profile")}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="glass-row flex items-center justify-between px-4 py-3">
            <dt className="text-muted-foreground">{t("auth.full_name")}</dt>
            <dd className="font-medium">{profile?.name || "—"}</dd>
          </div>
          <div className="glass-row flex items-center justify-between px-4 py-3">
            <dt className="text-muted-foreground">{t("auth.email")}</dt>
            <dd className="font-medium">{profile?.email ?? user.email}</dd>
          </div>
        </dl>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("app.disclaimer")}</p>
    </div>
  );
}
