import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowRight, GraduationCap, Loader2, MapPin, Plus, Sparkles, Target, Trash2, TrendingUp } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { LoadingView } from "@/components/loading-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { getUniversityMatcher, generateUniversityMatches } from "@/lib/university.functions";

export const Route = createFileRoute("/_authenticated/university-matcher")({
  component: UniversityMatcherPage,
  head: () => ({ meta: [
    { title: "University Match Predictor | Compass" },
    { name: "description", content: "Enter your A-Levels, IB, or GPA and get personalised university matches with admission probability and gap analysis." },
  ] }),
});

type System = "a_levels" | "ib" | "gpa";
type SubjectGrade = { subject: string; grade: string };
type Match = {
  university: string; country: string; major: string;
  city?: string; campusSetting?: string; campusImageQuery?: string; lifestyle?: string;
  matchLevel: "strong" | "competitive" | "reach";
  admissionProbability: number;
  entryRequirements: string; tuitionEstimate: string;
  scholarships: string[]; strengths: string[]; improvements: string[];
  gapAnalysis: { area: string; current: string; target: string; recommendation: string }[];
  explanation: string; ranking?: string;
};

const emptySubject = (): SubjectGrade => ({ subject: "", grade: "" });

function UniversityMatcherPage() {
  const fetchData = useServerFn(getUniversityMatcher);
  const generate = useServerFn(generateUniversityMatches);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["university-matcher"], queryFn: () => fetchData() });

  const [system, setSystem] = useState<System>("a_levels");
  const [aPredicted, setAPredicted] = useState<SubjectGrade[]>([emptySubject(), emptySubject(), emptySubject()]);
  const [gcses, setGcses] = useState("");
  const [ibTotal, setIbTotal] = useState("");
  const [ibHL, setIbHL] = useState<SubjectGrade[]>([emptySubject(), emptySubject(), emptySubject()]);
  const [ibSL, setIbSL] = useState<SubjectGrade[]>([emptySubject(), emptySubject(), emptySubject()]);
  const [gpaScale, setGpaScale] = useState("4.0");
  const [gpaCurrent, setGpaCurrent] = useState("");
  const [testScores, setTestScores] = useState("");

  const [countries, setCountries] = useState<string[]>([]);
  const [majorsInput, setMajorsInput] = useState("");
  const [budget, setBudget] = useState<"any" | "low" | "medium" | "high">("any");
  const [scholarships, setScholarships] = useState(false);
  const [language, setLanguage] = useState("English");
  const [campusType, setCampusType] = useState<"any" | "urban" | "suburban" | "rural">("any");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingView />;
  const profile = data?.profile;
  const name = profile?.display_name || "Student";
  const initials = name.split(" ").map((v) => v[0]).join("").slice(0, 2).toUpperCase();
  const latest = data?.latest;
  const matches = (latest?.matches as Match[] | null) ?? [];

  const toggleCountry = (c: string) => setCountries((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

  const submit = async () => {
    setError(null); setSubmitting(true);
    try {
      const clean = (list: SubjectGrade[]) => list.filter((s) => s.subject.trim() && s.grade.trim());
      const academic = system === "a_levels"
        ? { system, aLevels: { predicted: clean(aPredicted), gcses: gcses.trim() || undefined } }
        : system === "ib"
        ? { system, ib: { totalPoints: ibTotal.trim() || undefined, higherLevel: clean(ibHL), standardLevel: clean(ibSL) } }
        : { system, gpa: { scale: gpaScale, current: gpaCurrent.trim() || undefined, testScores: testScores.trim() || undefined } };
      const preferences = {
        countries,
        majors: majorsInput.split(",").map((m) => m.trim()).filter(Boolean),
        budget, scholarshipsImportant: scholarships, language, campusType,
      };
      const result = await generate({ data: { academic, preferences } });
      if (!result.ok) { setError(result.error); }
      else { await queryClient.invalidateQueries({ queryKey: ["university-matcher"] }); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <AppNav initials={initials} />
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-12">
        <header className="animate-enter">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">University Match Predictor</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Where can you <span className="text-primary/45 italic">realistically</span> get in?
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Share your academic profile and we'll generate personalised university matches with admission probability estimates and clear gap analysis.
          </p>
          <p className="mt-2 text-xs text-muted-foreground italic">These are AI-generated estimates, not admission guarantees.</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Your academic profile</h2>
            <Tabs value={system} onValueChange={(v) => setSystem(v as System)} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="a_levels">A-Levels</TabsTrigger>
                <TabsTrigger value="ib">IB</TabsTrigger>
                <TabsTrigger value="gpa">GPA</TabsTrigger>
              </TabsList>

              <TabsContent value="a_levels" className="space-y-3 pt-4">
                <Label className="text-xs uppercase tracking-wider">Predicted / achieved grades</Label>
                {aPredicted.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Subject (e.g. Mathematics)" value={s.subject} onChange={(e) => setAPredicted((p) => p.map((r, idx) => idx === i ? { ...r, subject: e.target.value } : r))} />
                    <Input className="w-24" placeholder="A*" value={s.grade} onChange={(e) => setAPredicted((p) => p.map((r, idx) => idx === i ? { ...r, grade: e.target.value } : r))} />
                    {aPredicted.length > 1 && <Button variant="ghost" size="icon" onClick={() => setAPredicted((p) => p.filter((_, idx) => idx !== i))}><Trash2 /></Button>}
                  </div>
                ))}
                {aPredicted.length < 6 && <Button variant="compassOutline" size="sm" onClick={() => setAPredicted((p) => [...p, emptySubject()])}><Plus /> Add subject</Button>}
                <div className="pt-2">
                  <Label className="text-xs uppercase tracking-wider">GCSEs (optional)</Label>
                  <Textarea className="mt-2" placeholder="e.g. 9,9,8,7,7,6,6,6,6" value={gcses} onChange={(e) => setGcses(e.target.value)} rows={2} />
                </div>
              </TabsContent>

              <TabsContent value="ib" className="space-y-3 pt-4">
                <Label className="text-xs uppercase tracking-wider">Total points (predicted)</Label>
                <Input placeholder="e.g. 38" value={ibTotal} onChange={(e) => setIbTotal(e.target.value)} />
                <Label className="text-xs uppercase tracking-wider pt-2">Higher Level subjects</Label>
                {ibHL.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Subject" value={s.subject} onChange={(e) => setIbHL((p) => p.map((r, idx) => idx === i ? { ...r, subject: e.target.value } : r))} />
                    <Input className="w-20" placeholder="7" value={s.grade} onChange={(e) => setIbHL((p) => p.map((r, idx) => idx === i ? { ...r, grade: e.target.value } : r))} />
                    {ibHL.length > 1 && <Button variant="ghost" size="icon" onClick={() => setIbHL((p) => p.filter((_, idx) => idx !== i))}><Trash2 /></Button>}
                  </div>
                ))}
                {ibHL.length < 4 && <Button variant="compassOutline" size="sm" onClick={() => setIbHL((p) => [...p, emptySubject()])}><Plus /> Add HL subject</Button>}
                <Label className="text-xs uppercase tracking-wider pt-2">Standard Level subjects</Label>
                {ibSL.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder="Subject" value={s.subject} onChange={(e) => setIbSL((p) => p.map((r, idx) => idx === i ? { ...r, subject: e.target.value } : r))} />
                    <Input className="w-20" placeholder="6" value={s.grade} onChange={(e) => setIbSL((p) => p.map((r, idx) => idx === i ? { ...r, grade: e.target.value } : r))} />
                    {ibSL.length > 1 && <Button variant="ghost" size="icon" onClick={() => setIbSL((p) => p.filter((_, idx) => idx !== i))}><Trash2 /></Button>}
                  </div>
                ))}
                {ibSL.length < 4 && <Button variant="compassOutline" size="sm" onClick={() => setIbSL((p) => [...p, emptySubject()])}><Plus /> Add SL subject</Button>}
              </TabsContent>

              <TabsContent value="gpa" className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Scale</Label>
                    <Select value={gpaScale} onValueChange={setGpaScale}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.0">4.0</SelectItem>
                        <SelectItem value="5.0">5.0</SelectItem>
                        <SelectItem value="10">10.0</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wider">Current GPA</Label>
                    <Input className="mt-2" placeholder="e.g. 3.8" value={gpaCurrent} onChange={(e) => setGpaCurrent(e.target.value)} />
                  </div>
                </div>
                <Label className="text-xs uppercase tracking-wider pt-2">Standardised test scores (optional)</Label>
                <Textarea placeholder="e.g. SAT 1450, IELTS 7.5" value={testScores} onChange={(e) => setTestScores(e.target.value)} rows={2} />
              </TabsContent>
            </Tabs>

            <div className="mt-8 space-y-4 border-t border-border pt-6">
              <h2 className="text-lg font-bold">Preferences</h2>
              <div>
                <Label className="text-xs uppercase tracking-wider">Target countries</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["United Kingdom", "United States", "Canada", "Australia", "Singapore", "Netherlands", "Germany", "Ireland", "India"].map((c) => (
                    <button key={c} type="button" onClick={() => toggleCountry(c)} className={`rounded-full border px-3 py-1 text-xs transition ${countries.includes(c) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Preferred majors (comma-separated)</Label>
                <Input className="mt-2" placeholder="e.g. Computer Science, Data Science" value={majorsInput} onChange={(e) => setMajorsInput(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-wider">Budget</Label>
                  <Select value={budget} onValueChange={(v) => setBudget(v as typeof budget)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="low">Lower cost</SelectItem>
                      <SelectItem value="medium">Mid range</SelectItem>
                      <SelectItem value="high">Premium / no limit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider">Campus</Label>
                  <Select value={campusType} onValueChange={(v) => setCampusType(v as typeof campusType)}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="suburban">Suburban</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider">Language of instruction</Label>
                <Input className="mt-2" value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={scholarships} onCheckedChange={(v) => setScholarships(Boolean(v))} />
                Scholarships are important to me
              </label>
            </div>

            <Button variant="compass" className="mt-6 w-full" onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" /> Generating matches…</> : <><Sparkles /> Find my universities</>}
            </Button>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </Card>

          <div className="space-y-6">
            {matches.length === 0 && (
              <Card className="grid place-items-center p-12 text-center">
                <GraduationCap className="size-12 text-primary/40" />
                <h2 className="mt-4 text-xl font-bold">No matches yet</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Fill in your academic profile and preferences, then generate personalised university matches with admission probability and gap analysis.</p>
              </Card>
            )}
            {matches.length > 0 && latest && (
              <>
                {latest.summary && (
                  <Card className="border-primary/20 bg-primary/5 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">AI summary</p>
                    <p className="mt-2 text-sm leading-relaxed">{latest.summary}</p>
                  </Card>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {matches.map((m, i) => <MatchCard key={`${m.university}-${i}`} match={m} />)}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const levelStyle = {
  strong: { label: "Strong Match", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  competitive: { label: "Competitive Match", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  reach: { label: "Reach Match", className: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
} as const;

function MatchCard({ match }: { match: Match }) {
  const style = levelStyle[match.matchLevel];
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">{match.university}</h3>
          <p className="text-sm text-muted-foreground">{match.major} · {match.country}</p>
        </div>
        <Badge variant="outline" className={style.className}>{style.label}</Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Estimated admission probability</span>
          <span className="font-mono font-bold">{match.admissionProbability}%</span>
        </div>
        <Progress value={match.admissionProbability} className="mt-2 h-2" />
      </div>

      <p className="mt-4 text-sm leading-relaxed">{match.explanation}</p>

      <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-xs">
        <div><dt className="font-bold uppercase tracking-wider text-muted-foreground">Entry requirements</dt><dd className="mt-1">{match.entryRequirements}</dd></div>
        <div><dt className="font-bold uppercase tracking-wider text-muted-foreground">Tuition</dt><dd className="mt-1">{match.tuitionEstimate}</dd></div>
        {match.ranking && <div><dt className="font-bold uppercase tracking-wider text-muted-foreground">Ranking</dt><dd className="mt-1">{match.ranking}</dd></div>}
      </dl>

      {match.strengths.length > 0 && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600"><TrendingUp className="size-3" /> Your strengths</p>
          <ul className="mt-2 space-y-1 text-xs">{match.strengths.map((s) => <li key={s}>✓ {s}</li>)}</ul>
        </div>
      )}

      {match.improvements.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600"><Target className="size-3" /> Areas to improve</p>
          <ul className="mt-2 space-y-1 text-xs">{match.improvements.map((s) => <li key={s}>• {s}</li>)}</ul>
        </div>
      )}

      {match.gapAnalysis.length > 0 && (
        <div className="mt-4 rounded-md border border-border bg-muted/40 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gap analysis</p>
          <div className="mt-2 space-y-2 text-xs">
            {match.gapAnalysis.map((g, i) => (
              <div key={i}>
                <p className="font-semibold">{g.area}</p>
                <p className="text-muted-foreground">{g.current} <ArrowRight className="inline size-3" /> {g.target}</p>
                <p className="mt-0.5 italic">{g.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.scholarships.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scholarships to explore</p>
          <ul className="mt-1 flex flex-wrap gap-1">{match.scholarships.map((s) => <li key={s} className="rounded-full border border-border px-2 py-0.5 text-xs">{s}</li>)}</ul>
        </div>
      )}
    </Card>
  );
}
