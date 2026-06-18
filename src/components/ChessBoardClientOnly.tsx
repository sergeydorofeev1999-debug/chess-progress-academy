import dynamic from 'next/dynamic';

const ChessBoardDynamic = dynamic(
  () => import('@/components/ChessBoard'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[480px] mx-auto aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    ),
  }
);

export default function ChessBoardClientOnly({ fen }: { fen: string }) {
  return <ChessBoardDynamic fen={fen} interactive={true} />;
}
