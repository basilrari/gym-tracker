export default function ProgressLoading() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-mobile mx-auto w-full animate-pulse">
      <div className="h-8 w-36 bg-muted/30 rounded-xl mx-auto" />
      <div className="glass-panel p-4 h-64 rounded-3xl" />
      <div className="glass-panel p-4 h-32 rounded-3xl" />
      <div className="glass-panel p-4 h-56 rounded-3xl" />
      <div className="glass-panel p-4 h-56 rounded-3xl" />
    </div>
  );
}
