-- Обновить Урок 1: интерактивная доска "Съешь звезду"
UPDATE lessons
SET video_url = '{"type":"interactive_collect_stars","instructions":"Ладья стоит на a1. Проведите ладью по доске и соберите все золотые звёзды! Ладья ходит по горизонталям и вертикалям.","initialFen":"8/8/8/8/8/8/8/R7 w - - 0 1","stars":[{"square":"a8"},{"square":"h8"},{"square":"h1"}],"allowedPieces":["r"],"hint":"Ладья ходит только прямо. Попробуйте a1→a8→h8→h1.","successMessage":"Отлично! Вы собрали все звёзды и изучили координаты доски."}'::jsonb,
    chess_board_fen = '8/8/8/8/8/8/8/R7 w - - 0 1',
    content = 'Проведите ладью по доске и соберите все золотые звёзды. Ладья ходит по горизонталям и вертикалям на любое расстояние.'
WHERE id = '871fd651-0b72-476a-a552-bc83a8d8b334';

-- Проверка
SELECT title, video_url IS NOT NULL as has_interactive
FROM lessons
WHERE id = '871fd651-0b72-476a-a552-bc83a8d8b334';
