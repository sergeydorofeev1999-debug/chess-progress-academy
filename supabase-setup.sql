-- ============================================
-- Chess Progress Academy — Initial Schema + Seed Data
-- Execute this in Supabase SQL Editor
-- ============================================

-- Profiles (auto-created on auth signup)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, "order")
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  "order" INT NOT NULL,
  duration_minutes INT DEFAULT 0,
  chess_board_fen TEXT,
  chess_pgn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, "order")
);

-- Progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can view own progress" ON lesson_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can view own enrollments" ON course_enrollments
  FOR SELECT USING (user_id = auth.uid());

-- Indices
CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON course_enrollments(user_id);

-- ============================================
-- SEED DATA: 1 Course, 3 Modules, 10 Lessons
-- ============================================

INSERT INTO courses (title, description, level, is_published)
VALUES ('Шахматы с нуля', 'Освойте основы шахматной игры с нуля. Идеально для начинающих.', 'beginner', TRUE)
RETURNING id;

-- Get the course id (we'll use a known value for seeding)
DO $$
DECLARE
  course_id UUID;
  m1 UUID;
  m2 UUID;
  m3 UUID;
BEGIN
  SELECT id INTO course_id FROM courses WHERE title = 'Шахматы с нуля';

  INSERT INTO modules (course_id, title, "order")
  VALUES (course_id, 'Модуль 1: Знакомство с шахматами', 1)
  RETURNING id INTO m1;

  INSERT INTO modules (course_id, title, "order")
  VALUES (course_id, 'Модуль 2: Тяжёлые фигуры', 2)
  RETURNING id INTO m2;

  INSERT INTO modules (course_id, title, "order")
  VALUES (course_id, 'Модуль 3: Практика', 3)
  RETURNING id INTO m3;

  -- Module 1 lessons (Intro + major pieces)
  INSERT INTO lessons (module_id, course_id, title, content, "order", duration_minutes, chess_board_fen) VALUES
    (m1, course_id, 'Урок 1: Доска и координаты', 'Шахматная доска состоит из 64 клеток: 8 горизонталей (рангов) и 8 вертикалей (файлов). Белые фигуры всегда располагаются на 1-м и 2-м рангах.', 1, 10, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    (m1, course_id, 'Урок 2: Как ходит ладья', 'Ладья ходит по горизонтали и вертикали на любое число клеток. Сильнее всего на открытых вертикалях.', 2, 10, '8/8/8/4r3/8/8/8/8 w - - 0 1'),
    (m1, course_id, 'Урок 3: Как ходит слон', 'Слон ходит по диагонали на любое число клеток. Один слон — по белым полям, другой — по чёрным.', 3, 10, '8/8/8/4b3/8/8/8/8 w - - 0 1'),
    (m1, course_id, 'Урок 4: Как ходит ферзь', 'Ферзь — самая сильная фигура. Ходит как ладья + слон: по горизонтали, вертикали и диагонали.', 4, 12, '8/8/8/4q3/8/8/8/8 w - - 0 1'),
    (m1, course_id, 'Урок 5: Король — главная фигура', 'Король ходит на одну клетку в любом направлении. Игра заканчивается, когда королю ставят мат.', 5, 10, '8/8/8/4k3/8/8/8/8 w - - 0 1');

  -- Module 2 lessons (Knight + Pawn)
  INSERT INTO lessons (module_id, course_id, title, content, "order", duration_minutes, chess_board_fen) VALUES
    (m2, course_id, 'Урок 6: Как ходит конь', 'Конь ходит буквой "Г": 2 клетки в одном направлении и 1 в перпендикулярном. Может перепрыгивать через фигуры.', 6, 12, '8/8/8/4n3/8/8/8/8 w - - 0 1'),
    (m2, course_id, 'Урок 7: Как ходит пешка', 'Пешка ходит на одну клетку вперёд (на два с начальной позиции). Бьёт по диагонали на одну клетку.', 7, 12, '8/8/8/4p3/8/8/8/8 w - - 0 1');

  -- Module 3 lessons (Practice)
  INSERT INTO lessons (module_id, course_id, title, content, "order", duration_minutes, chess_board_fen) VALUES
    (m3, course_id, 'Урок 8: Шах и мат', 'Шах — нападение на короля. Мат — шах, от которого некуда деться. Цель игры — поставить мат.', 8, 15, 'r1bqk1nr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1'),
    (m3, course_id, 'Урок 9: Основные правила', 'Рокировка, взятие на проходе, превращение пешки — ключевые правила шахмат.', 9, 15, 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'),
    (m3, course_id, 'Урок 10: Первая партия', 'Поздравляю! Ты готов сыграть свою первую партию. Вспомни все фигуры и поставь мат.', 10, 20, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');

END $$;
