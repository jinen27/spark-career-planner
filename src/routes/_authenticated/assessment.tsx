import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { analyseAssessment, getDashboard, saveAssessment } from "@/lib/career.functions";
import { assessmentQuestions } from "@/lib/assessment";
import { QUIZ_CARDS, scoreAnswers, FAMILY_META, type Family } from "@/lib/career-quiz-data";
import { saveQuizResult } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/assessment")({
  component: AssessmentPage,
  head: () => ({ meta: [
    { title: "Career assessment | Compass" },
    { name: "description", content: "A quick warm-up round plus the evidence-led RIASEC assessment — combined into one flow." },
  ] }),
});

type Phase = "intro" | "warmup" | "riasec" | "warmup-summary";

function AssessmentPage() {
  const fetchDashboard = useServerFn(getDashboard);
  const save = useServerFn(saveAssessment);
  const analyse = useServerFn(analyseAssessment);
  const saveQuiz = useServerFn(saveQuizResult);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDashboard() });

  const quizSaveMutation = useMutation({
    mutationFn: (payload: { topFamily: string; scores: { family: string; score: number }[]; answers: string[][] }) => saveQuiz({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quiz-history"] }),
  });

  const [phase, setPhase] = useState<Phase>("intro");

  // Warm-up quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[][]>([]);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);

  // RIASEC state
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [sessionId, setSessionId] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (data && !initialized) {
      setInitialized(true);
      if (data.assessment?.status === "in_progress") {
        setSessionId(data.assessment.id);
        const saved = (data.assessment.responses ?? {}) as Record<string, number>;
        setResponses(saved);
        setIndex(Math.min(Object.keys(saved).length, assessmentQuestions.length - 1));
        // resume mid-flow: skip warm-up
        if (Object.keys(saved).length > 0) setPhase("riasec");
      }
    }
  }, [data, initialized]);

  const quizResults = useMemo(
    () => (quizAnswers.length === QUIZ_CARDS.length ? scoreAnswers(quizAnswers) : []),
    [quizAnswers],
  );
  const topFamily = quizResults[0]?.family;

  if (isLoading) return <LoadingView />;
  if (!data?.profile?.display_name)
    return (
      <div>
        <AppNav />
        <main className="mx-auto max-w-2xl px-6 py-20 text-center">
          <h1 className="text-3xl font-bold">First, tell us a little about you.</h1>
          <Button variant="compass" className="mt-6" onClick={() => navigate({ to: "/profile" })}>Complete profile</Button>
        </main>
      </div>
    );

  const initials = data.profile.display_name.split(" ").map((v) => v[0]).join("").slice(0, 2).toUpperCase();

  // -------- WARM-UP --------
  const choose = (side: "A" | "B") => {
    if (picked) return;
    const card = QUIZ_CARDS[quizStep];
    const tags = side === "A" ? card.optionA.tags : card.optionB.tags;
    setPicked(side);
    setTimeout(() => {
      const nextAnswers = [...quizAnswers, tags];
      setQuizAnswers(nextAnswers);
      setPicked(null);
      if (quizStep + 1 >= QUIZ_CARDS.length) {
        const scored = scoreAnswers(nextAnswers);
        // fire-and-forget save
        quizSaveMutation.mutate({
          topFamily: scored[0].family,
          scores: scored.map((r) => ({ family: r.family, score: r.score })),
          answers: nextAnswers,
        });
        setPhase("warmup-summary");
      } else {
        setQuizStep(quizStep + 1);
      }
    }, 200);
  };

  // -------- RIASEC --------
  const question = assessmentQuestions[index];
  const answered = responses[question?.id ?? ""];
  const progress = Math.round((Object.keys(responses).length / assessmentQuestions.length) * 100);
  const persist = async (nextResponses = responses) => {
    const result = await save({ data: { id: sessionId, responses: nextResponses, progress: Math.round((Object.keys(nextResponses).length / assessmentQuestions.length) * 100) } });
    setSessionId(result.id);
    return result.id;
  };
  const select = async (value: number) => {
    const next = { ...responses, [question.id]: value };
    setResponses(next);
    setError("");
    await persist(next);
  };
  const finish = async () => {
    if (Object.keys(responses).length !== assessmentQuestions.length) {
      setError("Please answer every question before finishing.");
      return;
    }
    setBusy(true); setError("");
    try {
      const id = await persist();
      const result = await analyse({
        data: {
          assessmentId: id,
          quizSignal: quizResults.length ? quizResults.slice(0, 3).map((r) => r.family) : undefined,
        },
      });
      if (!result.ok) { setError(result.error); return; }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis could not be completed.");
    } finally { setBusy(false); }
  };

  // -------- INTRO --------
  if (phase === "intro") {
    return (
      <div className="min-h-screen">
        <AppNav initials={initials} />
        <main className="mx-auto max-w-3xl px-5 py-16 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Career Assessment · Two rounds</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">A quick warm-up, then the deep dive.</h1>
          <p className="mt-5 max-w-2xl text-muted-foreground">
            Round 1 is a 60-second "would you rather" mini-game that surfaces your instincts. Round 2 is the evidence-led RIASEC assessment. Both feed the same AI analysis so your recommendations are richer and more diverse.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Round 1 · Warm-up</p>
              <h2 className="mt-2 font-bold">Quick "would you rather"</h2>
              <p className="mt-1 text-sm text-muted-foreground">12 fast picks. ~60 seconds.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Round 2 · Deep dive</p>
              <h2 className="mt-2 font-bold">RIASEC interest scan</h2>
              <p className="mt-1 text-sm text-muted-foreground">18 evidence-based statements.</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="compass" onClick={() => setPhase("warmup")}><Sparkles /> Start with the warm-up</Button>
            <Button variant="outline" onClick={() => setPhase("riasec")}>Skip to deep dive</Button>
          </div>
        </main>
      </div>
    );
  }

  // -------- WARM-UP UI --------
  if (phase === "warmup") {
    const card = QUIZ_CARDS[quizStep];
    return (
      <div className="min-h-screen">
        <AppNav initials={initials} />
        <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
          <header className="mb-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Round 1 · Warm-up · ~60 sec</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tap what feels most like you.</h1>
          </header>
          <div className="mb-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Question {quizStep + 1} of {QUIZ_CARDS.length}</span>
            <span className="font-mono">{Math.round((quizStep / QUIZ_CARDS.length) * 100)}%</span>
          </div>
          <Progress value={(quizStep / QUIZ_CARDS.length) * 100} className="mb-8 h-1.5" />
          <div key={card.id} className="animate-enter rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-bold sm:text-2xl">{card.prompt}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(["A", "B"] as const).map((side) => {
                const opt = side === "A" ? card.optionA : card.optionB;
                const isPicked = picked === side;
                return (
                  <button
                    key={side}
                    onClick={() => choose(side)}
                    className={`group rounded-xl border p-5 text-left transition-all ${isPicked ? "scale-[0.98] border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"}`}
                  >
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${isPicked ? "text-primary-foreground/80" : "text-primary"}`}>Option {side}</span>
                    <p className="mt-3 text-base font-semibold leading-snug">{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------- WARM-UP SUMMARY --------
  if (phase === "warmup-summary" && topFamily) {
    const meta = FAMILY_META[topFamily as Family];
    return (
      <div className="min-h-screen">
        <AppNav initials={initials} />
        <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Warm-up complete</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Your instincts lean toward {meta.name}.</h1>
          <p className="mt-4 text-muted-foreground">{meta.blurb}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {meta.careers.map((c) => (
              <span key={c} className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold">{c}</span>
            ))}
          </div>
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="text-sm">Now let's ground that with the evidence-led round. It takes about 5 minutes and shapes your final AI recommendations.</p>
          </div>
          <div className="mt-6">
            <Button variant="compass" onClick={() => setPhase("riasec")}>Continue to Round 2 <ChevronRight /></Button>
          </div>
        </main>
      </div>
    );
  }

  // -------- RIASEC UI --------
  return (
    <div className="min-h-screen">
      <AppNav initials={initials} />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[1fr_190px] md:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Round 2 · {question.context}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Discover how you naturally think and work.</h1>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider"><span>Progress</span><span className="font-mono">{progress}%</span></div>
            <Progress value={progress} className="h-3 bg-border" />
          </div>
        </div>
        <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")} / {assessmentQuestions.length}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">How much is this like you?</span>
          </div>
          <h2 className="mt-8 max-w-2xl text-2xl font-bold leading-snug sm:text-3xl">{question.prompt}</h2>
          <div className="mt-10 grid gap-2 sm:grid-cols-5">
            {[1, 2, 3, 4, 5].map((value) => (
              <Button key={value} type="button" variant={answered === value ? "compass" : "compassOutline"} className="h-auto min-h-20 flex-col whitespace-normal px-2 py-3" onClick={() => select(value)}>
                <span className="font-mono text-lg">{value}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide">{value === 1 ? "Not like me" : value === 5 ? "Very like me" : value === 3 ? "Unsure" : ""}</span>
              </Button>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-6">
            <Button variant="ghost" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}><ChevronLeft /> Previous</Button>
            {index < assessmentQuestions.length - 1
              ? <Button variant="compass" onClick={() => setIndex(index + 1)} disabled={!answered}>Next <ChevronRight /></Button>
              : <Button variant="compass" onClick={finish} disabled={!answered || busy}>{busy ? "Analysing your profile…" : "Generate my career path"}</Button>}
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        </section>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">There are no right answers. Your results suggest areas to explore — not limits on what you can achieve.</p>
      </main>
    </div>
  );
}
