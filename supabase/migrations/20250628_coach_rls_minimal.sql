ALTER TABLE courses ADD COLUMN IF NOT EXISTS coach_id UUID;
CREATE INDEX IF NOT EXISTS idx_courses_coach ON courses(coach_id);
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sel_courses" ON courses;
DROP POLICY IF EXISTS "adm_courses" ON courses;
DROP POLICY IF EXISTS "coach_courses" ON courses;
CREATE POLICY "sel_courses" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "adm_courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coach_courses" ON courses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach') AND coach_id = auth.uid());

DROP POLICY IF EXISTS "sel_lessons" ON lessons;
DROP POLICY IF EXISTS "adm_lessons" ON lessons;
DROP POLICY IF EXISTS "coach_lessons" ON lessons;
CREATE POLICY "sel_lessons" ON lessons FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.is_published = true));
CREATE POLICY "adm_lessons" ON lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coach_lessons" ON lessons FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach') AND EXISTS (SELECT 1 FROM courses WHERE courses.id = lessons.course_id AND courses.coach_id = auth.uid()));

DROP POLICY IF EXISTS "sel_profiles" ON profiles;
DROP POLICY IF EXISTS "adm_profiles" ON profiles;
DROP POLICY IF EXISTS "coach_profiles" ON profiles;
CREATE POLICY "sel_profiles" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "adm_profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coach_profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach') AND role = 'student');

DROP POLICY IF EXISTS "sel_enroll" ON enrollments;
DROP POLICY IF EXISTS "adm_enroll" ON enrollments;
DROP POLICY IF EXISTS "coach_enroll" ON enrollments;
CREATE POLICY "sel_enroll" ON enrollments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "adm_enroll" ON enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "coach_enroll" ON enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach') AND EXISTS (SELECT 1 FROM courses WHERE courses.id = enrollments.course_id AND courses.coach_id = auth.uid()));
