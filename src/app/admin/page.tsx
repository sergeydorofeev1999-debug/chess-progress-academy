'use client';

import { useState } from 'react';
import { courses } from '@/lib/mockData';
import { Plus, Trash2, Edit3 } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons'>('courses');

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['courses', 'lessons'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === tab
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab === 'courses' ? 'Курсы' : 'Уроки'}
          </button>
        ))}
      </div>

      {/* Courses tab */}
      {activeTab === 'courses' && (
        <div>
          <button className="mb-4 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-2 rounded-lg transition">
            <Plus size={18} /> Создать курс
          </button>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Название</th>
                  <th className="px-4 py-3 text-left font-medium">Уровень</th>
                  <th className="px-4 py-3 text-left font-medium">Уроков</th>
                  <th className="px-4 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{course.title}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{course.level}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-slate-400 hover:text-slate-600 mr-2"><Edit3 size={16} /></button>
                      <button className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lessons tab */}
      {activeTab === 'lessons' && (
        <div>
          <button className="mb-4 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-4 py-2 rounded-lg transition">
            <Plus size={18} /> Создать урок
          </button>

          {courses.map(course => (
            <div key={course.id} className="mb-6">
              <h3 className="font-semibold mb-2">{course.title}</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Урок</th>
                      <th className="px-4 py-2 text-left font-medium">Модуль</th>
                      <th className="px-4 py-2 text-right font-medium">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {course.modules.flatMap(m => m.lessons).map(lesson => (
                      <tr key={lesson.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">{lesson.title}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {course.modules.find(m => m.lessons.some(l => l.id === lesson.id))?.title}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button className="text-slate-400 hover:text-slate-600 mr-2"><Edit3 size={16} /></button>
                          <button className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
