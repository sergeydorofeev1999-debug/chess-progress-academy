'use server';

import { createClient } from './supabase/server';

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
    .order('"order"');
  if (modulesError) throw modulesError;

  return { course, modules: modules || [] };
}

export async function getLesson(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
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
  const { error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    });
  if (error) throw error;
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
