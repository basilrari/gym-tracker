"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [units, setUnits] = useState<"kg" | "lb">("kg");
  const [height, setHeight] = useState("");
  const [bodyweight, setBodyweight] = useState("");
  const [restTimer, setRestTimer] = useState("90");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        display_name: displayName.trim() || null,
        units,
        height_cm: height ? parseFloat(height) : null,
        bodyweight_kg: bodyweight ? parseFloat(bodyweight) : null,
        rest_timer_seconds: restTimer ? parseInt(restTimer, 10) : 90,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save profile");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="w-full max-w-mobile mx-auto px-2 space-y-8 mt-4 mb-12">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Complete Profile</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Set up your gym tracker</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-3xl glass-panel">
        <div className="space-y-3">
          <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Username *</Label>
          <Input
            id="username"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="h-12"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="displayName" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Display name</Label>
          <Input
            id="displayName"
            placeholder="John"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-12"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Units</Label>
          <div className="flex rounded-full glass-panel p-1 border-white/10">
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all duration-250 ${
                units === "kg" ? "bg-primary text-primary-foreground shadow-neu-extruded" : "text-muted-foreground active:scale-95"
              }`}
              onClick={() => setUnits("kg")}
            >
              kg
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-4 rounded-full text-sm font-bold transition-all duration-250 ${
                units === "lb" ? "bg-primary text-primary-foreground shadow-neu-extruded" : "text-muted-foreground active:scale-95"
              }`}
              onClick={() => setUnits("lb")}
            >
              lb
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <Label htmlFor="height" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            placeholder="175"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min={100}
            max={250}
            className="h-12"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="bodyweight" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Bodyweight ({units})</Label>
          <Input
            id="bodyweight"
            type="number"
            step="0.1"
            placeholder="70"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            min={30}
            max={300}
            className="h-12"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="restTimer" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Rest timer (seconds)</Label>
          <Input
            id="restTimer"
            type="number"
            placeholder="90"
            value={restTimer}
            onChange={(e) => setRestTimer(e.target.value)}
            min={30}
            max={300}
            className="h-12"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium px-1">{error}</p>
        )}
        <div className="pt-4">
          <Button type="submit" className="w-full rounded-full h-14 text-base font-bold shadow-neu-extruded active:shadow-neu-pressed transition-all" disabled={loading}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
