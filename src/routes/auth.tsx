import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Compass, Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in | Compass Career Guidance" }, { name: "description", content: "Securely sign in or create your Compass student career guidance account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "recovery">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { if (window.location.hash.includes("type=recovery")) setMode("recovery"); supabase.auth.getUser().then(({ data }) => { if (data.user && !window.location.hash.includes("type=recovery")) navigate({ to: "/dashboard" }); }); }, [navigate]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      if (mode === "forgot") { const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth` }); if (error) throw error; setMessage("Check your inbox for a secure password reset link."); }
      else if (mode === "recovery") { if (password.length < 8) throw new Error("Use at least 8 characters."); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setMessage("Password updated. You can continue to your dashboard."); }
      else if (mode === "signup") { const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } }); if (error) throw error; setMessage("Account created. Check your email to confirm your address."); }
      else { const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw error; navigate({ to: "/dashboard" }); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again."); } finally { setBusy(false); }
  };
  const google = async () => { setBusy(true); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard`, extraParams: { prompt: "select_account" } }); if (result.error) { setMessage(result.error.message); setBusy(false); } else if (!result.redirected) navigate({ to: "/dashboard" }); };
  const title = mode === "signup" ? "Create your path" : mode === "forgot" ? "Reset your password" : mode === "recovery" ? "Choose a new password" : "Welcome back";
  return <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
    <section className="hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter"><Compass className="size-6"/> Compass</div><div className="max-w-xl"><p className="mb-5 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground/60">Evidence-led career discovery</p><h1 className="text-6xl font-extrabold leading-[1.02] tracking-tight">Your future is not one decision. <span className="text-primary-foreground/45 italic">It’s a trail.</span></h1><p className="mt-7 max-w-lg text-lg leading-relaxed text-primary-foreground/70">Understand your interests, explore credible possibilities, and turn insight into practical next steps.</p></div><p className="text-xs text-primary-foreground/50">Private by design · Explainable recommendations · Built for students</p></section>
    <section className="flex items-center justify-center bg-background px-5 py-12 sm:px-10"><div className="w-full max-w-sm"><div className="mb-10 flex items-center gap-3 font-black text-xl uppercase tracking-tighter lg:hidden"><Compass className="size-6 text-primary"/> Compass</div><p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-primary">Student account</p><h2 className="text-4xl font-extrabold tracking-tight">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Your assessment responses and recommendations are saved securely to your account.</p>
      {mode !== "recovery" && <Button variant="compassOutline" className="mt-8 h-12 w-full" onClick={google} disabled={busy}>Continue with Google</Button>}
      {mode !== "recovery" && <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><span className="h-px flex-1 bg-border"/>or use email<span className="h-px flex-1 bg-border"/></div>}
      <form onSubmit={submit} className="space-y-4">{mode !== "recovery" && <label className="block text-xs font-bold uppercase tracking-wider">Email<Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} className="mt-2 h-12 bg-card normal-case" placeholder="student@example.com"/></label>}{mode !== "forgot" && <label className="block text-xs font-bold uppercase tracking-wider">Password<div className="relative mt-2"><Input required type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} className="h-12 bg-card pr-11 normal-case" placeholder="At least 8 characters"/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff/> : <Eye/>}</Button></div></label>}<Button variant="compass" className="h-12 w-full" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "recovery" ? "Update password" : "Sign in"}</Button></form>
      {message && <p role="status" className="mt-4 rounded-lg border border-border bg-secondary p-3 text-sm leading-relaxed">{message}</p>}
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">{mode === "signin" && <><button onClick={() => setMode("signup")} className="font-semibold text-primary">Create account</button><button onClick={() => setMode("forgot")}>Forgot password?</button></>}{mode !== "signin" && mode !== "recovery" && <button onClick={() => setMode("signin")} className="font-semibold text-primary">Back to sign in</button>}{mode === "recovery" && <button onClick={() => navigate({ to: "/dashboard" })} className="font-semibold text-primary">Continue to dashboard</button>}</div>
    </div></section>
  </main>;
}