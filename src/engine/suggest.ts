// Podpowiedzi przy wpisywaniu: kolejne trasy, kilometry dla znanej pary miejsc, propozycje stałych tras.
import { normalizePlace, round1, samePlace } from "./ledger";
import type { Route, Trip } from "./types";

const key = (s: string) => normalizePlace(s).toLowerCase();
const pairKey = (o: string, d: string) => `${key(o)}→${key(d)}`;

function mostCommon<T>(items: T[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const it of items) {
    const n = (counts.get(it) ?? 0) + 1;
    counts.set(it, n);
    if (n > bestN) { best = it; bestN = n; }
  }
  return best;
}

/** Ile razy użyto stałej trasy (po id albo po tych samych miejscach). */
export function routeUsage(routes: Route[], trips: Trip[]): Map<number, number> {
  const byPair = new Map<string, number>();
  for (const t of trips) byPair.set(pairKey(t.origin, t.destination), (byPair.get(pairKey(t.origin, t.destination)) ?? 0) + 1);
  return new Map(routes.map((r) => [r.id, byPair.get(pairKey(r.origin, r.destination)) ?? 0]));
}

/**
 * Stałe trasy do pokazania jako „następny przejazd”: najpierw te, które zaczynają się
 * tam, gdzie auto teraz stoi, potem pozostałe – każda grupa wg częstości użycia.
 */
export function suggestRoutes(routes: Route[], trips: Trip[], from: string | null): { route: Route; fromHere: boolean }[] {
  const usage = routeUsage(routes, trips);
  return routes
    .filter((r) => !r.archived)
    .map((route) => ({ route, fromHere: from ? samePlace(route.origin, from) : false }))
    .sort((a, b) =>
      Number(b.fromHere) - Number(a.fromHere)
      || (usage.get(b.route.id) ?? 0) - (usage.get(a.route.id) ?? 0)
      || a.route.position - b.route.position
      || a.route.id - b.route.id);
}

/** Najczęstsza liczba km dla pary miejsc (z historii albo ze stałej trasy). */
export function kmForPair(trips: Trip[], routes: Route[], origin: string, destination: string): number | null {
  if (!origin.trim() || !destination.trim()) return null;
  const k = pairKey(origin, destination);
  const route = routes.find((r) => pairKey(r.origin, r.destination) === k);
  if (route) return route.km;
  const kms = trips.filter((t) => pairKey(t.origin, t.destination) === k).map((t) => t.km);
  return mostCommon(kms) ?? null;
}

/** Najczęstszy cel dla pary miejsc. */
export function purposeForPair(trips: Trip[], origin: string, destination: string): string | null {
  const k = pairKey(origin, destination);
  return mostCommon(trips.filter((t) => pairKey(t.origin, t.destination) === k).map((t) => t.purpose.trim())) ?? null;
}

/** Znane miejsca, od najczęściej odwiedzanych. */
export function knownPlaces(trips: Trip[], routes: Route[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  const add = (s: string, w = 1) => {
    const label = normalizePlace(s);
    if (!label) return;
    const c = counts.get(key(label));
    if (c) c.n += w;
    else counts.set(key(label), { label, n: w });
  };
  for (const t of trips) { add(t.origin); add(t.destination); }
  for (const r of routes) { add(r.origin, 5); add(r.destination, 5); }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((c) => c.label);
}

export function knownPurposes(trips: Trip[], routes: Route[]): string[] {
  const counts = new Map<string, { label: string; n: number }>();
  for (const p of [...trips.map((t) => t.purpose), ...routes.map((r) => r.purpose)]) {
    const label = p.trim();
    if (!label) continue;
    const c = counts.get(label.toLowerCase());
    if (c) c.n += 1;
    else counts.set(label.toLowerCase(), { label, n: 1 });
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).map((c) => c.label);
}

export function knownDrivers(trips: Trip[]): string[] {
  return [...new Set(trips.map((t) => t.driver.trim()).filter(Boolean))];
}

export interface RouteProposal {
  origin: string;
  destination: string;
  km: number;
  purpose: string;
  count: number;
}

/** Przejazdy powtarzane co najmniej `min` razy, których nie ma jeszcze na liście stałych tras. */
export function routeProposals(trips: Trip[], routes: Route[], min = 3): RouteProposal[] {
  const existing = new Set(routes.filter((r) => !r.archived).map((r) => pairKey(r.origin, r.destination)));
  const groups = new Map<string, Trip[]>();
  for (const t of trips) {
    const k = pairKey(t.origin, t.destination);
    if (existing.has(k)) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  return [...groups.values()]
    .filter((g) => g.length >= min)
    .map((g) => ({
      origin: normalizePlace(g[0].origin),
      destination: normalizePlace(g[0].destination),
      km: round1(mostCommon(g.map((t) => t.km)) ?? g[0].km),
      purpose: mostCommon(g.map((t) => t.purpose.trim())) ?? g[0].purpose,
      count: g.length,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Cel dla trasy powrotnej – z historii, a gdy jej brak: „Powrót”. */
export function returnPurpose(trips: Trip[], route: Pick<Route, "origin" | "destination">): string {
  return purposeForPair(trips, route.destination, route.origin) ?? "Powrót";
}
