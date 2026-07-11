'use server';

import { createClient } from './supabase/server';

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function assertCanManageCourse(supabase: any, userId: string, courseId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (profileError) throw profileError;

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, coach_id')
    .eq('id', courseId)
    .single();
  if (courseError) throw courseError;

  if (profile?.role === 'admin') return;
  if (profile?.role === 'coach' && course?.coach_id === userId) return;

  throw new Error('Unauthorized');
}

export async function getCourses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at');
  if (error) throw error;
  return data || [];
}

export async function getCourseWithModules(id: string) {
  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();
  if (courseError) throw courseError;

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select(`
      *,
      lessons (*)
    `)
    .eq('course_id', id)
    .order('"order"')
    .order('"order"', { foreignTable: 'lessons' });
  if (modulesError) throw modulesError;

  return { course, modules: modules || [] };
}

export async function getLesson(id: string) {
  const supabase = await createClient();
  let lesson: any = null;
  if (isUUID(id)) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    lesson = data;
  } else {
    const order = parseInt(id, 10);
    if (isNaN(order)) return null;
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('"order"', order)
      .single();
    if (error) throw error;
    lesson = data;
  }
  // Security: ensure the course is published before returning the lesson
  if (lesson?.course_id) {
    const { data: course } = await supabase
      .from('courses')
      .select('is_published')
      .eq('id', lesson.course_id)
      .single();
    if (!course?.is_published) return null;
  }
  return lesson;
}

export async function getCourseLessons(courseId: string) {
  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('is_published', true)
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) return [];

  const { data, error } = await supabase
    .from('lessons')
    .select('id,title,"order",duration_minutes,video_url')
    .eq('course_id', courseId)
    .order('"order"');
  if (error) throw error;
  return data || [];
}

export async function getUserProgress(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch lesson IDs for this course first
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id')
    .eq('course_id', courseId);
  if (lessonsError) throw lessonsError;

  const lessonIds = (lessons || []).map((l: any) => l.id);
  if (lessonIds.length === 0) return [];

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)
    .in('lesson_id', lessonIds);
  if (error) throw error;
  return data || [];
}

/** Batch-fetch course progress for dashboard — replaces N+1 per-course calls. */
export async function getCurrentUserCourseProgress(courseIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (courseIds.length === 0) return {};

  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .in('course_id', courseIds);
  if (lessonsError) throw lessonsError;

  const progressPerCourse: Record<string, { completed: number; total: number }> = {};
  courseIds.forEach(courseId => {
    progressPerCourse[courseId] = {
      completed: 0,
      total: (lessons || []).filter((l: any) => l.course_id === courseId).length,
    };
  });

  const lessonIds = (lessons || []).map((l: any) => l.id);
  if (lessonIds.length === 0) return progressPerCourse;

  const { data: progress, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)
    .in('lesson_id', lessonIds);
  if (progressError) throw progressError;

  const lessonCourseById = new Map((lessons || []).map((l: any) => [l.id, l.course_id]));
  (progress || []).forEach((item: any) => {
    if (!item.is_completed) return;
    const courseId = lessonCourseById.get(item.lesson_id);
    if (courseId && progressPerCourse[courseId]) {
      progressPerCourse[courseId].completed += 1;
    }
  });

  return progressPerCourse;
}

/** Auth-safe version — userId taken from session, never from client params. */
export async function markLessonCompleteAuth(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const userId = user.id;

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id')
    .eq('id', lessonId)
    .single();
  if (lessonError) throw lessonError;

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', userId)
    .eq('course_id', lesson.course_id)
    .maybeSingle();
  if (enrollmentError) throw enrollmentError;
  if (!enrollment) throw new Error('Not enrolled in this course');

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: 'User' }, { onConflict: 'id' });
  if (profileError) {
    console.error('Profile upsert error (non-blocking):', profileError.message);
  }

  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    });
  if (error) {
    console.error('markLessonCompleteAuth error:', error.message, error.details);
    throw error;
  }
}

export async function getCurrentUserEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*, courses!inner(*)')
    .eq('courses.is_published', true)
    .eq('user_id', user.id);
  if (error) throw error;
  return data || [];
}

export async function enrollCurrentUser(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('course_enrollments')
    .upsert({ user_id: user.id, course_id: courseId });
  if (error) throw error;
}

// ============================================
// COACH / ADMIN DATA FUNCTIONS
// ============================================

/** Admin: get all courses (published + drafts). Coach: get own courses. */
export async function getCoachCourses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  if (role === 'admin') {
    // Admin sees everything
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, level, is_published, created_at, coach_id')
      .order('created_at');
    if (error) throw error;
    return data || [];
  }

  if (role === 'coach') {
    // Coach sees own courses
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, level, is_published, created_at')
      .eq('coach_id', user.id)
      .order('created_at');
    if (error) throw error;
    return data || [];
  }

  throw new Error('Unauthorized: not a coach or admin');
}

/** Create a new course (coach or admin). */
export async function createCourse(courseData: {
  title: string;
  description: string;
  level: string;
  is_published?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;
  if (role !== 'admin' && role !== 'coach') {
    throw new Error('Unauthorized');
  }

  const payload: any = {
    title: courseData.title,
    description: courseData.description,
    level: courseData.level,
    is_published: courseData.is_published ?? false,
  };

  // Coach: auto-assign coach_id. Admin can create without it.
  if (role === 'coach') {
    payload.coach_id = user.id;
  }

  const { data, error } = await supabase
    .from('courses')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Update course (coach own, admin any). */
export async function updateCourse(
  courseId: string,
  updates: Partial<{
    title: string;
    description: string;
    level: string;
    is_published: boolean;
  }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Delete course (RLS enforces ownership). */
export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);

  if (error) throw error;
}
