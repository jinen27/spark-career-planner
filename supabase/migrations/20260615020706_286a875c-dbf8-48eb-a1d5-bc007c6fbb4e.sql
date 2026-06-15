CREATE TABLE public.career_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid REFERENCES public.career_recommendations(id) ON DELETE SET NULL,
  career_slug text NOT NULL,
  career_title text NOT NULL,
  task_title text NOT NULL,
  scenario text NOT NULL,
  instructions text NOT NULL,
  response text NOT NULL,
  enjoyment integer NOT NULL,
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_experiences_enjoyment_range CHECK (enjoyment BETWEEN 1 AND 5)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_experiences TO authenticated;
GRANT ALL ON public.career_experiences TO service_role;

ALTER TABLE public.career_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own career experiences"
ON public.career_experiences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX career_experiences_user_created_idx ON public.career_experiences (user_id, created_at DESC);
CREATE INDEX career_experiences_recommendation_idx ON public.career_experiences (recommendation_id);

CREATE TRIGGER set_career_experiences_updated_at
BEFORE UPDATE ON public.career_experiences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();