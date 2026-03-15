"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We couldn’t load this page. Try again or go back home.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button variant="outline" className="rounded-full flex-1" onClick={reset}>
            Try again
          </Button>
          <Link href="/" className="flex-1">
            <Button className="rounded-full w-full">Back to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
