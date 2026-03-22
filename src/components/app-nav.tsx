"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, History, BarChart3, Scale, Trophy, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/templates", label: "Routines", icon: Dumbbell },
  { href: "/history", label: "History", icon: History },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/weight", label: "Weight", icon: Scale },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function AppNav() {
  const pathname = usePathname();
  const isWorkoutPage =
    pathname.startsWith("/workout/") && !pathname.endsWith("/complete");

  if (isWorkoutPage) return null;

  return (
    <nav className="sticky bottom-0 z-30 flex-shrink-0 w-full glass-nav border-t border-white/10 dark:border-white/5 px-2 py-3 pb-6 safe-area-pb">
      <div className="max-w-[430px] mx-auto flex justify-around items-center gap-0.5 flex-wrap">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[64px] rounded-full transition-all duration-250",
                isActive
                  ? "text-primary shadow-neu-pressed bg-background"
                  : "text-muted-foreground hover:text-foreground active:scale-95 active:shadow-neu-pressed"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(255,100,0,0.5)]")} />
              <span className="text-[10px] font-medium leading-none mt-1">{item.label}</span>
            </Link>
          );
        })}
        <ThemeToggle />
      </div>
    </nav>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="icon">
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
