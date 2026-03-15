import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="p-8 rounded-3xl bg-card shadow-neu-extruded text-center space-y-6 max-w-sm">
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <Link href="/">
          <Button className="rounded-full w-full">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
