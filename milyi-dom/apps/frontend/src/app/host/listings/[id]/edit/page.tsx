import { EditListingClient } from '../../../../../components/host/edit-listing-client';
import { RequireAuth } from '../../../../../components/ui/require-auth';

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RequireAuth roles={['HOST', 'ADMIN']}>
      <div className="bg-sand-50 py-12">
        <div className="mx-auto max-w-content-xl px-4 sm:px-6 lg:px-10">
          <header className="space-y-2">
            <p className="text-sm uppercase tracking-wide text-pine-600">Редактирование</p>
            <h1 className="text-3xl font-serif text-slate-900">Обновите детали объявления</h1>
            <p className="text-sm text-slate-600">
              Измените информацию и изображения, чтобы предложение оставалось актуальным и привлекательным для гостей.
            </p>
          </header>
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-soft">
            <EditListingClient listingId={id} />
          </section>
        </div>
      </div>
    </RequireAuth>
  );
}
