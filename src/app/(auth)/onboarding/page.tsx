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
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Complete your profile</h1>
        <p className="text-muted-foreground mt-1">Set up your gym tracker</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            placeholder="John"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Units</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={units === "kg" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUnits("kg")}
            >
              kg
            </Button>
            <Button
              type="button"
              variant={units === "lb" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setUnits("lb")}
            >
              lb
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="height">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            placeholder="175"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            min={100}
            max={250}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bodyweight">Bodyweight ({units})</Label>
          <Input
            id="bodyweight"
            type="number"
            step="0.1"
            placeholder="70"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            min={30}
            max={300}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="restTimer">Rest timer (seconds)</Label>
          <Input
            id="restTimer"
            type="number"
            placeholder="90"
            value={restTimer}
            onChange={(e) => setRestTimer(e.target.value)}
            min={30}
            max={300}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}
