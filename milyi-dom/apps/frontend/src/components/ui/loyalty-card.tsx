"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SparklesIcon, GiftIcon, ClockIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  fetchLoyaltyBalance,
  fetchLoyaltyHistory,
  type LoyaltyAccount,
  type LoyaltyTransaction,
  type LoyaltyTier,
} from "../../services/loyalty";
import { parseError } from "../../lib/api-client";

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<
  LoyaltyTier,
  { label: string; color: string; bg: string; ring: string }
> = {
  BRONZE:   { label: "Бронза",   color: "text-amber-700",  bg: "bg-amber-50",  ring: "ring-amber-300" },
  SILVER:   { label: "Серебро",  color: "text-slate-600",  bg: "bg-slate-50",  ring: "ring-slate-300" },
  GOLD:     { label: "Золото",   color: "text-yellow-600", bg: "bg-yellow-50", ring: "ring-yellow-400" },
  PLATINUM: { label: "Платина",  color: "text-violet-700", bg: "bg-violet-50", ring: "ring-violet-400" },
};

function TierBadge({ tier }: { tier: LoyaltyTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}
    >
      <SparklesIcon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ current, needed }: { current: number; needed: number }) {
  const pct = Math.min(100, (current / (current + needed)) * 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        className="h-full rounded-full bg-pine-500"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  );
}

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const isPositive = tx.points > 0;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
            isPositive ? "bg-emerald-50" : "bg-rose-50"
          }`}
        >
          {isPositive ? (
            <GiftIcon className="h-4 w-4 text-emerald-600" />
          ) : (
            <SparklesIcon className="h-4 w-4 text-rose-500" />
          )}
        </div>
        <div>
          <p className="text-sm text-slate-800">{tx.description}</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            <ClockIcon className="h-3 w-3" />
            {new Date(tx.createdAt).toLocaleDateString("ru-RU")}
          </p>
        </div>
      </div>
      <span
        className={`text-sm font-semibold ${
          isPositive ? "text-emerald-600" : "text-rose-500"
        }`}
      >
        {isPositive ? "+" : ""}
        {tx.points} балл{Math.abs(tx.points) === 1 ? "" : "ов"}
      </span>
    </div>
  );
}

interface LoyaltyCardProps {
  /** Show transaction history (default: true) */
  showHistory?: boolean;
}

export function LoyaltyCard({ showHistory = true }: LoyaltyCardProps) {
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchLoyaltyBalance(),
      showHistory ? fetchLoyaltyHistory(10) : Promise.resolve<LoyaltyTransaction[]>([]),
    ])
      .then(([bal, hist]) => {
        setAccount(bal);
        setHistory(hist);
      })
      .catch((err) => toast.error(parseError(err).message))
      .finally(() => setLoading(false));
  }, [showHistory]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-3xl bg-white p-6 shadow-soft space-y-4">
        <div className="h-5 w-32 rounded bg-slate-100" />
        <div className="h-10 w-24 rounded bg-slate-100" />
        <div className="h-2 w-full rounded-full bg-slate-100" />
      </div>
    );
  }

  if (!account) return null;

  const tierCfg = TIER_CONFIG[account.tier];

  return (
    <motion.div
      className="rounded-3xl bg-white p-6 shadow-soft"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Программа лояльности</p>
          <TierBadge tier={account.tier} />
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-slate-900">
            {account.points.toLocaleString("ru-RU")}
          </p>
          <p className="text-xs text-slate-400">баллов</p>
        </div>
      </div>

      {/* Progress to next tier */}
      {account.nextTier ? (
        <div className="mb-5 space-y-1">
          <div className="flex justify-between text-xs text-slate-500">
            <span className={tierCfg.color}>{TIER_CONFIG[account.tier].label}</span>
            <span>{TIER_CONFIG[account.nextTier.tier].label}</span>
          </div>
          <ProgressBar
            current={account.totalEarned}
            needed={account.nextTier.pointsNeeded}
          />
          <p className="text-xs text-slate-400 text-right">
            ещё{" "}
            <span className="font-semibold text-slate-600">
              {account.nextTier.pointsNeeded.toLocaleString("ru-RU")}
            </span>{" "}
            баллов до {TIER_CONFIG[account.nextTier.tier].label}
          </p>
        </div>
      ) : (
        <p className="mb-5 text-xs text-violet-600 font-medium">
          Вы достигли максимального уровня — Платина!
        </p>
      )}

      {/* How to earn */}
      <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 leading-5">
        <span className="font-semibold">Как накапливать:</span> 1 балл за каждые 100 ₽ потраченных на бронирование.{" "}
        <span className="font-semibold">Списание:</span> 100 баллов = скидка 100 ₽.
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700">История</p>
          <div className="divide-y divide-slate-100">
            {history.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
