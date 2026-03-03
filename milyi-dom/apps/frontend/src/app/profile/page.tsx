"use client";

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RequireAuth } from '../../components/ui/require-auth';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import { fetchCurrentUser, fetchUserStats, updateAccount, updateProfile, deleteMe, exportMyData, fetchNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from '../../services/users';
import { changePassword } from '../../services/auth';
import { fetchGuestBookings } from '../../services/bookings';
import type { Booking } from '../../types/api';
import { formatCurrency, decimalToNumber } from '../../lib/format';
import { parseError } from '../../lib/api-client';
import { LoyaltyCard } from '../../components/ui/loyalty-card';
import { TwoFactorSetup } from '../../components/ui/two-factor-setup';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, updateUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ listings: number; bookings: number; reviews: number; favorites: number } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState('profile');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [paymentBookings, setPaymentBookings] = useState<Booking[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Новые пароли не совпадают');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error('Новый пароль должен содержать минимум 8 символов');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast.success('Пароль изменён');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Вы уверены? Это действие необратимо. Все ваши данные будут анонимизированы.')) return;
    if (!window.confirm('Подтвердите ещё раз: удалить аккаунт безвозвратно?')) return;
    setDeletingAccount(true);
    try {
      await deleteMe();
      toast.success('Аккаунт удалён. До свидания!');
      logout();
      router.push('/');
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      await exportMyData();
      toast.success('Файл с вашими данными загружен');
    } catch (error) {
      toast.error(parseError(error).message);
    } finally {
      setExportingData(false);
    }
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
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-pine-600 border-t-transparent" />
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
                  { id: 'loyalty', name: 'Бонусы', icon: '⭐' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={async () => {
                      setActiveTab(item.id);
                      if (item.id === 'notifications' && notifPrefs === null) {
                        setNotifLoading(true);
                        try {
                          const prefs = await fetchNotificationPrefs();
                          setNotifPrefs(prefs);
                        } catch (err) {
                          toast.error(parseError(err).message);
                        } finally {
                          setNotifLoading(false);
                        }
                      }
                      if (item.id === 'payments' && paymentBookings.length === 0) {
                        setPaymentsLoading(true);
                        try {
                          const res = await fetchGuestBookings({ limit: 20 });
                          setPaymentBookings(res.items);
                        } catch (err) {
                          toast.error(parseError(err).message);
                        } finally {
                          setPaymentsLoading(false);
                        }
                      }
                    }}
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
                    <div className="h-20 w-20 rounded-full bg-pine-600 flex items-center justify-center text-2xl font-semibold text-white">
                      {user?.profile?.firstName?.[0]?.toUpperCase() || user?.email[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {user?.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}` : user?.email}
                      </h3>
                      <p className="text-gray-600">{user?.email}</p>
                      {user?.isSuperhost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pine-100 px-2 py-1 text-xs font-medium text-pine-800 mt-1">
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
                        className="bg-pine-600 hover:bg-pine-500 rounded-full"
                      >
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="rounded-xl bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Безопасность</h2>
                    <div className="space-y-6">
                      {/* Password change */}
                      <div className="border-b border-gray-200 pb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Смена пароля</h3>
                        <p className="text-gray-600 mb-4">Обновите ваш пароль для повышения безопасности</p>
                        <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
                          <Input
                            type="password"
                            placeholder="Текущий пароль"
                            value={pwForm.currentPassword}
                            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                            required
                          />
                          <Input
                            type="password"
                            placeholder="Новый пароль (мин. 8 символов)"
                            value={pwForm.newPassword}
                            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                            required
                          />
                          <Input
                            type="password"
                            placeholder="Повторите новый пароль"
                            value={pwForm.confirmPassword}
                            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                            required
                          />
                          <Button type="submit" variant="outline" disabled={pwSaving}>
                            {pwSaving ? 'Сохранение…' : 'Изменить пароль'}
                          </Button>
                        </form>
                      </div>
                      {/* 2FA */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Двухфакторная аутентификация</h3>
                        <p className="text-gray-600 mb-4">Добавьте дополнительный уровень защиты к вашему аккаунту</p>
                        <TwoFactorSetup
                          isEnabled={user?.twoFactorEnabled ?? false}
                          onStatusChange={(enabled) => updateUser({ ...user!, twoFactorEnabled: enabled })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* GDPR section */}
                  <div className="rounded-xl bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ваши данные (GDPR)</h2>
                    <p className="text-gray-600 mb-6">
                      Вы имеете право на получение копии своих данных и на их удаление в соответствии с GDPR.
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 p-4">
                        <div>
                          <h3 className="font-medium text-gray-900">Экспорт данных</h3>
                          <p className="text-sm text-gray-500">Скачайте JSON-файл со всеми вашими данными</p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={handleExportData}
                          disabled={exportingData}
                          className="shrink-0"
                        >
                          {exportingData ? 'Подготовка…' : 'Скачать данные'}
                        </Button>
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <div>
                          <h3 className="font-medium text-red-900">Удалить аккаунт</h3>
                          <p className="text-sm text-red-700">
                            Ваши данные будут анонимизированы. Удаление невозможно, если есть активные бронирования.
                          </p>
                        </div>
                        <Button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="shrink-0 bg-red-600 text-white hover:bg-red-700"
                        >
                          {deletingAccount ? 'Удаление…' : 'Удалить аккаунт'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'loyalty' && <LoyaltyCard showHistory />}

              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">История платежей</h2>
                    <p className="mt-1 text-sm text-gray-500">Ваши последние бронирования и их стоимость.</p>
                  </div>
                  {paymentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
                      ))}
                    </div>
                  ) : paymentBookings.length === 0 ? (
                    <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
                      <p className="text-slate-500">У вас пока нет бронирований.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                      {paymentBookings.map((booking, idx) => {
                        const STATUS_RU: Record<string, string> = {
                          PENDING: 'Ожидает',
                          CONFIRMED: 'Подтверждено',
                          CANCELLED: 'Отменено',
                          COMPLETED: 'Завершено',
                        };
                        const statusColor: Record<string, string> = {
                          PENDING: 'text-amber-600 bg-amber-50',
                          CONFIRMED: 'text-green-700 bg-green-50',
                          CANCELLED: 'text-red-600 bg-red-50',
                          COMPLETED: 'text-slate-600 bg-slate-100',
                        };
                        return (
                          <div
                            key={booking.id}
                            className={`flex items-center justify-between px-6 py-4 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{booking.listing.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {new Date(booking.checkIn).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                {' — '}
                                {new Date(booking.checkOut).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div className="ml-4 flex flex-shrink-0 items-center gap-3">
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[booking.status] ?? 'text-slate-600 bg-slate-100'}`}>
                                {STATUS_RU[booking.status] ?? booking.status}
                              </span>
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(decimalToNumber(booking.totalPrice), booking.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Email-уведомления</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Выберите, о чём вы хотите получать уведомления на почту.
                    </p>
                  </div>

                  {notifLoading || notifPrefs === null ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
                          <div className="space-y-1.5">
                            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                            <div className="h-3 w-64 animate-pulse rounded bg-gray-100" />
                          </div>
                          <div className="h-6 w-11 animate-pulse rounded-full bg-gray-200" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {([
                        {
                          key: 'notifEmailBookings' as const,
                          label: 'Бронирования',
                          description: 'Запросы, подтверждения, отмены и напоминания о заезде',
                        },
                        {
                          key: 'notifEmailMessages' as const,
                          label: 'Сообщения',
                          description: 'Новые сообщения от хозяев и гостей',
                        },
                        {
                          key: 'notifEmailSavedSearches' as const,
                          label: 'Сохранённые поиски',
                          description: 'Новые объявления по вашим сохранённым запросам',
                        },
                        {
                          key: 'notifEmailMarketing' as const,
                          label: 'Акции и новости',
                          description: 'Специальные предложения, скидки и обновления платформы',
                        },
                      ] as const).map(({ key, label, description }) => {
                        const checked = notifPrefs[key];
                        const toggle = async () => {
                          const updated = { ...notifPrefs, [key]: !checked };
                          setNotifPrefs(updated);
                          setNotifSaving(true);
                          try {
                            await updateNotificationPrefs({ [key]: !checked });
                          } catch (err) {
                            setNotifPrefs(notifPrefs); // rollback
                            toast.error(parseError(err).message);
                          } finally {
                            setNotifSaving(false);
                          }
                        };
                        return (
                          <div key={key} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
                            <div>
                              <p className="font-medium text-gray-900">{label}</p>
                              <p className="text-sm text-gray-500">{description}</p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={checked}
                              onClick={toggle}
                              disabled={notifSaving}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pine-500 focus:ring-offset-2 disabled:opacity-60 ${
                                checked ? 'bg-pine-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  checked ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
