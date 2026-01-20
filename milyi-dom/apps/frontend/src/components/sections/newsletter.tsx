export default function Newsletter() {
  return (
    <section className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Будьте в курсе лучших предложений
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
              Получайте подборки уникальных жилых пространств и специальные предложения прямо на почту
            </p>
            <form className="mt-8 sm:flex sm:max-w-md sm:mx-auto">
              <div className="min-w-0 flex-1">
                <label htmlFor="email" className="sr-only">
                  Email адрес
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Введите ваш email"
                  className="block w-full rounded-md border border-gray-300 px-5 py-3 text-base text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="mt-3 sm:mt-0 sm:ml-3">
                <button
                  type="submit"
                  className="block w-full rounded-md bg-blue-600 px-5 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:px-10"
                >
              Подписаться
            </button>
        </div>
            </form>

            <p className="mt-3 text-sm text-gray-400">
              Мы заботимся о ваших данных. Ознакомьтесь с нашей{' '}
              <a href="#" className="font-medium text-gray-500 hover:text-gray-600">
                политикой конфиденциальности
              </a>
              .
            </p>
      </div>
        </div>
      </div>
    </section>
  );
}

