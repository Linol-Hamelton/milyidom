import { ListingDetailClient } from '../../../components/listings/listing-detail-client';

interface ListingDetailPageProps {
  params: { id: string };
}

export default function ListingDetailPage({ params }: ListingDetailPageProps) {
  return <ListingDetailClient listingId={params.id} />;
}

