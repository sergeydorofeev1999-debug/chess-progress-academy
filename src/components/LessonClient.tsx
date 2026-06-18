'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChessBoard from '@/components/ChessBoard';
import InteractiveCollectStars from '@/components/InteractiveCollectStars';
import { CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { markLessonComplete } from '@/lib/data';

interface Lesson {
  id: string;
  title: string;
  content: string;
  duration_minutes: number;
  chess_board_fen: string | null;
  video_url: string | null;
  course_id: string;
}

interface Props {
  lesson: Lesson;
  allLessons: Lesson[];
  courseId: string;
  isCompletedInit: boolean;
  userId: string | null;
}

function parseInteractiveConfig(videoUrl: string | null) {
  if (!videoUrl) return null;
  if (!videoUrl.startsWith('{')) return null;
  try {
    return JSON.parse(videoUrl);
  } catch {
    return null;
  }
}

export default function LessonClient({ lesson, allLessons, courseId, isCompletedInit, userId }: Props) {
  const [isCompleted, setIsCompleted] = useState(isCompletedInit);
  const [completing, setCompleting] = useState(false);

  const lessonIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;

  const interactiveConfig = parseInteractiveConfig(lesson.video_url);

  const handleComplete = async () => {
    if (!userId) {
      alert('Войдите, чтобы сохранить прогресс');
      return;
    }
    setCompleting(true);
    try {
      await markLessonComplete(userId, lesson.id);
      setIsCompleted(true);
    } catch (e) {
      alert('Ошибка сохранения прогресса');
    } finally {
      setCompleting(false);
    }
  };

  const handleInteractiveComplete = async () => {
    if (userId) {
      await markLessonComplete(userId, lesson.id);
      setIsCompleted(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href={`/courses/${courseId}`} className="text-sm text-slate-500 hover:text-slate-800 mb-4 inline-block">
        ← Назад к курсу
      </Link>

      <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
      <p className="text-sm text-slate-500 mb-6">{lesson.duration_minutes} мин</p>

      {/* Interactive Lesson */}
      {interactiveConfig ? (
        <div className="mb-8">
          <InteractiveCollectStars
            config={interactiveConfig}
            onComplete={handleInteractiveComplete}
          />
        </div>
      ) : (
        /* Regular video placeholder */
        <div className="bg-slate-900 rounded-xl aspect-video flex items-center justify-center mb-6">
          <div className="text-center text-white">
            <div className="text-5xl mb-2">▶️</div>
            <p className="text-sm text-slate-300">Видео будет здесь</p>
          </div>
        </div>
      )}

      {/* Regular text content */}
      {lesson.content && !interactiveConfig && (
        <div className="prose max-w-none mb-8">
          <p className="text-slate-700 leading-relaxed whitespace-pre-line">{lesson.content}</p>
        </div>
      )}

      {lesson.chess_board_fen && !interactiveConfig && (
        <div className="mb-8">
          <h3 className="font-semibold mb-4">Позиция на доске</h3>
          <ChessBoard fen={lesson.chess_board_fen} interactive={true} />
        </div>
      )}

      {!isCompleted && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3 rounded-lg transition mb-6 disabled:opacity-50"
        >
          {completing ? 'Сохранение...' : 'Отметить урок пройденным ✓'}
        </button>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 text-green-600 font-medium mb-6">
          <CheckCircle size={20} /> Урок пройден!
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {prevLesson && (
          <Link
            href={`/lessons/${prevLesson.id}?course=${courseId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft size={18} /> Предыдущий
          </Link>
        )}
        {nextLesson && (
          <Link
            href={`/lessons/${nextLesson.id}?course=${courseId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
          >
            Следующий <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}
