-- ============================================
-- Migration: 20260711_progress_enrollment_write_policies
-- Fix RLS for lesson_progress and course_enrollments writes
-- Add missing modules table and courses.coach_id
-- ============================================

-- 1. Ensure app-expected course ownership column exists.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_courses_coach ON public.courses(coach_id);

-- 2. Ensure app-expected modules table exists.
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, "order")
);

CREATE INDEX IF NOT EXISTS idx_modules_course ON public.modules(course_id);

-- 3. Enable RLS on tables that need write policies.
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- 4. Modules policies: read follows published courses; admin/coach writes follow course ownership.
DROP POLICY IF EXISTS "sel_modules" ON public.modules;
DROP POLICY IF EXISTS "adm_modules" ON public.modules;
DROP POLICY IF EXISTS "coach_modules" ON public.modules;

CREATE POLICY "sel_modules" ON public.modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.is_published = true
    )
  );

CREATE POLICY "adm_modules" ON public.modules
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "coach_modules" ON public.modules
  FOR ALL
  USING (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    is_coach(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.courses
      WHERE courses.id = modules.course_id
        AND courses.coach_id = auth.uid()
    )
  );

-- 5. lesson_progress: INSERT/UPDATE required by markLessonCompleteAuth.
DROP POLICY IF EXISTS "ins_own_progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "upd_own_progress" ON public.lesson_progress;

CREATE POLICY "ins_own_progress" ON public.lesson_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "upd_own_progress" ON public.lesson_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. course_enrollments: INSERT/UPDATE required by enrollCurrentUser.
DROP POLICY IF EXISTS "ins_own_enrollment" ON public.course_enrollments;
DROP POLICY IF EXISTS "upd_own_enrollment" ON public.course_enrollments;

CREATE POLICY "ins_own_enrollment" ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.courses
      WHERE courses.id = course_enrollments.course_id
        AND courses.is_published = true
    )
  );

CREATE POLICY "upd_own_enrollment" ON public.course_enrollments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
