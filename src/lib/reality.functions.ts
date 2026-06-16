import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PreferencesSchema = z.object({
  salaryPriority: z.enum(["low", "medium", "high"]),
  balancePriority: z.enum(["low", "medium", "high"]),
  studyTolerance: z.enum(["short", "moderate", "long"]),
  stressTolerance: z.enum(["low", "medium", "high"]),
  environment: z.enum(["flexible", "office", "remote", "field", "laboratory", "hospital", "travel", "no_preference"]),
});

const RealitySchema = z.object({
  careerTitle: z.string(),
  salary: z.object({ currency: z.string(), period: z.string(), entry: z.string(), mid: z.string(), senior: z.string(), note: z.string() }),
  education: z.object({ years: z.string(), requirements: z.array(z.string()).min(1).max(5) }),
  majors: z.array(z.string()).min(1).max(5),
  environments: z.array(z.string()).min(1).max(5),
  conditions: z.object({ hours: z.string(), balance: z.string(), flexibility: z.string() }),
  stress: z.object({
    level: z.enum(["low", "moderate", "high", "very_high"]),
    summary: z.string(),
    factors: z.array(z.string()).min(2).max(5),
  }),
  outlook: z.object({ rating: z.enum(["limited", "steady", "strong"]), summary: z.string(), opportunities: z.array(z.string()).min(1).max(4) }),
  demand: z.object({
    current: z.enum(["low", "moderate", "high", "very_high"]),
    fiveYear: z.enum(["declining", "stable", "growing", "rapidly_growing"]),
    growthNote: z.string(),
    drivers: z.array(z.string()).min(2).max(5),
  }),
  regions: z.array(z.object({
    name: z.string(),
    reason: z.string(),
  })).min(3).max(6),
  challenges: z.array(z.string()).min(2).max(5),
  progression: z.array(z.string()).min(3).max(6),
  fitScore: z.number().int().min(0).max(100),
  personalisedInsight: z.string(),
  tradeoff: z.string(),
});

const RealityOutputSchema = z.object({ careers: z.array(RealitySchema).length(3) });
const GenerateInput = z.object({ preferences: PreferencesSchema });

function officialSources(country: string) {
  const normalized = country.toLowerCase();
  if (normalized.includes("united kingdom") || normalized === "uk" || normalized.includes("britain")) return [
    { title: "National Careers Service", publisher: "UK Government", url: "https://nationalcareers.service.gov.uk/job-profiles" },
    { title: "Labour market overview", publisher: "Office for National Statistics", url: "https://www.ons.gov.uk/employmentandlabourmarket" },
  ];
  if (normalized.includes("united states") || normalized === "usa" || normalized === "us") return [
    { title: "Occupational Outlook Handbook", publisher: "U.S. Bureau of Labor Statistics", url: "https://www.bls.gov/ooh/" },
    { title: "O*NET OnLine", publisher: "U.S. Department of Labor", url: "https://www.onetonline.org/" },
  ];
  if (normalized.includes("canada")) return [{ title: "Job Bank career planning", publisher: "Government of Canada", url: "https://www.jobbank.gc.ca/career-planning" }];
  if (normalized.includes("australia")) return [{ title: "Occupation profiles", publisher: "Jobs and Skills Australia", url: "https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles" }];
  return [
    { title: "ILOSTAT", publisher: "International Labour Organization", url: "https://ilostat.ilo.org/data/" },
    { title: "OECD Employment Database", publisher: "OECD", url: "https://www.oecd.org/en/data/datasets/oecd-employment-database.html" },
  ];
}

function friendlyAiError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) return "The reality report could not be formatted correctly. Please try again.";
  if (error instanceof Error && error.message.includes("402")) return "Reality reports are temporarily unavailable because the workspace has no AI credits.";
  if (error instanceof Error && error.message.includes("429")) return "The Reality Checker is busy right now. Please wait a moment and try again.";
  return "The Reality Checker is temporarily unavailable. Please try again.";
}

export const getRealityChecker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileResult, assessmentResult, recommendationsResult, reportsResult] = await Promise.all([
      context.supabase.from("profiles").select("display_name, country, educational_stage, current_subjects, preferences").eq("id", context.userId).maybeSingle(),
      context.supabase.from("assessment_sessions").select("scores").eq("user_id", context.userId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("career_recommendations").select("*").eq("user_id", context.userId).order("rank"),
      context.supabase.from("career_reality_reports").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false }),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (assessmentResult.error) throw assessmentResult.error;
    if (recommendationsResult.error) throw recommendationsResult.error;
    if (reportsResult.error) throw reportsResult.error;
    const country = profileResult.data?.country ?? "Not specified";
    return { profile: profileResult.data, assessment: assessmentResult.data, recommendations: recommendationsResult.data, reports: reportsResult.data, sources: officialSources(country) };
  });

export const generateRealityReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: profile, error: profileError }, { data: assessment }, { data: recommendations, error: recommendationsError }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("assessment_sessions").select("scores").eq("user_id", context.userId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      context.supabase.from("career_recommendations").select("*").eq("user_id", context.userId).order("rank").limit(3),
    ]);
    if (profileError) throw profileError;
    if (recommendationsError) throw recommendationsError;
    if (recommendations.length !== 3) return { ok: false as const, error: "Complete your assessment to create three career recommendations first." };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The Reality Checker is temporarily unavailable." };
    const sources = officialSources(profile.country);
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: RealityOutputSchema, name: "career_reality_comparison", description: "A three-career reality comparison covering salary, study, stress, demand, geography, and personalised lifestyle fit." }),
        prompt: `You are an ethical career information analyst for students. Produce exactly one reality report for each of the three supplied careers, in the same order.

Separate objective career facts from personalised interpretation:
- Objective synthesis (cautious, source-grounded): salary, education, majors, environments, conditions, stress, outlook, demand, regions, challenges, progression.
- AI interpretation (clearly opinion): fitScore, personalisedInsight, tradeoff.

Rules:
- Cautious ranges, never false precision. Never promise earnings or employment.
- Salary values are gross annual ranges in the student's country where the official source supports them; otherwise broad estimate with limitations explained in salary.note.
- stress.level uses Low / Moderate / High / Very high based on typical hours, responsibility, emotional/physical demand, deadlines, competitive pressure.
- demand.current and demand.fiveYear reflect the student's country; growthNote is a short plain-English projection over the next 5–10 years. drivers explain why (tech, demographics, regulation, etc.).
- regions: list 3–6 countries or regions globally where the career currently shows strong demand or talent shortages, with one short reason per region.
- Ground objective sections only in the official portals supplied below and the existing recommendation context. Do not invent studies, citations, or URLs.
- Keep every field concise and student-friendly. Fit score = lifestyle alignment with stated preferences, not likelihood of success.
- Personalise commentary to the student's stated preferences (salary, balance, study tolerance, stress tolerance, environment). When a recommendation conflicts with a strong preference, name a gentler adjacent path in the tradeoff field.

Student: ${JSON.stringify({ country: profile.country, educationalStage: profile.educational_stage, subjects: profile.current_subjects, preferences: data.preferences, interestScores: assessment?.scores ?? {} })}
Careers: ${JSON.stringify(recommendations)}
Approved official portals: ${JSON.stringify(sources)}`,
      });
      const byTitle = new Map(output.careers.map((career) => [career.careerTitle.toLowerCase(), career]));
      const today = new Date().toISOString().slice(0, 10);
      const rows = recommendations.map((recommendation, index) => ({
        user_id: context.userId,
        recommendation_id: recommendation.id,
        career_slug: recommendation.career_slug,
        career_title: recommendation.career_title,
        country: profile.country,
        preferences: data.preferences,
        report: byTitle.get(recommendation.career_title.toLowerCase()) ?? output.careers[index],
        data_as_of: today,
      }));
      const { data: saved, error: saveError } = await context.supabase.from("career_reality_reports").upsert(rows, { onConflict: "user_id,recommendation_id" }).select("*");
      if (saveError) throw saveError;
      const { error: preferenceError } = await context.supabase.from("profiles").update({ preferences: data.preferences }).eq("id", context.userId);
      if (preferenceError) throw preferenceError;
      return { ok: true as const, reports: saved };
    } catch (error) {
      console.error("Career reality generation failed", error);
      return { ok: false as const, error: friendlyAiError(error) };
    }
  });
