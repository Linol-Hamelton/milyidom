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

  it('keeps frontend static image paths unchanged', () => {
    const service = createService() as any;

    expect(service.normalizeImageUrl('/images/listing-3.jpg')).toBe('/images/listing-3.jpg');
  });

  it('keeps absolute CDN URLs unchanged (new uploads store full URL)', () => {
    const service = createService() as any;
    const cdnUrl =
      'https://milyidom-images.storage.yandexcloud.net/Russia/Moscow/%D0%90%D1%80%D0%B1%D0%B0%D1%82/10/listing123/1773106737764-abc.jpg';

    expect(service.normalizeImageUrl(cdnUrl)).toBe(cdnUrl);
  });

  it('normalizes legacy relative upload paths using imageBaseUrl fallback', () => {
    const service = createService() as any;

    // Existing DB records with relative keys are still handled gracefully
    expect(service.normalizeImageUrl('uploads/abc.jpg')).toBe(
      'http://localhost:4001/images/uploads/abc.jpg',
    );
  });
});
