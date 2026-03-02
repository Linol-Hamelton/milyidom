import Image from 'next/image';
import Link from 'next/link';
import { destinations } from '../../data/destinations';

export default function Destinations() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Исследуйте направления
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Откройте для себя уникальные места по всему миру
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {destinations.map((destination) => (
            <Link
              key={destination.id}
              href={`/listings?city=${encodeURIComponent(destination.name)}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <Image
                  src={destination.image}
                  alt={destination.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 250px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-semibold">{destination.name}</h3>
                  <p className="text-sm opacity-90">{destination.country}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

