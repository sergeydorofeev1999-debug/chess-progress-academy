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
  if (isUUID(id)) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  } else {
    const order = parseInt(id, 10);
    if (isNaN(order)) return null;
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('"order"', order)
      .single();
    if (error) throw error;
    return data;
  }
}

export async function getCourseLessons(courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('"order"');
  if (error) throw error;
  return data || [];
}

export async function getUserProgress(userId: string, courseId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const supabase = await createClient();

  // Ensure profile exists (FK on lesson_progress requires it)
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
    console.error('markLessonComplete error:', error.message, error.details);
    throw error;
  }
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

export async function getUserEnrollments(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*, courses(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

export async function enrollUser(userId: string, courseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('course_enrollments')
    .upsert({ user_id: userId, course_id: courseId });
  if (error) throw error;
}
