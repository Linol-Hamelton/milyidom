import type { Metadata } from 'next';
import CategoryPills from "../components/sections/category-pills";
import Destinations from "../components/sections/destinations";
import FeaturedListings from "../components/sections/featured-listings";
import Hero from "../components/sections/hero";
import HostCta from "../components/sections/host-cta";
import Newsletter from "../components/sections/newsletter";
import Testimonials from "../components/sections/testimonials";
import WhyUs from "../components/sections/why-us";

export const metadata: Metadata = {
  title: 'Милый Дом — аренда жилья в России',
  description: 'Найдите идеальное место для отдыха или командировки. Проверенные хосты, честные цены, заботливый сервис.',
  openGraph: {
    title: 'Милый Дом — аренда жилья в России',
    description: 'Найдите идеальное место для отдыха или командировки. Проверенные хосты, честные цены, заботливый сервис.',
    url: 'https://milyidom.com',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Милый Дом' }],
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <CategoryPills />
      <FeaturedListings />
      <Destinations />
      <WhyUs />
      <Testimonials />
      <HostCta />
      <Newsletter />
    </>
  );
}
