export default function HistoryLoading() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-mobile mx-auto w-full animate-pulse">
      <div className="h-8 w-40 bg-muted/30 rounded-xl mx-auto" />
      <div className="flex gap-2 justify-center">
        <div className="h-10 w-24 bg-muted/30 rounded-full" />
        <div className="h-10 w-24 bg-muted/30 rounded-full" />
        <div className="h-10 w-20 bg-muted/30 rounded-full" />
      </div>
      <div className="glass-panel p-4 space-y-3">
        <div className="h-6 w-full bg-muted/20 rounded-lg" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted/20 rounded-lg" />
          ))}
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 glass-panel rounded-3xl" />
      ))}
    </div>
  );
}
