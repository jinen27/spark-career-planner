export function LoadingView({ label = "Charting your path…" }: { label?: string }) {
  return <div className="grid min-h-[60vh] place-items-center"><div className="text-center"><div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-border border-t-primary"/><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</p></div></div>;
}