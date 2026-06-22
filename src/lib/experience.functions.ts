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

export type CatalogCareer = {
  slug: string;
  title: string;
  description: string;
  responsibilities: string[];
  category: string;
};

export const CAREER_CATALOG: CatalogCareer[] = [
  { slug: "chef", title: "Chef", category: "Hospitality & Culinary", description: "Design menus, lead a kitchen brigade, and craft dishes that balance flavour, cost, and consistency under pressure.", responsibilities: ["Menu design and costing", "Service-time coordination", "Ingredient sourcing", "Plating and quality control"] },
  { slug: "software-engineer", title: "Software Engineer", category: "Technology", description: "Design, build, and maintain software systems used by other people and businesses.", responsibilities: ["System and API design", "Writing and reviewing code", "Debugging production issues", "Working with product and design"] },
  { slug: "civil-engineer", title: "Civil Engineer", category: "Engineering", description: "Plan and supervise the construction of bridges, roads, buildings, and water systems.", responsibilities: ["Structural calculations", "Site inspections", "Material and cost planning", "Safety compliance"] },
  { slug: "mechanical-engineer", title: "Mechanical Engineer", category: "Engineering", description: "Design machines, engines, and mechanical systems from concept to manufacturing.", responsibilities: ["CAD modelling", "Prototype testing", "Tolerancing and materials selection", "Manufacturing handover"] },
  { slug: "electrical-engineer", title: "Electrical Engineer", category: "Engineering", description: "Design circuits, power systems, and electronics that drive modern devices and infrastructure.", responsibilities: ["Circuit design", "Component selection", "Load and safety analysis", "PCB layout review"] },
  { slug: "investment-banker", title: "Investment Banker", category: "Finance", description: "Advise companies on raising capital, M&A, and large financial transactions.", responsibilities: ["Financial modelling", "Pitch decks", "Client meetings", "Deal execution"] },
  { slug: "management-consultant", title: "Management Consultant", category: "Business", description: "Help companies solve strategic and operational problems through analysis and recommendation.", responsibilities: ["Problem structuring", "Interviews and research", "Quantitative analysis", "Executive recommendations"] },
  { slug: "doctor", title: "Doctor (General Practitioner)", category: "Healthcare", description: "Diagnose and treat patients across a wide range of medical conditions.", responsibilities: ["Patient consultations", "Diagnostic reasoning", "Treatment planning", "Referrals and follow-up"] },
  { slug: "nurse", title: "Registered Nurse", category: "Healthcare", description: "Provide direct patient care, coordinate treatment, and act as the patient's frontline advocate.", responsibilities: ["Patient assessment", "Medication administration", "Care coordination", "Patient education"] },
  { slug: "lawyer", title: "Lawyer (Solicitor)", category: "Law", description: "Advise clients on legal matters and represent their interests in negotiations or court.", responsibilities: ["Drafting contracts", "Legal research", "Client advice", "Dispute resolution"] },
  { slug: "architect", title: "Architect", category: "Design & Built Environment", description: "Design buildings and spaces that balance form, function, regulation, and budget.", responsibilities: ["Concept sketches", "Floor plans and 3D models", "Client presentations", "Coordination with engineers"] },
  { slug: "graphic-designer", title: "Graphic Designer", category: "Creative", description: "Create visual identity, layouts, and assets across digital and print media.", responsibilities: ["Branding", "Layout design", "Typography", "Production-ready files"] },
  { slug: "journalist", title: "Journalist", category: "Media", description: "Research, write, and publish stories that inform the public.", responsibilities: ["Source interviews", "Fact-checking", "Story structuring", "Editing to a deadline"] },
  { slug: "teacher", title: "Secondary School Teacher", category: "Education", description: "Plan lessons, teach, and support students through their academic and personal development.", responsibilities: ["Lesson planning", "Classroom delivery", "Assessment and feedback", "Pastoral support"] },
  { slug: "marketing-manager", title: "Marketing Manager", category: "Business", description: "Plan and run marketing campaigns to grow a product or brand.", responsibilities: ["Campaign strategy", "Channel mix decisions", "Creative briefs", "Performance analysis"] },
  { slug: "product-manager", title: "Product Manager", category: "Technology", description: "Decide what a product should do, why, and in what order — then ship it with a team.", responsibilities: ["Roadmap and prioritisation", "User research", "Specs and trade-offs", "Cross-team coordination"] },
  { slug: "data-scientist", title: "Data Scientist", category: "Technology", description: "Use statistics, code, and ML to turn data into decisions.", responsibilities: ["Hypothesis framing", "Data wrangling", "Modelling", "Communicating findings"] },
  { slug: "psychologist", title: "Clinical Psychologist", category: "Healthcare", description: "Assess and support people experiencing mental-health and behavioural challenges.", responsibilities: ["Intake interviews", "Therapy planning", "Evidence-based interventions", "Outcome tracking"] },
  { slug: "entrepreneur", title: "Entrepreneur / Founder", category: "Business", description: "Identify a problem worth solving and build a venture around it.", responsibilities: ["Customer discovery", "Product decisions", "Fundraising", "Team building"] },
  { slug: "pilot", title: "Commercial Pilot", category: "Aviation", description: "Operate aircraft safely and make in-flight decisions in changing conditions.", responsibilities: ["Pre-flight planning", "Crew coordination", "In-flight decision-making", "Post-flight reporting"] },
];

const Source = z.enum(["recommendation", "catalog"]);
const GenerateTaskInput = z.object({
  source: Source,
  recommendationId: z.string().uuid().optional(),
  careerSlug: z.string().optional(),
}).refine((v) => v.source === "recommendation" ? !!v.recommendationId : !!v.careerSlug, { message: "Missing identifier" });

const SubmitTaskInput = z.object({
  source: Source,
  recommendationId: z.string().uuid().optional(),
  careerSlug: z.string().optional(),
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

type CareerContext = { slug: string; title: string; description: string; responsibilities: unknown };

async function resolveCareer(
  supabase: Awaited<ReturnType<typeof requireSupabaseAuth.client>> extends never ? never : any,
  userId: string,
  input: { source: "recommendation" | "catalog"; recommendationId?: string; careerSlug?: string },
): Promise<{ career: CareerContext; recommendationId: string | null }> {
  if (input.source === "recommendation" && input.recommendationId) {
    const { data, error } = await supabase.from("career_recommendations").select("*").eq("id", input.recommendationId).eq("user_id", userId).single();
    if (error) throw error;
    return { career: { slug: data.career_slug, title: data.career_title, description: data.description, responsibilities: data.responsibilities }, recommendationId: data.id };
  }
  const entry = CAREER_CATALOG.find((c) => c.slug === input.careerSlug);
  if (!entry) throw new Error("Career not found in catalog");
  return { career: entry, recommendationId: null };
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
    return { recommendations: recommendationsResult.data, experiences: experiencesResult.data, profile: profileResult.data, catalog: CAREER_CATALOG };
  });

export const generateCareerExperience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateTaskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { career } = await resolveCareer(context.supabase, context.userId, data);
    const { data: profile } = await context.supabase.from("profiles").select("educational_stage, current_subjects").eq("id", context.userId).maybeSingle();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "The Explorer is temporarily unavailable." };
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({ schema: TaskSchema, name: "career_experience", description: "A safe, realistic 10–15 minute career simulation for a secondary-school student." }),
        prompt: `Design one realistic, self-contained career simulation for a student exploring ${career.title}. It must mimic a genuine judgement, analysis, communication, design, or problem-solving task from the profession without requiring specialist software, private data, physical risk, medical treatment, or legal advice. Give enough fictional evidence and constraints inside the scenario for the student to respond. Do not test memorised technical knowledge. Make it suitable for ${profile?.educational_stage ?? "secondary"} level. Their current subjects are ${JSON.stringify(profile?.current_subjects ?? [])}. The activity should take 10–15 minutes and use 2–4 short prompts. Career context: ${career.description}. Typical responsibilities: ${JSON.stringify(career.responsibilities)}.`,
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
    const { career, recommendationId } = await resolveCareer(context.supabase, context.userId, data);
    const { data: profile } = await context.supabase.from("profiles").select("educational_stage, current_subjects").eq("id", context.userId).maybeSingle();
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI feedback is temporarily unavailable. Your response has not been submitted." };
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);
    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3.5-flash"),
        output: Output.object({ schema: FeedbackSchema, name: "career_experience_feedback", description: "Supportive, evidence-based feedback on a student's career simulation response." }),
        prompt: `Act as a supportive career coach, not a grader. Review this student's response to a ${career.title} simulation. Identify demonstrated strengths using direct evidence from their response, practical growth areas, and whether the work still appears aligned with their interests and abilities. Alignment is exploratory, never a prediction of success. If they enjoyed only parts of the task, suggest related careers that use those parts. Keep feedback concise, specific, age-appropriate, and avoid medical, legal, or psychological claims.\n\nStudent stage: ${profile?.educational_stage ?? "secondary"}\nSubjects: ${JSON.stringify(profile?.current_subjects ?? [])}\nCareer: ${career.title}\nTask: ${JSON.stringify(data.task)}\nStudent response: ${data.response}\nEnjoyment rating: ${data.enjoyment}/5`,
      });
      const { data: saved, error: saveError } = await context.supabase.from("career_experiences").insert({
        user_id: context.userId,
        recommendation_id: recommendationId,
        career_slug: career.slug,
        career_title: career.title,
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
