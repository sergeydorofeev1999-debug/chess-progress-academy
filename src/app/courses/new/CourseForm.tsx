'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CourseForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const payload: any = {
        title,
        description,
        level,
        is_published: isPublished,
      };

      if (profile?.role === 'coach') {
        payload.coach_id = user.id;
      }

      const { error: insertError } = await supabase
        .from('courses')
        .insert(payload);

      if (insertError) throw insertError;

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании курса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Например: Шахматы с нуля"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Описание</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          rows={4}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Краткое описание курса"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Уровень</label>
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="beginner">Начинающий</option>
          <option value="intermediate">Средний</option>
          <option value="advanced">Продвинутый</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_published"
          checked={isPublished}
          onChange={e => setIsPublished(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor="is_published" className="text-sm text-slate-700">
          Опубликовать сразу
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-900 font-medium px-6 py-2 rounded-lg transition"
        >
          {loading ? 'Создание...' : 'Создать курс'}
        </button>
        <a
          href="/admin"
          className="inline-flex items-center border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-lg transition"
        >
          Отмена
        </a>
      </div>
    </form>
  );
}
