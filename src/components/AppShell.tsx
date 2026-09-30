import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { BookOpen, FileText, GitCompare, LayoutDashboard, LogOut, MessageCircleQuestion, Settings } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";

import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "nav.reports", icon: FileText },
  { to: "/compare", label: "nav.compare", icon: GitCompare },
  { to: "/ask", label: "nav.ask", icon: MessageCircleQuestion },
  { to: "/references", label: "nav.references", icon: BookOpen },
  { to: "/settings", label: "nav.settings", icon: Settings },
] as const;

function initials(name: string | null | undefined, email: string | null | undefined) {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "·";
  const parts = source.split(/[\s@._]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "·";
}

export function AppShell({
  children,
  name,
  email,
  avatarUrl,
}: {
  children: ReactNode;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-glass-border bg-glass/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6">
          <Link to="/dashboard" className="min-w-0">
            <BrandLogo />
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <span
              title={name || email || ""}
              className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-sm font-bold text-ink-foreground ring-2 ring-teal/40 ring-offset-2 ring-offset-background"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name || email || ""} className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initials(name, email)
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex">
              {t("nav.sign_out")}
            </Button>
          </div>
        </div>
        <nav className="mx-auto grid max-w-7xl grid-cols-3 gap-2 px-4 pb-3 sm:px-6 lg:flex lg:flex-wrap">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-glass-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-brand/40 hover:bg-teal-soft/60 hover:text-foreground sm:text-sm lg:px-4"
              activeProps={{
                className: "!border-brand/50 !bg-teal-soft !text-ink font-semibold ring-1 ring-brand/30",
                "aria-current": "page",
              }}
            >
              <item.icon className="size-4 shrink-0 text-brand" />
              <span className="truncate">{t(item.label)}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-glass-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm sm:hidden"
          >
            <LogOut className="size-4 shrink-0 text-brand" />
            <span className="truncate">{t("nav.sign_out")}</span>
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <p className="text-xs leading-relaxed text-muted-foreground">{t("app.disclaimer")}</p>
      </footer>
    </div>
  );
}
