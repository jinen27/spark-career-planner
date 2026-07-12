import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowRight, GraduationCap, Loader2, MapPin, Plus, Sparkles, Target, Trash2, TrendingUp,
  Search, Star, Scale, X, Building2, DollarSign, Award, Users, ExternalLink, Globe, ImageOff,
} from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getUniversityMatcher, generateUniversityMatches } from "@/lib/university.functions";

export const Route = createFileRoute("/_authenticated/university-matcher")({
  component: UniversityMatcherPage,
  head: () => ({ meta: [
    { title: "University Match Predictor | Compass" },
    { name: "description", content: "Explore personalised university matches on interactive cards with logos, campus photos, maps, comparisons and detailed profiles." },
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
  websiteDomain?: string; acceptanceRate?: string; programmes?: string[];
  notableAlumni?: string[]; graduateOutcome?: string;
};

const emptySubject = (): SubjectGrade => ({ subject: "", grade: "" });

const COUNTRY_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧", "United States": "🇺🇸", "Canada": "🇨🇦", "Australia": "🇦🇺",
  "Singapore": "🇸🇬", "Netherlands": "🇳🇱", "Germany": "🇩🇪", "Ireland": "🇮🇪", "India": "🇮🇳",
  "France": "🇫🇷", "Switzerland": "🇨🇭", "Japan": "🇯🇵", "Hong Kong": "🇭🇰", "China": "🇨🇳",
  "New Zealand": "🇳🇿", "Spain": "🇪🇸", "Italy": "🇮🇹", "Sweden": "🇸🇪",
};
const flagOf = (c: string) => COUNTRY_FLAGS[c] ?? "🎓";

const levelStyle = {
  strong: { label: "Strong Match", chip: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", ring: "ring-emerald-400/40" },
  competitive: { label: "Competitive", chip: "bg-amber-500/10 text-amber-700 border-amber-500/30", ring: "ring-amber-400/40" },
  reach: { label: "Reach", chip: "bg-rose-500/10 text-rose-700 border-rose-500/30", ring: "ring-rose-400/40" },
} as const;

const FAV_KEY = "compass-fav-unis";
const loadFavs = (): string[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
};

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

  // browse / compare state
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<"all" | "strong" | "competitive" | "reach">("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [favs, setFavs] = useState<string[]>(loadFavs());
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detail, setDetail] = useState<Match | null>(null);

  const toggleFav = (key: string) => {
    setFavs((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const toggleCompare = (key: string) => {
    setCompareIds((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 4) return prev;
      return [...prev, key];
    });
  };

  if (isLoading) return <LoadingView />;
  const profile = data?.profile;
  const name = profile?.display_name || "Student";
  const initials = name.split(" ").map((v) => v[0]).join("").slice(0, 2).toUpperCase();
  const latest = data?.latest;
  const matches = (latest?.matches as Match[] | null) ?? [];

  const keyOf = (m: Match) => `${m.university}-${m.major}`;

  const filtered = matches.filter((m) => {
    if (filterLevel !== "all" && m.matchLevel !== filterLevel) return false;
    if (filterCountry !== "all" && m.country !== filterCountry) return false;
    if (showFavsOnly && !favs.includes(keyOf(m))) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(`${m.university} ${m.major} ${m.city ?? ""} ${m.country}`.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const countryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    matches.forEach((m) => map.set(m.country, (map.get(m.country) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [matches]);
  const uniqueCountries = countryBreakdown.map(([c]) => c);
  const maxCountryCount = countryBreakdown[0]?.[1] ?? 1;

  const toggleCountryPref = (c: string) => setCountries((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

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

  const compareMatches = matches.filter((m) => compareIds.includes(keyOf(m)));

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
            Explore personalised matches through interactive cards with campus photos, logos, side-by-side comparison, and detailed profiles.
          </p>
          <p className="mt-2 text-xs text-muted-foreground italic">These are AI-generated estimates, not admission guarantees.</p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)]">
          <Card className="p-6 h-fit lg:sticky lg:top-20">
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
                    <button key={c} type="button" onClick={() => toggleCountryPref(c)} className={`rounded-full border px-3 py-1 text-xs transition ${countries.includes(c) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}>{flagOf(c)} {c}</button>
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
                  <Card className="border-primary/20 bg-primary/5 p-5 animate-fade-in">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">AI summary</p>
                    <p className="mt-2 text-sm leading-relaxed">{latest.summary}</p>
                  </Card>
                )}

                {/* Country breakdown infographic */}
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Your match map</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">{matches.length} universities · {uniqueCountries.length} {uniqueCountries.length === 1 ? "country" : "countries"}</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {countryBreakdown.map(([country, count]) => (
                      <button key={country} onClick={() => setFilterCountry((c) => c === country ? "all" : country)} className="group flex w-full items-center gap-3 text-left">
                        <span className="w-32 shrink-0 text-sm font-medium">{flagOf(country)} {country}</span>
                        <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
                          <div className={`h-full rounded-md transition-all ${filterCountry === country ? "bg-primary" : "bg-primary/40 group-hover:bg-primary/60"}`} style={{ width: `${(count / maxCountryCount) * 100}%` }} />
                          <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold">{count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {filterCountry !== "all" && (
                    <button onClick={() => setFilterCountry("all")} className="mt-3 text-xs text-primary hover:underline">Clear country filter ✕</button>
                  )}
                </Card>

                {/* Filter / search bar */}
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search universities, majors, cities…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as typeof filterLevel)}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All match levels</SelectItem>
                        <SelectItem value="strong">Strong</SelectItem>
                        <SelectItem value="competitive">Competitive</SelectItem>
                        <SelectItem value="reach">Reach</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant={showFavsOnly ? "compass" : "compassOutline"} size="sm" onClick={() => setShowFavsOnly((v) => !v)}>
                      <Star className={showFavsOnly ? "fill-current" : ""} /> Favourites {favs.length > 0 && `(${favs.length})`}
                    </Button>
                    <Button variant="compass" size="sm" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>
                      <Scale /> Compare {compareIds.length > 0 && `(${compareIds.length})`}
                    </Button>
                  </div>
                  {compareIds.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Select 2–4 to compare · <button onClick={() => setCompareIds([])} className="text-primary hover:underline">clear</button></p>
                  )}
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  {filtered.map((m, i) => (
                    <MatchCard
                      key={`${keyOf(m)}-${i}`}
                      match={m}
                      isFav={favs.includes(keyOf(m))}
                      onToggleFav={() => toggleFav(keyOf(m))}
                      isCompared={compareIds.includes(keyOf(m))}
                      onToggleCompare={() => toggleCompare(keyOf(m))}
                      onOpen={() => setDetail(m)}
                    />
                  ))}
                </div>
                {filtered.length === 0 && (
                  <Card className="p-8 text-center text-sm text-muted-foreground">No matches for the current filters.</Card>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          {detail && <UniversityDetail match={detail} isFav={favs.includes(keyOf(detail))} onToggleFav={() => toggleFav(keyOf(detail))} />}
        </DialogContent>
      </Dialog>

      {/* Compare dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Side-by-side comparison</DialogTitle>
            <DialogDescription>Comparing {compareMatches.length} universities</DialogDescription>
          </DialogHeader>
          <CompareTable matches={compareMatches} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------- Card ----------------

function UniLogo({ domain, name, className = "" }: { domain?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 3).join("") || name.slice(0, 2).toUpperCase();
  if (!domain || failed) {
    return <div className={`grid place-items-center bg-primary/10 font-bold text-primary ${className}`}>{initials}</div>;
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      onError={() => setFailed(true)}
      className={`bg-white object-contain p-1 ${className}`}
    />
  );
}

function CampusImage({ query, alt, className = "" }: { query?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const q = encodeURIComponent(query || alt);
  if (failed) {
    return <div className={`grid place-items-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary/40 ${className}`}><ImageOff className="size-8" /></div>;
  }
  return (
    <img
      src={`https://source.unsplash.com/featured/800x400/?${q}`}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

function MatchCard({ match, isFav, onToggleFav, isCompared, onToggleCompare, onOpen }: {
  match: Match; isFav: boolean; onToggleFav: () => void; isCompared: boolean; onToggleCompare: () => void; onOpen: () => void;
}) {
  const style = levelStyle[match.matchLevel];
  const location = [match.city, match.country].filter(Boolean).join(" · ");
  return (
    <Card className={`group flex flex-col overflow-hidden p-0 transition-all hover:shadow-lg hover:-translate-y-0.5 ${isCompared ? `ring-2 ${style.ring}` : ""}`}>
      <div className="relative h-36 w-full overflow-hidden bg-muted">
        <CampusImage query={match.campusImageQuery} alt={`${match.university} campus`} className="h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <Badge variant="outline" className={`absolute right-3 top-3 ${style.chip} backdrop-blur`}>{style.label}</Badge>
        <div className="absolute left-3 top-3 flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }} className="grid size-8 place-items-center rounded-full bg-white/90 text-slate-800 backdrop-blur transition hover:scale-110" aria-label="Save to favourites">
            <Star className={`size-4 ${isFav ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onToggleCompare(); }} className={`grid size-8 place-items-center rounded-full backdrop-blur transition hover:scale-110 ${isCompared ? "bg-primary text-primary-foreground" : "bg-white/90 text-slate-800"}`} aria-label="Add to comparison">
            <Scale className="size-4" />
          </button>
        </div>
        <div className="absolute bottom-2 left-3 right-3 flex items-end gap-3">
          <UniLogo domain={match.websiteDomain} name={match.university} className="size-12 shrink-0 rounded-lg shadow-md" />
          <div className="min-w-0 flex-1 pb-1">
            <p className="truncate text-xs font-medium text-white/90">{flagOf(match.country)} {location || match.country}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold leading-tight">{match.university}</h3>
        <p className="text-sm text-muted-foreground">{match.major}</p>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Admission probability</span>
            <span className="font-mono font-bold">{match.admissionProbability}%</span>
          </div>
          <Progress value={match.admissionProbability} className="mt-1.5 h-2" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Stat icon={<Award className="size-3.5" />} label="Ranking" value={match.ranking || "—"} />
          <Stat icon={<Users className="size-3.5" />} label="Acceptance" value={match.acceptanceRate || "—"} />
          <Stat icon={<DollarSign className="size-3.5" />} label="Tuition" value={match.tuitionEstimate} />
          <Stat icon={<Building2 className="size-3.5" />} label="Setting" value={match.campusSetting || "—"} />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(match.programmes ?? []).slice(0, 2).map((p) => (
            <span key={p} className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px]">{p}</span>
          ))}
          {match.scholarships.length > 0 && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700">💰 {match.scholarships.length} scholarship{match.scholarships.length > 1 ? "s" : ""}</span>
          )}
        </div>

        <Button variant="compassOutline" size="sm" className="mt-4 w-full" onClick={onOpen}>
          View full profile <ArrowRight />
        </Button>
      </div>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold" title={value}>{value}</div>
    </div>
  );
}

// ---------------- Detail dialog ----------------

function UniversityDetail({ match, isFav, onToggleFav }: { match: Match; isFav: boolean; onToggleFav: () => void }) {
  const style = levelStyle[match.matchLevel];
  const location = [match.city, match.country].filter(Boolean).join(", ");
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(`${match.university} ${location}`)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden">
        <CampusImage query={match.campusImageQuery} alt={`${match.university} campus`} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <Badge variant="outline" className={`absolute right-4 top-4 ${style.chip}`}>{style.label}</Badge>
        <button onClick={onToggleFav} className="absolute right-4 top-14 grid size-9 place-items-center rounded-full bg-white/90 backdrop-blur transition hover:scale-110">
          <Star className={`size-4 ${isFav ? "fill-amber-400 text-amber-500" : "text-slate-800"}`} />
        </button>
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4">
          <UniLogo domain={match.websiteDomain} name={match.university} className="size-16 shrink-0 rounded-xl shadow-lg" />
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate text-2xl font-bold text-white">{match.university}</h2>
            <p className="text-sm text-white/90">{match.major}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80"><MapPin className="size-3" /> {flagOf(match.country)} {location || match.country}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat icon={<Award className="size-3.5" />} label="Ranking" value={match.ranking || "—"} />
          <Stat icon={<Users className="size-3.5" />} label="Acceptance rate" value={match.acceptanceRate || "—"} />
          <Stat icon={<DollarSign className="size-3.5" />} label="Tuition" value={match.tuitionEstimate} />
          <Stat icon={<Building2 className="size-3.5" />} label="Campus" value={match.campusSetting || "—"} />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Admission probability</span>
            <span className="font-mono font-bold">{match.admissionProbability}%</span>
          </div>
          <Progress value={match.admissionProbability} className="mt-1.5 h-2.5" />
        </div>

        <p className="text-sm leading-relaxed">{match.explanation}</p>

        <Tabs defaultValue="academics">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
            <TabsTrigger value="life">Life</TabsTrigger>
            <TabsTrigger value="money">Money</TabsTrigger>
          </TabsList>

          <TabsContent value="academics" className="space-y-4 pt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Degree programmes</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {(match.programmes ?? [match.major]).map((p) => (
                  <li key={p} className="flex items-start gap-2"><GraduationCap className="mt-0.5 size-4 text-primary shrink-0" /> {p}</li>
                ))}
              </ul>
            </div>
            {match.graduateOutcome && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Graduate outcomes</h4>
                <p className="mt-1 text-sm">{match.graduateOutcome}</p>
              </div>
            )}
            {(match.notableAlumni ?? []).length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notable alumni</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {match.notableAlumni!.map((a) => <span key={a} className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs">{a}</span>)}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="admissions" className="space-y-4 pt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entry requirements</h4>
              <p className="mt-1 text-sm">{match.entryRequirements}</p>
            </div>
            {match.strengths.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700"><TrendingUp className="size-3" /> Your strengths</h4>
                <ul className="mt-2 space-y-1 text-sm">{match.strengths.map((s) => <li key={s}>✓ {s}</li>)}</ul>
              </div>
            )}
            {match.improvements.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700"><Target className="size-3" /> Areas to improve</h4>
                <ul className="mt-2 space-y-1 text-sm">{match.improvements.map((s) => <li key={s}>• {s}</li>)}</ul>
              </div>
            )}
            {match.gapAnalysis.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="gap">
                  <AccordionTrigger className="text-xs font-bold uppercase tracking-wider">Gap analysis</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {match.gapAnalysis.map((g, i) => (
                        <div key={i} className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                          <p className="font-semibold">{g.area}</p>
                          <p className="text-muted-foreground">{g.current} <ArrowRight className="inline size-3" /> {g.target}</p>
                          <p className="mt-1 italic text-xs">{g.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="life" className="space-y-4 pt-4">
            {match.lifestyle && <p className="text-sm leading-relaxed">{match.lifestyle}</p>}
            <div className="overflow-hidden rounded-lg border border-border">
              <iframe
                title={`Map of ${match.university}`}
                src={mapSrc}
                className="h-64 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </TabsContent>

          <TabsContent value="money" className="space-y-4 pt-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tuition</h4>
              <p className="mt-1 text-sm">{match.tuitionEstimate}</p>
            </div>
            {match.scholarships.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scholarships to explore</h4>
                <ul className="mt-2 flex flex-wrap gap-1.5">{match.scholarships.map((s) => <li key={s} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-700">💰 {s}</li>)}</ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {match.websiteDomain && (
          <a href={`https://${match.websiteDomain}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Visit official website <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ---------------- Compare ----------------

function CompareTable({ matches }: { matches: Match[] }) {
  const rows: { label: string; get: (m: Match) => React.ReactNode }[] = [
    { label: "Country", get: (m) => `${flagOf(m.country)} ${m.country}` },
    { label: "City", get: (m) => m.city || "—" },
    { label: "Match level", get: (m) => <Badge variant="outline" className={levelStyle[m.matchLevel].chip}>{levelStyle[m.matchLevel].label}</Badge> },
    { label: "Admission probability", get: (m) => (
      <div>
        <div className="text-xs font-mono font-bold">{m.admissionProbability}%</div>
        <Progress value={m.admissionProbability} className="mt-1 h-1.5" />
      </div>
    )},
    { label: "Ranking", get: (m) => m.ranking || "—" },
    { label: "Acceptance rate", get: (m) => m.acceptanceRate || "—" },
    { label: "Tuition (annual)", get: (m) => m.tuitionEstimate },
    { label: "Entry requirements", get: (m) => <span className="text-xs">{m.entryRequirements}</span> },
    { label: "Campus setting", get: (m) => m.campusSetting || "—" },
    { label: "Scholarships", get: (m) => m.scholarships.length > 0 ? `${m.scholarships.length} listed` : "—" },
    { label: "Graduate outcomes", get: (m) => m.graduateOutcome || "—" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background p-2 text-left"></th>
            {matches.map((m) => (
              <th key={m.university} className="min-w-[220px] border-b border-border p-3 text-left align-bottom">
                <div className="flex items-center gap-2">
                  <UniLogo domain={m.websiteDomain} name={m.university} className="size-10 shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{m.university}</p>
                    <p className="truncate text-xs font-normal text-muted-foreground">{m.major}</p>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/50">
              <td className="sticky left-0 z-10 bg-background p-3 text-xs font-bold uppercase tracking-wider text-muted-foreground align-top">{row.label}</td>
              {matches.map((m) => (
                <td key={m.university} className="p-3 align-top">{row.get(m)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
