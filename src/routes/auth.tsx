import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { BrandLogo } from "@/components/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";

type Search = {
  mode?: "signin" | "signup" | undefined;
  demo?: boolean | undefined;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    mode: search["mode"] === "signup" ? "signup" : search["mode"] === "signin" ? "signin" : undefined,
    demo: search["demo"] === true || search["demo"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in to MediLens" },
      { name: "description", content: "Sign in or create a MediLens account to read your lab reports in your language." },
      { property: "og:title", content: "Sign in to MediLens" },
      { property: "og:description", content: "Create a MediLens account and choose English, Tamil or Hindi." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  const [mode, setMode] = useState<"signin" | "signup">(search.mode === "signin" ? "signin" : "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const destination = search.demo ? "/dashboard" : "/dashboard";

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate({ to: destination, replace: true });
    })();
  }, [destination, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name, preferred_language: language },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: destination, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error(t("common.error"));
      return;
    }
    if (result.redirected) return;
    navigate({ to: destination, replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-glass-border bg-glass backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="min-w-0">
            <BrandLogo />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="glass-panel p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signup" ? t("auth.sign_up_title") : t("auth.sign_in_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("app.tagline")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("auth.full_name")}</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="language">{t("auth.preferred_language")}</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => setLanguage(option.code as LanguageCode)}
                      className={
                        language === option.code
                          ? "rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
                          : "rounded-xl border border-border bg-glass px-4 py-2 text-sm font-medium"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full rounded-xl bg-ink text-ink-foreground hover:bg-ink/90">
              {mode === "signup" ? t("auth.sign_up") : t("auth.sign_in")}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={handleGoogle} disabled={busy} className="w-full rounded-xl bg-glass">
            {t("auth.google")}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-5 w-full text-center text-sm font-medium text-brand"
          >
            {mode === "signup" ? t("auth.have_account") : t("auth.no_account")}
          </button>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t("app.disclaimer")}</p>
      </div>
    </div>
  );
}
