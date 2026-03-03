import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodeIcal from 'node-ical';
import icalGenerator, { ICalCalendar } from 'ical-generator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IcalService {
  private readonly logger = new Logger(IcalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ── Export: generate iCal feed for a listing ──────────────────────────────

  async generateFeed(icalToken: string): Promise<ICalCalendar> {
    const listing = await this.prisma.listing.findUnique({
      where: { icalToken },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { checkIn: true, checkOut: true, id: true },
        },
        blockedDates: { select: { date: true, source: true } },
      },
    });

    if (!listing) throw new NotFoundException('iCal feed not found');

    const cal = icalGenerator({
      name: `Милый Дом — ${listing.title}`,
      prodId: { company: 'Милый Дом', product: 'Calendar', language: 'RU' },
      timezone: 'Europe/Moscow',
    });

    // Confirmed bookings
    for (const booking of listing.bookings) {
      cal.createEvent({
        id: booking.id,
        summary: 'Забронировано / Booked',
        start: booking.checkIn,
        end: booking.checkOut,
      });
    }

    // Manually blocked dates (group consecutive dates into events)
    const sorted = [...listing.blockedDates].sort((a, b) => a.date.getTime() - b.date.getTime());
    let groupStart: Date | null = null;
    let groupEnd: Date | null = null;

    const flushGroup = () => {
      if (groupStart && groupEnd) {
        const end = new Date(groupEnd);
        end.setDate(end.getDate() + 1);
        cal.createEvent({
          summary: 'Недоступно / Unavailable',
          start: groupStart,
          end,
        });
      }
    };

    for (const { date } of sorted) {
      if (!groupStart) {
        groupStart = date;
        groupEnd = date;
      } else {
        const prev = new Date(groupEnd!);
        prev.setDate(prev.getDate() + 1);
        if (prev.toDateString() === date.toDateString()) {
          groupEnd = date;
        } else {
          flushGroup();
          groupStart = date;
          groupEnd = date;
        }
      }
    }
    flushGroup();

    return cal;
  }

  // ── Import: sync external iCal URL ────────────────────────────────────────

  async syncExternalCalendar(listingId: string, hostId: string, icalUrl: string): Promise<{ added: number }> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');

    let events: nodeIcal.CalendarResponse;
    try {
      events = await nodeIcal.async.fromURL(icalUrl);
    } catch (err) {
      this.logger.warn(`Failed to fetch iCal from ${icalUrl}: ${String(err)}`);
      throw new Error('Failed to fetch iCal feed. Check the URL.');
    }

    // Save the URL for future syncs
    if (!listing.icalSyncUrls.includes(icalUrl)) {
      await this.prisma.listing.update({
        where: { id: listingId },
        data: { icalSyncUrls: { push: icalUrl } },
      });
    }

    // Extract all blocked dates from events
    const datesToBlock: Date[] = [];
    const now = new Date();

    for (const event of Object.values(events)) {
      if (!event || event.type !== 'VEVENT') continue;

      const vEvent = event as nodeIcal.VEvent;
      const start = vEvent.start;
      const end = vEvent.end;
      if (!start || !end) continue;

      // Only future dates
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      const endDay = new Date(end);
      endDay.setHours(0, 0, 0, 0);

      while (cursor < endDay) {
        if (cursor >= now) {
          datesToBlock.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    if (datesToBlock.length === 0) return { added: 0 };

    // Upsert blocked dates
    let added = 0;
    for (const date of datesToBlock) {
      const result = await this.prisma.blockedDate.upsert({
        where: { listingId_date: { listingId, date } },
        create: { listingId, date, source: 'ical_sync' },
        update: { source: 'ical_sync' },
      });
      if (result) added++;
    }

    this.logger.log(`Synced ${added} blocked dates for listing ${listingId} from ${icalUrl}`);
    return { added };
  }

  // ── Manual block / unblock ────────────────────────────────────────────────

  async blockDates(listingId: string, hostId: string, dates: string[]): Promise<{ blocked: number }> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');

    let blocked = 0;
    for (const dateStr of dates) {
      const date = new Date(dateStr);
      await this.prisma.blockedDate.upsert({
        where: { listingId_date: { listingId, date } },
        create: { listingId, date, source: 'manual' },
        update: { source: 'manual' },
      });
      blocked++;
    }

    return { blocked };
  }

  async unblockDates(listingId: string, hostId: string, dates: string[]): Promise<{ unblocked: number }> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');

    const result = await this.prisma.blockedDate.deleteMany({
      where: {
        listingId,
        date: { in: dates.map((d) => new Date(d)) },
      },
    });

    return { unblocked: result.count };
  }

  async getBlockedDates(listingId: string): Promise<string[]> {
    const blocked = await this.prisma.blockedDate.findMany({
      where: { listingId, date: { gte: new Date() } },
      select: { date: true },
      orderBy: { date: 'asc' },
    });

    return blocked.map((b) => b.date.toISOString().split('T')[0]);
  }

  async getBlockedDatesDetailed(listingId: string, hostId: string): Promise<{ date: string; source: string }[]> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');

    const blocked = await this.prisma.blockedDate.findMany({
      where: { listingId, date: { gte: new Date() } },
      select: { date: true, source: true },
      orderBy: { date: 'asc' },
    });

    return blocked.map((b) => ({ date: b.date.toISOString().split('T')[0], source: b.source }));
  }

  async getSyncUrls(listingId: string, hostId: string): Promise<string[]> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');
    return listing.icalSyncUrls;
  }

  async removeSyncUrl(listingId: string, hostId: string, urlToRemove: string): Promise<void> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException('Not your listing');

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { icalSyncUrls: listing.icalSyncUrls.filter((u) => u !== urlToRemove) },
    });
  }

  /** Return the public iCal feed URL for a host's listing. */
  async getFeedUrl(listingId: string, hostId: string): Promise<{ feedUrl: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { hostId: true, icalToken: true },
    });
    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.hostId !== hostId) throw new ForbiddenException();
    const apiBase = this.config.get<string>('app.apiUrl') ?? 'https://api.milyidom.com';
    return { feedUrl: `${apiBase}/api/ical/feed/${listing.icalToken}` };
  }
}
