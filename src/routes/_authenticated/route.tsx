import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
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
    <AppShell name={profile?.name ?? user.user_metadata?.["name"] ?? null} email={profile?.email ?? user.email ?? null}
      avatarUrl={(user.user_metadata?.["avatar_url"] as string | undefined) ?? (user.user_metadata?.["picture"] as string | undefined) ?? null}
    >
      <Outlet />
    </AppShell>
  );
}
