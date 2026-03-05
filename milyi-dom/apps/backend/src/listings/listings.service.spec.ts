import { ListingsService } from './listings.service';

describe('ListingsService image normalization', () => {
  const createService = () =>
    new ListingsService(
      {} as any,
      { get: jest.fn().mockReturnValue(undefined) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

  it('replaces seed listing unsplash urls with stable local images', () => {
    const service = createService() as any;

    expect(
      service.normalizeListingImageUrl(
        'seed_msk_loft',
        'https://images.unsplash.com/photo-1579033461380-b1d5dbf39a77?auto=format&fit=crop&w=800&q=80',
        0,
      ),
    ).toBe('/images/listing-1.jpg');
    expect(
      service.normalizeListingImageUrl(
        'seed_msk_loft',
        'https://images.unsplash.com/photo-1580587771525-4f3f51f17c39?auto=format&fit=crop&w=800&q=80',
        5,
      ),
    ).toBe('/images/listing-2.jpg');
  });

  it('keeps non-seed external images untouched', () => {
    const service = createService() as any;
    const url =
      'https://images.unsplash.com/photo-1579033461380-b1d5dbf39a77?auto=format&fit=crop&w=800&q=80';

    expect(service.normalizeListingImageUrl('listing-real', url, 0)).toBe(url);
  });

  it('keeps frontend static image paths and normalizes relative upload paths', () => {
    const service = createService() as any;

    expect(service.normalizeImageUrl('/images/listing-3.jpg')).toBe('/images/listing-3.jpg');
    expect(service.normalizeImageUrl('uploads/abc.jpg')).toBe(
      'http://localhost:4001/images/uploads/abc.jpg',
    );
  });
});
