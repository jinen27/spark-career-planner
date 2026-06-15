import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PreferencesSchema = z.object({
  salaryPriority: z.enum(["low", "medium", "high"]),
  balancePriority: z.enum(["low", "medium", "high"]),
  studyTolerance: z.enum(["short", "moderate", "long"]),
  environment: z.enum(["flexible", "office", "remote", "field", "laboratory", "hospital", "travel", "no_preference"]),
});

const RealitySchema = z.object({
  careerTitle: z.string(),
  salary: z.object({ currency: z.string(), period: z.string(), entry: z.string(), mid: z.string(), senior: z.string(), note: z.string() }),
  education: z.object({ years: z.string(), requirements: z.array(z.string()).min(1).max(5) }),
  majors: z.array(z.string()).min(1).max(5),
  environments: z.array(z.string()).min(1).max(5),
  conditions: z.object({ hours: z.string(), balance: z.string(), flexibility: z.string() }),
  outlook: z.object({ rating: z.enum(["limited", "steady", "strong"]), summary: z.string(), opportunities: z.array(z.string()).min(1).max(4) }),
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
        output: Output.object({ schema: RealityOutputSchema, name: "career_reality_comparison", description: "A three-career reality comparison grounded in supplied official labour-market portals." }),
        prompt: `You are an ethical career information analyst for students. Produce exactly one reality report for each of the three supplied careers, in the same order. Separate objective career facts from personalised interpretation: salary, education, majors, environments, conditions, outlook, challenges, and progression are objective synthesis; fitScore, personalisedInsight, and tradeoff are AI interpretation. Use cautious ranges, never false precision, and never promise earnings or employment. Salary values must be gross annual ranges where the supplied official source supports them; otherwise give a clearly labelled broad estimate and explain limitations in salary.note. Tailor to the student's country. Ground the objective synthesis only in the official labour-market portals supplied below and the existing recommendation context. Do not invent studies, citations, or URLs. Keep every field concise and student-friendly. Fit score means lifestyle alignment, not likelihood of success.

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