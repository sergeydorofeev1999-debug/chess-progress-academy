'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Menu, X, Home, BookOpen, LayoutDashboard, Settings, LogIn, LogOut } from 'lucide-react';

interface NavbarProps {
  isAdmin: boolean;
  isCoach: boolean;
}

export default function Navbar({ isAdmin, isCoach }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    }).catch((error) => {
      console.error('Failed to get user:', error);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const navLinks = [
    { href: '/', label: 'Главная', icon: Home },
    { href: '/courses', label: 'Курсы', icon: BookOpen },
  ];

  return (
    <nav className="bg-slate-900 text-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ♟️ Chess Progress Academy
        </Link>

        <div className="hidden md:flex gap-6 text-sm items-center">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-amber-400 transition">
              {label}
            </Link>
          ))}

          {user ? (
            <>
              <Link href="/dashboard" className="hover:text-amber-400 transition">
                Кабинет
              </Link>
              {isCoach && (
                <Link href="/coach" className="hover:text-amber-400 transition">
                  Тренер
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="hover:text-amber-400 transition">
                  Админ
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                <LogOut size={16} /> Выйти
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-slate-900 px-3 py-1.5 rounded-lg font-medium transition"
            >
              <LogIn size={16} /> Войти
            </Link>
          )}
        </div>

        <button
          className="md:hidden"
          aria-label="Открыть меню"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-slate-700 px-4 py-3 space-y-2 text-sm">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-2 py-1 hover:text-amber-400"
              onClick={() => setOpen(false)}>
              <Icon size={16} /> {label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2 py-1 hover:text-amber-400"
                onClick={() => setOpen(false)}>
                <LayoutDashboard size={16} /> Кабинет
              </Link>
              {isCoach && (
                <Link href="/coach" className="flex items-center gap-2 py-1 hover:text-amber-400"
                  onClick={() => setOpen(false)}>
                  <BookOpen size={16} /> Тренер
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="flex items-center gap-2 py-1 hover:text-amber-400"
                  onClick={() => setOpen(false)}>
                  <Settings size={16} /> Админ
                </Link>
              )}
              <button onClick={handleLogout} className="flex items-center gap-2 py-1 text-slate-400">
                <LogOut size={16} /> Выйти
              </button>
            </>
          ) : (
            <Link href="/auth" className="flex items-center gap-2 py-1 text-amber-400"
              onClick={() => setOpen(false)}>
              <LogIn size={16} /> Войти
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
