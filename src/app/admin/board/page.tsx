'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import BoardEditor from '@/components/board/BoardEditor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BoardEditorPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/auth';
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!profile) {
        window.location.href = '/';
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    }
    checkAdmin();
  }, []);

  if (loading) {
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
