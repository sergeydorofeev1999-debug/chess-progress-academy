'use server';

import { createClient } from './supabase/server';

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
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

/** Auth-safe version — userId taken from session, never from client params. */
export async function markLessonCompleteAuth(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const userId = user.id;

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
    .select('*, courses(*)')
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
