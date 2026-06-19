-- ============================================
-- Урок 2: Пешка — Интерактивные задания (collect stars)
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

UPDATE lessons
SET video_url = '{
  "type": "interactive_collect_stars",
  "pieceName": "Пешка",
  "pieceCode": "wP",
  "pieceDescription": "Движется вперёд, бьёт по диагонали",
  "levels": [
    {
      "initialFen": "8/8/8/8/8/8/4P3/8 w - - 0 1",
      "stars": [{"square": "e4"}],
      "instructions": "Пешка стоит на e2. Доведите её до звезды на e4! Пешка ходит вперёд.",
      "hint": "Пешка ходит вперёд на одну клетку. e2 → e3 → e4.",
      "maxMoves": 3
    },
    {
      "initialFen": "8/8/8/8/8/8/4P3/8 w - - 0 1",
      "stars": [{"square": "e4"}, {"square": "e5"}],
      "instructions": "Соберите обе звёзды с e4 и e5!",
      "hint": "Пешка идёт вперёд: e2 → e3 → e4 → e5.",
      "maxMoves": 4
    },
    {
      "initialFen": "8/8/8/3p4/8/4P3/8/8 w - - 0 1",
      "stars": [{"square": "d4"}],
      "instructions": "Пешка на e3 может взять чёрную пешку на d4 по диагонали. Соберите звезду!",
      "hint": "Пешка бьёт по диагонали. Ход e3 → xd4.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/8/8/1P4P1/8 w - - 0 1",
      "stars": [{"square": "b4"}, {"square": "g4"}],
      "instructions": "Две пешки! Соберите обе звёзды.",
      "hint": "Пешки идут вперёд. b2→b3→b4, g2→g3→g4.",
      "maxMoves": 5
    },
    {
      "initialFen": "8/8/8/2p1p3/8/4P3/8/8 w - - 0 1",
      "stars": [{"square": "d4"}, {"square": "f4"}],
      "instructions": "Пешка на e3 может взять пешки на d4 ИЛИ f4! Соберите обе звёзды.",
      "hint": "Бейте по диагонали: e3×d4, потом d4→d5 (если нужно), или e3×f4.",
      "maxMoves": 4
    }
  ],
  "successMessage": "Отлично! Вы освоили ходы пешки!"
}'::jsonb,
  content = 'Пешка — основная фигура в шахматах. Она ходит вперёд на одну клетку (с начальной позиции — на две) и бьёт по диагонали.'
WHERE id = (
  SELECT id FROM lessons WHERE title = 'Урок 7: Как ходит пешка' LIMIT 1
);