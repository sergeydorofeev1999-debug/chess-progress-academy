import ChessFootballBoard from '@/components/ChessFootballBoard';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-lg">
        <h1 className="text-center text-xl font-bold mb-4">Тест: Урок 23</h1>
        <ChessFootballBoard onComplete={() => {}} />
      </div>
    </div>
  );
}
