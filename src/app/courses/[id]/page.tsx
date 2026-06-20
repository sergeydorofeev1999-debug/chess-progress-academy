import Link from 'next/link';
import { getCourseWithModules, getUserProgress } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import PieceCards from '@/components/PieceCards';
import CourseProgress from '@/components/CourseProgress';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, modules } = await getCourseWithModules(id);

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

  const basicLevelLessons = allLessons.slice(6);
  const basicLevelDescriptions = [
    'Съешь чёрную фигуру',
    'Защити свою фигуру',
    'Поставь шах королю',
    'Выведи короля из шаха',
    'Поставь мат королю',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">← Назад к курсам</Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-slate-600 mb-4">{course.description}</p>
        <CourseProgress totalLessons={totalLessons} serverProgressMap={serverProgressMap} allLessons={allLessons} />
      </div>

      <div className="space-y-6">
        {/* ШАХМАТНЫЕ ФИГУРЫ */}
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
            pieceCodes={['R','B','Q','K','N','P']}
            descriptions={['Движется по прямой','Двигается по диагонали','Ферзь = ладья + слон','Самая важная фигура','Ходит буквой «Г»','Ходит на 1-2 клетки вперёд']}
          />
        </div>

        {/* БАЗОВЫЙ УРОВЕНЬ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Базовый уровень</h2>
          <PieceCards
            lessons={basicLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              try {
                const config = JSON.parse(l.video_url || '{}');
                if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
              } catch {}
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={basicLevelDescriptions}
          />
        </div>
      </div>
    </div>
  );
}
