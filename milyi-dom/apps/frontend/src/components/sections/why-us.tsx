const advantages = [
  {
    title: 'Безопасность и прозрачность',
    description: 'Проверяем каждого хозяина и гостя, используем защищённые платежи и понятные правила проживания.',
    icon: (
      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  },
  {
    title: 'Помощь на всех этапах',
    description: 'Поддерживаем 24/7: поможем подобрать жильё, решим вопросы с заселением и подскажем, что посмотреть рядом.',
    icon: (
      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: 'Гибкие условия бронирования',
    description: 'Выбирайте понятные тарифы, бесплатные отмены и скидки для длительных поездок.',
    icon: (
      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
];

export default function WhyUs() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Почему выбирают нас
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Мы делаем ваше путешествие комфортным и безопасным
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {advantages.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white p-8 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                {item.icon}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-4 text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

