-- ============================================
-- Урок 6: Ферзь — Интерактивные задания (collect stars)
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
      "initialFen": "8/8/8/8/8/8/8/4Q3 w - - 0 1",
      "stars": [{"square": "h5"}],
      "instructions": "Ферзь на e1. Соберите звезду на h5!",
      "hint": "Ферзь ходит по прямой и по диагонали. e1 → h5 по диагонали.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/8/8/8/5Q2 w - - 0 1",
      "stars": [{"square": "f7"}, {"square": "a6"}],
      "instructions": "Ферзь на f1. Соберите звёзды на f7 и a6!",
      "hint": "f1 → f7 по вертикали, потом f7 → a6 по диагонали.",
      "maxMoves": 3
    },
    {
      "initialFen": "8/8/8/8/4Q3/8/8/8 w - - 0 1",
      "stars": [{"square": "b8"}, {"square": "h8"}, {"square": "h1"}],
      "instructions": "Ферзь на e4. Соберите все три звезды на краях доски!",
      "hint": "e4 → b8 по диагонали, b8 → h8 по горизонтали, h8 → h1 по вертикали.",
      "maxMoves": 4
    },
    {
      "initialFen": "8/8/8/8/8/8/8/3Q4 w - - 0 1",
      "stars": [{"square": "d8"}, {"square": "a5"}, {"square": "a1"}],
      "instructions": "Ферзь на d1. Соберите три звезды: d8, a5, a1!",
      "hint": "d1 → d8 вверх, d8 → a5 по диагонали, a5 → a1 вниз.",
      "maxMoves": 4
    },
    {
      "initialFen": "8/8/8/8/3Q4/8/8/8 w - - 0 1",
      "stars": [{"square": "a8"}, {"square": "h4"}, {"square": "d8"}],
      "instructions": "Ферзь на d4. Соберите все звёзды за минимум ходов!",
      "hint": "d4 → a8 по диагонали, a8 → d8 по горизонтали, d8 → h4 по диагонали.",
      "maxMoves": 4
    }
  ],
  "successMessage": "Отлично! Вы освоили ходы ферзя!"
}'::jsonb,
  content = 'Ферзь — самая сильная фигура в шахматах. Она объединяет возможности ладьи и слона: ходит по горизонтали, вертикали и диагонали на любое число клеток. Ферзь не может перепрыгивать через фигуры.'
WHERE id = (
  SELECT id FROM lessons WHERE title = 'Урок 4: Как ходит ферзь' LIMIT 1
);