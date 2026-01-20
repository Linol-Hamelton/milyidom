import Link from 'next/link';

const footerLinks = [
  {
    title: 'О сервисе',
    items: [
      { label: 'Как работает Милый дом', href: '#' },
      { label: 'Команда и партнеры', href: '#' },
      { label: 'Контакты', href: '#' },
    ],
  },
  {
    title: 'Поддержка',
    items: [
      { label: 'Помощь гостям', href: '#support' },
      { label: 'Правила и безопасность', href: '#' },
      { label: 'Центр помощи', href: '#' },
    ],
  },
  {
    title: 'Хостам',
    items: [
      { label: 'Стать хозяином', href: '#hosts' },
      { label: 'Рекомендации по приёму гостей', href: '#' },
      { label: 'Программа доверия', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer id="support">
      <div className="mx-auto grid max-w-content-lg gap-12 px-6 py-12 lg:grid-cols-4 lg:px-10">
        <div className="space-y-4">
          <div>
            <span className="text-xl font-semibold text-pine-600">Милый дом</span>
            <p className="mt-2 text-sm text-slate-600">
              Сервис для поиска уютного жилья в городах и путешествиях. Бронируйте напрямую у проверенных хозяев.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Milyi Dom. Все права защищены.
          </p>
        </div>
        {footerLinks.map((column) => (
          <div key={column.title} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {column.title}
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              {column.items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-pine-500">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
