import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import { AppNav } from "@/components/app-nav";

import { PageTransition } from "@/components/page-transition";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="pb-32 pt-4">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
