export interface Lesson {
  id: string;
  title: string;
  content: string;
  video_url?: string;
  order: number;
  duration_minutes: number;
  chess_board_fen?: string;
}

export interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  thumbnail_url?: string;
  modules: Module[];
}

export const courses: Course[] = [
  {
    id: '1',
    title: 'Шахматы с нуля',
    description: 'Освойте основы шахматной игры с нуля. Идеально для начинающих.',
    level: 'beginner',
    modules: [
      {
        id: 'm1',
        title: 'Модуль 1: Знакомство с шахматами',
        order: 1,
        lessons: [
          {
            id: 'l1',
            title: 'Урок 1: Доска и координаты',
            content: 'Шахматная доска состоит из 64 клеток: 8 горизонталей (рангов) и 8 вертикалей (файлов). Белые фигуры всегда располагаются на 1-м и 2-м рангах.',
            order: 1,
            duration_minutes: 10,
            chess_board_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          },
          {
            id: 'l2',
            title: 'Урок 2: Как ходит пешка',
            content: 'Пешка ходит на одну клетку вперёд (на два с начальной позиции). Бьёт по диагонали на одну клетку.',
            order: 2,
            duration_minutes: 12,
            chess_board_fen: '8/8/8/4p3/8/8/8/8 w - - 0 1',
          },
          {
            id: 'l3',
            title: 'Урок 3: Как ходит слон',
            content: 'Слон ходит по диагонали на любое число клеток. Один слон — по белым полям, другой — по чёрным.',
            order: 3,
            duration_minutes: 10,
            chess_board_fen: '8/8/8/4b3/8/8/8/8 w - - 0 1',
          },
          {
            id: 'l4',
            title: 'Урок 4: Как ходит конь',
            content: 'Конь ходит буквой "Г": 2 клетки в одном направлении и 1 в перпендикулярном. Может перепрыгивать через фигуры.',
            order: 4,
            duration_minutes: 12,
            chess_board_fen: '8/8/8/4n3/8/8/8/8 w - - 0 1',
          },
        ]
      },
      {
        id: 'm2',
        title: 'Модуль 2: Тяжёлые фигуры',
        order: 2,
        lessons: [
          {
            id: 'l5',
            title: 'Урок 5: Как ходит ладья',
            content: 'Ладья ходит по горизонтали и вертикали на любое число клеток. Сильнее всего на открытых вертикалях.',
            order: 5,
            duration_minutes: 10,
            chess_board_fen: '8/8/8/4r3/8/8/8/8 w - - 0 1',
          },
          {
            id: 'l6',
            title: 'Урок 6: Как ходит ферзь',
            content: 'Ферзь — самая сильная фигура. Ходит как ладья + слон: по горизонтали, вертикали и диагонали.',
            order: 6,
            duration_minutes: 12,
            chess_board_fen: '8/8/8/4q3/8/8/8/8 w - - 0 1',
          },
          {
            id: 'l7',
            title: 'Урок 7: Король — главная фигура',
            content: 'Король ходит на одну клетку в любом направлении. Игра заканчивается, когда королю ставят мат.',
            order: 7,
            duration_minutes: 10,
            chess_board_fen: '8/8/8/4k3/8/8/8/8 w - - 0 1',
          },
        ]
      },
      {
        id: 'm3',
        title: 'Модуль 3: Практика',
        order: 3,
        lessons: [
          {
            id: 'l8',
            title: 'Урок 8: Защита фигур',
            content: 'Защита фигур от атаки. Как увести фигуру с опасного поля.',
            order: 8,
            duration_minutes: 15,
            chess_board_fen: '8/8/8/4bb2/8/8/P2P4/R2K4 w - - 0 1',
          },
          {
            id: 'l9',
            title: 'Урок 9: Шах',
            content: 'Шах — нападение на короля. Учимся ставить шах.',
            order: 9,
            duration_minutes: 15,
            chess_board_fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
          },
          {
            id: 'l10',
            title: 'Урок 10: Выход из шаха',
            content: 'Как увести короля из-под шаха. Защита и перекрытие.',
            order: 10,
            duration_minutes: 15,
            chess_board_fen: '3q4/8/8/8/8/8/8/3K4 w - - 0 1',
          },
          {
            id: 'l11',
            title: 'Урок 11: Мат',
            content: 'Мат — шах, от которого некуда деться. Цель шахматной партии.',
            order: 11,
            duration_minutes: 20,
            chess_board_fen: '3qk3/3ppp2/8/8/2B5/5Q2/8/8 w - - 0 1',
          },
        ]
      },
      {
        id: 'm4',
        title: 'Модуль 4: Средний уровень',
        order: 4,
        lessons: [
          {
            id: 'l12',
            title: 'Урок 12: Расстановка фигур',
            content: 'Знакомство с начальной позицией в шахматах. Все фигуры расставлены на свои места. Белые на 1-2 рядах, чёрные на 7-8 рядах.',
            order: 12,
            duration_minutes: 15,
            chess_board_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          },
        ]
      },
    ]
  }
];

export const lessonProgress: Record<string, boolean> = {};

export function getCourseProgress(courseId: string): number {
  const course = courses.find(c => c.id === courseId);
  if (!course) return 0;
  const total = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completed = Object.keys(lessonProgress).filter(k => lessonProgress[k]).length;
  return Math.round((completed / total) * 100);
}

export function markLessonComplete(lessonId: string): void {
  lessonProgress[lessonId] = true;
}
