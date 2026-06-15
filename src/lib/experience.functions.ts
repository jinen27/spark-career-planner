import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TaskSchema = z.object({
  title: z.string(),
  scenario: z.string(),
  instructions: z.string(),
  prompts: z.array(z.string()).min(2).max(4),
  timeEstimate: z.string(),
});

const FeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).min(2).max(4),
  growthAreas: z.array(z.string()).min(1).max(3),
  alignment: z.enum(["strong", "promising", "mixed"]),
  alignmentReason: z.string(),
  relatedCareers: z.array(z.string()).min(1).max(3),
  nextStep: z.string(),
});

const GenerateTaskInput = z.object({ recommendationId: z.string().uuid() });
const SubmitTaskInput = z.object({
  recommendationId: z.string().uuid(),
  task: TaskSchema,
  response: z.string().trim().min(40).max(6000),
  enjoyment: z.number().int().min(1).max(5),
});

function friendlyAiError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) return "The activity could not be prepared correctly. Please try again.";
  if (error instanceof Error && error.message.includes("402")) return "AI feedback is temporarily unavailable because the workspace has no AI credits.";
  if (error instanceof Error && error.message.includes("429")) return "The Explorer is busy right now. Please wait a moment and try again.";
  return "The Explorer is temporarily unavailable. Please try again.";
}

export const getExperienceExplorer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [recommendationsResult, experiencesResult, profileResult] = await Promise.all([
      context.supabase.from("career_recommendations").select("id, career_slug, career_title, description, rank").eq("user_id", context.userId).order("rank"),
      context.supabase.from("career_experiences").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("display_name, educational_stage, current_subjects").eq("id", context.userId).maybeSingle(),
    ]);
    if (recommendationsResult.error) throw recommendationsResult.error;
    if (experiencesResult.error) throw experiencesResult.error;
    if (profileResult.error) throw profileResult.error;
    return { recommendations: recommendationsResult.data, experiences: experiencesResult.data, profile: profileResult.data };
  });

export const generateCareerExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateTaskInput.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: recommendation, error }, { data: profile }] = await Promise.all([
      context.supabase.from("career_recommendations").select("*").eq("id", data.recommendationId).eq("user_id", context.userId).single(),
      context.supabase.from("profiles").select("educational_stage, current_subjects").eq("id", context.userId).maybeSingle(),
    ]);
    if (error) throw error;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The Explorer is temporarily unavailable." };
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({ schema: TaskSchema, name: "career_experience", description: "A safe, realistic 10–15 minute career simulation for a secondary-school student." }),
        prompt: `Design one realistic, self-contained career simulation for a student exploring ${recommendation.career_title}. It must mimic a genuine judgement, analysis, communication, design, or problem-solving task from the profession without requiring specialist software, private data, physical risk, medical treatment, or legal advice. Give enough fictional evidence and constraints inside the scenario for the student to respond. Do not test memorised technical knowledge. Make it suitable for ${profile?.educational_stage ?? "secondary"} level. Their current subjects are ${JSON.stringify(profile?.current_subjects ?? [])}. The activity should take 10–15 minutes and use 2–4 short prompts. Career context: ${recommendation.description}. Typical responsibilities: ${JSON.stringify(recommendation.responsibilities)}.`,
      });
      return { ok: true as const, task: output };
    } catch (generationError) {
      console.error("Career experience generation failed", generationError);
      return { ok: false as const, error: friendlyAiError(generationError) };
    }
  });

export const submitCareerExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SubmitTaskInput.parse(input))
  .handler(async ({ data, context }) => {
    const [{ data: recommendation, error }, { data: profile }] = await Promise.all([
      context.supabase.from("career_recommendations").select("*").eq("id", data.recommendationId).eq("user_id", context.userId).single(),
      context.supabase.from("profiles").select("educational_stage, current_subjects").eq("id", context.userId).maybeSingle(),
    ]);
    if (error) throw error;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI feedback is temporarily unavailable. Your response has not been submitted." };
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({ schema: FeedbackSchema, name: "career_experience_feedback", description: "Supportive, evidence-based feedback on a student's career simulation response." }),
        prompt: `Act as a supportive career coach, not a grader. Review this student's response to a ${recommendation.career_title} simulation. Identify demonstrated strengths using direct evidence from their response, practical growth areas, and whether the work still appears aligned with their interests and abilities. Alignment is exploratory, never a prediction of success. If they enjoyed only parts of the task, suggest related careers that use those parts. Keep feedback concise, specific, age-appropriate, and avoid medical, legal, or psychological claims.\n\nStudent stage: ${profile?.educational_stage ?? "secondary"}\nSubjects: ${JSON.stringify(profile?.current_subjects ?? [])}\nCareer: ${recommendation.career_title}\nTask: ${JSON.stringify(data.task)}\nStudent response: ${data.response}\nEnjoyment rating: ${data.enjoyment}/5`,
      });
      const { data: saved, error: saveError } = await context.supabase.from("career_experiences").insert({
        user_id: context.userId,
        recommendation_id: recommendation.id,
        career_slug: recommendation.career_slug,
        career_title: recommendation.career_title,
        task_title: data.task.title,
        scenario: data.task.scenario,
        instructions: `${data.task.instructions}\n\n${data.task.prompts.join("\n")}`,
        response: data.response,
        enjoyment: data.enjoyment,
        feedback: output,
      }).select("*").single();
      if (saveError) throw saveError;
      return { ok: true as const, experience: saved };
    } catch (submissionError) {
      console.error("Career experience feedback failed", submissionError);
      return { ok: false as const, error: friendlyAiError(submissionError) };
    }
  });