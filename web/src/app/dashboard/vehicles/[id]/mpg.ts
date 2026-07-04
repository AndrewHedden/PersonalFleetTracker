import type { FuelEntry } from '@stablebook/shared';

/**
 * Compute miles-per-gallon for each *tank-filled* fill-up, tank-to-tank.
 *
 * MPG is only defined at a fill-up that fills the tank, over the interval since
 * the previous full tank: distance = odometer − previous-full-odometer, and
 * gallons = the fuel added at every fill *after* the previous full tank up to
 * and including this one (so partial fills in between roll in; this fill's
 * gallons count, the previous full tank's do not).
 *
 * Fills are walked in odometer order (physical truth). Partial fills never get
 * their own MPG — their gallons carry forward to the next full tank. Bad data
 * is guarded: the first full tank (no prior) and any interval with a
 * non-positive distance (e.g. out-of-order imported odometers) or zero gallons
 * produce no MPG.
 *
 * Returns a map of fuel-entry id → MPG (only for entries that have one).
 */
export function computeMpg(entries: FuelEntry[]): Map<string, number> {
  const mpg = new Map<string, number>();

  const ordered = [...entries].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  });

  let lastFullOdo: number | null = null;
  let gallonsSinceFull = 0;
  for (const e of ordered) {
    gallonsSinceFull += Number(e.gallons);
    if (!e.tankFilled) continue;
    if (lastFullOdo !== null) {
      const distance = e.odometer - lastFullOdo;
      if (distance > 0 && gallonsSinceFull > 0) {
        mpg.set(e.id, distance / gallonsSinceFull);
      }
    }
    lastFullOdo = e.odometer;
    gallonsSinceFull = 0;
  }

  return mpg;
}
