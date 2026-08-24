/**
 * Trading sessions.
 *
 * Forex instruments (and gold, which trades on the same venues) are shut over
 * the weekend: no quotes, no candles, no fills. Crypto genuinely runs around
 * the clock, which is why the session is a per-instrument property rather than
 * one global switch.
 *
 * Every function takes an explicit `at`, so the whole module is testable
 * without waiting for an actual Saturday.
 */

export type TradingHours = "forex" | "24/7";

const SUNDAY = 0;
const SATURDAY = 6;

/** Weekends are evaluated in UTC so the session is the same for every viewer. */
export function isOpenAt(hours: TradingHours, at: Date = new Date()): boolean {
  if (hours === "24/7") return true;
  const day = at.getUTCDay();
  return day !== SATURDAY && day !== SUNDAY;
}

/** Start of the next session, or null when the market never closes. */
export function nextOpenAfter(hours: TradingHours, at: Date = new Date()): Date | null {
  if (hours === "24/7" || isOpenAt(hours, at)) return null;

  const next = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())
  );
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (!isOpenAt(hours, next));
  return next;
}

/** Midnight UTC after the last open day of the current run. */
export function nextCloseAfter(hours: TradingHours, at: Date = new Date()): Date | null {
  if (hours === "24/7" || !isOpenAt(hours, at)) return null;

  const next = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())
  );
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (isOpenAt(hours, next));
  return next;
}

/** "2d 5h" / "40m" — a compact countdown for the closed-market badge. */
export function formatCountdown(from: Date, to: Date): string {
  const totalMinutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export interface MarketStatus {
  open: boolean;
  /** When the state next flips; null for instruments that never close. */
  changesAt: Date | null;
  /** Ready-to-render summary, e.g. "Opens in 2d 5h". */
  label: string;
}

export function marketStatus(hours: TradingHours, at: Date = new Date()): MarketStatus {
  if (hours === "24/7") {
    return { open: true, changesAt: null, label: "Open 24/7" };
  }

  const open = isOpenAt(hours, at);
  const changesAt = open ? nextCloseAfter(hours, at) : nextOpenAfter(hours, at);
  const countdown = changesAt ? formatCountdown(at, changesAt) : "";

  return {
    open,
    changesAt,
    label: open ? `Closes in ${countdown}` : `Opens in ${countdown}`,
  };
}
