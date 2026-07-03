import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCoachCourses } from '@/lib/data';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
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

  const courses = await getCoachCourses();

  return (
    <>
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <AdminClient courses={courses} />
    </>
  );
}