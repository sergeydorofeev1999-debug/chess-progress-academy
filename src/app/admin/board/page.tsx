import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BoardEditor from '@/components/board/BoardEditor';

export const dynamic = 'force-dynamic';

export default async function BoardEditorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Редактор позиций</h1>
      <BoardEditor />
    </div>
  );
}
