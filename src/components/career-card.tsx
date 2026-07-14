import { useMemo, useState } from "react";
import {
  Activity, Banknote, Bookmark, BookmarkCheck, BriefcaseBusiness, ChevronRight,
  Clock, GraduationCap, Heart, LineChart, Rocket, ScanEye, Sparkles, Sun, Sunrise, Sunset,
  Stethoscope, Palette, Cpu, Scale, Wrench, FlaskConical, TrendingUp, Users, Leaf,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export type CareerRecommendation = {
  id: string;
  rank: number;
  career_title: string;
  career_slug: string;
  confidence: number;
  description: string;
  match_reasons: unknown;
  responsibilities: unknown;
  outlook: string | null;
  pathways: unknown;
  related_professions: unknown;
  university_majors: unknown;
  recommended_subjects: unknown;
  technical_skills: unknown;
  soft_skills: unknown;
  preparation_experiences: unknown;
};

const list = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

// ---------- heuristics ----------
function pickIcon(title: string) {
  const t = title.toLowerCase();
  if (/(doctor|nurse|medic|surg|health|therap|dent|pharm|epidemi)/.test(t)) return Stethoscope;
  if (/(design|art|writ|music|film|creat|photo|architect|fashion)/.test(t)) return Palette;
  if (/(engineer|mechanic|electric|civil|robotic|aero)/.test(t)) return Wrench;
  if (/(scien|research|biolog|chem|physic|lab|astro)/.test(t)) return FlaskConical;
  if (/(data|software|develop|program|ai|machine|cyber|tech|comput)/.test(t)) return Cpu;
  if (/(law|policy|govern|diplom|legal|advoca)/.test(t)) return Scale;
  if (/(finance|bank|invest|econom|account|consult|manag|market)/.test(t)) return TrendingUp;
  if (/(teach|educat|social|counsel|psycho|human)/.test(t)) return Users;
  if (/(environ|sustain|ecolog|climate|conserv|agric)/.test(t)) return Leaf;
  return BriefcaseBusiness;
}

function score(text: string, positive: RegExp, negative: RegExp) {
  const p = (text.match(positive) || []).length;
  const n = (text.match(negative) || []).length;
  return Math.max(0, Math.min(3, 2 + p - n));
}

type Level = "low" | "medium" | "high";
const levelFrom = (n: number): Level => (n >= 3 ? "high" : n === 2 ? "medium" : "low");

function analyseBadges(item: CareerRecommendation) {
  const outlook = (item.outlook ?? "").toLowerCase();
  const resp = list(item.responsibilities).join(" ").toLowerCase();
  const path = list(item.pathways).join(" ").toLowerCase();
  const combined = `${outlook} ${resp} ${path}`;

  const demand = levelFrom(score(outlook, /(growth|growing|strong|high demand|rising|shortage|expanding)/g, /(declin|shrink|saturat|contract|weak)/g));
  const salary = levelFrom(score(combined, /(high salary|well paid|lucrative|competitive salary|six-figure|senior|principal|director|partner)/g, /(low pay|modest|entry|volunteer|underpaid)/g));
  const stress = levelFrom(score(combined, /(deadline|pressure|high-stakes|emergency|on-call|fast-paced|demanding)/g, /(flexible|steady|predictable|calm|routine)/g));
  const flexibility = levelFrom(score(combined, /(remote|flexible|freelance|self-employ|hybrid|autonom)/g, /(shift|on-call|clinic|onsite|studio|lab)/g));
  const eduYears = /(doctor|surgeon|scientist|research|phd|academic|epidemi)/.test(item.career_title.toLowerCase() + " " + path)
    ? "6+ yrs" : /(engineer|lawyer|architect|pharma|dentist)/.test(item.career_title.toLowerCase() + " " + path)
    ? "5 yrs" : /(nurse|teacher|analyst|develop|design)/.test(item.career_title.toLowerCase() + " " + path)
    ? "3–4 yrs" : "3 yrs+";
  return { demand, salary, stress: stress as Level, flexibility, eduYears };
}

const levelColor: Record<Level, string> = {
  low: "bg-muted text-foreground/60 border-border",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  high: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
};
const stressColor: Record<Level, string> = {
  low: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
  high: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
};
const levelLabel: Record<Level, string> = { low: "Low", medium: "Medium", high: "High" };

function salarySteps(salary: Level) {
  const base = salary === "high" ? [45, 70, 100, 130] : salary === "medium" ? [30, 45, 65, 85] : [22, 32, 45, 60];
  return [
    { label: "Entry", value: base[0] },
    { label: "Mid", value: base[1] },
    { label: "Senior", value: base[2] },
    { label: "Lead", value: base[3] },
  ];
}

function dayInLife(resp: string[]) {
  const slots: [typeof Sunrise, string, string | undefined][] = [
    [Sunrise, "Morning", resp[0]],
    [Sun, "Midday", resp[1] ?? resp[0]],
    [Sunset, "Afternoon", resp[2] ?? resp[1] ?? resp[0]],
  ];
  return slots.filter(([, , t]) => Boolean(t)) as [typeof Sunrise, string, string][];
}

// ---------- favourites (localStorage) ----------
const FAV_KEY = "compass:fav:careers";
function readFavs(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
export function useFavCareers() {
  const [favs, setFavs] = useState<string[]>(() => readFavs());
  const toggle = (slug: string) => {
    setFavs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
  return { favs, toggle };
}

// ---------- CareerCard ----------
export function CareerCard({
  item, isFav, onToggleFav, compareSelected, onToggleCompare,
}: {
  item: CareerRecommendation;
  isFav: boolean;
  onToggleFav: () => void;
  compareSelected: boolean;
  onToggleCompare: () => void;
}) {
  const Icon = useMemo(() => pickIcon(item.career_title), [item.career_title]);
  const badges = useMemo(() => analyseBadges(item), [item]);
  const steps = useMemo(() => salarySteps(badges.salary), [badges.salary]);
  const resp = list(item.responsibilities);
  const day = dayInLife(resp);
  const tech = list(item.technical_skills);
  const soft = list(item.soft_skills);
  const path = list(item.pathways);
  const reasons = list(item.match_reasons);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      {/* header */}
      <div className="relative border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-primary/[0.02] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] text-primary">#{String(item.rank).padStart(2, "0")}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.confidence}% profile fit</span>
            </div>
            <h3 className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">{item.career_title}</h3>
            <div className="mt-2">
              <Progress value={item.confidence} className="h-1.5 bg-border" />
            </div>
          </div>
          <button onClick={onToggleFav} aria-label={isFav ? "Remove bookmark" : "Bookmark career"} className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary/40 hover:text-primary">
            {isFav ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>

      {/* badges row */}
      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-4 sm:px-6">
        <BadgeChip icon={Banknote} label="Salary" value={levelLabel[badges.salary]} tone={levelColor[badges.salary]} />
        <BadgeChip icon={TrendingUp} label="Demand" value={levelLabel[badges.demand]} tone={levelColor[badges.demand]} />
        <BadgeChip icon={Activity} label="Stress" value={levelLabel[badges.stress]} tone={stressColor[badges.stress]} />
        <BadgeChip icon={Rocket} label="Flexibility" value={levelLabel[badges.flexibility]} tone={levelColor[badges.flexibility]} />
        <BadgeChip icon={GraduationCap} label="Study" value={badges.eduYears} tone="bg-primary/5 text-primary border-primary/20" />
      </div>

      {/* salary progression chart */}
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <LineChart className="size-3.5" /> Illustrative salary progression
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">indicative · £k</span>
        </div>
        <div className="grid grid-cols-4 items-end gap-2 h-24">
          {steps.map((s) => (
            <div key={s.label} className="flex h-full flex-col justify-end gap-1.5">
              <div className="relative w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/40 transition-all group-hover:from-primary group-hover:to-primary/60" style={{ height: `${Math.min(100, s.value)}%` }}>
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground">{s.value}</span>
              </div>
              <span className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Why it fits */}
      {reasons.length > 0 && (
        <div className="border-b border-border bg-primary/[0.03] px-5 py-4 sm:px-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="size-3.5" /> Why it fits you
          </div>
          <ul className="space-y-1.5">
            {reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-2 text-sm leading-relaxed"><ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" />{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expandable */}
      <Accordion type="multiple" className="px-5 sm:px-6">
        {day.length > 0 && (
          <AccordionItem value="day" className="border-b-border">
            <AccordionTrigger className="text-sm font-bold"><span className="flex items-center gap-2"><Clock className="size-4 text-primary" /> A day in the life</span></AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {day.map(([D, label, text]) => (
                  <div key={label} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary"><D className="size-3.5" /> {label}</div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {(tech.length + soft.length) > 0 && (
          <AccordionItem value="skills" className="border-b-border">
            <AccordionTrigger className="text-sm font-bold"><span className="flex items-center gap-2"><ScanEye className="size-4 text-primary" /> Skills you'll build</span></AccordionTrigger>
            <AccordionContent>
              {tech.length > 0 && <SkillGroup label="Technical" items={tech} tone="bg-primary/10 text-primary border-primary/20" />}
              {soft.length > 0 && <SkillGroup label="Human" items={soft} tone="bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300" />}
            </AccordionContent>
          </AccordionItem>
        )}

        {path.length > 0 && (
          <AccordionItem value="path" className="border-b-border">
            <AccordionTrigger className="text-sm font-bold"><span className="flex items-center gap-2"><Rocket className="size-4 text-primary" /> Career progression</span></AccordionTrigger>
            <AccordionContent>
              <ol className="relative space-y-4 border-l border-border pl-5">
                {path.map((p, i) => (
                  <li key={p} className="relative">
                    <span className="absolute -left-[26px] top-0.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                    <p className="text-sm leading-relaxed">{p}</p>
                  </li>
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        )}

        {list(item.university_majors).length + list(item.recommended_subjects).length > 0 && (
          <AccordionItem value="prep" className="border-b-border">
            <AccordionTrigger className="text-sm font-bold"><span className="flex items-center gap-2"><GraduationCap className="size-4 text-primary" /> How to prepare</span></AccordionTrigger>
            <AccordionContent>
              {list(item.university_majors).length > 0 && <MiniList label="University majors" items={list(item.university_majors)} />}
              {list(item.recommended_subjects).length > 0 && <MiniList label="School subjects" items={list(item.recommended_subjects)} />}
              {list(item.preparation_experiences).length > 0 && <MiniList label="Experiences to seek" items={list(item.preparation_experiences)} />}
            </AccordionContent>
          </AccordionItem>
        )}

        {list(item.related_professions).length > 0 && (
          <AccordionItem value="related" className="border-b-0">
            <AccordionTrigger className="text-sm font-bold"><span className="flex items-center gap-2"><Heart className="size-4 text-primary" /> Related roles to explore</span></AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-1.5">
                {list(item.related_professions).map((r) => <Badge key={r} variant="outline" className="border-primary/20 bg-primary/[0.04] text-xs font-normal">{r}</Badge>)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3 sm:px-6">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
          <Checkbox checked={compareSelected} onCheckedChange={onToggleCompare} />
          Compare
        </label>
        {item.outlook && <span className="line-clamp-1 text-[11px] italic text-muted-foreground">{item.outlook}</span>}
      </div>
    </article>
  );
}

function BadgeChip({ icon: Icon, label, value, tone }: { icon: typeof Banknote; label: string; value: string; tone: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <Icon className="size-3" />
      <span className="opacity-70">{label}</span>
      <span>·</span>
      <span>{value}</span>
    </span>
  );
}

function SkillGroup({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <div className="mt-2 first:mt-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s) => <span key={s} className={`rounded-full border px-2 py-0.5 text-xs ${tone}`}>{s}</span>)}
      </div>
    </div>
  );
}

function MiniList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <ul className="space-y-1">
        {items.map((i) => <li key={i} className="flex gap-2 text-sm leading-relaxed"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{i}</li>)}
      </ul>
    </div>
  );
}

// ---------- Compare dialog content ----------
export function CareerCompareTable({ items }: { items: CareerRecommendation[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 border-b border-border p-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground"></th>
            {items.map((c) => (
              <th key={c.id} className="border-b border-border p-2 text-left">
                <div className="flex items-center gap-2">
                  {(() => { const I = pickIcon(c.career_title); return <I className="size-4 text-primary" />; })()}
                  <span className="font-bold">{c.career_title}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr>td]:border-b [&>tr>td]:border-border [&>tr>td]:p-2 [&>tr>td]:align-top">
          <Row label="Profile fit" items={items} render={(c) => <span className="font-mono">{c.confidence}%</span>} />
          <Row label="Salary" items={items} render={(c) => levelLabel[analyseBadges(c).salary]} />
          <Row label="Demand" items={items} render={(c) => levelLabel[analyseBadges(c).demand]} />
          <Row label="Stress" items={items} render={(c) => levelLabel[analyseBadges(c).stress]} />
          <Row label="Flexibility" items={items} render={(c) => levelLabel[analyseBadges(c).flexibility]} />
          <Row label="Study" items={items} render={(c) => analyseBadges(c).eduYears} />
          <Row label="Outlook" items={items} render={(c) => <span className="text-xs text-muted-foreground">{c.outlook}</span>} />
          <Row label="Top skills" items={items} render={(c) => (
            <div className="flex flex-wrap gap-1">
              {[...list(c.technical_skills), ...list(c.soft_skills)].slice(0, 4).map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
            </div>
          )} />
          <Row label="Majors" items={items} render={(c) => (
            <ul className="space-y-0.5 text-xs">{list(c.university_majors).slice(0, 3).map((m) => <li key={m}>· {m}</li>)}</ul>
          )} />
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, items, render }: { label: string; items: CareerRecommendation[]; render: (c: CareerRecommendation) => React.ReactNode }) {
  return (
    <tr>
      <td className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</td>
      {items.map((c) => <td key={c.id}>{render(c)}</td>)}
    </tr>
  );
}


