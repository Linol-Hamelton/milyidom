import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface AiSearchQuery {
  query: string;
}

export interface AiSearchResult {
  /** Structured search params extracted by Claude */
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
  /** Human-readable summary of what Claude understood */
  interpretation: string;
}

const SYSTEM_PROMPT = `You are a search assistant for "Милый Дом" — a Russian short-term rental platform.

Your job is to interpret a user's natural language search query and extract structured search parameters.

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation):
{
  "q": "keywords for full-text search (relevant words from query)",
  "city": "city name if mentioned, else null",
  "country": "country if mentioned, else null",
  "minPrice": number or null,
  "maxPrice": number or null,
  "maxGuests": number or null,
  "bedroomsCount": number or null,
  "amenities": ["wifi", "pool", ...] or [],
  "sortBy": "rating" | "pricePerNight" | "reviewsCount" | null,
  "sortOrder": "asc" | "desc" | null,
  "interpretation": "one sentence in Russian describing what you understood"
}

Rules:
- Extract any price hints (budget, cheap, expensive, etc.)
- Recognize Russian city names and translate to their canonical Russian form
- Map descriptive amenities to standard names: wifi, pool, parking, gym, kitchen, ac, beach, mountain, sauna, fireplace
- If user wants "cheap" or "budget" → sortBy pricePerNight, sortOrder asc
- If user wants "best rated" or "top" → sortBy rating, sortOrder desc
- Prices in Russian context: "недорого" < 3000 RUB, "дорого" > 15000 RUB
- Keep q field focused: only the key descriptive words, not city/price/guest info`;

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly client: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('anthropic.apiKey');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Anthropic AI client initialized');
    } else {
      this.client = null;
      this.logger.warn('ANTHROPIC_API_KEY not set — AI search disabled');
    }
  }

  async interpret(query: string): Promise<AiSearchResult> {
    if (!this.client) {
      // Graceful degradation: treat query as plain text search
      return {
        params: { q: query },
        interpretation: 'AI-поиск недоступен. Ищем по тексту запроса.',
      };
    }

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }],
      });

      const raw = message.content[0].type === 'text' ? message.content[0].text : '';
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
      return {
        params: { q: query },
        interpretation: 'Не удалось разобрать запрос. Ищем по тексту.',
      };
    }
  }

  async generateReviewSummary(reviews: { rating: number; comment: string }[]): Promise<string> {
    if (!this.client || reviews.length === 0) return '';

    const reviewText = reviews
      .slice(0, 50) // limit to 50 reviews
      .map((r) => `[${r.rating}/5] ${r.comment}`)
      .join('\n');

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:
          'Ты помощник для агрегации отзывов. Напиши краткое нейтральное резюме отзывов гостей (2-3 предложения на русском языке). Укажи главные плюсы и минусы.',
        messages: [{ role: 'user', content: reviewText }],
      });

      return message.content[0].type === 'text' ? message.content[0].text : '';
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
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system:
          'You are a fraud detection system for a rental platform. Analyze the listing and respond ONLY with JSON: {"isFraud": boolean, "reason": "string"}. Flag fraud when: unrealistic pricing, copy-pasted generic text, suspicious claims, clearly fake location. Reason must be in Russian when isFraud is true, empty string otherwise.',
        messages: [
          {
            role: 'user',
            content: `Title: ${listing.title}\nCity: ${listing.city}, ${listing.country}\nBase price/night: ${listing.basePrice} RUB\nDescription: ${listing.description}`,
          },
        ],
      });

      const raw =
        message.content[0].type === 'text' ? message.content[0].text : '{}';
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

    const prompt = `Listing data:
- City: ${opts.city}
- Type: ${opts.propertyType}, ${opts.bedrooms} bedrooms
- Current price/night: ${opts.currentPrice} ${opts.currency}
- Occupancy rate (last 12 months): ${opts.occupancyRate}%
- Month: ${opts.month}

Market data (same city, similar type):
- Listings: ${opts.marketData.listingsCount}
- Average price: ${opts.marketData.avgPrice} ${opts.currency}
- Min: ${opts.marketData.minPrice} / Max: ${opts.marketData.maxPrice} ${opts.currency}
- Average rating: ${opts.marketData.avgRating.toFixed(1)}`;

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: `You are a dynamic pricing engine for a short-term rental platform.
Analyze the listing and market data and respond ONLY with valid JSON (no markdown):
{"suggestedPrice":<number>,"minPrice":<number>,"maxPrice":<number>,"rationale":"<1-2 sentences in Russian>","factors":["<factor>","<factor>"]}
Rules:
- suggestedPrice reflects demand, competition, occupancy, seasonality
- minPrice = floor to protect brand value; maxPrice = peak ceiling
- factors: 2-5 key Russian-language factors (e.g. "высокий сезон", "низкая заполняемость")
- All prices in same currency as input
- Conservative: don't suggest changes > 40% from current price`,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
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

  async translate(
    text: string,
    targetLanguage: string,
  ): Promise<{ translated: string }> {
    if (!this.client) {
      return { translated: text };
    }

    try {
      const message = await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are a professional translator for a rental platform. Translate the provided text to ${targetLanguage}. Return ONLY the translated text, no explanations.`,
        messages: [{ role: 'user', content: text }],
      });

      const translated =
        message.content[0].type === 'text' ? message.content[0].text : text;
      return { translated };
    } catch (err) {
      this.logger.warn(`Translation failed: ${String(err)}`);
      return { translated: text };
    }
  }
}
