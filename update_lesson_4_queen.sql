-- ============================================
-- Урок 4: Ферзь — Новые задания (5 уровней)
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

UPDATE lessons
SET video_url = '{
  "type": "interactive_collect_stars",
  "pieceName": "Ферзь",
  "pieceCode": "wQ",
  "pieceDescription": "Самая сильная фигура: ходит как ладья и слон вместе",
  "levels": [
    {
      "initialFen": "8/8/8/8/8/3Q4/8/8 w - - 0 1",
      "stars": [{"square": "d5"}, {"square": "g8"}],
      "instructions": "Ферзь на d2. Соберите звёзды на d5 и g8!",
      "hint": "d2 → d5 по вертикали, затем d5 → g8 по диагонали.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/4Q3/8/8/8 w - - 0 1",
      "stars": [{"square": "c2"}, {"square": "c8"}, {"square": "h3"}, {"square": "a3"}],
      "instructions": "Ферзь на e4. Соберите звёзды на c2, c8, h3 и a3!",
      "hint": "e4 → c2 по диагонали, c2 → c8 по вертикали, c8 → h3 по диагонали, h3 → a3 по горизонтали.",
      "maxMoves": 4
    },
    {
      "initialFen": "8/8/8/8/5Q2/8/8/8 w - - 0 1",
      "stars": [{"square": "c1"}, {"square": "c8"}, {"square": "a6"}, {"square": "e6"}, {"square": "b3"}, {"square": "h3"}],
      "instructions": "Ферзь на f4. Соберите все 6 звёзд!",
      "hint": "f4 → c1 по диагонали, c1 → c8 по вертикали, c8 → a6 по диагонали, a6 → e6 по горизонтали, e6 → c4 → b3 по диагоналям, b3 → h3 по горизонтали.",
      "maxMoves": 7
    },
    {
      "initialFen": "1Q6/8/8/8/8/8/8/8 w - - 0 1",
      "stars": [{"square": "b1"}, {"square": "b8"}, {"square": "h2"}, {"square": "a2"}, {"square": "a5"}, {"square": "g5"}, {"square": "e3"}],
      "instructions": "Ферзь на b7. Соберите все 7 звёзд!",
      "hint": "b7 → b8 вверх, b8 → h2 по диагонали, h2 → a2 по горизонтали, a2 → a5 по вертикали, a5 → g5 по горизонтали, g5 → e3 по диагонали, e3 → b3? Нет... Пробуйте найти свой путь!",
      "maxMoves": 8
    },
    {
      "initialFen": "8/8/8/8/8/8/8/3Q4 w - - 0 1",
      "stars": [{"square": "e1"}, {"square": "c2"}, {"square": "a1"}, {"square": "a4"}, {"square": "c6"}, {"square": "b6"}, {"square": "h6"}, {"square": "b8"}],
      "instructions": "Ферзь на d1. Соберите все 8 звёзд!",
      "hint": "d1 → a1 по горизонтали, a1 → a4 по вертикали, a4 → c6 по диагонали, c6 → b6 по горизонтали, b6 → h6 по горизонтали, h6 → ... Пробуйте b8 и c2!",
      "maxMoves": 9
    }
  ],
  "successMessage": "Отлично! Вы освоили ходы ферзя!"
}'::jsonb
WHERE id = (
  SELECT id FROM lessons WHERE title = 'Урок 4: Как ходит ферзь' LIMIT 1
);
