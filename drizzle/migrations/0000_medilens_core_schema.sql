-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  report_date DATE,
  lab_name TEXT,
  raw_text TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reports_user_idx ON public.reports(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports select" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reports insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reports update" ON public.reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reports delete" ON public.reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- report_tests
CREATE TABLE public.report_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  original_test_name TEXT,
  value TEXT,
  unit TEXT,
  reference_range TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',
  confidence NUMERIC,
  source_text TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX report_tests_report_idx ON public.report_tests(report_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_tests TO authenticated;
GRANT ALL ON public.report_tests TO service_role;
ALTER TABLE public.report_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tests select" ON public.report_tests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY "own tests insert" ON public.report_tests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY "own tests update" ON public.report_tests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY "own tests delete" ON public.report_tests FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));

-- explanations
CREATE TABLE public.explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_test_id UUID NOT NULL REFERENCES public.report_tests(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  explanation_level TEXT NOT NULL DEFAULT 'simple',
  summary TEXT,
  what_is_this_test TEXT,
  why_highlighted TEXT,
  general_context TEXT,
  safety_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_test_id, language, explanation_level)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.explanations TO authenticated;
GRANT ALL ON public.explanations TO service_role;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own explanations select" ON public.explanations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_tests t JOIN public.reports r ON r.id = t.report_id WHERE t.id = report_test_id AND r.user_id = auth.uid()));
CREATE POLICY "own explanations insert" ON public.explanations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_tests t JOIN public.reports r ON r.id = t.report_id WHERE t.id = report_test_id AND r.user_id = auth.uid()));

-- doctor_questions
CREATE TABLE public.doctor_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  question TEXT NOT NULL,
  evidence_test_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doctor_questions_report_idx ON public.doctor_questions(report_id, language);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_questions TO authenticated;
GRANT ALL ON public.doctor_questions TO service_role;
ALTER TABLE public.doctor_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own questions select" ON public.doctor_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY "own questions insert" ON public.doctor_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));
CREATE POLICY "own questions delete" ON public.doctor_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.user_id = auth.uid()));

-- profile auto-create
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, preferred_language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();