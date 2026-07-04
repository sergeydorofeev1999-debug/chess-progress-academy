import Link from 'next/link';
import { getCourseWithModules, getUserProgress } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import PieceCards from '@/components/PieceCards';
import CourseProgress from '@/components/CourseProgress';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { course, modules } = await getCourseWithModules(id);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let serverProgressMap: Record<string, boolean> = {};
  if (user) {
    const progress = await getUserProgress(id);
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

  const basicLevelLessons = allLessons.slice(6, 11);
  const advancedLevelLessons = allLessons.slice(11, 17);
  const prepLevelLessons = allLessons.slice(17, 23);
  const endgameLevelLessons = allLessons.slice(23, 27);
  const midegameLevelLessons = allLessons.slice(27, 31);
  const openingLevelLessons = allLessons.slice(31);

  const basicLevelDescriptions = [
    'Съешь чёрную фигуру',
    'Защити свою фигуру',
    'Поставь шах королю',
    'Выведи короля из шаха',
    'Поставь мат королю',
  ];

  const advancedLevelDescriptions = [
    'Расстановка фигур в начале партии',
    'Особый ход короля и ладьи',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/courses" className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">← Назад к курсам</Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-slate-600 mb-4">{course.description}</p>
        <CourseProgress totalLessons={totalLessons} serverProgressMap={serverProgressMap} />
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
        {/* СРЕДНИЙ УРОВЕНЬ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Средний уровень</h2>
          <PieceCards
            lessons={advancedLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              try {
                const config = JSON.parse(l.video_url || '{}');
                if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
              } catch {}
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={advancedLevelDescriptions}
          />
        </div>

        {/* ПОДГОТОВКА К ИГРЕ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Подготовка к игре</h2>
          <PieceCards
            lessons={prepLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              // Pawn race (lesson 18) has 3 difficulty levels
              if (l.id === 'af74a851-e308-411d-82e1-fafdc5bd390a') {
                levelsCount = 3;
              }
              // Rook pawn (lesson 19) has 3 difficulty levels
              if (l.id === 'd239daeb-f7e9-410e-84c7-8f0eac3ebcb4') {
                levelsCount = 3;
              }
              // Bishop pawn (lesson 20) has 3 difficulty levels
              if (l.id === '2976cdff-d622-45a6-9ce4-fbcc33fa9528') {
                levelsCount = 3;
              }
              // Queen pawn (lesson 21) has 3 difficulty levels
              if (l.id === 'a8b9a524-5e37-43c5-a479-9c98494d704e') {
                levelsCount = 3;
              }
              // Knight pawn (lesson 22) has 3 difficulty levels
              if (l.id === '1ce04101-6a7d-45c9-bcef-6e17dbafa6ac') {
                levelsCount = 3;
              }
              // Chess football (lesson 23) has 3 difficulty levels
              if (l.id === 'bae12fca-bfa4-44b6-9dff-7555fe240706') {
                levelsCount = 3;
              } else {
                try {
                  const config = JSON.parse(l.video_url || '{}');
                  if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
                } catch {}
              }
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={['Игра пешками против компьютера']}
          />
        </div>

        {/* ЭНДШПИЛЬ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Эндшпиль</h2>
          <PieceCards
            lessons={endgameLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              if (l.id === '126a2252-7482-4ed4-8d5a-a0afe82d834d') {
                levelsCount = 4;
              } else {
                try {
                  const config = JSON.parse(l.video_url || '{}');
                  if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
                } catch {}
              }
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={['Мат двумя ладьями', 'Мат ферзём', 'Мат ладьёй', 'Правило квадрата']}
          />
        </div>

        {/* МИТТЕЛЬШПИЛЬ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Миттельшпиль</h2>
          <PieceCards
            lessons={midegameLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              try {
                const config = JSON.parse(l.video_url || '{}');
                if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
              } catch {}
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={['Двойной удар']}
          />
        </div>

        {/* ДЕБЮТ */}
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Дебют</h2>
          <PieceCards
            lessons={openingLevelLessons.map((l: any, idx: number) => {
              let levelsCount = 1;
              try {
                const config = JSON.parse(l.video_url || '{}');
                if (config.levels && Array.isArray(config.levels)) levelsCount = config.levels.length;
              } catch {}
              return { id: l.id, title: l.title, order: l.order, duration_minutes: l.duration_minutes, levelsCount };
            })}
            progressMap={serverProgressMap}
            courseId={course.id}
            descriptions={['Итальянская партия за белых']}
          />
        </div>
      </div>
    </div>
  );
}
