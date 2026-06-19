import Link from 'next/link';
import { getCourseWithModules, getUserProgress } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle, Play } from 'lucide-react';
import PieceCards from '@/components/PieceCards';
import CourseProgress from '@/components/CourseProgress';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, modules } = await getCourseWithModules(id);

  // Get current user (if logged in)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let serverProgressMap: Record<string, boolean> = {};
  if (user) {
    const progress = await getUserProgress(user.id, id);
    progress.forEach((p: any) => {
      serverProgressMap[p.lesson_id] = p.is_completed;
    });
  }

  const allLessons = modules
    .flatMap((m: any) => m.lessons || [])
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  const totalLessons = allLessons.length;

  if (!course) {
    return <div className="max-w-6xl mx-auto px-4 py-12">Курс не найден</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">← Назад к курсам</Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-slate-600 mb-4">{course.description}</p>
        <CourseProgress totalLessons={totalLessons} serverProgressMap={serverProgressMap} allLessons={allLessons} />
      </div>

      <div className="space-y-6">
        {/* ШАХМАТНЫЕ ФИГУРЫ — клиентский компонент с localStorage-прогрессом */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Шахматные фигуры</h2>
          <PieceCards
            lessons={allLessons.slice(0, 6).map((l: any) => {
              let levelsCount = 1;
              try {
                const config = JSON.parse(l.video_url || '{}');
                if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
              } catch {}
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
          />
        </div>

        {/* Остальные уроки — список */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Дальше</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {allLessons.slice(6).map((lesson: any) => {
              const isCompleted = serverProgressMap[lesson.id];
              return (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}?course=${course.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition"
                >
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle size={20} className="text-green-500" />
                    ) : (
                      <Play size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{lesson.title}</p>
                    <p className="text-xs text-slate-500">{lesson.duration_minutes} мин</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
