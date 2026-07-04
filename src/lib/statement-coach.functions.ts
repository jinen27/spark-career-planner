import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CoachInput = z.object({
  statement: z.string().min(80, "Please paste at least a paragraph (80+ characters).").max(8000),
  course: z.string().min(2).max(120),
  university: z.string().max(120).optional().default(""),
  applicationSystem: z.enum(["ucas", "common_app", "coalition", "other"]).default("ucas"),
});

const CriterionSchema = z.object({
  name: z.string(),
  score: z.number().int().min(0).max(10),
  summary: z.string(),
  strengths: z.array(z.string()).max(4),
  improvements: z.array(z.string()).max(4),
});

const CoachOutputSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  verdict: z.string(),
  hookRewrite: z.string(),
  criteria: z.array(CriterionSchema).min(5).max(6),
  lineEdits: z.array(z.object({
    original: z.string(),
    suggestion: z.string(),
    reason: z.string(),
  })).max(6),
  missingEvidence: z.array(z.string()).max(6),
  clichesFlagged: z.array(z.string()).max(6),
  nextSteps: z.array(z.string()).min(3).max(6),
});

function friendlyAiError(error: unknown) {
  if (NoObjectGeneratedError.isInstance(error)) return "The coach couldn't format its feedback. Please try again.";
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("402")) return "Personal Statement Coach is temporarily unavailable (workspace has no AI credits).";
  if (msg.includes("429")) return "The coach is busy right now. Please wait a moment and try again.";
  return `Coach error: ${msg.slice(0, 240)}`;
}

export const critiqueStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoachInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Personal Statement Coach is temporarily unavailable." };

    const { data: profile } = await context.supabase
      .from("profiles").select("country, educational_stage, current_subjects").eq("id", context.userId).maybeSingle();

    const wordCount = data.statement.trim().split(/\s+/).length;
    const { createCareerAiProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createCareerAiProvider(apiKey);

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: CoachOutputSchema }),
        prompt: `You are an experienced university admissions tutor giving honest, constructive feedback on a draft personal statement.

Application system: ${data.applicationSystem.toUpperCase()}
Course applied for: ${data.course}
Target university: ${data.university || "(not specified)"}
Student context: ${JSON.stringify(profile ?? {})}
Draft word count: ${wordCount}

Evaluate the draft on FIVE to SIX criteria:
1. Opening hook — does the first paragraph grab attention without cliché?
2. Academic motivation — is the interest in ${data.course} specific and evidenced?
3. Evidence & super-curricular — books, projects, competitions, work, wider reading?
4. Reflection & insight — does the student SHOW thinking, not just list activities?
5. Structure & flow — clear thread, purposeful paragraphs, strong closing?
6. Style & clarity — concise, mature, free of hedging and jargon?

For each criterion give a 0–10 score, a one-sentence summary, up to 4 strengths, up to 4 concrete improvements.

Then produce:
- hookRewrite: one improved opening sentence in the student's voice (do not invent facts).
- lineEdits: up to 6 short before/after suggestions taken from the actual draft.
- missingEvidence: gaps the tutor would probe in interview.
- clichesFlagged: phrases like "from a young age", "passionate", "ever since I can remember".
- nextSteps: 3–6 prioritised actions the student should take before submitting.
- overallScore: 0–100 holistic mark.
- verdict: 1–2 sentence honest overall judgement, calibrated (not falsely encouraging, not harsh).

Rules:
- Never rewrite the entire statement.
- Never fabricate experiences or credentials for the student.
- Respect ${data.applicationSystem === "ucas" ? "the UCAS 4,000 character / 47 line limit" : "typical Common App 650-word limit"}.
- Be direct and specific. Quote short phrases from the draft when giving line edits.

Draft:
"""
${data.statement}
"""`,
      });
      return { ok: true as const, feedback: output, wordCount };
    } catch (error) {
      console.error("Statement coach failed", error);
      return { ok: false as const, error: friendlyAiError(error) };
    }
  });
