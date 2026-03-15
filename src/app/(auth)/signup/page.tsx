"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm space-y-8 mt-[-10vh]">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full shadow-neu-extruded bg-card">
          <div className="w-14 h-14 rounded-full shadow-neu-inset flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Gym Tracker</h1>
        <p className="text-muted-foreground uppercase tracking-wider text-xs font-medium">Create your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-6 rounded-3xl shadow-neu-extruded bg-card">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-12"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Password</Label>
          <PasswordInput
            id="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="h-12"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive font-medium px-1">{error}</p>
        )}
        <div className="pt-2">
          <Button type="submit" className="w-full rounded-full h-14 text-base font-bold shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-[0.98] transition-all" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              "Sign up"
            )}
          </Button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
