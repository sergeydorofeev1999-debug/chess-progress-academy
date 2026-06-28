import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, Users, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Verify role = coach
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('role', 'coach')
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  // Fetch coach's courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title, description, level, is_published, created_at')
    .eq('coach_id', user.id)
    .order('created_at');

  if (coursesError) {
    console.error('Coach courses error:', coursesError.message);
  }

  // Fetch enrollments for coach's courses
  const courseIds = (courses || []).map((c: any) => c.id);
  let enrollmentCount = 0;
  if (courseIds.length > 0) {
    const { count, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .in('course_id', courseIds);
    if (!enrollError) enrollmentCount = count || 0;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Кабинет тренера</h1>
      <p className="text-slate-600 mb-8">Управление курсами и учениками</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Моих курсов', value: (courses || []).length, icon: BookOpen },
          { label: 'Учеников', value: enrollmentCount, icon: Users },
          { label: 'Уровень', value: 'Тренер', icon: BarChart3 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4 text-center">
            <Icon className="mx-auto mb-2 text-amber-500" size={24} />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Courses */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Мои курсы</h2>
        <Link
          href="/courses/new"
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-2 rounded-lg transition text-sm"
        >
          + Создать курс
        </Link>
      </div>

      {(courses || []).length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
          У вас пока нет курсов. Нажмите «Создать курс», чтобы добавить первый.
        </div>
      ) : (
        <div className="space-y-3">
          {(courses || []).map((course: any) => (
            <div key={course.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{course.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-slate-500">
                    <span className="capitalize">{course.level === 'beginner' ? 'Начинающий' : course.level}</span>
                    <span>{course.is_published ? 'Опубликован' : 'Черновик'}</span>
                  </div>
                </div>
                <Link
                  href={`/courses/${course.id}`}
                  className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                >
                  Открыть
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
