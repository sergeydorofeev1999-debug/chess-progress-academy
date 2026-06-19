-- ============================================
-- Урок 3: Слон — Интерактивные задания (collect stars)
-- Выполните в Supabase Dashboard → SQL Editor
-- ============================================

UPDATE lessons
SET video_url = '{
  "type": "interactive_collect_stars",
  "pieceName": "Слон",
  "pieceCode": "wB",
  "pieceDescription": "Движется по диагонали",
  "levels": [
    {
      "initialFen": "8/8/8/8/8/8/8/5B2 w - - 0 1",
      "stars": [{"square": "h3"}],
      "instructions": "Слон стоит на f1. Доведите его до звезды на h3! Слон ходит по диагонали.",
      "hint": "Слон ходит по диагонали. f1 → h3.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/8/8/8/2B5 w - - 0 1",
      "stars": [{"square": "a3"}, {"square": "e7"}],
      "instructions": "Слон на c1. Соберите обе звёзды!",
      "hint": "По диагонали: c1 → a3, потом a3 → e7.",
      "maxMoves": 3
    },
    {
      "initialFen": "8/8/8/8/8/2B5/8/8 w - - 0 1",
      "stars": [{"square": "d6"}, {"square": "h6"}],
      "instructions": "Слон на c3. Соберите звёзды на d6 и h6!",
      "hint": "c3 → d4 → e5 → f6 → h6. Обратите внимание — d6 уже пройдено.",
      "maxMoves": 5
    },
    {
      "initialFen": "8/8/8/8/8/2b5/8/2B5 w - - 0 1",
      "stars": [{"square": "a3"}],
      "instructions": "Слон на c1, но чёрный слон на c6 блокирует путь. Найдите обход!",
      "hint": "Слон не может перепрыгивать. Ищите другую диагональ: c1 → a3 напрямую.",
      "maxMoves": 2
    },
    {
      "initialFen": "8/8/8/8/8/8/8/3B4 w - - 0 1",
      "stars": [{"square": "a6"}, {"square": "h6"}, {"square": "h1"}],
      "instructions": "Слон на d1. Соберите все три звёзды!",
      "hint": "d1 → h5 → h6, или d1 → a4 → a6.",
      "maxMoves": 5
    }
  ],
  "successMessage": "Отлично! Вы освоили ходы слона!"
}'::jsonb,
  content = 'Слон ходит по диагонали на любое число клеток. У каждого игрока два слона: один ходит по белым полям, другой — по чёрным. Они никогда не меняют цвет полей.'
WHERE id = (
  SELECT id FROM lessons WHERE title = 'Урок 3: Как ходит слон' LIMIT 1
);