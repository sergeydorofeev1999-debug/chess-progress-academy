'use client';

import BoardEditor from '@/components/board/BoardEditor';

export default function TestBoardPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Тест редактора (без авторизации)</h1>
      <BoardEditor />
    </div>
  );
}
