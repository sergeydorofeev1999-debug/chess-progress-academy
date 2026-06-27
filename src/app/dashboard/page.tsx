import Link from 'next/link';
import { getCurrentUserEnrollments, getUserProgress } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, CheckCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Войдите в аккаунт</h1>
        <p className="text-slate-600 mb-6">Чтобы видеть прогресс, нужно авторизоваться</p>
        <Link href="/auth" className="inline-block bg-slate-900 text-white px-6 py-3 rounded-lg">Войти</Link>
      </div>
    );
  }

  const enrollments = await getCurrentUserEnrollments();
  const progress = await getUserProgress('');
  const completedLessons = progress.filter((p: any) => p.is_completed).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Мой кабинет</h1>
      <p className="text-slate-600 mb-8">Отслеживай свой прогресс обучения</p>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Курсов', value: enrollments.length, icon: BookOpen },
          { label: 'Уроков пройдено', value: completedLessons, icon: CheckCircle },
          { label: 'Всего уроков', value: 10, icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-4 text-center">
            <Icon className="mx-auto mb-2 text-amber-500" size={24} />
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">Мои курсы</h2>
      <div className="space-y-4">
        {enrollments.map((enrollment: any) => {
          const course = enrollment.courses;
          return (
            <Link key={course.id} href={`/courses/${course.id}`}>
              <div className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <p className="text-sm text-slate-600">{completedLessons} уроков пройдено</p>
                  </div>
                  <span className="text-2xl">♟️</span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Прогресс</span>
                    <span>{Math.round((completedLessons / 10) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(completedLessons / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
