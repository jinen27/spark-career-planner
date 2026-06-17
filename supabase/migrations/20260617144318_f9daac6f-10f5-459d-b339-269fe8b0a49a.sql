CREATE TABLE public.university_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_system TEXT NOT NULL,
  academic_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.university_matches TO authenticated;
GRANT ALL ON public.university_matches TO service_role;

ALTER TABLE public.university_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own university matches"
ON public.university_matches FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_university_matches_updated_at
BEFORE UPDATE ON public.university_matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_university_matches_user ON public.university_matches(user_id, updated_at DESC);