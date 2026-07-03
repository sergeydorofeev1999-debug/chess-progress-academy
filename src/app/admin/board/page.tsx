'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import BoardEditor from '@/components/board/BoardEditor';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BoardEditorPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
        .then(({ data: profile }) => {
          if (!profile) {
            window.location.href = '/';
            return;
          }
          setIsAdmin(true);
          setChecked(true);
        });
    });
  }, []);

  if (!checked) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Редактор позиций</h1>
      <BoardEditor />
    </div>
  );
}
