import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'typesense';
import { CacheService } from '../cache/cache.service';
import type { SearchParams } from 'typesense/lib/Typesense/Documents';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';

// ── Collection schema ─────────────────────────────────────────────────────────

const LISTINGS_SCHEMA = {
  name: 'listings',
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'title', type: 'string' as const },
    { name: 'description', type: 'string' as const, optional: true },
    { name: 'city', type: 'string' as const, facet: true },
    { name: 'country', type: 'string' as const, facet: true },
    { name: 'pricePerNight', type: 'float' as const },
    { name: 'maxGuests', type: 'int32' as const, facet: true },
    { name: 'bedroomsCount', type: 'int32' as const, facet: true },
    { name: 'bathroomsCount', type: 'float' as const, facet: true },
    { name: 'rating', type: 'float' as const },
    { name: 'reviewsCount', type: 'int32' as const },
    { name: 'isSuperhost', type: 'bool' as const, facet: true },
    { name: 'amenities', type: 'string[]' as const, facet: true },
    { name: 'status', type: 'string' as const, facet: true },
    {
      name: 'location',
      type: 'geopoint' as const,
      optional: true,
    },
  ],
  default_sorting_field: 'rating',
} as const;

export interface ListingDocument {
  id: string;
  title: string;
  description?: string;
  city: string;
  country: string;
  pricePerNight: number;
  maxGuests: number;
  bedroomsCount: number;
  bathroomsCount: number;
  rating: number;
  reviewsCount: number;
  isSuperhost: boolean;
  amenities: string[];
  status: string;
  location?: [number, number]; // [lat, lng]
}

export interface SearchListingsParams {
  q: string;
  city?: string;
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  maxGuests?: number;
  bedroomsCount?: number;
  amenities?: string[];
  page?: number;
  perPage?: number;
  sortBy?: 'rating' | 'pricePerNight' | 'reviewsCount';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly client: Client;

  constructor(
    private readonly config: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    this.client = new Client({
      nodes: [
        {
          host: config.get<string>('typesense.host', 'localhost'),
          port: config.get<number>('typesense.port', 8108),
          protocol: 'http',
        },
      ],
      apiKey: config.get<string>('typesense.apiKey', 'milyi-dom-typesense-dev-key'),
      connectionTimeoutSeconds: 5,
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  // ── Collection management ─────────────────────────────────────────────────

  private async ensureCollection() {
    try {
      await this.client.collections('listings').retrieve();
      this.logger.log('Typesense "listings" collection already exists');
    } catch {
      try {
        await this.client.collections().create(LISTINGS_SCHEMA as unknown as CollectionCreateSchema);
        this.logger.log('Typesense "listings" collection created');
      } catch (err) {
        this.logger.warn(`Typesense unavailable on startup — search disabled: ${String(err)}`);
      }
    }
  }

  // ── Indexing ──────────────────────────────────────────────────────────────

  async indexListing(doc: ListingDocument): Promise<void> {
    try {
      await this.client.collections('listings').documents().upsert(doc);
    } catch (err) {
      this.logger.warn(`Failed to index listing ${doc.id}: ${String(err)}`);
    }
  }

  async deleteListing(id: string): Promise<void> {
    try {
      await this.client.collections('listings').documents(id).delete();
    } catch (err) {
      this.logger.warn(`Failed to delete listing ${id} from index: ${String(err)}`);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async searchListings(params: SearchListingsParams) {
    const cacheKey = `search:listings:${JSON.stringify(params)}`;
    return this.cacheService.wrap(
      cacheKey,
      () => this._searchListings(params),
      60, // 60 seconds
    );
  }

  private async _searchListings(params: SearchListingsParams) {
    const {
      q,
      city,
      country,
      minPrice,
      maxPrice,
      maxGuests,
      bedroomsCount,
      amenities,
      page = 1,
      perPage = 20,
      sortBy = 'rating',
      sortOrder = 'desc',
    } = params;

    const filterParts: string[] = ['status:=PUBLISHED'];

    if (city) filterParts.push(`city:=${city}`);
    if (country) filterParts.push(`country:=${country}`);
    if (minPrice !== undefined && maxPrice !== undefined) {
      filterParts.push(`pricePerNight:[${minPrice}..${maxPrice}]`);
    } else if (minPrice !== undefined) {
      filterParts.push(`pricePerNight:>=${minPrice}`);
    } else if (maxPrice !== undefined) {
      filterParts.push(`pricePerNight:<=${maxPrice}`);
    }
    if (maxGuests !== undefined) filterParts.push(`maxGuests:>=${maxGuests}`);
    if (bedroomsCount !== undefined) filterParts.push(`bedroomsCount:>=${bedroomsCount}`);
    if (amenities && amenities.length > 0) {
      filterParts.push(`amenities:=[${amenities.join(',')}]`);
    }

    const searchParams: SearchParams<object> = {
      q: q || '*',
      query_by: 'title,description,city,country',
      filter_by: filterParts.join(' && '),
      sort_by: `${sortBy}:${sortOrder}`,
      page,
      per_page: perPage,
      facet_by: 'city,country,maxGuests,bedroomsCount,amenities',
    };

    try {
      return await this.client.collections('listings').documents().search(searchParams);
    } catch (err) {
      this.logger.warn(`Typesense search failed: ${String(err)}`);
      return { hits: [], found: 0, page: 1 };
    }
  }

  // ── Bulk reindex ──────────────────────────────────────────────────────────

  async bulkIndex(docs: ListingDocument[]): Promise<void> {
    if (docs.length === 0) return;
    try {
      await this.client.collections('listings').documents().import(docs, { action: 'upsert' });
      this.logger.log(`Bulk indexed ${docs.length} listings`);
    } catch (err) {
      this.logger.warn(`Bulk index failed: ${String(err)}`);
    }
  }
}
