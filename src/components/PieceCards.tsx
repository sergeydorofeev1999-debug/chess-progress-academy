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

const MULTI_LEVEL_LESSONS = [
  'af74a851-e308-411d-82e1-fafdc5bd390a', // pawnRace
  'd239daeb-f7e9-410e-84c7-8f0eac3ebcb4', // rookPawn
  '2976cdff-d622-45a6-9ce4-fbcc33fa9528', // bishopPawn
  'a8b9a524-5e37-43c5-a479-9c98494d704e', // queenPawn
  '1ce04101-6a7d-45c9-bcef-6e17dbafa6ac', // knightPawn
  'bae12fca-bfa4-44b6-9dff-7555fe240706', // chessFootball
];

const STAR_BASED_LESSONS = [
  '126a2252-7482-4ed4-8d5a-a0afe82d834d', // twoRooksMate
  '3ca74ff6-7274-4cbd-9336-f33378310fcd', // queenMate
];

const LESSON_KEYS: Record<string, string> = {
  'af74a851-e308-411d-82e1-fafdc5bd390a': 'pawnrace_progress',
  'd239daeb-f7e9-410e-84c7-8f0eac3ebcb4': 'rookpawn_progress',
  '2976cdff-d622-45a6-9ce4-fbcc33fa9528': 'bishoppawn_progress',
  'a8b9a524-5e37-43c5-a479-9c98494d704e': 'queenpawn_progress',
  '1ce04101-6a7d-45c9-bcef-6e17dbafa6ac': 'knightpawn_progress',
  'bae12fca-bfa4-44b6-9dff-7555fe240706': 'football_progress',
  '126a2252-7482-4ed4-8d5a-a0afe82d834d': 'tworooks_progress',
  '3ca74ff6-7274-4cbd-9336-f33378310fcd': 'queenmate_progress',
};

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
        const isMultiLevel = MULTI_LEVEL_LESSONS.includes(lesson.id);
        const isStarBased = STAR_BASED_LESSONS.includes(lesson.id);
        const storageKey = LESSON_KEYS[lesson.id];

        let levelsDone = 0;
        let minStars = 0;

        if (storageKey && mounted) {
          try {
            const raw = localStorage.getItem(`${storageKey}_${lesson.id}`) || '{}';
            const progress = JSON.parse(raw);
            const stars = Object.values(progress) as number[];
            levelsDone = stars.filter(s => s > 0).length;
            minStars = stars.length > 0 ? Math.min(...stars) : 0;
          } catch {}
        } else {
          levelsDone = Object.values(detail).filter((v: any) => v >= 1).length;
          const allStars = Object.values(detail) as number[];
          minStars = allStars.length > 0 ? Math.min(...allStars) : 0;
        }

        const isCompleted = isServerCompleted || (levelsDone >= totalLevels);
        const hasProgress = levelsDone > 0;

        let bgColor = 'bg-[#e6e0ec]';
        let borderColor = 'border-[#c5b5d8]';
        let starCount = 0;

        if (isMultiLevel) {
          // Lessons 18-23: green if any level won, stars = levels won
          if (hasProgress) {
            bgColor = 'bg-[#ebf5d8]';
            borderColor = 'border-[#c5e0a5]';
            starCount = levelsDone;
          }
        } else if (isStarBased) {
          // Lesson 24: purple → blue → green
          if (isCompleted) {
            bgColor = 'bg-[#ebf5d8]';
            borderColor = 'border-[#c5e0a5]';
            starCount = minStars;
          } else if (hasProgress) {
            bgColor = 'bg-[#cce5ff]';
            borderColor = 'border-[#a3c8f0]';
          }
        } else {
          // Default lessons
          if (isCompleted) {
            bgColor = 'bg-[#ebf5d8]';
            borderColor = 'border-[#c5e0a5]';
            starCount = minStars || 1;
          } else if (hasProgress) {
            bgColor = 'bg-[#cce5ff]';
            borderColor = 'border-[#a3c8f0]';
          }
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
            {isMultiLevel && hasProgress && (
              <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {'★'.repeat(Math.min(starCount, 3))}
              </div>
            )}
            {isStarBased && isCompleted && (
              <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {'★'.repeat(starCount || 1)}
              </div>
            )}
            {isStarBased && hasProgress && !isCompleted && (
              <div className="absolute top-0 right-0 bg-[#3399ff] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {levelsDone}/{totalLevels}
              </div>
            )}
            {!isMultiLevel && !isStarBased && isCompleted && (
              <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                {'★'.repeat(starCount || 1)}
              </div>
            )}
            {!isMultiLevel && !isStarBased && hasProgress && !isCompleted && (
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
