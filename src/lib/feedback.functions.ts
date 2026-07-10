import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FeedbackSchema = z.object({
  category: z.enum(["general", "bug", "question", "feature", "compliment"]),
  subject: z.string().trim().min(3, "Please add a short subject.").max(120),
  message: z.string().trim().min(10, "Please add a bit more detail.").max(4000),
  replyEmail: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("feedback_messages").insert({
      user_id: context.userId,
      category: data.category,
      subject: data.subject,
      message: data.message,
      reply_email: data.replyEmail || null,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const listMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("feedback_messages")
      .select("id, category, subject, message, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });
