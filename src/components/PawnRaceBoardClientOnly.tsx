import dynamic from 'next/dynamic';

const PawnRaceBoard = dynamic(
  () => import('@/components/PawnRaceBoard'),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Загрузка доски...</p>
      </div>
    ),
  }
);

export default function PawnRaceBoardClientOnly({ onComplete }: { onComplete: () => void }) {
  return <PawnRaceBoard onComplete={onComplete} />;
}
