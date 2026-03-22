import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="glass-panel max-w-sm w-full p-8 text-center space-y-4">
        <h1 className="text-xl font-bold">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">
          Check your connection. Cached pages may still open from the app shell.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold"
        >
          Try home
        </Link>
      </div>
    </div>
  );
}
