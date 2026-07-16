import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight, Award, BookOpen, Briefcase, Check, GraduationCap, MapPin, Rocket, Sparkles, Target,
} from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDashboard } from "@/lib/career.functions";
import { getUniversityMatcher } from "@/lib/university.functions";

export const Route = createFileRoute("/_authenticated/roadmap")({
  component: RoadmapPage,
  head: () => ({
    meta: [
      { title: "Your career roadmap | Compass" },
      { name: "description", content: "A visual milestone-by-milestone journey from where you are today to your target career." },
    ],
  }),
});

const STAGE_LABEL: Record<string, string> = {
  lower_secondary: "Lower secondary",
  secondary: "Secondary school",
  sixth_form: "Sixth form / A-levels",
  other: "Current stage",
};

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  academic: { label: "Academic", color: "bg-blue-500/10 text-blue-700 border-blue-500/30", icon: BookOpen },
  skill: { label: "Skill building", color: "bg-purple-500/10 text-purple-700 border-purple-500/30", icon: Sparkles },
  experience: { label: "Experience", color: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: Target },
  application: { label: "Applications", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: Award },
};

function RoadmapPage() {
  const fetchDash = useServerFn(getDashboard);
  const fetchUnis = useServerFn(getUniversityMatcher);
  const navigate = useNavigate();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const unis = useQuery({ queryKey: ["university-matcher"], queryFn: () => fetchUnis() });

  if (dash.isLoading || unis.isLoading) return <LoadingView />;
  const data = dash.data;
  const name = data?.profile?.display_name || "Student";
  const initials = name.split(" ").map((v) => v[0]).join("").slice(0, 2).toUpperCase();

  const stage = data?.profile?.educational_stage
    ? STAGE_LABEL[data.profile.educational_stage] ?? "Current stage"
    : "Current stage";
  const recs = data?.recommendations ?? [];
  const top = recs[0];
  const plan = data?.plan ?? [];
  const completed = plan.filter((p) => p.completed).length;
  const total = plan.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  const matches = (unis.data?.latest?.matches as { university: string; matchLevel: string }[] | null) ?? [];
  const strongUnis = matches.filter((m) => m.matchLevel === "strong").slice(0, 3);

  if (!top) {
    return (
      <div className="min-h-screen">
        <AppNav initials={initials} />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-extrabold">Complete your assessment first</h1>
          <p className="mt-3 text-muted-foreground">Your roadmap is built from your top career match. Finish the assessment to unlock it.</p>
          <Button variant="compass" className="mt-6" onClick={() => navigate({ to: "/assessment" })}>Go to assessment <ArrowRight /></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppNav initials={initials} />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
        <header className="animate-enter">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Your Roadmap</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            From <span className="text-primary/45 italic">{stage.toLowerCase()}</span> to <span className="text-primary">{top.career_title}</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            A visual journey with concrete milestones. Tick them off on your dashboard as you go.
          </p>
        </header>

        {/* Journey strip */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card className="border-primary/20 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <MapPin className="size-3.5" /> Today
            </div>
            <h3 className="mt-2 text-xl font-bold">{stage}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{data?.profile?.country ?? "Your journey starts here."}</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <GraduationCap className="size-3.5" /> University stage
            </div>
            <h3 className="mt-2 text-xl font-bold">
              {(Array.isArray(top.university_majors) ? (top.university_majors[0] as string | undefined) : undefined) ?? "Degree pathway"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {strongUnis.length > 0
                ? `Strong matches: ${strongUnis.map((u) => u.university).join(", ")}`
                : "Generate university matches to see strong-fit schools here."}
            </p>
          </Card>
          <Card className="border-primary/40 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Rocket className="size-3.5" /> Target career
            </div>
            <h3 className="mt-2 text-xl font-bold">{top.career_title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{top.confidence}% fit · {top.outlook?.slice(0, 80) ?? ""}{top.outlook && top.outlook.length > 80 ? "…" : ""}</p>
          </Card>
        </div>

        {/* Progress bar */}
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Milestone progress</span>
            <span className="font-mono">{completed} / {total} complete</span>
          </div>
          <Progress value={pct} className="mt-3 h-3" />
        </Card>

        {/* Vertical timeline */}
        <section className="mt-12">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Milestones on your path</h2>
            <Button variant="compassOutline" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
              Tick off milestones <ArrowRight />
            </Button>
          </div>

          <ol className="relative mt-8 space-y-8 pl-8">
            <div className="absolute bottom-4 left-3 top-4 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border" />
            {plan.map((step, i) => {
              const meta = CATEGORY_META[step.category] ?? CATEGORY_META.academic;
              const Icon = meta.icon;
              return (
                <li key={step.id} className="relative animate-enter" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className={`absolute -left-[29px] grid size-7 place-items-center rounded-full ring-4 ring-background ${step.completed ? "bg-primary text-primary-foreground" : "bg-background border-2 border-primary text-primary"}`}>
                    {step.completed ? <Check className="size-3.5" /> : <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  <Card className={`p-5 transition ${step.completed ? "opacity-70" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={meta.color}>
                        <Icon className="mr-1 size-3" /> {meta.label}
                      </Badge>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{step.timeframe}</span>
                    </div>
                    <h3 className={`mt-2 text-lg font-bold ${step.completed ? "line-through decoration-primary/40" : ""}`}>{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </Card>
                </li>
              );
            })}

            {/* Terminus */}
            <li className="relative">
              <div className="absolute -left-[29px] grid size-7 place-items-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
                <Briefcase className="size-3.5" />
              </div>
              <Card className="border-primary/40 bg-primary/5 p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Destination</p>
                <h3 className="mt-1 text-lg font-bold">You as a {top.career_title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{top.description}</p>
              </Card>
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
