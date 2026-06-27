'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Неверный email или пароль';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Подтвердите email перед входом';
  }
  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return 'Пользователь с таким email уже зарегистрирован';
  }
  if (normalized.includes('password')) {
    return 'Пароль должен быть не короче 6 символов';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Слишком много попыток. Попробуйте позже';
  }
  return 'Не удалось выполнить вход. Попробуйте ещё раз';
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('success');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error');
    if (error) {
      setMessage(decodeURIComponent(error));
      setMessageType('error');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('success');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage(getAuthErrorMessage(error.message));
        setMessageType('error');
      } else {
        setMessage('Проверьте почту для подтверждения регистрации');
        setMessageType('success');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(getAuthErrorMessage(error.message));
        setMessageType('error');
      } else {
        window.location.href = '/dashboard';
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setMessage('');
    setMessageType('success');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setMessageType('error');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isSignUp ? 'Регистрация' : 'Вход'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
            required
            minLength={6}
          />
        </div>

        {message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              messageType === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Загрузка...' : isSignUp ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase text-slate-400">или</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          viewBox="0 0 24 24"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
          />
        </svg>
        {googleLoading ? 'Подключение...' : 'Войти через Google'}
      </button>

      <p className="text-center text-sm text-slate-600 mt-4">
        {isSignUp ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-amber-600 hover:text-amber-700 font-medium"
        >
          {isSignUp ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </p>
    </div>
  );
}
