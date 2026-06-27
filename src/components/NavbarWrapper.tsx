import { createClient } from '@/lib/supabase/server';
import Navbar from './Navbar';

const ADMIN_EMAILS = ['sergeydorofeev1999@gmail.com'];

export default async function NavbarWrapper() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email || '') : false;

  return <Navbar isAdmin={isAdmin} />;
}
