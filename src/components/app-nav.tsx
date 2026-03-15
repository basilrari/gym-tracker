"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, BarChart3, Trophy, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/templates", label: "Templates", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function AppNav() {
  const pathname = usePathname();
  const isWorkoutPage =
    pathname.startsWith("/workout/") && !pathname.endsWith("/complete");

  if (isWorkoutPage) return null;

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto bg-card shadow-neu-extruded rounded-[2rem] p-2">
      <div className="flex justify-around items-center">
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
                  ? "text-primary shadow-neu-pressed bg-background/50"
                  : "text-muted-foreground hover:text-foreground active:scale-95 active:shadow-neu-pressed"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(255,100,0,0.5)]")} />
              <span className="text-[10px] font-medium leading-none mt-1">{item.label}</span>
            </Link>
          );
        })}
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
