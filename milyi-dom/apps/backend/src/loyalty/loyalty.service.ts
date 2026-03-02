import { Injectable, BadRequestException } from '@nestjs/common';
import { LoyaltyTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ── Tier thresholds (lifetime points earned) ─────────────────────────────────
const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE:   0,
  SILVER:   1_000,
  GOLD:     5_000,
  PLATINUM: 20_000,
};

// Earning rate: 1 point per 100 RUB spent
const POINTS_PER_UNIT = 1;
const UNIT_COST = 100; // RUB

// Redemption rate: 100 points = 100 RUB
const POINTS_TO_RUB = 1;

function calcTier(totalEarned: number): LoyaltyTier {
  if (totalEarned >= TIER_THRESHOLDS.PLATINUM) return LoyaltyTier.PLATINUM;
  if (totalEarned >= TIER_THRESHOLDS.GOLD)     return LoyaltyTier.GOLD;
  if (totalEarned >= TIER_THRESHOLDS.SILVER)   return LoyaltyTier.SILVER;
  return LoyaltyTier.BRONZE;
}

function pointsFromAmount(amountRub: number): number {
  return Math.floor(amountRub / UNIT_COST) * POINTS_PER_UNIT;
}

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Internal helpers ─────────────────────────────────────────────────────

  private async getOrCreate(userId: string) {
    return this.prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId, points: 0, totalEarned: 0, tier: LoyaltyTier.BRONZE },
      update: {},
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async getBalance(userId: string) {
    const account = await this.getOrCreate(userId);
    const nextTier = this.nextTierInfo(account.totalEarned);
    return { ...account, nextTier };
  }

  async getHistory(userId: string, limit = 20) {
    const account = await this.getOrCreate(userId);
    const transactions = await this.prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return transactions;
  }

  /**
   * Award points when a booking is completed.
   * amountRub = totalPrice of the booking.
   */
  async earnFromBooking(
    userId: string,
    amountRub: number,
    bookingId: string,
  ): Promise<void> {
    const points = pointsFromAmount(amountRub);
    if (points <= 0) return;

    const account = await this.getOrCreate(userId);
    const newTotalEarned = account.totalEarned + points;
    const newTier = calcTier(newTotalEarned);

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: points },
          totalEarned: { increment: points },
          tier: newTier,
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points,
          type: 'EARN',
          description: `Баллы за бронирование`,
          bookingId,
        },
      }),
    ]);
  }

  /**
   * Redeem points for a discount on the next booking.
   * Returns the RUB discount amount applied.
   */
  async redeem(userId: string, pointsToRedeem: number, bookingId: string): Promise<number> {
    if (pointsToRedeem <= 0) {
      throw new BadRequestException('Количество баллов должно быть больше 0');
    }

    const account = await this.getOrCreate(userId);

    if (account.points < pointsToRedeem) {
      throw new BadRequestException(
        `Недостаточно баллов. Доступно: ${account.points}, запрошено: ${pointsToRedeem}`,
      );
    }

    const discountRub = pointsToRedeem * POINTS_TO_RUB;

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { decrement: pointsToRedeem } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points: -pointsToRedeem,
          type: 'REDEEM',
          description: `Списание баллов (скидка ${discountRub} ₽)`,
          bookingId,
        },
      }),
    ]);

    return discountRub;
  }

  /** Award bonus points (e.g. sign-up bonus, first review, referral). */
  async awardBonus(userId: string, points: number, description: string): Promise<void> {
    const account = await this.getOrCreate(userId);
    const newTotalEarned = account.totalEarned + points;
    const newTier = calcTier(newTotalEarned);

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: points },
          totalEarned: { increment: points },
          tier: newTier,
        },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points,
          type: 'BONUS',
          description,
        },
      }),
    ]);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private nextTierInfo(totalEarned: number): {
    tier: LoyaltyTier;
    pointsNeeded: number;
  } | null {
    const tiers = [
      LoyaltyTier.SILVER,
      LoyaltyTier.GOLD,
      LoyaltyTier.PLATINUM,
    ] as const;

    for (const tier of tiers) {
      const threshold = TIER_THRESHOLDS[tier];
      if (totalEarned < threshold) {
        return { tier, pointsNeeded: threshold - totalEarned };
      }
    }
    return null; // already Platinum
  }
}
