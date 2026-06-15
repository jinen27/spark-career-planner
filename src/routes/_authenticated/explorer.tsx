import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateCareerExperience, getExperienceExplorer, submitCareerExperience } from "@/lib/experience.functions";

export const Route = createFileRoute("/_authenticated/explorer")({
  component: ExplorerPage,
  head: () => ({ meta: [{ title: "Career Experience Explorer | Compass" }, { name: "description", content: "Try realistic career tasks and receive personalised AI feedback." }] }),
});

type Task = { title: string; scenario: string; instructions: string; prompts: string[]; timeEstimate: string };
type Feedback = { summary?: string; strengths?: string[]; growthAreas?: string[]; alignment?: string; alignmentReason?: string; relatedCareers?: string[]; nextStep?: string };

function ExplorerPage() {
  const load = useServerFn(getExperienceExplorer);
  const generate = useServerFn(generateCareerExperience);
  const submit = useServerFn(submitCareerExperience);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error: loadError } = useQuery({ queryKey: ["career-explorer"], queryFn: () => load() });
  const [recommendationId, setRecommendationId] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [response, setResponse] = useState("");
  const [enjoyment, setEnjoyment] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) return <LoadingView />;
  if (loadError || !data) return <ExplorerMessage title="The Explorer could not load." action="Back to dashboard" onAction={() => navigate({ to: "/dashboard" })} />;
  const initials = (data.profile?.display_name ?? "Student").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const selectedId = recommendationId || data.recommendations[0]?.id || "";
  const selected = data.recommendations.find((item) => item.id === selectedId);

  if (!selected) return <div className="min-h-screen"><AppNav initials={initials} /><ExplorerMessage title="Complete your assessment first." action="Go to assessment" onAction={() => navigate({ to: "/assessment" })} /></div>;

  const start = async () => {
    setBusy(true); setError(""); setFeedback(null); setResponse(""); setEnjoyment(0);
    try { const result = await generate({ data: { recommendationId: selectedId } }); if (!result.ok) { setError(result.error); return; } setTask(result.task); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The activity could not be prepared."); }
    finally { setBusy(false); }
  };

  const finish = async () => {
    if (!task || response.trim().length < 40 || enjoyment === 0) { setError("Write at least a few sentences and rate how the task felt before submitting."); return; }
    setBusy(true); setError("");
    try {
      const result = await submit({ data: { recommendationId: selectedId, task, response, enjoyment } });
      if (!result.ok) { setError(result.error); return; }
      setFeedback((result.experience.feedback ?? {}) as Feedback);
      await queryClient.invalidateQueries({ queryKey: ["career-explorer"] });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your response could not be reviewed."); }
    finally { setBusy(false); }
  };

  const reset = () => { setTask(null); setResponse(""); setEnjoyment(0); setFeedback(null); setError(""); };

  return <div className="min-h-screen"><AppNav initials={initials} /><main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
    <button type="button" onClick={() => navigate({ to: "/dashboard" })} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> Dashboard</button>
    <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_320px] lg:items-end"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Career Experience Explorer</p><h1 className="mt-3 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Don’t just learn about careers —<span className="text-primary/45 italic">&nbsp;experience them !</span></h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">Step into a realistic task, make the calls a professional would make, then reflect on whether the work feels like you.</p></div><div className="flex items-center gap-3 border-l-2 border-primary/30 pl-5"><Clock3 className="size-5 text-primary" /><div><p className="text-sm font-bold">10–15 minute simulation</p><p className="text-xs text-muted-foreground">No specialist knowledge required</p></div></div></header>

    {!task && <section className="mt-12"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Choose a direction</p><h2 className="mt-2 text-2xl font-bold">Which role do you want to try?</h2></div><span className="hidden font-mono text-xs text-muted-foreground sm:block">{data.experiences.length} completed</span></div><div className="grid gap-4 md:grid-cols-3">{data.recommendations.map((item) => { const active = item.id === selectedId; return <button type="button" key={item.id} onClick={() => setRecommendationId(item.id)} className={`min-h-52 rounded-xl border p-6 text-left transition-all ${active ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5" : "border-border bg-card hover:border-primary/20"}`}><div className="flex items-center justify-between"><span className="font-mono text-xs text-primary">0{item.rank}</span>{active && <CheckCircle2 className="size-5 text-primary" />}</div><h3 className="mt-8 text-xl font-bold">{item.career_title}</h3><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p></button>; })}</div><div className="mt-6 flex justify-end"><Button variant="compass" size="lg" onClick={start} disabled={busy}>{busy ? "Preparing your simulation…" : <>Experience {selected.career_title}<ArrowRight /></>}</Button></div></section>}

    {task && !feedback && <section className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"><article><div className="flex flex-wrap items-center gap-3"><span className="rounded border border-primary/15 bg-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">{selected.career_title}</span><span className="font-mono text-xs text-muted-foreground">{task.timeEstimate}</span></div><h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{task.title}</h2><div className="mt-8 border-l-2 border-primary/25 pl-6"><p className="text-xs font-bold uppercase tracking-widest text-primary">The situation</p><p className="mt-3 whitespace-pre-line text-base leading-7">{task.scenario}</p></div><div className="mt-10"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your brief</p><p className="mt-3 leading-7 text-muted-foreground">{task.instructions}</p><ol className="mt-5 space-y-3">{task.prompts.map((prompt, index) => <li key={prompt} className="flex gap-3 text-sm leading-6"><span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span><span>{prompt}</span></li>)}</ol></div></article><aside className="lg:sticky lg:top-24 lg:self-start"><div className="rounded-xl border border-border bg-card p-5"><label htmlFor="experience-response" className="text-xs font-bold uppercase tracking-widest">Your response</label><Textarea id="experience-response" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Explain what you would do and why…" className="mt-4 min-h-56 resize-y bg-background" maxLength={6000} /><p className="mt-2 text-right font-mono text-[10px] text-muted-foreground">{response.length} / 6000</p><fieldset className="mt-6"><legend className="text-xs font-bold uppercase tracking-widest">Could you see yourself doing this?</legend><div className="mt-3 grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((value) => <Button key={value} type="button" variant={enjoyment === value ? "compass" : "compassOutline"} size="sm" onClick={() => setEnjoyment(value)} aria-label={`Enjoyment ${value} out of 5`}>{value}</Button>)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Not for me</span><span>Very much</span></div></fieldset><Button variant="compass" className="mt-6 w-full" onClick={finish} disabled={busy}>{busy ? "Reviewing your approach…" : <><Sparkles /> Get my feedback</>}</Button><Button variant="ghost" className="mt-2 w-full" onClick={reset} disabled={busy}>Choose another career</Button>{error && <p role="alert" className="mt-4 text-sm leading-relaxed text-destructive">{error}</p>}</div></aside></section>}

    {feedback && <section className="mt-12"><div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"><article><p className="font-mono text-[11px] uppercase tracking-widest text-primary">Your reflection · {selected.career_title}</p><h2 className="mt-3 text-4xl font-extrabold tracking-tight">What your approach revealed.</h2><p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{feedback.summary}</p><div className="mt-10 grid gap-8 sm:grid-cols-2"><FeedbackList title="Strengths you demonstrated" items={feedback.strengths} /><FeedbackList title="Skills to stretch" items={feedback.growthAreas} /></div><div className="mt-10 border-l-2 border-primary/30 pl-6"><p className="text-xs font-bold uppercase tracking-widest text-primary">Career alignment · {feedback.alignment}</p><p className="mt-3 max-w-3xl leading-7">{feedback.alignmentReason}</p></div></article><aside className="space-y-6"><div className="rounded-xl border border-border bg-card p-6"><p className="text-xs font-bold uppercase tracking-widest">Explore next</p><div className="mt-4 flex flex-wrap gap-2">{feedback.relatedCareers?.map((career) => <span key={career} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{career}</span>)}</div><p className="mt-6 text-sm leading-6 text-muted-foreground">{feedback.nextStep}</p></div><Button variant="compass" className="w-full" onClick={reset}><RotateCcw /> Try another experience</Button><Button variant="compassOutline" className="w-full" onClick={() => navigate({ to: "/dashboard" })}>Return to dashboard</Button></aside></div></section>}

    {!task && data.experiences.length > 0 && <section className="mt-20 border-t border-border pt-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Experience log</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.experiences.slice(0, 6).map((experience) => { const savedFeedback = (experience.feedback ?? {}) as Feedback; return <article key={experience.id} className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><BriefcaseBusiness className="size-4 text-primary" /><span className="font-mono text-[10px] text-muted-foreground">{experience.enjoyment}/5 fit</span></div><p className="mt-5 text-xs font-semibold text-primary">{experience.career_title}</p><h3 className="mt-1 font-bold">{experience.task_title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{savedFeedback.summary}</p></article>; })}</div></section>}
    {error && !task && <p role="alert" className="mt-5 text-right text-sm text-destructive">{error}</p>}
  </main></div>;
}

function FeedbackList({ title, items = [] }: { title: string; items?: string[] }) { return <section><h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul></section>; }
function ExplorerMessage({ title, action, onAction }: { title: string; action: string; onAction: () => void }) { return <main className="grid min-h-[70vh] place-items-center px-6 text-center"><div><h1 className="text-3xl font-bold">{title}</h1><Button variant="compass" className="mt-6" onClick={onAction}>{action}</Button></div></main>; }