'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Lesson {
  id: string;
  title: string;
  order: number;
  duration_minutes: number;
  levelsCount: number;
}

interface Props {
  lessons: Lesson[];
  progressMap: Record<string, boolean>;
  courseId: string;
  pieceCodes?: string[];
  descriptions?: string[];
}

function getLessonDetail(lessonId: string): Record<number, number> {
  if (typeof window === 'undefined') return {};
  try {
    const progress = JSON.parse(localStorage.getItem(`lesson_progress_${lessonId}`) || '{}');
    const captureRaw = JSON.parse(localStorage.getItem(`lesson_capture_${lessonId}`) || '{}');
    const captureStars = captureRaw.levelStars || {};
    return { ...progress, ...captureStars };
  } catch {
    return {};
  }
}

export default function PieceCards({ lessons, progressMap, courseId, pieceCodes, descriptions }: Props) {
  const [clientDetails, setClientDetails] = useState<Record<string, Record<number, number>>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const details: Record<string, Record<number, number>> = {};
    for (const lesson of lessons) {
      details[lesson.id] = getLessonDetail(lesson.id);
    }
    setClientDetails(details);
  }, [lessons]);

  return (
    <div className="space-y-2">
      {lessons.map((lesson, i) => {
        const isServerCompleted = progressMap[lesson.id];
        const detail = mounted ? clientDetails[lesson.id] || {} : {};
        const totalLevels = lesson.levelsCount || 1;
        const levelsDone = Object.values(detail).filter((v: any) => v >= 1).length;
        const allStars = Object.values(detail) as number[];
        const minStars = allStars.length > 0 ? Math.min(...allStars) : 0;

        const isCompleted = isServerCompleted || (levelsDone >= totalLevels);
        const isStarted = !isCompleted && levelsDone > 0;

        let bgColor = 'bg-[#e6e0ec]';
        let borderColor = 'border-[#c5b5d8]';
        if (isCompleted) {
          bgColor = 'bg-[#ebf5d8]';
          borderColor = 'border-[#c5e0a5]';
        } else if (isStarted) {
          bgColor = 'bg-[#cce5ff]';
          borderColor = 'border-[#a3c8f0]';
        }

        const piece = pieceCodes?.[i];
        const desc = descriptions?.[i];

        return (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}?course=${courseId}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColor} ${borderColor} hover:brightness-95 transition relative`}
          >
            {piece ? (
              <img
                src={`/pieces/cburnett/w${piece}.svg`}
                className="w-10 h-10 shrink-0"
                draggable={false}
                alt=""
              />
            ) : (
              <div className="w-10 h-10 shrink-0 rounded-full bg-white/70 border border-gray-300 flex items-center justify-center text-sm font-bold text-gray-600">
                {lesson.order || i + 1}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{lesson.title}</p>
              {desc && <p className="text-xs text-gray-500 truncate">{desc}</p>}
            </div>
            {isCompleted && (
              <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {'★'.repeat(minStars || 3)}
              </div>
            )}
            {isStarted && !isCompleted && (
              <div className="absolute top-0 right-0 bg-[#3399ff] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {levelsDone}/{totalLevels}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
