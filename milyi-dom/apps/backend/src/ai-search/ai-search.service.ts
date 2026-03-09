import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AiSearchQuery {
  query: string;
}

export interface AiSearchResult {
  params: {
    q: string;
    city?: string;
    country?: string;
    minPrice?: number;
    maxPrice?: number;
    maxGuests?: number;
    bedroomsCount?: number;
    amenities?: string[];
    sortBy?: 'rating' | 'pricePerNight' | 'reviewsCount';
    sortOrder?: 'asc' | 'desc';
  };
  interpretation: string;
}

const SYSTEM_PROMPT = [
  'You are a search assistant for "Милый Дом" — a Russian short-term rental platform.',
  'Your job is to interpret a user natural language search query and extract structured search parameters.',
  'Respond ONLY with valid JSON (no markdown, no explanation):',
  '{',
  '  "q": "keywords for full-text search",',
  '  "city": "city name if mentioned, else null",',
  '  "country": "country if mentioned, else null",',
  '  "minPrice": number or null,',
  '  "maxPrice": number or null,',
  '  "maxGuests": number or null,',
  '  "bedroomsCount": number or null,',
  '  "amenities": ["wifi","pool",...] or [],',
  '  "sortBy": "rating"|"pricePerNight"|"reviewsCount"|null,',
  '  "sortOrder": "asc"|"desc"|null,',
  '  "interpretation": "one sentence in Russian describing what you understood"',
  '}',
  'Rules:',
  '- Extract price hints (budget, cheap, expensive)',
  '- Recognize Russian city names',
  '- Map amenities: wifi, pool, parking, gym, kitchen, ac, beach, mountain, sauna, fireplace',
  '- cheap/budget -> sortBy pricePerNight, sortOrder asc',
  '- best rated/top -> sortBy rating, sortOrder desc',
  '- Russian prices: недорого < 3000 RUB, дорого > 15000 RUB',
].join('\n');

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly client: OpenAI | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('deepseek.apiKey');
    if (apiKey) {
      this.client = new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com' });
      this.logger.log('DeepSeek AI client initialized');
    } else {
      this.client = null;
      this.logger.warn('DEEPSEEK_API_KEY not set — AI search disabled');
    }
  }

  async interpret(query: string): Promise<AiSearchResult> {
    if (!this.client) {
      return { params: { q: query }, interpretation: 'AI-поиск недоступен. Ищем по тексту запроса.' };
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 512,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const parsed = JSON.parse(text) as {
        q: string;
        city?: string | null;
        country?: string | null;
        minPrice?: number | null;
        maxPrice?: number | null;
        maxGuests?: number | null;
        bedroomsCount?: number | null;
        amenities?: string[];
        sortBy?: 'rating' | 'pricePerNight' | 'reviewsCount' | null;
        sortOrder?: 'asc' | 'desc' | null;
        interpretation: string;
      };

      return {
        params: {
          q: parsed.q || query,
          city: parsed.city ?? undefined,
          country: parsed.country ?? undefined,
          minPrice: parsed.minPrice ?? undefined,
          maxPrice: parsed.maxPrice ?? undefined,
          maxGuests: parsed.maxGuests ?? undefined,
          bedroomsCount: parsed.bedroomsCount ?? undefined,
          amenities: parsed.amenities?.length ? parsed.amenities : undefined,
          sortBy: parsed.sortBy ?? undefined,
          sortOrder: parsed.sortOrder ?? undefined,
        },
        interpretation: parsed.interpretation || 'Запрос обработан.',
      };
    } catch (err) {
      this.logger.warn(`AI search interpretation failed: ${String(err)}`);
      return { params: { q: query }, interpretation: 'Не удалось разобрать запрос. Ищем по тексту.' };
    }
  }

  async generateReviewSummary(reviews: { rating: number; comment: string }[]): Promise<string> {
    if (!this.client || reviews.length === 0) return '';

    const reviewText = reviews
      .slice(0, 50)
      .map((r) => `[${r.rating}/5] ${r.comment}`)
      .join('\n');

    try {
      const completion = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'Ты помощник для агрегации отзывов. Напиши краткое нейтральное резюме отзывов гостей (2-3 предложения на русском языке). Укажи главные плюсы и минусы.',
          },
          { role: 'user', content: reviewText },
        ],
      });
      return completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.warn(`Review summary failed: ${String(err)}`);
      return '';
    }
  }

  async detectFraud(listing: {
    title: string;
    description: string;
    basePrice: number;
    city: string;
    country: string;
  }): Promise<{ isFraud: boolean; reason: string }> {
    if (!this.client) return { isFraud: false, reason: '' };

    try {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Fraud detection timed out')), 5000);
      });

      const completion = await Promise.race([
        this.client.chat.completions.create({
          model: 'deepseek-chat',
          max_tokens: 256,
          messages: [
            {
              role: 'system',
              content:
                'You are a fraud detection system for a rental platform. Analyze the listing and respond ONLY with JSON: {"isFraud": boolean, "reason": "string"}. Flag fraud when: unrealistic pricing, copy-pasted generic text, suspicious claims, clearly fake location. Reason must be in Russian when isFraud is true, empty string otherwise.',
            },
            {
              role: 'user',
              content: `Title: ${listing.title}\nCity: ${listing.city}, ${listing.country}\nBase price/night: ${listing.basePrice} RUB\nDescription: ${listing.description}`,
            },
          ],
        }),
        timeoutPromise,
      ]);

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const result = JSON.parse(text) as { isFraud: boolean; reason: string };
      return { isFraud: result.isFraud ?? false, reason: result.reason ?? '' };
    } catch (err) {
      this.logger.warn(`Fraud detection failed: ${String(err)}`);
      return { isFraud: false, reason: '' };
    }
  }

  async suggestDynamicPrice(opts: {
    city: string;
    propertyType: string;
    bedrooms: number;
    currentPrice: number;
    currency: string;
    occupancyRate: number;
    month: number;
    marketData: {
      avgPrice: number;
      minPrice: number;
      maxPrice: number;
      listingsCount: number;
      avgRating: number;
    };
  }): Promise<{
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
    rationale: string;
    factors: string[];
  }> {
    const fallback = {
      suggestedPrice: opts.currentPrice,
      minPrice: Math.round(opts.currentPrice * 0.8),
      maxPrice: Math.round(opts.currentPrice * 1.2),
      rationale: 'AI недоступен — рекомендуется текущая цена.',
      factors: [] as string[],
    };

    if (!this.client) return fallback;

    const prompt = [
      `City: ${opts.city}, Type: ${opts.propertyType}, ${opts.bedrooms} bedrooms`,
      `Current price/night: ${opts.currentPrice} ${opts.currency}`,
      `Occupancy rate: ${opts.occupancyRate}%, Month: ${opts.month}`,
      `Market avg: ${opts.marketData.avgPrice}, min: ${opts.marketData.minPrice}, max: ${opts.marketData.maxPrice}`,
      `Market listings: ${opts.marketData.listingsCount}, avg rating: ${opts.marketData.avgRating.toFixed(1)}`,
    ].join('\n');

    try {
      const completion = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content:
              'You are a dynamic pricing engine. Respond ONLY with valid JSON (no markdown): ' +
              '{"suggestedPrice":<number>,"minPrice":<number>,"maxPrice":<number>,"rationale":"<Russian>","factors":["<factor>"]}. ' +
              'Conservative: max 40% change from current price.',
          },
          { role: 'user', content: prompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const result = JSON.parse(text) as {
        suggestedPrice: number;
        minPrice: number;
        maxPrice: number;
        rationale: string;
        factors: string[];
      };
      return {
        suggestedPrice: Math.round(result.suggestedPrice ?? opts.currentPrice),
        minPrice: Math.round(result.minPrice ?? opts.currentPrice * 0.8),
        maxPrice: Math.round(result.maxPrice ?? opts.currentPrice * 1.2),
        rationale: result.rationale ?? '',
        factors: Array.isArray(result.factors) ? result.factors : [],
      };
    } catch (err) {
      this.logger.warn(`Dynamic pricing failed: ${String(err)}`);
      return fallback;
    }
  }

  async translate(text: string, targetLanguage: string): Promise<{ translated: string }> {
    if (!this.client) return { translated: text };

    try {
      const completion = await this.client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate to ${targetLanguage}. Return ONLY translated text.`,
          },
          { role: 'user', content: text },
        ],
      });
      return { translated: completion.choices[0]?.message?.content ?? text };
    } catch (err) {
      this.logger.warn(`Translation failed: ${String(err)}`);
      return { translated: text };
    }
  }
}
