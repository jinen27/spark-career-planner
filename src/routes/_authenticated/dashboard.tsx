import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, BookmarkCheck, BriefcaseBusiness, Check, Circle, Compass, Download, Feather, GitCompare, Loader2, Map, MessageSquare, Scale, Sparkles, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CareerCard, CareerCompareTable, useFavCareers, type CareerRecommendation } from "@/components/career-card";
import { getDashboard, togglePlanStep } from "@/lib/career.functions";
import { getUniversityMatcher } from "@/lib/university.functions";
import { dimensionNames, type Dimension } from "@/lib/assessment";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardPage, head: () => ({ meta: [{ title: "Your career dashboard | Compass" }, { name: "description", content: "Review your explainable career matches, university preparation guidance, and personal roadmap." }] }) });



function DashboardPage() {
  const fetchDashboard = useServerFn(getDashboard);
  const fetchUnis = useServerFn(getUniversityMatcher);
  const toggle = useServerFn(togglePlanStep);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });
  const { favs, toggle: toggleFav } = useFavCareers();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const recommendations = (data?.recommendations ?? []) as CareerRecommendation[];
  const compareItems = useMemo(() => recommendations.filter((r) => compareIds.includes(r.id)), [recommendations, compareIds]);
  const toggleCompare = (id: string) => setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]);

  const downloadReport = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const [{ generateCareerReport }, unis] = await Promise.all([
        import("@/lib/report"),
        fetchUnis().catch(() => null),
      ]);
      const matches = (unis?.latest?.matches ?? []) as Parameters<typeof generateCareerReport>[0]["universities"];
      generateCareerReport({
        studentName: data.profile?.display_name || "Student",
        educationalStage: data.profile?.educational_stage,
        country: data.profile?.country,
        scores: (data.assessment?.scores ?? {}) as Record<string, number>,
        recommendations: recommendations.map((r) => ({
          rank: r.rank,
          career_title: r.career_title,
          confidence: r.confidence,
          description: r.description,
          match_reasons: (r.match_reasons ?? []) as string[],
          university_majors: (r.university_majors ?? []) as string[],
          recommended_subjects: (r.recommended_subjects ?? []) as string[],
          technical_skills: (r.technical_skills ?? []) as string[],
          soft_skills: (r.soft_skills ?? []) as string[],
          preparation_experiences: (r.preparation_experiences ?? []) as string[],
          outlook: r.outlook ?? undefined,
        })),
        plan: (data.plan ?? []).map((p) => ({
          title: p.title, description: p.description, timeframe: p.timeframe, category: p.category, completed: p.completed,
        })),
        universities: matches ?? [],
      });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <LoadingView/>;
  if (error || !data) return <div className="grid min-h-screen place-items-center px-6 text-center"><div><h1 className="text-2xl font-bold">Your dashboard could not load.</h1><p className="mt-2 text-muted-foreground">Please refresh and try again.</p></div></div>;

  const name = data.profile?.display_name || "Student";
  const initials = name.split(" ").map((v) => v[0]).join("").slice(0,2).toUpperCase();
  const scores = (data.assessment?.scores ?? {}) as Record<string, number>;
  const topDimensions = Object.entries(scores).sort((a,b) => b[1] - a[1]).slice(0,3);
  const toggleStep = async (id: string, completed: boolean) => { await toggle({ data: { id, completed } }); await queryClient.invalidateQueries({ queryKey: ["dashboard"] }); };
  const favCount = recommendations.filter((r) => favs.includes(r.career_slug)).length;

  if (!data.profile?.display_name) return <div className="min-h-screen"><AppNav initials={initials}/><main className="mx-auto max-w-3xl px-6 py-20 text-center"><p className="font-mono text-xs uppercase tracking-widest text-primary">Start here</p><h1 className="mt-4 text-5xl font-extrabold tracking-tight">Build your student profile.</h1><p className="mx-auto mt-5 max-w-xl text-muted-foreground">Tell us your stage and subjects so every recommendation fits your real educational context.</p><Button variant="compass" className="mt-8" onClick={() => navigate({ to: "/profile" })}>Create my profile <ArrowRight/></Button></main></div>;
  if (!data.assessment || data.assessment.status !== "completed") return <div className="min-h-screen"><AppNav initials={initials}/><main className="mx-auto max-w-5xl px-5 py-16 sm:px-6"><div className="grid items-end gap-10 md:grid-cols-[1fr_300px]"><div><p className="font-mono text-[11px] uppercase tracking-widest text-primary">Welcome, {name}</p><h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Your path starts with <span className="text-primary/45 italic">self-knowledge.</span></h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Complete a short evidence-led assessment. Compass will look for patterns across your interests, values, preferred environments, and strengths.</p></div><div className="rounded-xl border border-border bg-card p-6"><div className="flex justify-between text-xs font-bold uppercase tracking-wider"><span>Assessment progress</span><span className="font-mono">{data.assessment?.progress ?? 0}%</span></div><Progress value={data.assessment?.progress ?? 0} className="my-4 h-3 bg-border"/><Button variant="compass" className="w-full" onClick={() => navigate({ to: "/assessment" })}>{data.assessment ? "Continue assessment" : "Start assessment"}<ArrowRight/></Button></div></div><section className="mt-20 grid gap-8 border-t border-border pt-10 sm:grid-cols-3">{[[BookOpen,"Evidence-led","Questions are inspired by the RIASEC interest framework."],[Sparkles,"Explainable AI","Every match shows why it fits your individual profile."],[BriefcaseBusiness,"Action focused","Turn possibilities into subjects, skills, and experiences."]].map(([Icon,title,text]) => <div key={String(title)}><Icon className="mb-4 size-5 text-primary"/><h2 className="font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{String(text)}</p></div>)}</section></main></div>;

  return <div className="min-h-screen"><AppNav initials={initials}/><main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
    <header className="grid gap-10 md:grid-cols-[1fr_320px] md:items-end">
      <div className="animate-enter"><p className="font-mono text-[11px] uppercase tracking-widest text-primary">Your Compass profile · {topDimensions.map(([key]) => dimensionNames[key as Dimension]).join(" · ")}</p><h1 className="mt-3 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Your path is coming <span className="block text-primary/40 italic">into focus.</span></h1></div>
      <div className="animate-enter rounded-xl border border-border bg-card p-5 [animation-delay:100ms]"><p className="text-xs font-bold uppercase tracking-wider">Interest pattern</p><div className="mt-4 space-y-3">{topDimensions.map(([key,value]) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span>{dimensionNames[key as Dimension]}</span><span className="font-mono">{value}%</span></div><Progress value={value} className="h-1.5 bg-border"/></div>)}</div></div>
    </header>

    <section className="mt-16 grid border-y border-border md:grid-cols-2"><div className="border-b border-border py-8 md:border-b-0 md:border-r md:pr-8"><div className="flex h-full flex-col gap-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Scale className="size-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Career Reality Checker</p><h2 className="mt-1 text-2xl font-bold">Does the career fit your life?</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Compare salary, study commitment, working conditions, market outlook, and lifestyle fit across all three recommendations.</p></div></div><Button variant="compass" className="mt-auto self-start" onClick={() => navigate({ to: "/reality-checker" })}>Compare realities <ArrowRight /></Button></div></div><div className="py-8 md:pl-8"><div className="flex h-full flex-col gap-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Compass className="size-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Career Experience Explorer</p><h2 className="mt-1 text-2xl font-bold">Can you see yourself doing the work?</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Try a realistic 10–15 minute task from one of your recommended careers, then get personalised feedback on your approach.</p></div></div><Button variant="compassOutline" className="mt-auto self-start" onClick={() => navigate({ to: "/explorer" })}>Try an experience <ArrowRight /></Button></div></div></section>

    <section className="mt-6 grid border-y border-border md:grid-cols-2"><div className="border-b border-border py-8 md:border-b-0 md:border-r md:pr-8"><div className="flex h-full flex-col gap-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Trophy className="size-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Career Assessment · Warm-up + deep dive</p><h2 className="mt-1 text-2xl font-bold">Retake with the new warm-up round.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The assessment now opens with a 60-second "would you rather" round before the full RIASEC questions — giving richer, more diverse recommendations.</p></div></div><Button variant="compass" className="mt-auto self-start" onClick={() => navigate({ to: "/assessment" })}>Retake assessment <ArrowRight /></Button></div></div><div className="py-8 md:pl-8"><div className="flex h-full flex-col gap-6"><div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Feather className="size-5" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Personal Statement Coach</p><h2 className="mt-1 text-2xl font-bold">Sharpen your university application.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Paste a UCAS or Common App draft and get scored feedback, a stronger opening, and specific line edits from an AI admissions tutor.</p></div></div><Button variant="compassOutline" className="mt-auto self-start" onClick={() => navigate({ to: "/statement-coach" })}>Coach my statement <ArrowRight /></Button></div></div></section>

    <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Interactive career cards</p>
            <h2 className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Ranked recommendations</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {favCount > 0 && <span className="flex items-center gap-1"><BookmarkCheck className="size-3.5 text-primary" />{favCount} saved</span>}
            <Button size="sm" variant="compassOutline" disabled={compareIds.length < 2} onClick={() => setShowCompare(true)}>
              <GitCompare className="size-4" /> Compare ({compareIds.length}/3)
            </Button>
          </div>
        </div>

        <div className="grid gap-6 animate-enter [animation-delay:200ms]">
          {recommendations.map((item) => (
            <CareerCard
              key={item.id}
              item={item}
              isFav={favs.includes(item.career_slug)}
              onToggleFav={() => toggleFav(item.career_slug)}
              compareSelected={compareIds.includes(item.id)}
              onToggleCompare={() => toggleCompare(item.id)}
            />
          ))}
        </div>
      </section>

      <aside className="animate-enter [animation-delay:400ms]"><h2 className="mb-8 border-b border-border pb-4 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Your trail map</h2><div className="relative pl-8"><div className="absolute bottom-2 left-[7px] top-2 w-px bg-border"><div className="trail-line absolute left-0 top-0 w-px bg-primary"/></div><div className="space-y-10">{data.plan.map((step,index) => <div key={step.id} className={`relative ${index > 1 && !step.completed ? "opacity-55" : ""}`}><button onClick={() => toggleStep(step.id,!step.completed)} className="absolute -left-[31px] top-1 grid size-4 place-items-center rounded-full bg-background ring-4 ring-background" aria-label={`${step.completed ? "Mark incomplete" : "Mark complete"}: ${step.title}`}>{step.completed ? <span className="grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3"/></span> : <Circle className="size-4 fill-background text-primary"/>}</button><p className="text-[10px] font-bold uppercase tracking-widest text-primary">{step.completed ? "Completed" : step.timeframe}</p><h3 className="mt-1 text-sm font-bold">{step.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p></div>)}</div><div className="mt-12 border-t border-border pt-8"><div className="rounded-lg border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-wider">Advisor note</p><p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">"A recommendation is an invitation to investigate—not a decision made for you."</p></div><button onClick={() => navigate({ to: "/feedback" })} className="mt-4 flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"><span><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary"><MessageSquare className="size-3"/> Feedback</span><p className="mt-1 text-xs text-muted-foreground">Have a question, bug, or idea? Send it to us.</p></span><ArrowRight className="size-4 text-muted-foreground"/></button></div></div></aside>
    </div>
  </main>

  <Dialog open={showCompare} onOpenChange={setShowCompare}>
    <DialogContent className="max-w-4xl">
      <DialogHeader><DialogTitle>Career comparison</DialogTitle></DialogHeader>
      <CareerCompareTable items={compareItems} />
    </DialogContent>
  </Dialog>

  <footer className="mt-20 border-t border-border bg-card py-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 text-xs text-muted-foreground sm:flex-row"><span className="font-black uppercase tracking-tighter text-foreground">Compass</span><span>Your results are private and visible only to you.</span></div></footer>
  </div>;
}