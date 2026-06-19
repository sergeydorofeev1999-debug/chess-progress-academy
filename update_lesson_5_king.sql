-- ============================================
-- Урок 5: Король — Интерактивные задания (collect stars)
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

UPDATE lessons
SET video_url = '{
  "type": "interactive_collect_stars",
  "pieceName": "Король",
  "pieceCode": "wK",
  "pieceDescription": "Самая важная фигура: ходит на 1 клетку в любом направлении",
  "levels": [
    {
      "initialFen": "8/8/8/8/8/8/8/4K3 w - - 0 1",
      "stars": [{"square": "e2"}],
      "instructions": "Король на e1. Дойдите до звезды на e2!",
      "hint": "Король ходит на одну клетку в любом направлении. e1 → e2.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/8/8/8/5K2 w - - 0 1",
      "stars": [{"square": "f2"}, {"square": "g3"}],
      "instructions": "Король на f1. Соберите звёзды на f2 и g3!",
      "hint": "f1 → f2 → g3. Или f1 → g2 → g3. Король ходит только на 1 клетку.",
      "maxMoves": 3
    },
    {
      "initialFen": "8/8/8/8/8/3K4/8/8 w - - 0 1",
      "stars": [{"square": "e4"}, {"square": "g4"}, {"square": "g2"}],
      "instructions": "Король на d3. Соберите все три звезды!",
      "hint": "d3 → e4 → f4? Нет, только на 1 клетку. d3 → e4 → f3 → g4 → g3 → g2. Или ищите короче.",
      "maxMoves": 6
    },
    {
      "initialFen": "8/8/8/8/2K5/8/8/8 w - - 0 1",
      "stars": [{"square": "c5"}, {"square": "a5"}, {"square": "a3"}],
      "instructions": "Король на c4. Соберите три звезды на c5, a5 и a3!",
      "hint": "c4 → c5 → b5 → a5 → a4 → a3.",
      "maxMoves": 6
    },
    {
      "initialFen": "8/8/8/8/8/4K3/8/8 w - - 0 1",
      "stars": [{"square": "f8"}, {"square": "h8"}, {"square": "h6"}],
      "instructions": "Король на e3. Соберите все звезды! Король медленный, но упорный.",
      "hint": "e3 → f4 → g5 → h6 → g7 → h8? Или e3 → f4 → e5 → f6 → g7 → f8 → g8 → h8. Ищите оптимальный путь.",
      "maxMoves": 8
    }
  ],
  "successMessage": "Отлично! Вы освоили ходы короля!"
}'::jsonb,
  content = 'Король — самая важная фигура. Если королю поставили мат — партия закончена. Король ходит на одну клетку в любом направлении: по горизонтали, вертикали и диагонали. Король не может ходить на клетку, где его атакуют (это называется шах).'
WHERE id = (
  SELECT id FROM lessons WHERE title = 'Урок 5: Король — главная фигура' LIMIT 1
);