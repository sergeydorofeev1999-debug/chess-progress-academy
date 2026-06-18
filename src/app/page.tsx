import Link from 'next/link';
import { BookOpen, Trophy, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">♟️ Chess Progress Academy</h1>
        <p className="text-lg text-slate-300 max-w-xl mx-auto mb-8">
          Онлайн-платформа для шахматных курсов. Учи фигуры, решаю задачи, отслеивай прогресс.
        </p>
        <Link
          href="/courses"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-8 py-3 rounded-lg transition"
        >
          Начать обучение
        </Link>
      </section>

      {/* Features */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: BookOpen, title: '10+ уроков', desc: 'От доски и фигур до первой партии' },
            { icon: Trophy, title: 'Интерактивная доска', desc: 'Разбирай позиции прямо в браузере' },
            { icon: Users, title: 'Прогресс', desc: 'Отслеивай, какие уроки пройдены' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-slate-200 rounded-xl p-6 text-center">
              <Icon className="mx-auto mb-3 text-amber-500" size={32} />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-100 py-16 px-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Первый курс уже доступен</h2>
        <p className="text-slate-600 mb-6">«Шахматы с нуля» — 10 уроков от доски до первой победы</p>
        <Link
          href="/courses/1"
          className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Перейти к курсу
        </Link>
      </section>
    </div>
  );
}
