CREATE TABLE public.career_reality_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recommendation_id uuid NOT NULL REFERENCES public.career_recommendations(id) ON DELETE CASCADE,
  career_slug text NOT NULL,
  career_title text NOT NULL,
  country text NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_as_of date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT career_reality_reports_user_recommendation_key UNIQUE (user_id, recommendation_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_reality_reports TO authenticated;
GRANT ALL ON public.career_reality_reports TO service_role;

ALTER TABLE public.career_reality_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own career reality reports"
ON public.career_reality_reports
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX career_reality_reports_user_updated_idx ON public.career_reality_reports (user_id, updated_at DESC);
CREATE INDEX career_reality_reports_recommendation_idx ON public.career_reality_reports (recommendation_id);

CREATE TRIGGER set_career_reality_reports_updated_at
BEFORE UPDATE ON public.career_reality_reports
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();