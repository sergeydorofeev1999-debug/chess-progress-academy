import Link from 'next/link';
import { getCourses } from '@/lib/data';
import { Clock, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Курсы</h1>
      <p className="text-slate-600 mb-8">Выбери курс и начни обучение</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course: any) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="group">
            <div className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 h-40 flex items-center justify-center">
                <span className="text-6xl">♟️</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 text-xs text-amber-600 mb-2">
                  <BarChart3 size={14} /> {course.level === 'beginner' ? 'Начинающий' : course.level}
                </div>
                <h3 className="font-semibold text-lg mb-1 group-hover:text-amber-600 transition">{course.title}</h3>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{course.description}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock size={14} /> Курс
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
