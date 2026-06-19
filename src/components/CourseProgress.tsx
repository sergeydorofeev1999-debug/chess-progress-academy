'use client';

import { useState, useEffect } from 'react';

interface Lesson {
  id: string;
  title: string;
  order: number;
}

interface Props {
  totalLessons: number;
  serverProgressMap: Record<string, boolean>;
  allLessons: Lesson[];
}

export default function CourseProgress({ totalLessons, serverProgressMap, allLessons }: Props) {
  const [completedCount, setCompletedCount] = useState(() => {
    return Object.values(serverProgressMap).filter(Boolean).length;
  });

  useEffect(() => {
    let count = 0;
    for (const lesson of allLessons) {
      const serverDone = serverProgressMap[lesson.id];
      if (serverDone) {
        count++;
        continue;
      }
      // Check localStorage
      const detailKey = `lesson_progress_${lesson.id}`;
      const detail = localStorage.getItem(detailKey);
      if (detail) {
        const parsed = JSON.parse(detail);
        const totalLevels = Object.keys(parsed).length;
        const completedLevels = Object.values(parsed).filter((v: any) => v >= 1).length;
        if (completedLevels >= totalLevels) {
          count++;
          continue;
        }
      }
      // Fallback: lesson_completed_{id}
      if (localStorage.getItem(`lesson_completed_${lesson.id}`) === 'true') {
        count++;
      }
    }
    setCompletedCount(count);
  }, [allLessons, serverProgressMap]);

  const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="bg-slate-100 rounded-lg p-4">
      <div className="flex justify-between text-sm mb-2">
        <span>Прогресс курса</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-slate-500 mt-1">{completedCount} из {totalLessons} уроков пройдено</p>
    </div>
  );
}
