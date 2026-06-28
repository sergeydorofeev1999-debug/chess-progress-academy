import { createClient } from '@/lib/supabase/server';
import Navbar from './Navbar';

export default async function NavbarWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    userRole = profile?.role || null;
  }

  const isAdmin = userRole === 'admin';
  const isCoach = userRole === 'coach';

  return <Navbar isAdmin={isAdmin} isCoach={isCoach} />;
}
