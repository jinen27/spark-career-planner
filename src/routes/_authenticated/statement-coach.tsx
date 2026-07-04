import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Feather, Lightbulb, ListChecks, Quote, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { critiqueStatement } from "@/lib/statement-coach.functions";

export const Route = createFileRoute("/_authenticated/statement-coach")({
  component: StatementCoachPage,
  head: () => ({ meta: [
    { title: "Personal Statement Coach | Compass" },
    { name: "description", content: "Paste your draft and get AI-powered admissions-tutor feedback: hook, evidence, reflection, structure, style, and line edits." },
  ] }),
});

type System = "ucas" | "common_app" | "coalition" | "other";

function StatementCoachPage() {
  const runCritique = useServerFn(critiqueStatement);
  const [statement, setStatement] = useState("");
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const [system, setSystem] = useState<System>("ucas");

  const mutation = useMutation({
    mutationFn: (payload: { statement: string; course: string; university: string; applicationSystem: System }) =>
      runCritique({ data: payload }),
  });

  const chars = statement.length;
  const words = useMemo(() => statement.trim() ? statement.trim().split(/\s+/).length : 0, [statement]);
  const limit = system === "ucas" ? { unit: "chars", value: chars, max: 4000 } : { unit: "words", value: words, max: 650 };
  const overLimit = limit.value > limit.max;

  const submit = () => {
    if (!statement.trim() || !course.trim()) return;
    mutation.mutate({ statement, course, university, applicationSystem: system });
  };

  const result = mutation.data?.ok ? mutation.data.feedback : null;
  const errorMsg = mutation.data && !mutation.data.ok ? mutation.data.error : null;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Application booster</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Personal Statement Coach</h1>
          <p className="mt-3 text-muted-foreground">
            An AI admissions tutor reads your draft and returns honest, scored feedback — plus specific line edits and a stronger opening you can steal.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="course">Course applied for *</Label>
                <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Economics" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="uni">Target university (optional)</Label>
                <Input id="uni" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. LSE" className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Application system</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["ucas", "common_app", "coalition", "other"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSystem(s)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${system === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>
                    {s === "ucas" ? "UCAS" : s === "common_app" ? "Common App" : s === "coalition" ? "Coalition" : "Other"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="draft">Your draft *</Label>
                <span className={`font-mono text-[11px] ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
                  {limit.value.toLocaleString()} / {limit.max.toLocaleString()} {limit.unit}
                </span>
              </div>
              <Textarea id="draft" value={statement} onChange={(e) => setStatement(e.target.value)}
                rows={18} className="mt-1.5 font-serif text-[15px] leading-relaxed"
                placeholder="Paste your personal statement here…" />
            </div>
            <Button variant="compass" onClick={submit} disabled={mutation.isPending || !statement.trim() || !course.trim() || statement.length < 80} className="w-full">
              {mutation.isPending ? <><Sparkles className="animate-pulse" /> Reading your draft…</> : <><Wand2 /> Get admissions feedback</>}
            </Button>
            {errorMsg && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{errorMsg}</p>}
            <p className="text-xs text-muted-foreground">Your draft is not stored. Feedback is generated fresh each run.</p>
          </section>

          <section className="space-y-6">
            {!result && !mutation.isPending && (
              <div className="grid h-full min-h-[420px] place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
                <div>
                  <Feather className="mx-auto size-8 text-primary" />
                  <p className="mt-4 font-semibold">Feedback appears here.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Fill in the course and paste at least a paragraph to begin.</p>
                </div>
              </div>
            )}

            {mutation.isPending && (
              <div className="grid h-full min-h-[420px] place-items-center rounded-2xl border border-border bg-card p-8">
                <div className="text-center">
                  <div className="mx-auto size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  <p className="mt-4 font-semibold">Reading your draft like an admissions tutor…</p>
                </div>
              </div>
            )}

            {result && (
              <>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Overall</p>
                      <p className="mt-1 text-4xl font-black">{result.overallScore}<span className="text-lg text-muted-foreground">/100</span></p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Verdict</p>
                      <p className="mt-1 max-w-xs text-sm">{result.verdict}</p>
                    </div>
                  </div>
                  <Progress value={result.overallScore} className="mt-4 h-2" />
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2">
                    <Wand2 className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Stronger opening you can adapt</h3>
                  </div>
                  <p className="mt-3 font-serif text-base italic leading-relaxed">“{result.hookRewrite}”</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scored breakdown</h3>
                  {result.criteria.map((c) => (
                    <details key={c.name} className="group rounded-xl border border-border bg-card p-4 open:shadow-sm">
                      <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                        <span className="font-semibold">{c.name}</span>
                        <span className="flex items-center gap-3">
                          <span className="w-24"><Progress value={c.score * 10} className="h-1.5" /></span>
                          <span className="font-mono text-xs text-muted-foreground">{c.score}/10</span>
                        </span>
                      </summary>
                      <p className="mt-3 text-sm text-muted-foreground">{c.summary}</p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <List title="Strengths" icon={<CheckCircle2 className="size-3.5 text-emerald-600" />} items={c.strengths} />
                        <List title="Improve" icon={<Lightbulb className="size-3.5 text-amber-600" />} items={c.improvements} />
                      </div>
                    </details>
                  ))}
                </div>

                {result.lineEdits.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-center gap-2">
                      <Quote className="size-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest">Line edits</h3>
                    </div>
                    <ul className="mt-4 space-y-4">
                      {result.lineEdits.map((edit, i) => (
                        <li key={i} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                          <p className="text-muted-foreground line-through">{edit.original}</p>
                          <p className="mt-1 font-semibold text-foreground">→ {edit.suggestion}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{edit.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {result.missingEvidence.length > 0 && (
                    <Card icon={<AlertTriangle className="size-4 text-amber-600" />} title="Gaps a tutor would probe">
                      {result.missingEvidence.map((m) => <li key={m}>{m}</li>)}
                    </Card>
                  )}
                  {result.clichesFlagged.length > 0 && (
                    <Card icon={<AlertTriangle className="size-4 text-rose-500" />} title="Clichés flagged">
                      {result.clichesFlagged.map((m) => <li key={m}>“{m}”</li>)}
                    </Card>
                  )}
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-center gap-2">
                    <ListChecks className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Next steps before you submit</h3>
                  </div>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
                    {result.nextSteps.map((step) => <li key={step}>{step}</li>)}
                  </ol>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{icon} {title}</p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((i) => <li key={i} className="leading-snug">{i}</li>)}
      </ul>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{icon} {title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{children}</ul>
    </div>
  );
}
