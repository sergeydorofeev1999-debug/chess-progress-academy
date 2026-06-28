-- ============================================
-- FIX: Infinite recursion in RLS policies
-- ============================================

-- Create helper functions with SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION is_coach(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'coach');
END;
$$;

-- ============================================
-- FIX: Profiles policies (no recursion)
-- ============================================

DROP POLICY IF EXISTS "sel_profiles" ON profiles;
DROP POLICY IF EXISTS "adm_profiles" ON profiles;
DROP POLICY IF EXISTS "coach_profiles" ON profiles;

CREATE POLICY "sel_profiles" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "adm_profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "coach_profiles" ON profiles
  FOR SELECT USING (is_coach(auth.uid()) AND role = 'student');

-- ============================================
-- FIX: Courses policies (no recursion)
-- ============================================

DROP POLICY IF EXISTS "sel_courses" ON courses;
DROP POLICY IF EXISTS "adm_courses" ON courses;
DROP POLICY IF EXISTS "coach_courses" ON courses;

CREATE POLICY "sel_courses" ON courses
  FOR SELECT USING (is_published = true);

CREATE POLICY "adm_courses" ON courses
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "coach_courses" ON courses
  FOR ALL USING (is_coach(auth.uid()) AND coach_id = auth.uid());

-- ============================================
-- FIX: Lessons policies (no recursion)
-- ============================================

DROP POLICY IF EXISTS "sel_lessons" ON lessons;
DROP POLICY IF EXISTS "adm_lessons" ON lessons;
DROP POLICY IF EXISTS "coach_lessons" ON lessons;

CREATE POLICY "sel_lessons" ON lessons
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.is_published = true
  ));

CREATE POLICY "adm_lessons" ON lessons
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "coach_lessons" ON lessons
  FOR ALL USING (is_coach(auth.uid()) AND EXISTS (
    SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.coach_id = auth.uid()
  ));

-- ============================================
-- FIX: Enrollments policies (no recursion)
-- ============================================

DROP POLICY IF EXISTS "sel_enroll" ON course_enrollments;
DROP POLICY IF EXISTS "adm_enroll" ON course_enrollments;
DROP POLICY IF EXISTS "coach_enroll" ON course_enrollments;

CREATE POLICY "sel_enroll" ON course_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "adm_enroll" ON course_enrollments
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "coach_enroll" ON course_enrollments
  FOR SELECT USING (is_coach(auth.uid()) AND EXISTS (
    SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.coach_id = auth.uid()
  ));
