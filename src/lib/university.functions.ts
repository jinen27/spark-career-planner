import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubjectGrade = z.object({ subject: z.string().min(1).max(80), grade: z.string().min(1).max(20) });

const AcademicInputsSchema = z.object({
  system: z.enum(["a_levels", "ib", "gpa"]),
  aLevels: z.object({
    predicted: z.array(SubjectGrade).max(6).optional(),
    achieved: z.array(SubjectGrade).max(6).optional(),
    gcses: z.string().max(500).optional(),
  }).optional(),
  ib: z.object({
    totalPoints: z.string().max(10).optional(),
    higherLevel: z.array(SubjectGrade).max(6).optional(),
    standardLevel: z.array(SubjectGrade).max(6).optional(),
    predicted: z.array(SubjectGrade).max(6).optional(),
  }).optional(),
  gpa: z.object({
    scale: z.string().max(20).optional(),
    current: z.string().max(20).optional(),
    testScores: z.string().max(500).optional(),
  }).optional(),
});

const PreferencesSchema = z.object({
  countries: z.array(z.string()).max(10).default([]),
  majors: z.array(z.string()).max(8).default([]),
  budget: z.enum(["any", "low", "medium", "high"]).default("any"),
  scholarshipsImportant: z.boolean().default(false),
  language: z.string().max(50).default("English"),
  campusType: z.enum(["any", "urban", "suburban", "rural"]).default("any"),
});

const MatchSchema = z.object({
  university: z.string(),
  country: z.string(),
  city: z.string(),
  campusSetting: z.string(),
  campusImageQuery: z.string(),
  lifestyle: z.string(),
  major: z.string(),
  matchLevel: z.enum(["strong", "competitive", "reach"]),
  admissionProbability: z.number(),
  entryRequirements: z.string(),
  tuitionEstimate: z.string(),
  scholarships: z.array(z.string()),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  gapAnalysis: z.array(z.object({ area: z.string(), current: z.string(), target: z.string(), recommendation: z.string() })),
  explanation: z.string(),
  ranking: z.string(),
});

const OutputSchema = z.object({
  summary: z.string(),
  matches: z.array(MatchSchema),
});

const GenerateInput = z.object({
  academic: AcademicInputsSchema,
  preferences: PreferencesSchema,
});

function friendlyAiError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) return "The university matches could not be formatted correctly. Please try again.";
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("402")) return "University matching is temporarily unavailable because the workspace has no AI credits.";
  if (msg.includes("429")) return "The University Matcher is busy right now. Please wait a moment and try again.";
  return `University Matcher error: ${msg.slice(0, 240)}`;
}

export const getUniversityMatcher = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileResult, recommendationsResult, matchResult] = await Promise.all([
      context.supabase.from("profiles").select("display_name, country, educational_stage, current_subjects").eq("id", context.userId).maybeSingle(),
      context.supabase.from("career_recommendations").select("career_title, university_majors, recommended_subjects").eq("user_id", context.userId).order("rank"),
      context.supabase.from("university_matches").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (recommendationsResult.error) throw recommendationsResult.error;
    if (matchResult.error) throw matchResult.error;
    return {
      profile: profileResult.data,
      recommendations: recommendationsResult.data ?? [],
      latest: matchResult.data,
    };
  });

export const generateUniversityMatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: profile, error: profileError }, { data: recommendations, error: recError }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("career_recommendations").select("career_title, university_majors, recommended_subjects, description").eq("user_id", context.userId).order("rank"),
    ]);
    if (profileError) throw profileError;
    if (recError) throw recError;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The University Matcher is temporarily unavailable." };

    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: OutputSchema }),
        prompt: `You are an ethical university admissions advisor for secondary school students.

Generate 6–8 personalised university recommendations based on the student's academic qualifications, career interests, and preferences.

For each university, classify the match level as:
- "strong": Student exceeds typical entry requirements (admission probability 70–95).
- "competitive": Student meets requirements but admission is competitive (40–69).
- "reach": Student is below the typical admitted-student profile but may still apply (5–39).

Important rules:
- Never guarantee admission. The admissionProbability is an INFORMED ESTIMATE based on publicly available admissions data, not a promise.
- Use real, well-known universities and degree programmes that exist.
- Entry requirements must reflect the academic system the student uses (A-Level grades, IB points, or GPA equivalents).
- Tuition estimates are annual international/domestic figures in local currency with a short note.
- Include at least 2 "strong", 2 "competitive", and 1 "reach" match where possible.
- Respect preferred countries when provided; otherwise include a diverse international set.
- Align the major with the student's career recommendations and stated major preferences.
- gapAnalysis: if the student is below requirements in any area, provide concrete current → target steps. Otherwise omit or keep short.
- explanation is a short paragraph (2–3 sentences) connecting the student's profile to this programme.
- summary: 1–2 sentences describing the overall recommendation portfolio.
- city: the specific city (and neighbourhood/district if famous, e.g. "Cambridge, MA" or "Bloomsbury, London").
- campusSetting: one short phrase — e.g. "Historic urban campus in central London", "Suburban parkland campus 20 min from city", "Rural collegiate campus".
- campusImageQuery: 3–6 plain English keywords that will retrieve a good photo of THIS university's campus from Unsplash (e.g. "Stanford University main quad", "IIT Bombay campus"). No punctuation.
- lifestyle: 1–2 sentences on student life — weather, housing style, social scene, cost of living, transport, notable student traditions.

Student profile: ${JSON.stringify({
          country: profile.country,
          educationalStage: profile.educational_stage,
          subjects: profile.current_subjects,
        })}
Academic qualifications: ${JSON.stringify(data.academic)}
Preferences: ${JSON.stringify(data.preferences)}
Career recommendations: ${JSON.stringify(recommendations)}`,
      });

      const { data: saved, error: saveError } = await context.supabase
        .from("university_matches")
        .insert({
          user_id: context.userId,
          academic_system: data.academic.system,
          academic_inputs: data.academic,
          preferences: data.preferences,
          matches: output.matches,
          summary: output.summary,
        })
        .select("*")
        .single();
      if (saveError) throw saveError;
      return { ok: true as const, record: saved };
    } catch (error) {
      console.error("University match generation failed", error);
      return { ok: false as const, error: friendlyAiError(error) };
    }
  });
