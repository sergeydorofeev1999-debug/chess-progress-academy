-- Урок 40: Тактический штурм
INSERT INTO lessons (module_id, course_id, title, content, "order", duration_minutes, chess_board_fen, video_url)
VALUES (
  '3fa89d66-e362-4827-9abe-0571936dcd4a',  -- Модуль (тот же что уроки 38-39)
  '22fb0184-9784-4cae-9f2d-cc32ceee4c9c',  -- Курс
  'Урок 40: Тактический штурм',
  'Тактический штурм — это тренировка решения шахматных задач на скорость. Выберите режим: Штурм (5 минут), Блиц (3 минуты) или Выживание (без ограничения времени, ошибка = конец). Решайте задачи, набирайте очки и старайтесь не прерывать серию правильных ответов!',
  40,
  15,
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  '{"type": "interactive_tactical_storm"}'
);
