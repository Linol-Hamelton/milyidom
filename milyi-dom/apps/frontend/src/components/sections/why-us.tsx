const advantages = [
  {
    title: 'Безопасность и прозрачность',
    description: 'Проверяем каждого хозяина и гостя, используем защищённые платежи и понятные правила проживания.',
    icon: '🔒',
  },
  {
    title: 'Поддержка 24/7',
    description: 'Поможем подобрать жильё, решим вопросы с заселением и подскажем, что посмотреть рядом.',
    icon: '🤝',
  },
  {
    title: 'Гибкие условия',
    description: 'Понятные тарифы, бесплатные отмены и скидки для длительных поездок.',
    icon: '📅',
  },
  {
    title: 'Проверенные отзывы',
    description: 'Только реальные гости оставляют отзывы. Вы всегда знаете, чего ожидать.',
    icon: '⭐',
  },
];

export default function WhyUs() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-pine-600">Наши преимущества</p>
          <h2 className="mt-2 font-serif text-3xl text-slate-900 md:text-4xl">
            Почему выбирают Милый Дом
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map((item) => (
            <div
              key={item.title}
              className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition hover:border-pine-200 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pine-50 text-3xl">
                {item.icon}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
