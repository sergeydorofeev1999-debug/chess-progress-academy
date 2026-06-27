import { createClient } from '@/lib/supabase/server';
import Navbar from './Navbar';

export default async function NavbarWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    isAdmin = !!profile;
  }

  return <Navbar isAdmin={isAdmin} />;
}
