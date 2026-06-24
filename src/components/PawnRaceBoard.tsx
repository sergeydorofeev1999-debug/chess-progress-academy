'use client';

import dynamic from 'next/dynamic';

const PawnRaceBoardClient = dynamic(
  () => import('./PawnRaceBoardClient'),
  { ssr: false }
);

export default function PawnRaceBoard({ onComplete }: { onComplete: () => void }) {
  return <PawnRaceBoardClient onComplete={onComplete} />;
}
