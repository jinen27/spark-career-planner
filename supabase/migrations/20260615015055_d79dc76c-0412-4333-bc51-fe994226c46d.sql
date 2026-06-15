CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 100),
  school_year text NOT NULL DEFAULT '' CHECK (char_length(school_year) <= 50),
  country text NOT NULL DEFAULT '' CHECK (char_length(country) <= 100),
  educational_stage text NOT NULL DEFAULT 'secondary' CHECK (educational_stage IN ('lower_secondary', 'secondary', 'sixth_form', 'other')),
  current_subjects text[] NOT NULL DEFAULT '{}',
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'analysing', 'completed')),
  version text NOT NULL DEFAULT 'riasec-v1' CHECK (char_length(version) <= 40),
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_sessions TO authenticated;
GRANT ALL ON public.assessment_sessions TO service_role;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage their own assessments" ON public.assessment_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX assessment_sessions_user_created_idx ON public.assessment_sessions (user_id, created_at DESC);
CREATE TRIGGER set_assessment_sessions_updated_at BEFORE UPDATE ON public.assessment_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.career_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  career_slug text NOT NULL CHECK (char_length(career_slug) <= 120),
  career_title text NOT NULL CHECK (char_length(career_title) <= 150),
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 20),
  confidence integer NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  description text NOT NULL CHECK (char_length(description) <= 2000),
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  responsibilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  outlook text NOT NULL DEFAULT '' CHECK (char_length(outlook) <= 1000),
  pathways jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_professions jsonb NOT NULL DEFAULT '[]'::jsonb,
  university_majors jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
  technical_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  soft_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  preparation_experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, rank)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_recommendations TO authenticated;
GRANT ALL ON public.career_recommendations TO service_role;
ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage their own recommendations" ON public.career_recommendations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_recommendations_user_assessment_idx ON public.career_recommendations (user_id, assessment_id, rank);
CREATE TRIGGER set_career_recommendations_updated_at BEFORE UPDATE ON public.career_recommendations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  assessment_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.career_recommendations(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) <= 180),
  description text NOT NULL CHECK (char_length(description) <= 1500),
  category text NOT NULL CHECK (category IN ('academic', 'skill', 'experience', 'application')),
  timeframe text NOT NULL CHECK (char_length(timeframe) <= 80),
  sequence integer NOT NULL CHECK (sequence BETWEEN 1 AND 50),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_plans TO authenticated;
GRANT ALL ON public.development_plans TO service_role;
ALTER TABLE public.development_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage their own development plans" ON public.development_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX development_plans_user_assessment_idx ON public.development_plans (user_id, assessment_id, sequence);
CREATE TRIGGER set_development_plans_updated_at BEFORE UPDATE ON public.development_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();