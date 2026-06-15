import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateScores } from "@/lib/assessment";

const ResponsesSchema = z.record(z.string(), z.number().int().min(1).max(5));
const SaveAssessmentSchema = z.object({ id: z.string().uuid().optional(), responses: ResponsesSchema, progress: z.number().int().min(0).max(100) });
const ProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  schoolYear: z.string().trim().min(1).max(50),
  country: z.string().trim().min(2).max(100),
  educationalStage: z.enum(["lower_secondary", "secondary", "sixth_form", "other"]),
  currentSubjects: z.array(z.string().trim().min(1).max(60)).max(20),
});

const RecommendationSchema = z.object({
  careerSlug: z.string(), careerTitle: z.string(), confidence: z.number(), description: z.string(),
  matchReasons: z.array(z.string()), responsibilities: z.array(z.string()), outlook: z.string(),
  pathways: z.array(z.string()), relatedProfessions: z.array(z.string()), universityMajors: z.array(z.string()),
  recommendedSubjects: z.array(z.string()), technicalSkills: z.array(z.string()), softSkills: z.array(z.string()),
  preparationExperiences: z.array(z.string()),
});
const AnalysisSchema = z.object({
  recommendations: z.array(RecommendationSchema).length(3),
  roadmap: z.array(z.object({ title: z.string(), description: z.string(), category: z.enum(["academic", "skill", "experience", "application"]), timeframe: z.string() })).min(4).max(6),
});

const ANALYSIS_INSTRUCTIONS = `Return a career analysis matching the supplied schema exactly. Include exactly 3 recommendations and 4 to 6 roadmap steps. Confidence must be a number from 0 to 100. Every roadmap category must be one of: academic, skill, experience, application. Do not omit any field. Use empty arrays rather than omitting array fields.`;

export const getDashboard = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profileResult, assessmentResult] = await Promise.all([
    context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    context.supabase.from("assessment_sessions").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (assessmentResult.error) throw assessmentResult.error;
  const assessment = assessmentResult.data;
  if (!assessment) return { profile: profileResult.data, assessment: null, recommendations: [], plan: [] };
  const [recommendationsResult, planResult] = await Promise.all([
    context.supabase.from("career_recommendations").select("*").eq("assessment_id", assessment.id).order("rank"),
    context.supabase.from("development_plans").select("*").eq("assessment_id", assessment.id).order("sequence"),
  ]);
  if (recommendationsResult.error) throw recommendationsResult.error;
  if (planResult.error) throw planResult.error;
  return { profile: profileResult.data, assessment, recommendations: recommendationsResult.data, plan: planResult.data };
});

export const saveProfile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => ProfileSchema.parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("profiles").upsert({ id: context.userId, display_name: data.displayName, school_year: data.schoolYear, country: data.country, educational_stage: data.educationalStage, current_subjects: data.currentSubjects });
  if (error) throw error;
  return { ok: true };
});

export const saveAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => SaveAssessmentSchema.parse(input)).handler(async ({ data, context }) => {
  const payload = { user_id: context.userId, responses: data.responses, scores: calculateScores(data.responses), progress: data.progress };
  if (data.id) {
    const { error } = await context.supabase.from("assessment_sessions").update(payload).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { id: data.id };
  }
  const { data: created, error } = await context.supabase.from("assessment_sessions").insert(payload).select("id").single();
  if (error) throw error;
  return created;
});

export const analyseAssessment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ assessmentId: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const [{ data: assessment, error: assessmentError }, { data: profile, error: profileError }] = await Promise.all([
    context.supabase.from("assessment_sessions").select("*").eq("id", data.assessmentId).eq("user_id", context.userId).single(),
    context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
  ]);
  if (assessmentError) throw assessmentError;
  if (profileError) throw profileError;
  if (assessment.progress < 100) throw new Error("Please complete every assessment question first.");
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Career analysis is temporarily unavailable.");
  const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
  const gateway = createCareerAiProvider(apiKey);
   const model = gateway("google/gemini-3-flash-preview");
   const prompt = `You are an ethical career counsellor for secondary school students. Generate diverse, realistic and explainable career recommendations. Never imply certainty; confidence is profile fit, not predicted success. Use concise, supportive language. Ground every match reason in the supplied profile and RIASEC scores. Include current but non-numeric job outlook language, pathways, related roles, degree majors, school subjects, technical and soft skills, and concrete preparation experiences. Build a staged roadmap suitable for the student's education level.\n\n${ANALYSIS_INSTRUCTIONS}\n\nStudent profile: ${JSON.stringify(profile)}\nRIASEC scores (0-100): ${JSON.stringify(assessment.scores)}`;
   let output: z.infer<typeof AnalysisSchema>;
   try {
     const result = await generateText({
       model,
       output: Output.object({ schema: AnalysisSchema, name: "career_analysis", description: ANALYSIS_INSTRUCTIONS }),
       prompt,
     });
     output = result.output;
   } catch (error) {
     if (!NoObjectGeneratedError.isInstance(error)) throw error;
     if (error.finishReason === "length") {
       console.warn("Career analysis was truncated before schema validation completed.");
       return { ok: false, error: "The career analysis was too long to complete. Please try again." };
     }

     console.warn("Career analysis failed schema validation; attempting one structured repair.", error.cause);
     try {
       const repaired = await generateText({
         model,
         output: Output.object({ schema: AnalysisSchema, name: "career_analysis", description: ANALYSIS_INSTRUCTIONS }),
         prompt: `Correct the draft below so it matches the required schema exactly. Preserve useful content, add any missing fields, use exactly 3 recommendations and 4 to 6 roadmap steps, and return only the corrected structured result.\n\n${ANALYSIS_INSTRUCTIONS}\n\nDraft:\n${error.text ?? "No usable draft was returned; generate the analysis again from the original request."}\n\nOriginal request:\n${prompt}`,
       });
       output = repaired.output;
     } catch (repairError) {
       console.error("Career analysis schema repair failed.", repairError);
       return { ok: false, error: "We couldn't format your career analysis correctly. Your answers are saved—please try again." };
     }
   }
  await context.supabase.from("career_recommendations").delete().eq("assessment_id", assessment.id).eq("user_id", context.userId);
  await context.supabase.from("development_plans").delete().eq("assessment_id", assessment.id).eq("user_id", context.userId);
  const recommendations = output.recommendations.map((item, index) => ({
    user_id: context.userId, assessment_id: assessment.id, rank: index + 1, career_slug: item.careerSlug.slice(0, 120), career_title: item.careerTitle.slice(0, 150), confidence: Math.max(0, Math.min(100, Math.round(item.confidence))), description: item.description, match_reasons: item.matchReasons, responsibilities: item.responsibilities, outlook: item.outlook, pathways: item.pathways, related_professions: item.relatedProfessions, university_majors: item.universityMajors, recommended_subjects: item.recommendedSubjects, technical_skills: item.technicalSkills, soft_skills: item.softSkills, preparation_experiences: item.preparationExperiences,
  }));
  const { data: inserted, error: recError } = await context.supabase.from("career_recommendations").insert(recommendations).select("id, rank");
  if (recError) throw recError;
  const topId = inserted.find((item) => item.rank === 1)?.id ?? null;
  const plan = output.roadmap.map((item, index) => ({ user_id: context.userId, assessment_id: assessment.id, recommendation_id: topId, title: item.title, description: item.description, category: item.category, timeframe: item.timeframe, sequence: index + 1 }));
  const { error: planError } = await context.supabase.from("development_plans").insert(plan);
  if (planError) throw planError;
  const { error: completeError } = await context.supabase.from("assessment_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", assessment.id);
  if (completeError) throw completeError;
   return { ok: true, error: null };
});

export const togglePlanStep = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), completed: z.boolean() }).parse(input)).handler(async ({ data, context }) => {
  const { error } = await context.supabase.from("development_plans").update({ completed: data.completed }).eq("id", data.id).eq("user_id", context.userId);
  if (error) throw error;
  return { ok: true };
});