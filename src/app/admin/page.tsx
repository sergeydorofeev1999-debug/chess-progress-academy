import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

// Замените на ваши email'ы администраторов
const ADMIN_EMAILS = [
  'sergeydorofeev1999@gmail.com',
];

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // TODO: после миграции profiles.role переключить на проверку role === 'admin'
  if (!ADMIN_EMAILS.includes(user.email ?? '')) {
    notFound();
  }

  return <AdminClient />;
}
