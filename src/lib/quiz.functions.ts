import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveSchema = z.object({
  topFamily: z.string().min(1).max(40),
  scores: z.array(z.object({ family: z.string(), score: z.number() })).max(20),
  answers: z.array(z.array(z.string())).max(50),
});

export const saveQuizResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("quiz_results")
      .insert({ user_id: context.userId, top_family: data.topFamily, scores: data.scores, answers: data.answers })
      .select("id, created_at").single();
    if (error) throw error;
    return row;
  });

export const listQuizResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("quiz_results").select("id, top_family, scores, created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    return data ?? [];
  });
