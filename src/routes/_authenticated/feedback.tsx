import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listMyFeedback, submitFeedback } from "@/lib/feedback.functions";

export const Route = createFileRoute("/_authenticated/feedback")({
  component: FeedbackPage,
  head: () => ({ meta: [
    { title: "Feedback & Questions | Compass" },
    { name: "description", content: "Send feedback, ask a question, or report an issue — the Compass team reads every message." },
  ] }),
});

type Category = "general" | "bug" | "question" | "feature" | "compliment";
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "General" },
  { value: "question", label: "Question" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature idea" },
  { value: "compliment", label: "Compliment" },
];

function FeedbackPage() {
  const send = useServerFn(submitFeedback);
  const listFn = useServerFn(listMyFeedback);
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["my-feedback"], queryFn: () => listFn() });

  const [category, setCategory] = useState<Category>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => send({ data: { category, subject, message, replyEmail } }),
    onSuccess: () => {
      setSubject(""); setMessage(""); setReplyEmail(""); setCategory("general");
      qc.invalidateQueries({ queryKey: ["my-feedback"] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">We're listening</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Send feedback or a question</h1>
          <p className="mt-3 text-muted-foreground">
            Found a bug, have an idea, or need help with something? Drop a note — every message reaches the Compass team.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <form
            onSubmit={(e) => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }}
            className="space-y-4 rounded-2xl border border-border bg-card p-6"
          >
            <div>
              <Label>Category</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${category === c.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary…" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's on your mind…" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="email">Reply-to email (optional)</Label>
              <Input id="email" type="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">Only needed if you'd like a direct response.</p>
            </div>
            <Button type="submit" variant="compass" disabled={mutation.isPending || !subject.trim() || message.trim().length < 10} className="w-full">
              {mutation.isPending ? <><Send className="animate-pulse" /> Sending…</> : <><Send /> Send message</>}
            </Button>
            {mutation.isSuccess && (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="size-4" /> Thanks — your message was received.
              </p>
            )}
            {mutation.isError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {(mutation.error as Error)?.message ?? "Something went wrong. Please try again."}
              </p>
            )}
          </form>

          <aside className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-widest">Your past messages</h2>
            </div>
            {list.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
            {!list.isLoading && (list.data?.length ?? 0) === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">You haven't sent any feedback yet.</p>
            )}
            <ul className="mt-4 space-y-3">
              {list.data?.map((f) => (
                <li key={f.id} className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <span className="text-primary">{f.category}</span>
                    <span>{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{f.subject}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{f.message}</p>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
