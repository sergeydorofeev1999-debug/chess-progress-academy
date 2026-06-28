import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCourse } from '@/lib/data';
import CourseForm from './CourseForm';

export const dynamic = 'force-dynamic';

export default async function NewCoursePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;
  if (role !== 'admin' && role !== 'coach') {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Создать курс</h1>
      <CourseForm />
    </div>
  );
}
