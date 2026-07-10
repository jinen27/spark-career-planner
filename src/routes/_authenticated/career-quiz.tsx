import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, History, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUIZ_CARDS, FAMILY_META, scoreAnswers, type Family } from "@/lib/career-quiz-data";
import { listQuizResults, saveQuizResult } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/career-quiz")({
  component: CareerQuizPage,
  head: () => ({ meta: [
    { title: "Career Match Quiz | Compass" },
    { name: "description", content: "A 60-second 'would you rather' mini-game that reveals which career families fit your instincts." },
  ] }),
});

function CareerQuizPage() {
  const navigate = useNavigate();
  const saveFn = useServerFn(saveQuizResult);
  const listFn = useServerFn(listQuizResults);
  const qc = useQueryClient();
  const history = useQuery({ queryKey: ["quiz-history"], queryFn: () => listFn() });
  const saveMutation = useMutation({
    mutationFn: (payload: { topFamily: string; scores: { family: string; score: number }[]; answers: string[][] }) => saveFn({ data: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quiz-history"] }),
  });

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [picked, setPicked] = useState<"A" | "B" | null>(null);
  const card = QUIZ_CARDS[step];
  const total = QUIZ_CARDS.length;
  const done = step >= total;

  const results = useMemo(() => (done ? scoreAnswers(answers) : []), [done, answers]);
  const top3 = results.slice(0, 3);
  const maxScore = top3[0]?.score || 1;

  useEffect(() => {
    if (done && results.length && !saveMutation.isPending && saveMutation.data === undefined && !saveMutation.isError) {
      saveMutation.mutate({
        topFamily: results[0].family,
        scores: results.map((r) => ({ family: r.family, score: r.score })),
        answers,
      });
    }
  }, [done, results, answers, saveMutation]);

  const choose = (side: "A" | "B") => {
    if (picked) return;
    setPicked(side);
    const tags = side === "A" ? card.optionA.tags : card.optionB.tags;
    setTimeout(() => {
      setAnswers((prev) => [...prev, tags]);
      setPicked(null);
      setStep((s) => s + 1);
    }, 220);
  };

  const reset = () => { setStep(0); setAnswers([]); setPicked(null); saveMutation.reset(); };

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Mini-game · 60 seconds</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Career Match Quiz</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Tap the option that feels most like you. There are no right answers — just patterns.</p>
        </header>

        {!done && (
          <>
            <div className="mb-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Question {step + 1} of {total}</span>
              <span className="font-mono">{Math.round(((step) / total) * 100)}%</span>
            </div>
            <Progress value={(step / total) * 100} className="mb-8 h-1.5" />

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
              <p className="mt-6 text-xs text-muted-foreground">Trust your gut. You can retake it anytime.</p>
            </div>
          </>
        )}

        {done && (
          <div className="animate-enter space-y-6">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><Trophy className="size-5" /></span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Your top match</p>
                  <h2 className="text-2xl font-bold">{FAMILY_META[top3[0].family].emoji} {FAMILY_META[top3[0].family].name}</h2>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground">{FAMILY_META[top3[0].family].blurb}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {FAMILY_META[top3[0].family].careers.map((c) => (
                  <span key={c} className="rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-semibold">{c}</span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your career family ranking</h3>
              {top3.map(({ family, score }) => (
                <div key={family} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>{FAMILY_META[family].emoji} {FAMILY_META[family].name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{Math.round((score / maxScore) * 100)}%</span>
                  </div>
                  <Progress value={(score / maxScore) * 100} className="mt-2 h-1.5" />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="compass" onClick={() => navigate({ to: "/assessment" })}>
                <Sparkles /> Take the full assessment <ArrowRight />
              </Button>
              <Button variant="outline" onClick={reset}><RotateCcw /> Play again</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              This mini-game is a starting point. For explainable, evidence-led recommendations, complete the full assessment.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
