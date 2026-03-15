export default function AppLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
