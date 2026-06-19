'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lesson {
  id: string;
  title: string;
  order: number;
  duration_minutes: number;
}

interface Props {
  lessons: Lesson[];
  progressMap: Record<string, boolean>;
  courseId: string;
}

const DESCRIPTIONS = [
  'Движется по прямой',
  'Двигается по диагонали',
  'Ферзь = ладья + слон',
  'Самая важная фигура',
  'Ходит буквой «Г»',
  'Ходит на 1-2 клетки вперёд',
];

const PIECES = ['R', 'B', 'Q', 'K', 'N', 'P'];

export default function PieceCards({ lessons, progressMap, courseId }: Props) {
  const [startedMap, setStartedMap] = useState<Record<string, boolean>>({});
  const [completedLocalMap, setCompletedLocalMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const started: Record<string, boolean> = {};
    const completed: Record<string, boolean> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('lesson_started_')) {
        started[key.replace('lesson_started_', '')] = true;
      }
      if (key?.startsWith('lesson_completed_')) {
        completed[key.replace('lesson_completed_', '')] = true;
      }
    }
    setStartedMap(started);
    setCompletedLocalMap(completed);
  }, []);

  return (
    <div className="space-y-2">
      {lessons.map((lesson, i) => {
        const isServerCompleted = progressMap[lesson.id];
        const isLocalCompleted = completedLocalMap[lesson.id];
        const isCompleted = isServerCompleted || isLocalCompleted;
        const isStarted = startedMap[lesson.id];
        const isNotStarted = !isCompleted && !isStarted;

        let bgColor = 'bg-[#e6e0ec]';
        let borderColor = 'border-[#c5b5d8]';
        if (isCompleted) {
          bgColor = 'bg-[#ebf5d8]';
          borderColor = 'border-[#c5e0a5]';
        } else if (isStarted) {
          bgColor = 'bg-[#cce5ff]';
          borderColor = 'border-[#a3c8f0]';
        }

        return (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.id}?course=${courseId}`}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColor} ${borderColor} hover:brightness-95 transition relative`}
          >
            <img
              src={`/pieces/cburnett/w${PIECES[i]}.svg`}
              className="w-10 h-10 shrink-0"
              draggable={false}
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">{lesson.title}</p>
              <p className="text-xs text-gray-500 truncate">{DESCRIPTIONS[i]}</p>
            </div>
            {isCompleted && (
              <div className="absolute top-0 right-0 bg-[#7ab648] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                ★★★
              </div>
            )}
            {isStarted && !isCompleted && (
              <div className="absolute top-0 right-0 bg-[#3399ff] text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg">
                2/5
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
