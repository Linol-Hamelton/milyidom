import CategoryPills from "../components/sections/category-pills";
import Destinations from "../components/sections/destinations";
import FeaturedListings from "../components/sections/featured-listings";
import Hero from "../components/sections/hero";
import HostCta from "../components/sections/host-cta";
import Newsletter from "../components/sections/newsletter";
import Testimonials from "../components/sections/testimonials";
import WhyUs from "../components/sections/why-us";

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
