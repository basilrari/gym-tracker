export default function WorkoutLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-muted-foreground">Loading workout...</p>
    </div>
  );
}
