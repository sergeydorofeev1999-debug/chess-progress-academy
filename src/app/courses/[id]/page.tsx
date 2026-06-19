import Link from 'next/link';
import { getCourseWithModules, getUserProgress } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle, Play } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, modules } = await getCourseWithModules(id);

  // Get current user (if logged in)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let progressMap: Record<string, boolean> = {};
  if (user) {
    const progress = await getUserProgress(user.id, id);
    progress.forEach((p: any) => {
      progressMap[p.lesson_id] = p.is_completed;
    });
  }

  const totalLessons = modules.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0);
  const completedCount = Object.values(progressMap).filter(Boolean).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  if (!course) {
    return <div className="max-w-6xl mx-auto px-4 py-12">Курс не найден</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">← Назад к курсам</Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-slate-600 mb-4">{course.description}</p>

        <div className="bg-slate-100 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Прогресс курса</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{completedCount} из {totalLessons} уроков пройдено</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ШАХМАТНЫЕ ФИГУРЫ — карточки в стиле Lichess */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Шахматные фигуры</h2>
          <div className="space-y-2">
            {modules.flatMap((m: any) => m.lessons || []).slice(0, 6).map((lesson: any, i: number) => {
              const isCompleted = progressMap[lesson.id];
              // Colors matching Lichess: alternating green/blue/purple
              const bgColors = ['bg-[#ebf5d8]', 'bg-[#ebf5d8]', 'bg-[#cce5ff]', 'bg-[#e6e0ec]', 'bg-[#cce5ff]', 'bg-[#e6e0ec]'];
              const borderColors = ['border-[#c5e0a5]', 'border-[#c5e0a5]', 'border-[#a3c8f0]', 'border-[#c5b5d8]', 'border-[#a3c8f0]', 'border-[#c5b5d8]'];
              return (
                <Link
                  key={lesson.id}
                  href={`/lessons/${lesson.id}?course=${course.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColors[i]} ${borderColors[i]} hover:brightness-95 transition relative`}
                >
                  <img
                    src={`/pieces/cburnett/w${['R','B','Q','K','N','P'][i]}.svg`}
                    className="w-10 h-10 shrink-0"
                    draggable={false}
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{lesson.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[
                        'Движется по прямой',
                        'Двигается по диагонали',
                        'Ферзь = ладья + слон',
                        'Самая важная фигура',
                        'Ходит буквой «Г»',
                        'Ходит на 1-2 клетки вперёд',
                      ][i]}
                    </p>
                  </div>
                  {/* Progress badge */}
                  {isCompleted ? (
                    <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                      ★★★
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Остальные уроки — список */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Дальше</h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {modules.flatMap((m: any) => m.lessons || []).slice(6).map((lesson: any) => {
              const isCompleted = progressMap[lesson.id];
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
