"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { fetchCurrentUser, fetchUserStats, updateAccount, updateProfile } from '../../services/users';
import { parseError } from '../../lib/api-client';

export default function ProfilePage() {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ listings: number; bookings: number; reviews: number; favorites: number } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    avatarUrl: '',
    bio: '',
    languages: '' as string,
    phone: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [current, statData] = await Promise.all([fetchCurrentUser(), fetchUserStats()]);
        updateUser(current);
        setStats(statData);
        setProfileForm({
          firstName: current.profile?.firstName ?? '',
          lastName: current.profile?.lastName ?? '',
          avatarUrl: current.profile?.avatarUrl ?? '',
          bio: current.profile?.bio ?? '',
          languages: current.profile?.languages?.join(', ') ?? '',
          phone: '',
        });
      } catch (error) {
        const { message } = parseError(error);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
        load();
  }, [isAuthenticated, updateUser]);

  const handleChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await Promise.all([
        updateProfile({
          firstName: profileForm.firstName || undefined,
          lastName: profileForm.lastName || undefined,
          avatarUrl: profileForm.avatarUrl || undefined,
          bio: profileForm.bio || undefined,
          languages: profileForm.languages
            ? profileForm.languages.split(',').map((lang) => lang.trim()).filter(Boolean)
            : undefined,
        }),
        profileForm.phone ? updateAccount({ user: { phone: profileForm.phone } }) : Promise.resolve(),
      ]);
      toast.success('Профиль обновлён');
      const refreshed = await fetchCurrentUser();
      updateUser(refreshed);
    } catch (error) {
      const { message } = parseError(error);
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900">Аккаунт</h1>
            <p className="mt-2 text-gray-600">Управляйте вашей личной информацией и настройками</p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-1">
                {[
                  { id: 'profile', name: 'Профиль', icon: '👤' },
                  { id: 'security', name: 'Безопасность', icon: '🔒' },
                  { id: 'notifications', name: 'Уведомления', icon: '🔔' },
                  { id: 'payments', name: 'Платежи', icon: '💳' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${
                      activeTab === item.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {item.name}
                  </button>
                ))}
              </nav>

              {/* Stats */}
              {stats && (
                <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Объявления', value: stats.listings, color: 'bg-blue-100 text-blue-800' },
                      { label: 'Поездки', value: stats.bookings, color: 'bg-green-100 text-green-800' },
                      { label: 'Отзывы', value: stats.reviews, color: 'bg-yellow-100 text-yellow-800' },
                      { label: 'Избранное', value: stats.favorites, color: 'bg-pink-100 text-pink-800' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${item.color}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
          )}
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && (
                <div className="rounded-xl bg-white p-8 shadow-sm">
                  <div className="mb-8">
                    <h2 className="text-2xl font-semibold text-gray-900">Личная информация</h2>
                    <p className="mt-2 text-gray-600">
                      Обновите вашу личную информацию и настройки профиля
                    </p>
                  </div>

                  {/* Avatar Section */}
                  <div className="mb-8 flex items-center gap-6">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center text-2xl font-semibold text-white">
                      {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user?.email}
                      </h3>
                      <p className="text-gray-600">{user?.email}</p>
                      {user?.isSuperhost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800 mt-1">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Суперхост
                        </span>
                      )}
                    </div>
                  </div>

                  <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Имя
                        </label>
                        <Input
                          value={profileForm.firstName}
                          onChange={(event) => handleChange('firstName', event.target.value)}
                          placeholder="Ваше имя"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Фамилия
                        </label>
                        <Input
                          value={profileForm.lastName}
                          onChange={(event) => handleChange('lastName', event.target.value)}
                          placeholder="Ваша фамилия"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Телефон
                      </label>
                      <Input
                        placeholder="+7 (___) ___-__-__"
                        value={profileForm.phone}
                        onChange={(event) => handleChange('phone', event.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Аватар (URL)
                      </label>
                      <Input
                        value={profileForm.avatarUrl}
                        onChange={(event) => handleChange('avatarUrl', event.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        О себе
                      </label>
                      <Textarea
                        rows={4}
                        value={profileForm.bio}
                        onChange={(event) => handleChange('bio', event.target.value)}
                        placeholder="Расскажите о себе, своих интересах или стиле хостинга..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Языки (через запятую)
                      </label>
                      <Input
                        value={profileForm.languages}
                        onChange={(event) => handleChange('languages', event.target.value)}
                        placeholder="Русский, Английский, Французский"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700"
                      >
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="rounded-xl bg-white p-8 shadow-sm">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">Безопасность</h2>
                  <div className="space-y-6">
                    <div className="border-b border-gray-200 pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Смена пароля</h3>
                      <p className="text-gray-600 mb-4">Обновите ваш пароль для повышения безопасности</p>
                      <Button variant="outline">Сменить пароль</Button>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Двухфакторная аутентификация</h3>
                      <p className="text-gray-600 mb-4">Добавьте дополнительный уровень защиты к вашему аккаунту</p>
                      <Button variant="outline">Настроить 2FA</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
