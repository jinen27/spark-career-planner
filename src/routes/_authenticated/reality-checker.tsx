import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowLeft, ArrowRight, BarChart3, BookOpen, BriefcaseBusiness, Building2, Clock3, ExternalLink, Globe2, GraduationCap, Scale, Sparkles, TrendingUp, TriangleAlert, WalletCards } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { generateRealityReports, getRealityChecker } from "@/lib/reality.functions";

export const Route = createFileRoute("/_authenticated/reality-checker")({
  component: RealityCheckerPage,
  head: () => ({ meta: [{ title: "Career Reality Checker | Compass" }, { name: "description", content: "Compare salary, study, stress, future demand, and global opportunities across your career recommendations." }] }),
});

type Priority = "low" | "medium" | "high";
type StudyTolerance = "short" | "moderate" | "long";
type Environment = "flexible" | "office" | "remote" | "field" | "laboratory" | "hospital" | "travel" | "no_preference";
type Preferences = { salaryPriority: Priority; balancePriority: Priority; studyTolerance: StudyTolerance; stressTolerance: Priority; environment: Environment };
type StressLevel = "low" | "moderate" | "high" | "very_high";
type DemandLevel = "low" | "moderate" | "high" | "very_high";
type FiveYear = "declining" | "stable" | "growing" | "rapidly_growing";
type Reality = {
  careerTitle: string;
  salary: { currency: string; period: string; entry: string; mid: string; senior: string; note: string };
  education: { years: string; requirements: string[] };
  majors: string[];
  environments: string[];
  conditions: { hours: string; balance: string; flexibility: string };
  stress: { level: StressLevel; summary: string; factors: string[] };
  outlook: { rating: "limited" | "steady" | "strong"; summary: string; opportunities: string[] };
  demand: { current: DemandLevel; fiveYear: FiveYear; growthNote: string; drivers: string[] };
  regions: { name: string; reason: string }[];
  challenges: string[];
  progression: string[];
  fitScore: number;
  personalisedInsight: string;
  tradeoff: string;
};

const defaults: Preferences = { salaryPriority: "medium", balancePriority: "high", studyTolerance: "moderate", stressTolerance: "medium", environment: "no_preference" };
const priorityOptions = [{ value: "low", label: "Not essential" }, { value: "medium", label: "Important" }, { value: "high", label: "A priority" }] as const;
const stressToleranceOptions = [{ value: "low", label: "Prefer low stress" }, { value: "medium", label: "Can handle moderate" }, { value: "high", label: "Thrive under pressure" }] as const;
const studyOptions = [{ value: "short", label: "Up to 3 years" }, { value: "moderate", label: "3–5 years" }, { value: "long", label: "6+ years is okay" }] as const;
const environmentOptions = ["no_preference", "flexible", "office", "remote", "field", "laboratory", "hospital", "travel"] as const;
const sortOptions = [
  { value: "fit", label: "Best lifestyle fit" },
  { value: "stress", label: "Lowest stress" },
  { value: "demand", label: "Highest future demand" },
  { value: "study", label: "Shortest study path" },
] as const;
type SortKey = (typeof sortOptions)[number]["value"];

const stressMeta: Record<StressLevel, { label: string; tone: string; score: number }> = {
  low: { label: "Low", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", score: 25 },
  moderate: { label: "Moderate", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", score: 50 },
  high: { label: "High", tone: "bg-orange-500/15 text-orange-700 dark:text-orange-300", score: 75 },
  very_high: { label: "Very high", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300", score: 95 },
};
const demandMeta: Record<DemandLevel, { label: string; score: number }> = {
  low: { label: "Low", score: 25 }, moderate: { label: "Moderate", score: 50 }, high: { label: "High", score: 80 }, very_high: { label: "Very high", score: 100 },
};
const fiveYearMeta: Record<FiveYear, { label: string; arrow: string; tone: string }> = {
  declining: { label: "Declining", arrow: "↓", tone: "text-rose-600 dark:text-rose-300" },
  stable: { label: "Stable", arrow: "→", tone: "text-muted-foreground" },
  growing: { label: "Growing", arrow: "↗", tone: "text-emerald-600 dark:text-emerald-300" },
  rapidly_growing: { label: "Rapidly growing", arrow: "↑", tone: "text-emerald-600 dark:text-emerald-300" },
};
const pretty = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

function asReality(value: unknown): Reality | null {
  if (!value || typeof value !== "object" || !("careerTitle" in value)) return null;
  return value as Reality;
}
function asPreferences(value: unknown): Preferences {
  if (!value || typeof value !== "object") return defaults;
  return { ...defaults, ...(value as Partial<Preferences>) };
}

function RealityCheckerPage() {
  const load = useServerFn(getRealityChecker);
  const generate = useServerFn(generateRealityReports);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error: loadError } = useQuery({ queryKey: ["reality-checker"], queryFn: () => load() });
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("fit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reports = useMemo(() => {
    if (!data) return [];
    const list = data.reports.map((row) => ({ row, reality: asReality(row.report) })).filter((item): item is { row: typeof data.reports[number]; reality: Reality } => item.reality !== null);
    const sorted = [...list];
    if (sortBy === "fit") sorted.sort((a, b) => b.reality.fitScore - a.reality.fitScore);
    if (sortBy === "stress") sorted.sort((a, b) => stressMeta[a.reality.stress.level].score - stressMeta[b.reality.stress.level].score);
    if (sortBy === "demand") sorted.sort((a, b) => demandMeta[b.reality.demand.current].score - demandMeta[a.reality.demand.current].score);
    if (sortBy === "study") sorted.sort((a, b) => (parseInt(a.reality.education.years) || 99) - (parseInt(b.reality.education.years) || 99));
    return sorted;
  }, [data, sortBy]);

  if (isLoading) return <LoadingView />;
  if (loadError || !data) return <Message title="The Reality Checker could not load." action="Back to dashboard" onAction={() => navigate({ to: "/dashboard" })} />;
  const currentPreferences = preferences ?? asPreferences(data.profile?.preferences);
  const initials = (data.profile?.display_name ?? "Student").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  if (data.recommendations.length === 0) return <div className="min-h-screen"><AppNav initials={initials} /><Message title="Complete your assessment first." action="Go to assessment" onAction={() => navigate({ to: "/assessment" })} /></div>;

  const createReports = async () => {
    setBusy(true); setError("");
    try {
      const result = await generate({ data: { preferences: currentPreferences } });
      if (!result.ok) { setError(result.error); return; }
      await queryClient.invalidateQueries({ queryKey: ["reality-checker"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The reports could not be created."); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen"><AppNav initials={initials} /><main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
    <Button variant="ghost" className="mb-8 -ml-3 text-muted-foreground" onClick={() => navigate({ to: "/dashboard" })}><ArrowLeft /> Dashboard</Button>
    <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_340px] lg:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Career Reality Checker</p><h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Does the career fit the life you want?</h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Look beyond interest fit. Compare study, earnings, stress, future demand, and where in the world each path is thriving.</p></div><div className="border-l-2 border-primary/30 pl-5"><p className="text-sm font-bold">Location lens · {data.profile?.country}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Ranges are directional, not guarantees. Always verify current details before deciding.</p></div></header>

    <section className="mt-10 border-b border-border pb-10"><div className="grid gap-8 lg:grid-cols-[240px_1fr]"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Your lifestyle lens</p><h2 className="mt-2 text-2xl font-bold">What matters to you?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">These priorities shape the AI fit commentary—not the objective career facts.</p></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><Preference label="Salary potential" value={currentPreferences.salaryPriority} options={priorityOptions} onChange={(value) => setPreferences({ ...currentPreferences, salaryPriority: value })} /><Preference label="Work-life balance" value={currentPreferences.balancePriority} options={priorityOptions} onChange={(value) => setPreferences({ ...currentPreferences, balancePriority: value })} /><Preference label="Stress tolerance" value={currentPreferences.stressTolerance} options={stressToleranceOptions} onChange={(value) => setPreferences({ ...currentPreferences, stressTolerance: value })} /><Preference label="Study commitment" value={currentPreferences.studyTolerance} options={studyOptions} onChange={(value) => setPreferences({ ...currentPreferences, studyTolerance: value })} /><Preference label="Preferred environment" value={currentPreferences.environment} options={environmentOptions.map((value) => ({ value, label: pretty(value) }))} onChange={(value) => setPreferences({ ...currentPreferences, environment: value })} /></div></div><div className="mt-8 flex flex-col items-end gap-3"><Button variant="compass" size="lg" onClick={createReports} disabled={busy}>{busy ? "Analysing career realities…" : reports.length ? "Refresh my comparison" : "Build my reality check"}<Sparkles /></Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></section>

    {reports.length > 0 ? <>
      <div className="mt-10 flex flex-wrap items-center gap-2"><span className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Sort by</span>{sortOptions.map((option) => <button key={option.value} onClick={() => setSortBy(option.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${sortBy === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}>{option.label}</button>)}</div>
      <Comparison reports={reports} sources={data.sources} />
    </> : <section className="grid gap-5 py-16 sm:grid-cols-3">{data.recommendations.map((item) => <article key={item.id} className="border-t-2 border-primary/20 pt-5"><span className="font-mono text-[10px] text-primary">0{item.rank}</span><h2 className="mt-6 text-xl font-bold">{item.career_title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Ready to compare salary, study, stress, future demand, and global opportunities.</p></article>)}</section>}
  </main></div>;
}

function Preference<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <label className="text-xs font-bold uppercase tracking-wider">{label}<select className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium normal-case tracking-normal" value={value} onChange={(event) => onChange(event.target.value as T)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function Comparison({ reports, sources }: { reports: { row: { data_as_of: string }; reality: Reality }[]; sources: { title: string; publisher: string; url: string }[] }) {
  return <section className="mt-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Side-by-side comparison</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">Three paths. The realities behind each.</h2></div><div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Objective data</span><span className="flex items-center gap-2"><Sparkles className="size-3 text-primary" />AI insight</span></div></div>
    <div className="mt-8 overflow-x-auto pb-4"><div className="grid min-w-[930px] grid-cols-3 gap-4">{reports.map(({ row, reality }) => {
      const stress = stressMeta[reality.stress.level];
      const demand = demandMeta[reality.demand.current];
      const fiveYear = fiveYearMeta[reality.demand.fiveYear];
      return <article key={reality.careerTitle} className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Lifestyle alignment</p><h3 className="mt-2 text-2xl font-extrabold">{reality.careerTitle}</h3></div><span className="grid size-14 shrink-0 place-items-center rounded-full border-4 border-primary/20 font-mono text-sm font-bold text-primary">{reality.fitScore}</span></div><Progress value={reality.fitScore} className="mt-4 h-1.5 bg-secondary" />
          <div className="mt-4 grid grid-cols-2 gap-2"><span className={`rounded-md px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider ${stress.tone}`}>Stress · {stress.label}</span><span className="rounded-md bg-secondary px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider"><span className={fiveYear.tone}>{fiveYear.arrow}</span> {fiveYear.label}</span></div>
        </div>
        <div className="space-y-0 divide-y divide-border">
          <RealityBlock icon={WalletCards} title="Salary range"><div className="grid grid-cols-3 gap-2">{[["Entry", reality.salary.entry], ["Mid", reality.salary.mid], ["Senior", reality.salary.senior]].map(([label, value]) => <div key={label}><p className="font-mono text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>)}</div><p className="mt-3 text-[11px] leading-5 text-muted-foreground">{reality.salary.currency} · {reality.salary.period}. {reality.salary.note}</p></RealityBlock>
          <RealityBlock icon={GraduationCap} title={`Education · ${reality.education.years}`}><List items={reality.education.requirements} /><TagList items={reality.majors} /></RealityBlock>
          <RealityBlock icon={Building2} title="Work environment"><TagList items={reality.environments} /></RealityBlock>
          <RealityBlock icon={Clock3} title="Working conditions"><Fact label="Hours" value={reality.conditions.hours} /><Fact label="Balance" value={reality.conditions.balance} /><Fact label="Flexibility" value={reality.conditions.flexibility} /></RealityBlock>
          <RealityBlock icon={Activity} title={`Stress level · ${stress.label}`}>
            <Progress value={stress.score} className="mb-3 h-1.5 bg-secondary" />
            <p className="text-xs leading-5">{reality.stress.summary}</p>
            <p className="mt-3 font-mono text-[9px] uppercase text-muted-foreground">Key stressors</p>
            <TagList items={reality.stress.factors} />
          </RealityBlock>
          <RealityBlock icon={TrendingUp} title={`Demand · ${demand.label}`}>
            <div className="flex items-center justify-between gap-3"><Progress value={demand.score} className="h-1.5 flex-1 bg-secondary" /><span className={`font-mono text-[10px] font-bold uppercase ${fiveYear.tone}`}>{fiveYear.arrow} {fiveYear.label}</span></div>
            <p className="mt-3 text-xs leading-5">{reality.demand.growthNote}</p>
            <p className="mt-3 font-mono text-[9px] uppercase text-muted-foreground">Growth drivers</p>
            <TagList items={reality.demand.drivers} />
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">{reality.outlook.summary}</p>
          </RealityBlock>
          <RealityBlock icon={Globe2} title="Where it's in demand">
            <ul className="space-y-3">{reality.regions.map((region) => <li key={region.name} className="border-l-2 border-primary/30 pl-3"><p className="text-xs font-bold">{region.name}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{region.reason}</p></li>)}</ul>
          </RealityBlock>
          <RealityBlock icon={TriangleAlert} title="Challenges"><List items={reality.challenges} /></RealityBlock>
          <RealityBlock icon={BarChart3} title="Typical progression"><ol className="space-y-2">{reality.progression.map((step, index) => <li key={step} className="flex gap-2 text-xs leading-5"><span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol></RealityBlock>
        </div>
        <div className="bg-primary/5 p-6"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"><Sparkles className="size-3" />AI-personalised insight</p><p className="mt-3 text-sm leading-6">{reality.personalisedInsight}</p><div className="mt-4 border-l-2 border-primary/30 pl-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Key trade-off</p><p className="mt-1 text-xs leading-5">{reality.tradeoff}</p></div></div>
        <p className="px-6 py-4 font-mono text-[9px] text-muted-foreground">Data reviewed {new Date(row.data_as_of).toLocaleDateString()}</p>
      </article>;
    })}</div></div>
    <section className="mt-10 border-t border-border pt-8"><div className="grid gap-8 lg:grid-cols-[240px_1fr]"><div><BookOpen className="size-5 text-primary" /><h2 className="mt-3 text-lg font-bold">Data transparency</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Objective sections are AI-synthesised from these official labour-market portals. Check the source for the latest occupation-specific figures.</p></div><div className="grid gap-3 sm:grid-cols-2">{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"><div><p className="text-sm font-bold">{source.title}</p><p className="mt-1 text-xs text-muted-foreground">{source.publisher}</p></div><ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" /></a>)}</div></div></section>
    <div className="mt-10 rounded-xl border border-border bg-secondary/50 p-5"><div className="flex gap-3"><Scale className="mt-0.5 size-5 shrink-0 text-primary" /><div><p className="text-sm font-bold">Use this as a decision aid, not a forecast.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Pay, stress, and demand vary by employer, location, experience, economic conditions, and specialism. AI fit scores reflect your stated preferences—not aptitude, success, or guaranteed satisfaction.</p></div></div></div>
  </section>;
}

function RealityBlock({ icon: Icon, title, children }: { icon: typeof BriefcaseBusiness; title: string; children: ReactNode }) { return <section className="p-6"><h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Icon className="size-4 text-primary" />{title}</h4><div className="mt-4">{children}</div></section>; }
function List({ items }: { items: string[] }) { return <ul className="space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul>; }
function TagList({ items }: { items: string[] }) { return <div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold">{item}</span>)}</div>; }
function Fact({ label, value }: { label: string; value: string }) { return <div className="mb-3 last:mb-0"><p className="font-mono text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xs leading-5">{value}</p></div>; }
function Message({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <main className="grid min-h-[70vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold">{title}</h1><Button variant="compass" className="mt-6" onClick={onAction}>{action}<ArrowRight /></Button></div></main>; }
