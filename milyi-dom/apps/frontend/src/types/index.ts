export interface Listing {
  id: string;
  slug?: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
  reviews: number;
  tags: string[];
  image: string;
  guests: number;
  bedrooms: number;
  baths: number;
  instantBook?: boolean;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  description: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
}