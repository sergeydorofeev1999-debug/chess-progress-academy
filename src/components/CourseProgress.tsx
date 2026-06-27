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
}

export default function CourseProgress({ totalLessons, serverProgressMap }: Props) {
  const [completedCount, setCompletedCount] = useState(
    () => Object.values(serverProgressMap).filter(Boolean).length
  );

  useEffect(() => {
    setCompletedCount(Object.values(serverProgressMap).filter(Boolean).length);
  }, [serverProgressMap]);

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
